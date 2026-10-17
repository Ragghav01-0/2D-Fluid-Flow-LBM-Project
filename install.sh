#!/bin/bash

echo "Creating new virtual environment\n"

if command -v conda &> /dev/null; then
  echo "Conda exists in your system: $(conda --version)"
  conda env create -f environment.yml
  echo "\n Virtual environment successfully created and required dependencies installed. Activate virtual env by typing 'conda activate .venv_lbm' "

elif command -v python &> /dev/null; then
  echo "Python exists in your system: $(python --version)"
  python -m venv .venv_lbm
  pip install -r requirements.txt

else
  echo "Neither Python nor Conda exists in your system"
  exit 1

fi