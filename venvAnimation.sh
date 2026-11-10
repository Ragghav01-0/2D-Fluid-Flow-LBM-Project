#!/bin/bash
# Flow-past-a-stenosis splash screen, played by venvActivate.sh before the
# environment is activated. It runs in its own bash process (venvActivate.sh is
# sourced into the user's shell, so none of this may leak into it).
# Usage: venvAnimation.sh [seconds]

DURATION=${1:-6}
PANEL_H=19          # rows of the flow animation (shrunk to fit the terminal)
PANEL_W=100         # columns of the flow animation (shrunk to fit the terminal)
CHROME=4            # title + stage line + progress line + status line
STAGES=("Starting up" "Pressure builds" "Squeezing through" "Settling down")
FLOW_STATE=$(mktemp)

trap 'printf "\033[?25h"; rm -f "$FLOW_STATE"' EXIT
trap 'exit 130' INT TERM

# Shrinks the animation to fit the terminal; returns 1 if it is too small to animate.
fit_panel() {
  local rows cols avail
  set -- $(stty size 2>/dev/null)
  rows=${1:-24}; cols=${2:-80}; TERM_COLS=$cols
  PANEL_W=$(( cols - 2 )); [ $PANEL_W -gt 100 ] && PANEL_W=100
  avail=$(( rows - 3 - CHROME ))
  PANEL_H=19; [ $avail -lt $PANEL_H ] && PANEL_H=$avail
  [ $(( PANEL_H % 2 )) -eq 0 ] && PANEL_H=$(( PANEL_H - 1 ))
  TOTAL_LINES=$(( CHROME + PANEL_H ))
  [ $PANEL_H -ge 9 ] && [ $PANEL_W -ge 60 ]
}

