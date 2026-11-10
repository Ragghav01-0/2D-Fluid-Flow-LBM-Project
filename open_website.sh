#!/bin/bash
# Starts the FluidFlow web UI in the background and opens it in the browser.
#   ./open_website.sh          start (or reopen if already running)
#   ./open_website.sh stop     stop the server
#   ./open_website.sh --demo   open the Demo mode (no solver)
# Your terminal stays free. Log: web/runs/server.log
cd "$(dirname "$0")" || exit 1
PY=.venv/bin/python
mkdir -p web/runs
PIDFILE=web/runs/server.pid
PORTFILE=web/runs/server.port
LOG=web/runs/server.log

running() { [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; }

if [ "$1" = "stop" ]; then
  if running; then
    kill "$(cat "$PIDFILE")" && echo "Stopped."
  else
    echo "Not running."
  fi
  rm -f "$PIDFILE" "$PORTFILE"
  exit 0
fi

SUFFIX=""
[ "$1" = "--demo" ] && SUFFIX="?demo"

# Already running from an earlier launch: just reopen it.
if running && [ -f "$PORTFILE" ]; then
  URL="http://127.0.0.1:$(cat "$PORTFILE")/$SUFFIX"
  echo "Already running: $URL"
  open "$URL" 2>/dev/null || echo "Could not open a browser. Open the address above yourself."
  exit 0
fi

if [ ! -x "$PY" ]; then
  echo "Python environment not found at $PY. Set it up first." >&2
  exit 1
fi

# First free port: 8765, then a few neighbours, then any free port.
PORT=$("$PY" -c '
import socket
for p in (8765, 8766, 8767, 8080, 8000, 0):
    s = socket.socket()
    try:
        s.bind(("127.0.0.1", p)); print(s.getsockname()[1]); break
    except OSError:
        pass
    finally:
        s.close()
')
if [ -z "$PORT" ]; then
  echo "Could not find a free port." >&2
  exit 1
fi
[ "$PORT" != "8765" ] && echo "Port 8765 is busy, using $PORT instead."

# Detached from the terminal, so closing it or pressing Ctrl+C does not matter.
nohup "$PY" -m web --port "$PORT" --no-browser >"$LOG" 2>&1 &
echo $! >"$PIDFILE"
echo "$PORT" >"$PORTFILE"

# Wait up to ~20 s for the server to answer.
for _ in $(seq 1 40); do
  if ! running; then
    echo "The server stopped while starting. Last log lines:" >&2
    tail -n 15 "$LOG" >&2
    rm -f "$PIDFILE" "$PORTFILE"
    exit 1
  fi
  curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 0.5
done

URL="http://127.0.0.1:$PORT/$SUFFIX"
echo "Running at $URL"
if ! open "$URL" 2>/dev/null; then
  echo "Could not open a browser. Open the address above yourself."
fi
echo "Stop it with: ./open_website.sh stop"
