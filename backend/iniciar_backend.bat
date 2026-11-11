@echo off
setlocal
cd /d "%~dp0"

if not exist "package.json" (
    echo ERROR: no se encuentra backend\package.json
    exit /b 1
)

if not exist "node_modules\express\package.json" (
    echo Instalando dependencias de Node.js...
    call npm.cmd install
    if errorlevel 1 exit /b 1
)

echo Iniciando EcoLogistica Lima en http://127.0.0.1:8000
echo Para detenerlo: Ctrl+C
echo.
call npm.cmd start
exit /b %ERRORLEVEL%
