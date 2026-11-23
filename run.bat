@echo off
REM One launcher after install.bat. Finds the Python environment itself (no activate step).
REM   run.bat web      web UI, opens the browser (Ctrl+C stops it)
REM   run.bat demo     web UI in Demo mode (no solver)
REM   run.bat solver   terminal solver, no GUI
setlocal
cd /d "%~dp0"
set "CMD=%~1"
if "%CMD:~0,2%"=="--" set "CMD=%CMD:~2%"
if /i "%CMD%"=="web" goto env
if /i "%CMD%"=="demo" goto env
if /i "%CMD%"=="solver" goto env
echo Usage: run.bat web ^| demo ^| solver
exit /b 1

:env
set "PY="
if exist ".venv_lbm\Scripts\python.exe" set "PY=%CD%\.venv_lbm\Scripts\python.exe"
if not defined PY (
    where conda >nul 2>nul
    if not errorlevel 1 (
        for /f "delims=" %%P in ('conda run -n .venv_lbm python -c "import sys; print(sys.executable)" 2^>nul') do set "PY=%%P"
    )
)
if not defined PY goto noenv
if not exist "%PY%" goto noenv
"%PY%" -c "import taichi" >nul 2>nul
if errorlevel 1 goto noenv

if /i "%CMD%"=="solver" (
    cd src
    "%PY%" Simulator.py
    exit /b %errorlevel%
)

"%PY%" -c "import websockets, psutil" >nul 2>nul
if errorlevel 1 (
    echo Installing the web server packages ^(one time^)...
    "%PY%" -m pip install --quiet websockets psutil
    if errorlevel 1 (
        echo Could not install websockets and psutil.
        exit /b 1
    )
)
if /i "%CMD%"=="demo" (
    start "" "http://127.0.0.1:8765/?demo"
    "%PY%" -m web --no-browser
    exit /b %errorlevel%
)
"%PY%" -m web
exit /b %errorlevel%

:noenv
echo Python environment not found ^(or taichi is missing^). Run install.bat first.
exit /b 1
