@echo off
setlocal
echo Creating new virtual environment
echo.

:: Check if Conda exists
where conda >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Conda exists in your system.
    call conda env create -f environment.yml --yes
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
    python -m venv .venv_lbm || goto :fail
    call .venv_lbm\Scripts\activate.bat || goto :fail
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt || goto :fail
    echo.
    echo Environment created. Activate it later with: .venv_lbm\Scripts\activate.bat
    goto :end
)

:: If neither exists
echo Neither Python nor Conda exists in your system.
goto :fail

:fail
echo.
echo Setup failed.
pause
exit /b 1

:end
pause