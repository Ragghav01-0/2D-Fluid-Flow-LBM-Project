@echo off
echo Creating new virtual environment
echo.

:: Check if Conda exists
where conda >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Conda exists in your system.
    call conda env create -f environment.yml
    echo.
    echo Virtual environment successfully created and required dependencies installed. Activate virtual env by typing 'conda activate .venv_lbm'
    goto :end
)

:: Check if Python exists
where python >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Python exists in your system.
    python -m venv .venv_lbm
    call .venv_lbm\Scripts\activate.bat
    python -m pip install -r requirements.txt
    goto :end
)

:: If neither exists
echo Neither Python nor Conda exists in your system.
exit /b 1

:end
pause
