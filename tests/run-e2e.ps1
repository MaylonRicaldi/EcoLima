$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$frontend = Join-Path $root 'frontend'
$container = 'ecolima-postgres'
$database = 'ecolima_e2e_' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$schemaInContainer = "/tmp/$database.sql"
$apiProcess = $null
$viteProcess = $null
$createdDatabase = $false
$completed = $false
$logPrefix = Join-Path $env:TEMP $database
$apiOut = "$logPrefix-api.out.log"
$apiErr = "$logPrefix-api.err.log"
$viteOut = "$logPrefix-vite.out.log"
$viteErr = "$logPrefix-vite.err.log"
$python = Join-Path $root '.venv\Scripts\python.exe'

function Get-HttpStatus {
    param([string]$Url)

    $request = [System.Net.HttpWebRequest]::Create($Url)
    $request.Timeout = 2000

    try {
        $response = $request.GetResponse()
        try {
            return [int]$response.StatusCode
        }
        finally {
            $response.Close()
        }
    }
    catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            $response = $_.Exception.Response
            try {
                return [int]$response.StatusCode
            }
            finally {
                $response.Close()
            }
        }
        return 0
    }
}

if (-not (Test-Path $python)) {
    $python = Join-Path $root 'backend\.venv\Scripts\python.exe'
}

if (-not (Test-Path $python)) {
    throw 'No se encontró el Python del entorno virtual del proyecto.'
}

$portsInUse = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in 8000, 5173 }

if ($portsInUse) {
    throw 'Los puertos 8000 o 5173 ya están ocupados. Cierra esos servicios y vuelve a ejecutar.'
}

$postgresStatus = docker inspect --format '{{.State.Running}}' $container
if ($LASTEXITCODE -ne 0 -or $postgresStatus -ne 'true') {
    throw 'El contenedor ecolima-postgres debe estar iniciado.'
}

$databaseSetting = Get-Content (Join-Path $backend '.env') |
    Where-Object { $_ -match '^DATABASE_URL=' } |
    Select-Object -First 1

if (-not $databaseSetting) {
    throw 'No se encontró DATABASE_URL en backend\.env.'
}

$baseDatabaseUrl = $databaseSetting.Substring('DATABASE_URL='.Length).Trim().Trim('"').Trim("'")
$testDatabaseUrl = [regex]::Replace(
    $baseDatabaseUrl,
    '/ecolima(?=\?|$)',
    "/$database"
)

if ($testDatabaseUrl -eq $baseDatabaseUrl) {
    throw 'No se pudo aislar la base E2E de la URL configurada.'
}

$env:DATABASE_URL = $testDatabaseUrl
$env:JWT_SECRET_KEY = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$env:CYPRESS_E2E_EMAIL = 'admin@ecolima.com'
$env:CYPRESS_E2E_PASSWORD = 'E2e!' + [guid]::NewGuid().ToString('N') + 'Aa1'
$env:ECOLIMA_TEST_ADMIN_PASSWORD = $env:CYPRESS_E2E_PASSWORD