# Laminar flow through a vessel whose lower wall carries a smooth bump (a
# one-sided stenosis). Lubrication approximation: at every x the profile is
# parabolic across the open lumen, with the stream function
#   psi = q (1.5 eta - 0.5 eta^3),  eta = (y - yc(x)) / h(x)
# so the flux is conserved and the velocity follows from u = dpsi/dy,
# v = -dpsi/dx. A weak vortex sits in the lee of the bump (recirculation zone)
# and an oscillating wake rides on the jet. Tracer particles are advected frame
# by frame (their state lives in FLOW_STATE) and drawn as braille-dot comets
# coloured by local speed (blue = slow, orange = fast).
read -r -d '' FLOW_AWK <<'AWK_EOF'
function bump(px) { return gmax * exp(-((px - cx) / sg) ^ 2) }
function vel(px, py, tt,   g, gp, h, hp, yc, ycp, eta, f, a, d, rx, ry, w, ramp) {
  g = bump(px); gp = -2 * (px - cx) / (sg * sg) * g
  h = (2 * hw - g) / 2; hp = -gp / 2
  yc = -g / 2;          ycp = -gp / 2
  eta = (py - yc) / h; if (eta > 1) eta = 1; if (eta < -1) eta = -1
  f = 1.5 * (1 - eta * eta)
  a = U * hw / h * f
  VX = a
  VY = a * (ycp + eta * hp)
  d = px - cx
  if (d > 0) {
    ramp = d < sg ? d / sg : 1
    VY += 0.5 * ramp * exp(-d / 14) * (1 - eta * eta) * sin(0.8 * d - 0.5 * tt)
  }
  # recirculation zone behind the bump: clockwise vortex hugging the lower wall
  rx = px - vx0; ry = py - vy0
  w = 0.6 * exp(-(rx * rx + ry * ry) / 14)
  VX -= w * ry; VY += w * rx
}
function advance(p, tt,   x, y, s, h, i, lo, hi) {
  x = X[p,0]; y = Y[p,0]; h = dt / 2
  for (s = 0; s < 2; s++) {
    vel(x, y, tt); x += VX * h; y += VY * h
    lo = -hw + 0.12; hi = hw - bump(x) - 0.12
    if (y < lo) y = lo
    if (y > hi) y = hi
  }
  for (i = NT - 1; i > 0; i--) { X[p,i] = X[p,i-1]; Y[p,i] = Y[p,i-1] }
  X[p,0] = x; Y[p,0] = y
  if (x >= L) {
    x = -((t * 7 + p * 13) % 10) / 10 * 1.5; y = (int(p / K) - (M - 1) / 2) * 0.65
    for (i = 0; i < NT; i++) { X[p,i] = x; Y[p,i] = y }
  }
}
BEGIN {
  L = W / 2; cy = int(H / 2); hw = (H - 2) / 2; U = 0.7
  cx = L * 0.38; sg = L * 0.14; gmax = 0.55 * 2 * hw
  vx0 = cx + 1.7 * sg; vy0 = hw - bump(vx0) - 1.6
  K = 9; NT = 7; dt = 0.3
  lim = hw - 0.1; M = 2 * int(lim / 0.65 + 0.5); NP = M * K
  split("\033[2m|\033[38;5;110m|\033[1;38;5;33m|\033[1;38;5;99m|\033[1;38;5;205m|\033[1;38;5;214m", C, "|")
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
      m = int(p / K); x = (p % K + ((m * 37) % 100) / 100) * L / K
      y = ((m - (M - 1) / 2) * 0.65 / hw) * ((2 * hw - bump(x)) / 2) - bump(x) / 2
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
  # the bump on the lower wall; half blocks give it a smoother edge
  for (c = 0; c < W; c++) {
    yb = hw - bump((c + 0.5) * 0.5)
    for (r = 1; r < H - 1; r++) {
      s = (r - cy) + 0.5 - yb
      if (s >= 0.75) { ch[r,c] = "█"; cl[r,c] = 1 }
      else if (s >= 0.25) { ch[r,c] = "▄"; cl[r,c] = 1 }
    }
  }
  for (p = 0; p < NP; p++) for (i = NT - 1; i >= 0; i--) {
    x = X[p,i]; y = Y[p,i]
    if (x < 0) continue
    ux = int(x * 4); uy = int((y + cy + 0.5) * 4)
    col = int(ux / 2); row = int(uy / 4)
    if (row < 1 || row > H - 2 || col >= W) continue
    if (cl[row,col] == 1) continue
    vel(x, y, t * dt); v = sqrt(VX*VX + VY*VY)
    cl[row,col] = (v < 0.8) ? 2 : (v < 1.4) ? 3 : (v < 2.0) ? 4 : 5
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

# Stage tracker (done / current / upcoming) and a progress bar over DURATION.
render_progress() {
  local elapsed=$1 pct stage line="" k filled bar=""
  pct=$(( elapsed * 100 / DURATION )); [ $pct -gt 100 ] && pct=100
  stage=$(( pct * ${#STAGES[@]} / 100 )); [ $stage -ge ${#STAGES[@]} ] && stage=$(( ${#STAGES[@]} - 1 ))
  for ((k = 0; k < ${#STAGES[@]}; k++)); do
    if   [ $k -lt $stage ]; then line+="  \033[32m✔\033[0m ${STAGES[k]}"
    elif [ $k -eq $stage ]; then line+="  \033[1;36m◉\033[0m \033[1m${STAGES[k]}\033[0m"
    else                         line+="  \033[2m○ ${STAGES[k]}\033[0m"
    fi
  done
  filled=$(( pct * 30 / 100 ))
  for ((k = 0; k < 30; k++)); do [ $k -lt $filled ] && bar+="█" || bar+="░"; done
  printf '%b\033[K\n' "$line"
  printf '  \033[1;38;5;33m●\033[0m slow  \033[1;38;5;99m●\033[0m  \033[1;38;5;205m●\033[0m  \033[1;38;5;214m●\033[0m fast   \033[36m%s\033[0m %3d%%\033[K\n' "$bar" "$pct"
}

[ -t 1 ] || exit 0
fit_panel || exit 0

: > "$FLOW_STATE"
printf '\033[?25l'
for ((n = 0; n < TOTAL_LINES; n++)); do echo; done
start=$SECONDS; i=0
while [ $(( SECONDS - start )) -lt "$DURATION" ]; do
  printf '\033[%dA' "$TOTAL_LINES"
  printf '\033[1m LBM · D2Q9 · flow past a stenosis\033[0m\033[K\n'
  render_flow "$i"
  render_progress $(( SECONDS - start ))
  printf '\033[36m ▸\033[0m Activating environment \033[2m[%ds]\033[0m\033[K\n' "$(( SECONDS - start ))"
  i=$((i + 1))
  sleep 0.05
done
printf '\033[%dA\033[J\033[?25h' "$TOTAL_LINES"
