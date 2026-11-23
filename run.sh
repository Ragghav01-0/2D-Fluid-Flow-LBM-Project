#!/bin/bash
# One launcher after ./install.sh. Finds the Python environment itself (no activate step).
#   ./run.sh web      web UI in the background, opens the browser
#   ./run.sh demo     web UI in Demo mode (no solver)
#   ./run.sh solver   terminal solver, no GUI
#   ./run.sh stop     stop the background web server
cd "$(dirname "$0")" || exit 1
CMD="${1#--}"

usage() { echo "Usage: ./run.sh web | demo | solver | stop" >&2; exit 1; }
case "$CMD" in web|demo|solver|stop) ;; *) usage ;; esac

# Environment: pip venv, then the conda env of the same name, then a plain .venv.
PY=""
for p in .venv_lbm/bin/python .venv/bin/python; do
  [ -x "$p" ] && PY="$PWD/$p" && break
done
if [ -z "$PY" ] && command -v conda >/dev/null 2>&1; then
  PY=$(conda run -n .venv_lbm python -c 'import sys; print(sys.executable)' 2>/dev/null | tail -n 1)
  [ -x "$PY" ] || PY=""
fi
if [ -z "$PY" ] || ! "$PY" -c 'import taichi' >/dev/null 2>&1; then
  echo "Python environment not found (or taichi is missing). Run ./install.sh first." >&2
  exit 1
fi
export PY

# The web server needs two packages the installers do not list; add them once.
if [ "$CMD" = web ] || [ "$CMD" = demo ]; then
  "$PY" -c 'import websockets, psutil' >/dev/null 2>&1 || {
    echo "Installing the web server packages (one time)..."
    "$PY" -m pip install --quiet websockets psutil || { echo "Could not install websockets and psutil." >&2; exit 1; }
  }
fi

case "$CMD" in
  web)    exec ./open_website.sh ;;
  demo)   exec ./open_website.sh --demo ;;
  stop)   exec ./open_website.sh stop ;;
  solver) cd src && exec "$PY" Simulator.py ;;
esac
