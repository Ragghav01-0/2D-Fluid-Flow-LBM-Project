@echo off
:: Creates the .venv_lbm environment and installs project dependencies.
:: Prefers conda (environment.yml); falls back to venv + pip (requirements.txt).
setlocal
set "ENV_NAME=.venv_lbm"

:: Always run from the repo root so relative paths resolve
cd /d "%~dp0"

echo Creating new virtual environment
echo.

:: Check if Conda exists
where conda >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Conda found.

    :: Update if the environment already exists, otherwise create it
    call conda env list | findstr /b /c:"%ENV_NAME% " >nul
    if not errorlevel 1 (
        echo Environment %ENV_NAME% already exists, updating it
        call conda env update -n %ENV_NAME% -f environment.yml --prune || goto :fail
    ) else (
        call conda env create -f environment.yml || goto :fail
    )

    echo.
    echo Environment ready. Activate it with:
    echo     conda activate %ENV_NAME%
    goto :done
)

:: Fall back to a plain venv. Try the `python` command, then the `py` launcher
set "PY="
python --version >nul 2>nul && set "PY=python"
if not defined PY (
    py --version >nul 2>nul && set "PY=py"
)
if not defined PY (
    echo Neither Python nor Conda was found on your system.
    goto :fail
)

echo Python found.
%PY% -m venv %ENV_NAME% || goto :fail

:: Call the venv's own interpreter so packages never land in the system Python
"%ENV_NAME%\Scripts\python.exe" -m pip install --upgrade pip
"%ENV_NAME%\Scripts\python.exe" -m pip install -r requirements.txt || goto :fail

echo.
echo Environment ready. Activate it with:
echo     %ENV_NAME%\Scripts\activate.bat
goto :done

:done
echo.
echo Then run "pip install -e ." from the repo root to make "src" and "examples" importable.
pause
exit /b 0

:fail
echo.
echo Setup failed.
pause
exit /b 1
