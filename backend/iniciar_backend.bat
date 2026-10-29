@echo off
REM ===================================================================
REM  EcoLogistica Lima - arranque del backend
REM
REM  Hay que ejecutar esto DESDE la carpeta backend, no desde la raiz.
REM  El paquete "app" vive en backend\, y Python solo buscalo donde
REM  esta el proceso. Desde la raiz no lo encuentra y sale con
REM  "No module named 'app'".
REM ===================================================================

setlocal

REM Si el usuario abrio el .bat haciendo doble clic, se cambia solo
REM a la carpeta del script.
cd /d "%~dp0"

if not exist "app\main.py" (
    echo ERROR: no se encuentra backend\app\main.py
    echo Ejecuta este archivo desde la carpeta backend.
    pause
    exit /b 1
)

REM La venv esta un nivel arriba, en la raiz del proyecto
if exist "..\.venv\Scripts\python.exe" (
    set PYTHON=..\.venv\Scripts\python.exe
) else (
    echo AVISO: no se encuentra ..\.venv
    echo Se usará el Python del sistema.
    set PYTHON=python
)

echo Iniciando EcoLogistica Lima en http://127.0.0.1:8000
echo Para detenerlo: Ctrl+C
echo.

%PYTHON% -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

endlocal