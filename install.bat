@echo off
setlocal
cd /d "%~dp0"
echo Creating new virtual environment
echo.

set "SPIN_LOG=%~dp0install.log"
type nul > "%SPIN_LOG%"
for /f %%t in ('powershell -NoProfile -Command "[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()"') do set "START_EPOCH=%%t"

:: Check if Conda exists
where conda >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Conda exists in your system.
    set "SPIN_MSG=Creating conda environment and installing dependencies"
    set "SPIN_CMD=conda env create -f environment.yml --yes"
    call :spin
    if errorlevel 1 (
        echo.
        echo Failed to create the conda environment. If it already exists, run:
        echo     conda env update -f environment.yml --prune
        goto :fail
    )
    call :hold
    echo.
    echo Environment created. Activate it by typing: conda activate .venv_lbm
    goto :end
)

:: Check if a working Python exists
python --version >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Python exists in your system.
    set "SPIN_MSG=Creating virtual environment"
    set "SPIN_CMD=python -m venv .venv_lbm"
    call :spin || goto :fail
    set "SPIN_MSG=Upgrading pip"
    set "SPIN_CMD=.venv_lbm\Scripts\python.exe -m pip install --upgrade pip"
    call :spin || goto :fail
    set "SPIN_MSG=Installing dependencies from requirements.txt"
    set "SPIN_CMD=.venv_lbm\Scripts\python.exe -m pip install -r requirements.txt"
    call :spin || goto :fail
    call :hold
    echo.
    echo Environment created. Activate it later with: .venv_lbm\Scripts\activate.bat
    goto :end
)

:: If neither exists
echo Neither Python nor Conda exists in your system.
goto :fail

:: Runs %SPIN_CMD% with the flow animation (install_animation.ps1). Output is
:: appended to install.log; the tail of it is printed if the command fails.
:spin
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_animation.ps1" -Message "%SPIN_MSG%" -Command "%SPIN_CMD%" -Log "%SPIN_LOG%" -StartEpoch %START_EPOCH% -MinDuration 25 %SPIN_EXTRA%
exit /b %ERRORLEVEL%

:: Keeps the animation going until the installer has run for 25 seconds.
:hold
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_animation.ps1" -Message "Finalizing environment" -Log "%SPIN_LOG%" -StartEpoch %START_EPOCH% -MinDuration 25 -Hold
exit /b 0

:fail
echo.
echo Setup failed. See %SPIN_LOG% for details.
pause
exit /b 1

:end
echo.
echo All done! Full installation log: %SPIN_LOG%
pause
