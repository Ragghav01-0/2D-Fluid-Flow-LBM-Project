@echo off
setlocal
cd /d "%~dp0"
echo Creating new virtual environment
echo.

set "SPIN_LOG=%~dp0install.log"
set "SPIN_STEPS=%~dp0install_steps.tmp"
type nul > "%SPIN_LOG%"
for /f %%t in ('powershell -NoProfile -Command "[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()"') do set "START_EPOCH=%%t"

:: Check if Conda exists
where conda >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Conda exists in your system.
    > "%SPIN_STEPS%" echo Creating conda environment and installing dependencies^|conda env create -f environment.yml --yes
    call :spin
    if errorlevel 1 (
        echo.
        echo Failed to create the conda environment. If it already exists, run:
        echo     conda env update -f environment.yml --prune
        goto :fail
    )
    echo.
    echo Environment created. Activate it by typing: conda activate .venv_lbm
    goto :end
)

:: Check if a working Python exists
python --version >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Python exists in your system.
    > "%SPIN_STEPS%" echo Creating virtual environment^|python -m venv .venv_lbm
    >> "%SPIN_STEPS%" echo Upgrading pip^|.venv_lbm\Scripts\python.exe -m pip install --upgrade pip
    >> "%SPIN_STEPS%" echo Installing dependencies from requirements.txt^|.venv_lbm\Scripts\python.exe -m pip install -r requirements.txt
    call :spin || goto :fail
    echo.
    echo Environment created. Activate it later with: .venv_lbm\Scripts\activate.bat
    goto :end
)

:: If neither exists
echo Neither Python nor Conda exists in your system.
goto :fail

:: Runs every step in %SPIN_STEPS% (one "message|command" per line) with the flow
:: animation (install_animation.ps1), which keeps running between steps. Output is
:: appended to install.log; the tail of it is printed if a step fails.
:spin
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_animation.ps1" -StepsFile "%SPIN_STEPS%" -Log "%SPIN_LOG%" -StartEpoch %START_EPOCH% -MinDuration 25
set "SPIN_RC=%ERRORLEVEL%"
del "%SPIN_STEPS%" >nul 2>nul
exit /b %SPIN_RC%

:fail
echo.
echo Setup failed. See %SPIN_LOG% for details.
pause
exit /b 1

:end
echo.
echo All done! Full installation log: %SPIN_LOG%
pause
