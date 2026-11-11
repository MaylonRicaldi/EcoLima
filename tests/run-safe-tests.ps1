$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'

Push-Location (Join-Path $root 'frontend')
try {
    npm.cmd run lint
    if ($LASTEXITCODE -ne 0) {
        throw 'Falló ESLint.'
    }

    npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw 'Falló la compilación del frontend.'
    }
}
finally {
    Pop-Location
}

Push-Location $backend
try {
    npm.cmd run test:coverage
    if ($LASTEXITCODE -ne 0) {
        throw 'Fallaron las pruebas del backend Node.js.'
    }

    $nodeFiles = Get-ChildItem src, test, tools -Recurse -Filter *.js -ErrorAction Stop
    foreach ($file in $nodeFiles) {
        node.exe --check $file.FullName
        if ($LASTEXITCODE -ne 0) {
            throw "Falló la comprobación de sintaxis: $($file.FullName)"
        }
    }
}
finally {
    Pop-Location
}

Write-Output 'Pruebas seguras completadas.'
