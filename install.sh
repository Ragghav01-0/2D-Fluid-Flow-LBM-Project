#!/bin/bash

cd "$(dirname "$0")" || exit 1

LOG_FILE="$PWD/install.log"
PANEL_H=19          # rows of the flow animation (shrunk to fit the terminal)
PANEL_W=100         # columns of the flow animation (shrunk to fit the terminal)
LOG_LINES=4         # live log lines shown under the animation
MIN_DURATION=37     # seconds the whole installer (animation included) runs for
TOTAL_LINES=$((1 + PANEL_H + 2 + 1 + LOG_LINES))
CAPTIONS=(
  "Seeding the D2Q9 lattice with fluid populations"
  "Streaming: populations hop to neighbouring nodes"
  "Collision: BGK relaxation toward equilibrium"
  "Bouncing back off the solid boundary"
  "Measuring velocity and pressure fields"
  "Handing the heavy lifting to the GPU"
)
pid=""
FLOW_STATE=$(mktemp)
: > "$LOG_FILE"

trap 'printf "\033[?25h"; rm -f "$FLOW_STATE"' EXIT
trap 'printf "\033[?25h\n\nInterrupted. Log so far: %s\n" "$LOG_FILE"; [ -n "$pid" ] && kill "$pid" 2>/dev/null; exit 130' INT TERM

# Shrinks the animation to fit the terminal; returns 1 if it is too small to animate.
fit_panel() {
  local rows cols avail
  set -- $(stty size 2>/dev/null)
  rows=${1:-24}; cols=${2:-80}; TERM_COLS=$cols
  PANEL_W=$(( cols - 2 )); [ $PANEL_W -gt 100 ] && PANEL_W=100
  avail=$(( rows - 3 - (1 + 2 + 1 + LOG_LINES) ))
  PANEL_H=19; [ $avail -lt $PANEL_H ] && PANEL_H=$avail
  [ $(( PANEL_H % 2 )) -eq 0 ] && PANEL_H=$(( PANEL_H - 1 ))
  TOTAL_LINES=$(( 1 + PANEL_H + 2 + 1 + LOG_LINES ))
  [ $PANEL_H -ge 7 ] && [ $PANEL_W -ge 60 ]
}

