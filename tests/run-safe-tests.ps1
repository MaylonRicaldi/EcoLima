$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root '.venv\Scripts\python.exe'

if (-not (Test-Path $python)) {
    $python = Join-Path $root 'backend\.venv\Scripts\python.exe'
}

if (-not (Test-Path $python)) {
    throw 'No se encontró el Python del entorno virtual del proyecto.'
}

Push-Location (Join-Path $root 'frontend')
try {
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        throw 'Falló ESLint.'
    }

    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw 'Falló la compilación del frontend.'
    }
}
finally {
    Pop-Location
}

Push-Location (Join-Path $root 'backend')
try {
    & $python -m compileall -q app
    if ($LASTEXITCODE -ne 0) {
        throw 'Falló la compilación sintáctica del backend.'
    }

    & $python tests\prueba_optimizador.py
    if ($LASTEXITCODE -ne 0) {
        throw 'Falló la prueba unitaria del optimizador.'
    }
}
finally {
    Pop-Location
}

Write-Output 'Pruebas seguras completadas.'
