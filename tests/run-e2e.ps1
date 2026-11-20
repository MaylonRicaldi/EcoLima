$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$testUrl = $env:DATABASE_URL_TEST

if (-not $testUrl) {
    throw 'DATABASE_URL_TEST es obligatorio. Debe apuntar a una rama Neon aislada de pruebas.'
}

if ($testUrl -match 'localhost|127\.0\.0\.1|0\.0\.0\.0') {
    throw 'DATABASE_URL_TEST no puede apuntar a una base local.'
}

$previousDatabaseUrl = $env:DATABASE_URL
$env:DATABASE_URL = $testUrl
$env:NODE_ENV = 'test'

$apiProcess = $null
$viteProcess = $null

try {
    $node = (Get-Command node.exe -ErrorAction Stop).Source
    $apiProcess = Start-Process -FilePath $node `
        -ArgumentList (Join-Path $root 'backend\src\server.js') `
        -WorkingDirectory (Join-Path $root 'backend') `
        -PassThru

    $viteProcess = Start-Process -FilePath $node `
        -ArgumentList @((Join-Path $root 'frontend\node_modules\vite\bin\vite.js'), '--host', '127.0.0.1', '--port', '5173') `
        -WorkingDirectory (Join-Path $root 'frontend') `
        -PassThru

    Start-Sleep -Seconds 3
    Push-Location (Join-Path $root 'frontend')
    try {
        npm.cmd run test:e2e
        if ($LASTEXITCODE -ne 0) {
            throw 'Playwright reporto pruebas fallidas.'
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    if ($apiProcess -and -not $apiProcess.HasExited) {
        Stop-Process -Id $apiProcess.Id -Force
    }
    if ($viteProcess -and -not $viteProcess.HasExited) {
        Stop-Process -Id $viteProcess.Id -Force
    }
    if ($null -eq $previousDatabaseUrl) {
        Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
    } else {
        $env:DATABASE_URL = $previousDatabaseUrl
    }
}