# Flow animation: potential flow past a cylinder plus a weak oscillating wake.
# Tracer particles are advected through the velocity field frame by frame (their
# state lives in FLOW_STATE) and drawn as braille-dot comets coloured by local
# speed (blue = slow, red = fast). Braille gives 2x4 sub-cell resolution, so
# the motion is smooth rather than hopping from character to character.
read -r -d '' FLOW_AWK <<'AWK_EOF'
# Potential flow past a cylinder (U = 1, radius R) plus a weak oscillating wake.
function vel(px, py, tt,   dx, dy, r2, r4, d, g, e) {
  dx = px - cx; dy = py
  r2 = dx*dx + dy*dy; if (r2 < 0.01) r2 = 0.01
  r4 = r2 * r2
  VX = 1 - R2 * (dx*dx - dy*dy) / r4
  VY = -2 * R2 * dx * dy / r4
  d = dx - R
  if (d > 0) {
    g = d / (d + 2) * exp(-d / 16); e = exp(-dy*dy / 8)
    VX *= 1 - 0.55 * g * e
    VY += 0.35 * (d < 5 ? d / 5 : 1) * exp(-d / 14) * exp(-dy*dy / 9.7) * sin(0.8 * dx - 0.5 * tt)
  }
}
function advance(p, tt,   x, y, s, h, dx, dy, r, i) {
  x = X[p,0]; y = Y[p,0]; h = dt / 2
  for (s = 0; s < 2; s++) {
    vel(x, y, tt); x += VX * h; y += VY * h
    dx = x - cx; r = sqrt(dx*dx + y*y)
    if (r < R * 1.02) { x = cx + dx * R * 1.02 / r; y = y * R * 1.02 / r }
    if (y > lim + 0.05) y = lim + 0.05
    if (y < -lim - 0.05) y = -lim - 0.05
  }
  for (i = NT - 1; i > 0; i--) { X[p,i] = X[p,i-1]; Y[p,i] = Y[p,i-1] }
  X[p,0] = x; Y[p,0] = y
  if (x >= L) {
    x = -((t * 7 + p * 13) % 10) / 10 * 1.5; y = (int(p / K) - (M - 1) / 2) * 0.65
    for (i = 0; i < NT; i++) { X[p,i] = x; Y[p,i] = y }
  }
}
BEGIN {
  L = W / 2; cx = int(W * 0.17 + 0.5); cy = int(H / 2); R = (H >= 17) ? 4 : 3; R2 = R*R; K = 9; NT = 7; dt = 0.3
  lim = (H - 2) / 2 - 0.1; M = 2 * int(lim / 0.65 + 0.5); NP = M * K
  split("\033[2m|\033[1;37m|\033[1;34m|\033[1;36m|\033[1;33m|\033[1;31m", C, "|")
  split("1 2 4 64 8 16 32 128", B, " ")

  n = 0
  while ((getline line < S) > 0) {
    split(line, a, " ")
    for (i = 0; i < NT; i++) { X[n,i] = a[1+2*i]; Y[n,i] = a[2+2*i] }
    n++
  }
  close(S)
  if (n != NP) {
    for (p = 0; p < NP; p++) {
      m = int(p / K); x = (p % K + ((m * 37) % 100) / 100) * L / K; y = (m - (M - 1) / 2) * 0.65
      for (i = 0; i < NT; i++) { X[p,i] = x; Y[p,i] = y }
    }
    for (w = -40; w < 0; w++) for (p = 0; p < NP; p++) advance(p, (t + w) * dt)
  }
  for (p = 0; p < NP; p++) advance(p, t * dt)
  printf "" > S
  for (p = 0; p < NP; p++) {
    line = ""
    for (i = 0; i < NT; i++) line = line sprintf("%.3f %.3f ", X[p,i], Y[p,i])
    print line > S
  }
  close(S)

  for (r = 0; r < H; r++) for (c = 0; c < W; c++) { ch[r,c] = " "; cl[r,c] = 0; mk[r,c] = 0 }
  for (c = 0; c < W; c++) { ch[0,c] = "═"; ch[H-1,c] = "═" }
  for (r = 1; r < H - 1; r++) for (c = 0; c < W; c++) {
    dx = (c + 0.5) * 0.5 - cx; dy = r - cy
    if (dx*dx + dy*dy <= R2) { ch[r,c] = "█"; cl[r,c] = 1 }
  }
  for (p = 0; p < NP; p++) for (i = NT - 1; i >= 0; i--) {
    x = X[p,i]; y = Y[p,i]
    if (x < 0) continue
    ux = int(x * 4); uy = int((y + cy + 0.5) * 4)
    col = int(ux / 2); row = int(uy / 4)
    if (row < 1 || row > H - 2 || col >= W) continue
    if (cl[row,col] == 1) continue
    vel(x, y, t * dt); v = sqrt(VX*VX + VY*VY)
    cl[row,col] = (v < 0.8) ? 2 : (v < 1.1) ? 3 : (v < 1.4) ? 4 : 5
    bit = (uy % 4) + (ux % 2) * 4 + 1
    if (!(bs[row,col,bit])) { bs[row,col,bit] = 1; mk[row,col] += B[bit] }
  }
  for (r = 0; r < H; r++) {
    s = ""; last = -1
    for (c = 0; c < W; c++) {
      if (cl[r,c] != last) { s = s C[cl[r,c]+1]; last = cl[r,c] }
      if (mk[r,c] > 0) s = s sprintf("%c%c%c", 226, 160 + int(mk[r,c] / 64), 128 + mk[r,c] % 64)
      else s = s ch[r,c]
    }
    printf "%s\033[0m\033[K\n", s
  }
}
AWK_EOF

render_flow() {
  LC_ALL=C awk -v t="$1" -v H="$PANEL_H" -v W="$PANEL_W" -v S="$FLOW_STATE" "$FLOW_AWK"
}

