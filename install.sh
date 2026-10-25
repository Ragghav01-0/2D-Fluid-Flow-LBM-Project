#!/usr/bin/env bash
# Creates the `.venv_lbm` environment and installs project dependencies.
# Prefers conda (environment.yml); falls back to venv + pip (requirements.txt).

set -euo pipefail

ENV_NAME=".venv_lbm"

# Always run from the repo root so relative paths resolve
cd "$(dirname "${BASH_SOURCE[0]}")"

fail() {
  echo
  echo "Setup failed: $1" >&2
  exit 1
}

echo "Creating new virtual environment"
echo

if command -v conda &> /dev/null; then
  echo "Conda found: $(conda --version)"

  if conda env list | awk '{print $1}' | grep -qx "$ENV_NAME"; then
    echo "Environment '$ENV_NAME' already exists, updating it"
    conda env update -n "$ENV_NAME" -f environment.yml --prune || fail "could not update the conda environment"
  else
    conda env create -f environment.yml || fail "could not create the conda environment"
  fi

  echo
  echo "Environment ready. Activate it with:"
  echo "    conda activate $ENV_NAME"

else
  # Prefer python3: some systems only ship that name
  if command -v python3 &> /dev/null; then
    PY=python3
  elif command -v python &> /dev/null; then
    PY=python
  else
    fail "neither Conda nor Python was found on your system"
  fi

  echo "Python found: $($PY --version)"

  $PY -m venv "$ENV_NAME" || fail "could not create the virtual environment"

  # Call the venv's own interpreter so packages never land in the system Python
  "$ENV_NAME/bin/python" -m pip install --upgrade pip
  "$ENV_NAME/bin/python" -m pip install -r requirements.txt || fail "pip could not install requirements.txt"

  echo
  echo "Environment ready. Activate it with:"
  echo "    source $ENV_NAME/bin/activate"
fi

echo
echo "Then run 'pip install -e .' from the repo root to make 'src' and 'examples' importable."
