# Helper for install.bat: runs a command while animating potential flow past a
# cylinder (tracer particles coloured by local speed). Full output is appended
# to the log file; the latest lines are shown live under the animation.
param(
    [Parameter(Mandatory)][string]$Message,
    [string]$Command,
    [Parameter(Mandatory)][string]$Log,
    [int]$StartEpoch = 0,       # unix time the installer started
    [int]$MinDuration = 25,     # seconds the whole installer runs for
    [switch]$Hold               # no command: just animate until MinDuration is reached
)

$W = 76; $H = 15; $L = 38; $cx = 13; $cy = 7; $Rad = 3; $LogLines = 4
$Total = 1 + $H + 2 + 1 + $LogLines
$Captions = @(
    'Seeding the D2Q9 lattice with fluid populations',
    'Streaming: populations hop to neighbouring nodes',
    'Collision: BGK relaxation toward equilibrium',
    'Bouncing back off the solid boundary',
    'Measuring velocity and pressure fields',
    'Handing the heavy lifting to the GPU'
)
function Get-Elapsed { [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - $StartEpoch }
$ConsoleWidth = [Console]::WindowWidth - 1
$Palette = @('DarkGray', 'White', 'Cyan', 'Green', 'Yellow', 'Red')
$Heads = @('O', 'o', '.')

# Static background: walls and cylinder
$baseCh = New-Object 'char[,]' $H, $W
$baseCl = New-Object 'int[,]' $H, $W
for ($r = 0; $r -lt $H; $r++) { for ($c = 0; $c -lt $W; $c++) { $baseCh[$r, $c] = ' ' } }
for ($c = 0; $c -lt $W; $c++) { $baseCh[0, $c] = '='; $baseCh[($H - 1), $c] = '=' }
for ($r = 1; $r -lt $H - 1; $r++) {
    for ($c = 0; $c -lt $W; $c++) {
        $dx = ($c + 0.5) * 0.5 - $cx; $dy = $r - $cy
        if ($dx * $dx + $dy * $dy -le $Rad * $Rad) { $baseCh[$r, $c] = '#'; $baseCl[$r, $c] = 1 }
    }
}

function Write-Padded([string]$text, [string]$color) {
    [Console]::ForegroundColor = $color
    [Console]::Write($text.PadRight($ConsoleWidth).Substring(0, $ConsoleWidth))
    [Console]::WriteLine()
}

# Tracer particles live in $px/$py (trail of $NT samples each) and are advected
# through the potential-flow velocity field (U = 1) plus a weak oscillating wake.
$PerLine = 9; $NT = 7; $dt = 0.3; $Rsq = $Rad * $Rad
$lim = ($H - 2) / 2 - 0.1
$NLines = 2 * [int][Math]::Floor($lim / 0.65 + 0.5); $NP = $NLines * $PerLine
$px = New-Object 'double[,]' $NP, $NT
$py = New-Object 'double[,]' $NP, $NT
$script:FVX = 0.0; $script:FVY = 0.0

function Get-Velocity([double]$x, [double]$y, [double]$tt) {
    $dx = $x - $cx
    $r2 = [Math]::Max(0.01, $dx * $dx + $y * $y); $r4 = $r2 * $r2
    $vx = 1 - $Rsq * ($dx * $dx - $y * $y) / $r4
    $vy = -2 * $Rsq * $dx * $y / $r4
    $d = $dx - $Rad
    if ($d -gt 0) {
        $g = $d / ($d + 2) * [Math]::Exp(-$d / 16)
        $vx *= 1 - 0.55 * $g * [Math]::Exp(-$y * $y / 8)
        $vy += 0.35 * [Math]::Min(1, $d / 5) * [Math]::Exp(-$d / 14) * [Math]::Exp(-$y * $y / 9.7) * [Math]::Sin(0.8 * $dx - 0.5 * $tt)
    }
    $script:FVX = $vx; $script:FVY = $vy
}

function Step-Particle([int]$p, [double]$tt, [int]$frame) {
    $x = $px[$p, 0]; $y = $py[$p, 0]; $hs = $dt / 2
    for ($s = 0; $s -lt 2; $s++) {
        Get-Velocity $x $y $tt
        $x += $script:FVX * $hs; $y += $script:FVY * $hs
        $dx = $x - $cx; $rr = [Math]::Sqrt($dx * $dx + $y * $y)
        if ($rr -lt $Rad * 1.02) { $x = $cx + $dx * $Rad * 1.02 / $rr; $y = $y * $Rad * 1.02 / $rr }
        $y = [Math]::Max(-$lim - 0.05, [Math]::Min($lim + 0.05, $y))
    }
    for ($i = $NT - 1; $i -gt 0; $i--) { $j = $i - 1; $px[$p, $i] = $px[$p, $j]; $py[$p, $i] = $py[$p, $j] }
    $px[$p, 0] = $x; $py[$p, 0] = $y
    if ($x -ge $L) {
        $x = -(($frame * 7 + $p * 13) % 10) / 10 * 1.5
        $y = ([Math]::Floor($p / $PerLine) - ($NLines - 1) / 2) * 0.65
        for ($i = 0; $i -lt $NT; $i++) { $px[$p, $i] = $x; $py[$p, $i] = $y }
    }
}

# Seed the particles along evenly spaced streamlines, then let them settle.
for ($p = 0; $p -lt $NP; $p++) {
    $ln = [Math]::Floor($p / $PerLine); $x0 = ($p % $PerLine + (($ln * 37) % 100) / 100) * $L / $PerLine
    for ($i = 0; $i -lt $NT; $i++) { $px[$p, $i] = $x0; $py[$p, $i] = ($ln - ($NLines - 1) / 2) * 0.65 }
}
for ($wf = -40; $wf -lt 0; $wf++) { for ($p = 0; $p -lt $NP; $p++) { Step-Particle $p ($wf * $dt) 0 } }

function Draw-Flow([int]$frame) {
    $tt = $frame * $dt
    for ($p = 0; $p -lt $NP; $p++) { Step-Particle $p $tt $frame }
    $ch = $baseCh.Clone(); $cl = $baseCl.Clone()
    for ($p = 0; $p -lt $NP; $p++) {
        for ($i = $NT - 1; $i -ge 0; $i--) {
            $x = $px[$p, $i]; $y = $py[$p, $i]
            if ($x -lt 0) { continue }
            $row = [int][Math]::Floor($y + $cy + 0.5); $col = [int][Math]::Floor($x * 2)
            if ($row -lt 1 -or $row -gt $H - 2 -or $col -ge $W) { continue }
            if ($cl[$row, $col] -eq 1) { continue }
            Get-Velocity $x $y $tt
            $v = [Math]::Sqrt($script:FVX * $script:FVX + $script:FVY * $script:FVY)
            $cl[$row, $col] = if ($v -lt 0.8) { 2 } elseif ($v -lt 1.1) { 3 } elseif ($v -lt 1.4) { 4 } else { 5 }
            $ch[$row, $col] = $Heads[[Math]::Min($i, 2)]
        }
    }
    for ($r = 0; $r -lt $H; $r++) {
        $col = 0
        while ($col -lt $W) {
            $run = $cl[$r, $col]; $sb = New-Object Text.StringBuilder
            while ($col -lt $W -and $cl[$r, $col] -eq $run) { $glyph = $ch[$r, $col]; [void]$sb.Append($glyph); $col++ }
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

$oldColor = [Console]::ForegroundColor
Add-Content -LiteralPath $Log -Value "`r`n=== $Message ==="
if ($StartEpoch -eq 0) { $StartEpoch = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() }
if (-not $Hold) {
    $p = Start-Process cmd -ArgumentList ('/s /c "' + $Command + ' >> "' + $Log + '" 2>&1"') `
        -WindowStyle Hidden -PassThru
    $null = $p.Handle
}
$sw = [Diagnostics.Stopwatch]::StartNew()

try {
    [Console]::CursorVisible = $false
    1..$Total | ForEach-Object { [Console]::WriteLine() }
    $top = [Console]::CursorTop - $Total
    $t = 0
    while ($(if ($Hold) { (Get-Elapsed) -lt $MinDuration } else { -not $p.HasExited })) {
        [Console]::SetCursorPosition(0, $top)
        Write-Padded ' LBM - D2Q9 - flow past a cylinder' 'White'
        Draw-Flow $t
        $el = Get-Elapsed
        $pct = [Math]::Min(100, [int](100 * $el / $MinDuration))
        $filled = [int]($pct * 30 / 100)
        Write-Padded ('  ' + $Captions[[int][Math]::Floor($el / 4) % $Captions.Count]) 'White'
        Write-Padded ('  slow . . . fast   [' + ('#' * $filled) + ('-' * (30 - $filled)) + "] $pct%") 'Cyan'
        Write-Padded (" > $Message [{0}s]" -f [int]$sw.Elapsed.TotalSeconds) 'Cyan'
        $tail = Get-LogTail
        for ($i = 0; $i -lt $LogLines; $i++) {
            $line = if ($i -lt $tail.Count) { '   ' + $tail[$i] } else { '' }
            Write-Padded $line 'DarkGray'
        }
        $t++
        Start-Sleep -Milliseconds 50
    }
    if (-not $Hold) { $p.WaitForExit() }

    # Clear the panel
    [Console]::SetCursorPosition(0, $top)
    1..$Total | ForEach-Object { [Console]::WriteLine(' ' * $ConsoleWidth) }
    [Console]::SetCursorPosition(0, $top)
} finally {
    [Console]::CursorVisible = $true
    [Console]::ForegroundColor = $oldColor
}

$secs = [int]$sw.Elapsed.TotalSeconds
if ($Hold -or $p.ExitCode -eq 0) {
    Write-Host '[OK] ' -ForegroundColor Green -NoNewline
    Write-Host "$Message ($($secs)s)"
    exit 0
}
Write-Host '[FAILED] ' -ForegroundColor Red -NoNewline
Write-Host "$Message. Last log lines (full log: $Log):"
Write-Host ''
Get-Content -LiteralPath $Log -Tail 25
exit 1