# Caption that changes every few seconds, plus a progress bar towards MIN_DURATION.
render_caption() {
  local idx=$(( (SECONDS / 4) % ${#CAPTIONS[@]} ))
  local pct=$(( SECONDS * 100 / MIN_DURATION )); [ $pct -gt 100 ] && pct=100
  local filled=$(( pct * 30 / 100 )) bar="" k
  for ((k = 0; k < 30; k++)); do [ $k -lt $filled ] && bar+="█" || bar+="░"; done
  printf '  \033[3m%s\033[0m\033[K\n' "${CAPTIONS[idx]}"
  printf '  \033[1;34m●\033[0m slow  \033[1;36m●\033[0m  \033[1;33m●\033[0m  \033[1;31m●\033[0m fast   \033[36m%s\033[0m %3d%%\033[K\n' "$bar" "$pct"
}

# run_step "message" command args...
# Runs the command in the background while the flow animation plays. Full
# output is appended to install.log; the last few lines are shown live.
run_step() {
  local msg="$1"; shift
  local start=$SECONDS i=0 width tailtxt

  printf '\n=== %s ===\n' "$msg" >> "$LOG_FILE"

  # Not a terminal (CI, piped output): skip the animation, keep the log.
  if [ ! -t 1 ] || ! fit_panel; then
    echo "$msg ..."
    "$@" >> "$LOG_FILE" 2>&1
    local rc=$?
    if [ $rc -ne 0 ]; then
      echo "$msg failed. See $LOG_FILE"; tail -n 20 "$LOG_FILE"; exit $rc
    fi
    return
  fi

  : > "$FLOW_STATE"
  "$@" >> "$LOG_FILE" 2>&1 &
  pid=$!
  width=$(( TERM_COLS - 6 ))

  printf '\033[?25l'
  for ((n = 0; n < TOTAL_LINES; n++)); do echo; done
  while kill -0 "$pid" 2>/dev/null; do
    tailtxt=$(tail -c 3000 "$LOG_FILE" | tr '\r' '\n' | LC_ALL=C tr -d '\000-\010\013-\037' \
              | grep -v '^[[:space:]]*$' | tail -n $LOG_LINES | cut -c1-"$width")
    printf '\033[%dA' "$TOTAL_LINES"
    printf '\033[1m LBM · D2Q9 · flow past a cylinder\033[0m\033[K\n'
    render_flow "$i"
    render_caption
    printf '\033[36m ▸\033[0m %s \033[2m[%ds]\033[0m\033[K\n' "$msg" "$((SECONDS - start))"
    local shown=0
    while IFS= read -r line; do
      printf '\033[2m   %s\033[0m\033[K\n' "$line"; shown=$((shown + 1))
    done <<< "$tailtxt"
    while [ $shown -lt $LOG_LINES ]; do printf '\033[K\n'; shown=$((shown + 1)); done
    i=$((i + 1))
    sleep 0.05
  done

  wait "$pid"
  local status=$?
  pid=""
  printf '\033[%dA\033[J\033[?25h' "$TOTAL_LINES"

  if [ $status -eq 0 ]; then
    printf '\033[32m✔\033[0m %s \033[2m(%ds)\033[0m\n' "$msg" "$((SECONDS - start))"
  else
    printf '\033[31m✘\033[0m %s failed. Last log lines (full log: %s):\n\n' "$msg" "$LOG_FILE"
    tail -n 25 "$LOG_FILE"
    exit $status
  fi
}

# Keeps the animation going until the installer has run for MIN_DURATION seconds.
hold_animation() {
  local remaining=$(( MIN_DURATION - SECONDS ))
  [ $remaining -gt 0 ] && [ -t 1 ] && run_step "Finalizing environment" sleep "$remaining"
}

echo "Creating new virtual environment"
echo

if command -v conda &> /dev/null; then
  echo "Conda exists in your system: $(conda --version)"
  run_step "Creating conda environment and installing dependencies" \
    conda env create -f environment.yml
  hold_animation
  echo
  echo "Virtual environment successfully created and required dependencies installed."
  echo "Activate it by typing: conda activate .venv_lbm"

elif command -v python &> /dev/null; then
  echo "Python exists in your system: $(python --version)"
  run_step "Creating virtual environment" python -m venv .venv_lbm
  run_step "Upgrading pip" .venv_lbm/bin/python -m pip install --upgrade pip
  run_step "Installing dependencies from requirements.txt" \
    .venv_lbm/bin/python -m pip install -r requirements.txt
  hold_animation
  echo
  echo "Environment created. Activate it with: source .venv_lbm/bin/activate"

else
  echo "Neither Python nor Conda exists in your system"
  exit 1

fi

printf '\n\033[32mAll done!\033[0m Full installation log: %s\n' "$LOG_FILE"
