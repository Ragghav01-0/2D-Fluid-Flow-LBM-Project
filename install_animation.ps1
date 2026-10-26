# Helper for install.bat: runs the installer steps one after another while
# animating potential flow past a cylinder (tracer particles coloured by local
# speed). The animation lives in this one process, so it keeps flowing between
# steps. Full output is appended to the log file; the latest lines are shown
# live under the animation.
#
# StepsFile has one step per line: "message|command" (command runs via cmd).
# Note: PowerShell variable names are case-insensitive ($R and $r are the same
# variable), so names below are deliberately distinct.
param(
    [Parameter(Mandatory)][string]$StepsFile,
    [Parameter(Mandatory)][string]$Log,
    [int]$StartEpoch = 0,       # unix time the installer started
    [int]$MinDuration = 25      # seconds the whole installer runs for
)

$LogLines = 4
# Size the panel to the console window (full size is 100 x 19)
$W = [Math]::Max(60, [Math]::Min(100, [Console]::WindowWidth - 2))
$H = [Math]::Max(7, [Math]::Min(19, [Console]::WindowHeight - 3 - (1 + 2 + 1 + $LogLines)))
if ($H % 2 -eq 0) { $H-- }
$L = $W / 2; $cx = [int][Math]::Floor($W * 0.17 + 0.5); $cy = [int][Math]::Floor($H / 2)
$Rad = if ($H -ge 17) { 4 } else { 3 }; $Rsq = $Rad * $Rad
$Total = 1 + $H + 2 + 1 + $LogLines
$Captions = @(
    'Seeding the D2Q9 lattice with fluid populations',
    'Streaming: populations hop to neighbouring nodes',
    'Collision: BGK relaxation toward equilibrium',
    'Bouncing back off the solid boundary',
    'Measuring velocity and pressure fields',
    'Handing the heavy lifting to the GPU'
)
if ($StartEpoch -eq 0) { $StartEpoch = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() }
function Get-Elapsed { [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - $StartEpoch }
$ConsoleWidth = [Console]::WindowWidth - 1
$Palette = @('DarkGray', 'White', 'Cyan', 'Green', 'Yellow', 'Red')
$Heads = @('O', 'o', '.', '.')

# Static background (flat arrays, index = row * W + col): walls and cylinder
$baseCh = New-Object 'char[]' ($H * $W)
$baseCl = New-Object 'int[]' ($H * $W)
for ($ib = 0; $ib -lt $H * $W; $ib++) { $baseCh[$ib] = ' ' }
for ($c = 0; $c -lt $W; $c++) { $baseCh[$c] = '='; $baseCh[($H - 1) * $W + $c] = '=' }
for ($rw = 1; $rw -lt $H - 1; $rw++) {
    for ($c = 0; $c -lt $W; $c++) {
        $dx = ($c + 0.5) * 0.5 - $cx; $dy = $rw - $cy
        if ($dx * $dx + $dy * $dy -le $Rsq) { $baseCh[$rw * $W + $c] = '#'; $baseCl[$rw * $W + $c] = 1 }
    }
}

# Tracer particles: $NT trail samples each, flat arrays (index = particle * NT + sample,
# sample 0 is the head). They are advected through the potential-flow velocity field
# (U = 1) plus a weak oscillating wake.
$PerLine = 5; $NT = 4; $dt = 0.3; $Spacing = 0.8
$lim = ($H - 2) / 2 - 0.1
$NLines = 2 * [int][Math]::Floor($lim / $Spacing + 0.5); $NP = $NLines * $PerLine
$px = New-Object 'double[]' ($NP * $NT)
$py = New-Object 'double[]' ($NP * $NT)
$pcol = New-Object 'int[]' $NP
for ($pi = 0; $pi -lt $NP; $pi++) {
    $ln = [int][Math]::Floor($pi / $PerLine)
    $x0 = ($pi % $PerLine + (($ln * 37) % 100) / 100) * $L / $PerLine
    $y0 = ($ln - ($NLines - 1) / 2) * $Spacing
    for ($k = 0; $k -lt $NT; $k++) { $px[$pi * $NT + $k] = $x0; $py[$pi * $NT + $k] = $y0 }
    $pcol[$pi] = 3
}

function Step-Particle([int]$idx, [double]$tt, [int]$frame) {
    $b = $idx * $NT; $x = $px[$b]; $y = $py[$b]; $hs = $dt / 2
    for ($sub = 0; $sub -lt 2; $sub++) {
        $ddx = $x - $cx
        $q2 = [Math]::Max(0.01, $ddx * $ddx + $y * $y); $q4 = $q2 * $q2
        $vx = 1 - $Rsq * ($ddx * $ddx - $y * $y) / $q4
        $vy = -2 * $Rsq * $ddx * $y / $q4
        $wd = $ddx - $Rad
        if ($wd -gt 0) {
            $vx *= 1 - 0.55 * ($wd / ($wd + 2) * [Math]::Exp(-$wd / 16)) * [Math]::Exp(-$y * $y / 8)
            $vy += 0.35 * [Math]::Min(1, $wd / 5) * [Math]::Exp(-$wd / 14) * [Math]::Exp(-$y * $y / 9.7) * [Math]::Sin(0.8 * $ddx - 0.5 * $tt)
        }
        $x += $vx * $hs; $y += $vy * $hs
        $ddx = $x - $cx; $rr = [Math]::Sqrt($ddx * $ddx + $y * $y)
        if ($rr -lt $Rad * 1.02) { $x = $cx + $ddx * $Rad * 1.02 / $rr; $y = $y * $Rad * 1.02 / $rr }
        $y = [Math]::Max(-$lim - 0.05, [Math]::Min($lim + 0.05, $y))
    }
    $spd = [Math]::Sqrt($vx * $vx + $vy * $vy)
    $pcol[$idx] = if ($spd -lt 0.8) { 2 } elseif ($spd -lt 1.1) { 3 } elseif ($spd -lt 1.4) { 4 } else { 5 }
    for ($k = $NT - 1; $k -gt 0; $k--) { $px[$b + $k] = $px[$b + $k - 1]; $py[$b + $k] = $py[$b + $k - 1] }
    $px[$b] = $x; $py[$b] = $y
    if ($x -ge $L) {
        $x = -(($frame * 7 + $idx * 13) % 10) / 10 * 1.5
        $ln = [int][Math]::Floor($idx / $PerLine)
        $y = ($ln - ($NLines - 1) / 2) * $Spacing
        for ($k = 0; $k -lt $NT; $k++) { $px[$b + $k] = $x; $py[$b + $k] = $y }
    }
}

function Write-Padded([string]$text, [string]$color) {
    [Console]::ForegroundColor = $color
    [Console]::Write($text.PadRight($ConsoleWidth).Substring(0, $ConsoleWidth))
    [Console]::WriteLine()
}

function Draw-Flow([int]$frame) {
    $tt = $frame * $dt
    for ($pi = 0; $pi -lt $NP; $pi++) { Step-Particle $pi $tt $frame }
    $ch = $baseCh.Clone(); $cl = $baseCl.Clone()
    for ($pi = 0; $pi -lt $NP; $pi++) {
        for ($k = $NT - 1; $k -ge 0; $k--) {
            $x = $px[$pi * $NT + $k]
            if ($x -lt 0) { continue }
            $rw = [int][Math]::Floor($py[$pi * $NT + $k] + $cy + 0.5); $col = [int][Math]::Floor($x * 2)
            if ($rw -lt 1 -or $rw -gt $H - 2 -or $col -ge $W) { continue }
            $cell = $rw * $W + $col
            if ($cl[$cell] -eq 1) { continue }
            $cl[$cell] = $pcol[$pi]; $ch[$cell] = $Heads[$k]
        }
    }
    for ($rw = 0; $rw -lt $H; $rw++) {
        $col = 0
        while ($col -lt $W) {
            $run = $cl[$rw * $W + $col]; $sb = New-Object Text.StringBuilder
            while ($col -lt $W -and $cl[$rw * $W + $col] -eq $run) { [void]$sb.Append($ch[$rw * $W + $col]); $col++ }
            [Console]::ForegroundColor = $Palette[$run]
            [Console]::Write($sb.ToString())
        }
        [Console]::WriteLine((' ' * [Math]::Max(0, $ConsoleWidth - $W)))
    }
}

function Get-LogTail {
    try {
        $lines = Get-Content -LiteralPath $Log -Tail ($LogLines + 4) -ErrorAction Stop |
            ForEach-Object { ($_ -split "`r")[-1] } | Where-Object { $_.Trim() }
        @($lines | Select-Object -Last $LogLines)
    } catch { @() }
}

function Start-Panel {
    1..$Total | ForEach-Object { [Console]::WriteLine() }
    $script:top = [Console]::CursorTop - $Total
}

function Clear-Panel {
    [Console]::SetCursorPosition(0, $script:top)
    1..$Total | ForEach-Object { [Console]::WriteLine(' ' * $ConsoleWidth) }
    [Console]::SetCursorPosition(0, $script:top)
}

function Draw-Panel([string]$msg, [int]$frame, $stepWatch) {
    [Console]::SetCursorPosition(0, $script:top)
    Write-Padded ' LBM - D2Q9 - flow past a cylinder' 'White'
    Draw-Flow $frame
    $el = Get-Elapsed
    $pct = [Math]::Min(100, [int](100 * $el / $MinDuration))
    $filled = [int]($pct * 30 / 100)
    Write-Padded ('  ' + $Captions[[int][Math]::Floor($el / 4) % $Captions.Count]) 'White'
    Write-Padded ('  slow . . . fast   [' + ('#' * $filled) + ('-' * (30 - $filled)) + "] $pct%") 'Cyan'
    Write-Padded (" > $msg [{0}s]" -f [int]$stepWatch.Elapsed.TotalSeconds) 'Cyan'
    if ($frame % 4 -eq 0) { $script:tailCache = Get-LogTail }
    for ($li = 0; $li -lt $LogLines; $li++) {
        $text = if ($li -lt $script:tailCache.Count) { '   ' + $script:tailCache[$li] } else { '' }
        Write-Padded $text 'DarkGray'
    }
}

function Write-Ok([string]$msg, $stepWatch) {
    Write-Host '[OK] ' -ForegroundColor Green -NoNewline
    Write-Host ("$msg ({0}s)" -f [int]$stepWatch.Elapsed.TotalSeconds)
}

$steps = @(Get-Content -LiteralPath $StepsFile | Where-Object { $_.Trim() } | ForEach-Object {
    $sep = $_.IndexOf('|')
    [pscustomobject]@{ Msg = $_.Substring(0, $sep); Cmd = $_.Substring($sep + 1) }
})

$oldColor = [Console]::ForegroundColor
$script:top = 0
$script:tailCache = @()
$frame = 0
try {
    [Console]::CursorVisible = $false
    Start-Panel
    foreach ($step in $steps) {
        Add-Content -LiteralPath $Log -Value "`r`n=== $($step.Msg) ==="
        $proc = Start-Process cmd -ArgumentList ('/s /c "' + $step.Cmd + ' >> "' + $Log + '" 2>&1"') `
            -WindowStyle Hidden -PassThru
        $null = $proc.Handle
        $sw = [Diagnostics.Stopwatch]::StartNew()
        while (-not $proc.HasExited) {
            Draw-Panel $step.Msg $frame $sw
            $frame++
            Start-Sleep -Milliseconds 30
        }
        $proc.WaitForExit()
        Clear-Panel
        if ($proc.ExitCode -ne 0) {
            [Console]::ForegroundColor = $oldColor
            Write-Host '[FAILED] ' -ForegroundColor Red -NoNewline
            Write-Host "$($step.Msg). Last log lines (full log: $Log):"
            Write-Host ''
            Get-Content -LiteralPath $Log -Tail 25
            exit 1
        }
        [Console]::ForegroundColor = $oldColor
        Write-Ok $step.Msg $sw
        Start-Panel
    }

    # Keep the animation going until the installer has run for MinDuration seconds.
    $sw = [Diagnostics.Stopwatch]::StartNew()
    $held = $false
    while ((Get-Elapsed) -lt $MinDuration) {
        $held = $true
        Draw-Panel 'Finalizing environment' $frame $sw
        $frame++
        Start-Sleep -Milliseconds 30
    }
    Clear-Panel
    if ($held) { [Console]::ForegroundColor = $oldColor; Write-Ok 'Finalizing environment' $sw }
} finally {
    [Console]::CursorVisible = $true
    [Console]::ForegroundColor = $oldColor
}
exit 0