try {
    docker exec $container psql -U ecolima_user -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $database"
    if ($LASTEXITCODE -ne 0) {
        throw 'No se pudo crear la base de datos E2E.'
    }
    $createdDatabase = $true

    $schemaPath = Join-Path $root 'database\ecolima_ddl.sql'
    docker cp $schemaPath "${container}:$schemaInContainer"
    if ($LASTEXITCODE -ne 0) {
        throw 'No se pudo copiar el DDL a PostgreSQL.'
    }

    docker exec $container psql -U ecolima_user -d $database -v ON_ERROR_STOP=1 -f $schemaInContainer
    if ($LASTEXITCODE -ne 0) {
        throw 'No se pudo inicializar el esquema aislado para las pruebas.'
    }

    docker exec $container psql -U ecolima_user -d $database -v ON_ERROR_STOP=1 -c "ALTER TABLE usuarios ADD COLUMN intentos_fallidos INTEGER NOT NULL DEFAULT 0; ALTER TABLE usuarios ADD COLUMN bloqueado_hasta TIMESTAMP"
    if ($LASTEXITCODE -ne 0) {
        throw 'No se pudieron aplicar las columnas de autenticación requeridas por la API.'
    }

    Push-Location $backend
    try {
        & $python (Join-Path $PSScriptRoot 'seed-e2e.py')
        if ($LASTEXITCODE -ne 0) {
            throw 'Falló la creación de datos semilla para E2E.'
        }
    }
    finally {
        Pop-Location
    }

    $apiProcess = Start-Process `
        -FilePath $python `
        -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000') `
        -WorkingDirectory $backend `
        -RedirectStandardOutput $apiOut `
        -RedirectStandardError $apiErr `
        -PassThru

    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $viteEntry = Join-Path $frontend 'node_modules\vite\bin\vite.js'
    $viteProcess = Start-Process `
        -FilePath $node `
        -ArgumentList @($viteEntry, '--host', 'localhost', '--port', '5173', '--strictPort') `
        -WorkingDirectory $frontend `
        -RedirectStandardOutput $viteOut `
        -RedirectStandardError $viteErr `
        -PassThru

    $apiReady = $false
    $viteReady = $false
    $apiStatus = 0
    $viteStatus = 0

    for ($attempt = 0; $attempt -lt 45; $attempt++) {
        if (-not $apiReady) {
            $apiStatus = Get-HttpStatus 'http://127.0.0.1:8000/health'
            $apiReady = $apiStatus -eq 200
        }

        if (-not $viteReady) {
            $viteStatus = Get-HttpStatus 'http://localhost:5173'
            $viteReady = $viteStatus -eq 200
        }

        if ($apiReady -and $viteReady) {
            break
        }
        Start-Sleep -Seconds 1
    }

    if (-not $apiReady) {
        throw "La API E2E no inició; HTTP=$apiStatus; proceso activo=$(-not $apiProcess.HasExited)."
    }
    if (-not $viteReady) {
        throw "Vite E2E no inició; HTTP=$viteStatus; proceso activo=$(-not $viteProcess.HasExited)."
    }

    Push-Location $frontend
    try {
        npm.cmd run cy:run
        if ($LASTEXITCODE -ne 0) {
            throw 'Cypress reportó una o más pruebas fallidas.'
        }
    }
    finally {
        Pop-Location
    }

    Push-Location $backend
    try {
        & $python tests\prueba_clientes.py
        if ($LASTEXITCODE -ne 0) {
            throw 'Falló la integración de clientes y permisos.'
        }

        & $python tests\prueba_permisos.py
        if ($LASTEXITCODE -ne 0) {
            throw 'Falló la integración de permisos por rol.'
        }
    }
    finally {
        Pop-Location
    }

    $completed = $true
    Write-Output 'Suite Cypress y pruebas de integración completadas.'
}
finally {
    Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:JWT_SECRET_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:CYPRESS_E2E_EMAIL -ErrorAction SilentlyContinue
    Remove-Item Env:CYPRESS_E2E_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:ECOLIMA_TEST_ADMIN_PASSWORD -ErrorAction SilentlyContinue

    foreach ($process in @($apiProcess, $viteProcess)) {
        if ($process -and -not $process.HasExited) {
            Stop-Process -Id $process.Id -Force
            Wait-Process -Id $process.Id -ErrorAction SilentlyContinue
        }
    }

    if ($createdDatabase) {
        docker exec $container psql -U ecolima_user -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$database' AND pid <> pg_backend_pid()" | Out-Null
        docker exec $container psql -U ecolima_user -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE $database"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "No se pudo eliminar la base temporal $database."
        }
    }

    docker exec $container rm -f $schemaInContainer 2>$null

    if ($completed) {
        Remove-Item $apiOut, $apiErr, $viteOut, $viteErr -ErrorAction SilentlyContinue
    }
    else {
        foreach ($log in @($apiErr, $viteErr, $apiOut, $viteOut)) {
            if (Test-Path $log) {
                Write-Output "Ultimas lineas de ${log}:"
                Get-Content $log -Tail 40
            }
        }
    }
}
