# CMP600 Backup Control - Git commit + local snapshot (WinForms)
#Requires -Version 5.1
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type -Name Win32ShowWindow -Namespace ConsoleHide -MemberDefinition @'
[DllImport("kernel32.dll")] public static extern System.IntPtr GetConsoleWindow();
[DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr hWnd, int nCmdShow);
'@ -ErrorAction SilentlyContinue
$consoleHwnd = [ConsoleHide.Win32ShowWindow]::GetConsoleWindow()
if ($consoleHwnd -ne [IntPtr]::Zero) {
    [void][ConsoleHide.Win32ShowWindow]::ShowWindow($consoleHwnd, 0)
}

$Script:BackupFolder  = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script:ProjectRoot   = Split-Path -Parent $BackupFolder
$Script:SnapshotsDir  = Join-Path $BackupFolder "snapshots"
$Script:LogBox        = $null
$Script:Busy          = $false

$Script:RobocopyExcludeDirs = @(
    "node_modules", "dist", ".git", ".vite", "__pycache__", ".pytest_cache",
    ".venv", "venv", "snapshots"
)

function Write-Log {
    param([string]$Message, [ValidateSet("info", "ok", "warn", "error")][string]$Level = "info")
    if (-not $Script:LogBox) { return }
    $stamp = Get-Date -Format "HH:mm:ss"
    $prefix = switch ($Level) {
        "ok"    { "[OK] " }
        "warn"  { "[WARN] " }
        "error" { "[ERR] " }
        default { "" }
    }
    $Script:LogBox.AppendText("[$stamp] $prefix$Message`r`n")
    $Script:LogBox.SelectionStart = $Script:LogBox.Text.Length
    $Script:LogBox.ScrollToCaret()
}

function Set-Busy {
    param([bool]$IsBusy, [System.Windows.Forms.Button[]]$Buttons)
    $Script:Busy = $IsBusy
    foreach ($b in $Buttons) {
        if ($b) { $b.Enabled = -not $IsBusy }
    }
    if ($IsBusy) {
        [System.Windows.Forms.Application]::DoEvents()
    }
}

function Read-ProcessOutputFile {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return "" }
    $raw = Get-Content -Path $Path -Raw -ErrorAction SilentlyContinue
    if ($null -eq $raw -or $raw.Length -eq 0) { return "" }
    return $raw.Trim()
}

function Invoke-GitCommand {
    param([string[]]$GitArgs)
    $gitExe = Get-GitExe
    if (-not $gitExe) {
        return @{ ExitCode = 1; Out = ""; Err = "git.exe not found" }
    }
    $outFile = [System.IO.Path]::GetTempFileName()
    $errFile = [System.IO.Path]::GetTempFileName()
    try {
        $p = Start-Process -FilePath $gitExe `
            -ArgumentList $GitArgs `
            -WorkingDirectory $Script:ProjectRoot `
            -NoNewWindow -Wait -PassThru `
            -RedirectStandardOutput $outFile `
            -RedirectStandardError $errFile
        $exitCode = if ($p) { $p.ExitCode } else { 1 }
        return @{
            ExitCode = $exitCode
            Out      = (Read-ProcessOutputFile $outFile)
            Err      = (Read-ProcessOutputFile $errFile)
        }
    } finally {
        Remove-Item $outFile, $errFile -Force -ErrorAction SilentlyContinue
    }
}

function Get-GitExe {
    $git = Get-Command git.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($git) { return $git.Source }
    $guess = "$env:ProgramFiles\Git\bin\git.exe"
    if (Test-Path $guess) { return $guess }
    return $null
}

function Invoke-GitCommit {
    if (-not (Test-Path (Join-Path $Script:ProjectRoot ".git"))) {
        Write-Log "No .git folder in project root." -Level error
        [System.Windows.Forms.MessageBox]::Show(
            "This folder is not a Git repository.`nProject: $Script:ProjectRoot",
            "Git Commit",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
        return
    }

    $msg = "Backup $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Log "Staging all changes..."
    $add = Invoke-GitCommand -GitArgs @("add", "-A")
    if ($add.ExitCode -ne 0) {
        Write-Log $(if ($add.Err) { $add.Err } else { $add.Out }) -Level error
        return
    }

    $status = Invoke-GitCommand -GitArgs @("status", "--porcelain")
    if ($status.ExitCode -ne 0) {
        Write-Log $(if ($status.Err) { $status.Err } else { "git status failed" }) -Level error
        return
    }
    if (-not $status.Out) {
        Write-Log "Nothing to commit - working tree clean." -Level warn
        [System.Windows.Forms.MessageBox]::Show(
            "No changes to commit.",
            "Git Commit",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null
        return
    }

    Write-Log "Committing: $msg"
    $msgFile = Join-Path ([System.IO.Path]::GetTempPath()) "cmp600-commit-msg.txt"
    try {
        [System.IO.File]::WriteAllText($msgFile, $msg, [System.Text.UTF8Encoding]::new($false))
        $commit = Invoke-GitCommand -GitArgs @("commit", "-F", $msgFile)
    } finally {
        Remove-Item -LiteralPath $msgFile -Force -ErrorAction SilentlyContinue
    }
    if ($commit.ExitCode -ne 0) {
        Write-Log $(if ($commit.Err) { $commit.Err } else { $commit.Out }) -Level error
        return
    }

    if ($commit.Out) {
        foreach ($line in ($commit.Out -split "`n")) {
            $t = $line.Trim()
            if ($t) { Write-Log $t -Level ok }
        }
    }

    $hash = Invoke-GitCommand -GitArgs @("rev-parse", "--short", "HEAD")
    if ($hash.ExitCode -eq 0 -and $hash.Out) {
        Write-Log "Commit created: $($hash.Out)" -Level ok
    }

    [System.Windows.Forms.MessageBox]::Show(
        "Git commit completed (local only).`n$msg`n`nUse Push to GitHub to upload.",
        "Git Commit",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
}

function Invoke-GitPush {
    if (-not (Test-Path (Join-Path $Script:ProjectRoot ".git"))) {
        Write-Log "No .git folder in project root." -Level error
        return
    }

    $branch = (Invoke-GitCommand -GitArgs @("rev-parse", "--abbrev-ref", "HEAD")).Out
    if (-not $branch) { $branch = "main" }

    Write-Log "Pushing to GitHub (origin $branch)..."
    $push = Invoke-GitCommand -GitArgs @("push", "origin", $branch)
    if ($push.ExitCode -ne 0) {
        Write-Log $(if ($push.Err) { $push.Err } else { $push.Out }) -Level error
        [System.Windows.Forms.MessageBox]::Show(
            "Push failed. Check log (login / network).",
            "Push to GitHub",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
        return
    }

    if ($push.Out) {
        foreach ($line in ($push.Out -split "`n")) {
            $t = $line.Trim()
            if ($t) { Write-Log $t -Level ok }
        }
    }
    if ($push.Err) {
        foreach ($line in ($push.Err -split "`n")) {
            $t = $line.Trim()
            if ($t) { Write-Log $t -Level ok }
        }
    }

    Write-Log "Push completed - GitHub is up to date." -Level ok
    [System.Windows.Forms.MessageBox]::Show(
        "Changes uploaded to GitHub.`nBranch: $branch",
        "Push to GitHub",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
}

function Invoke-RobocopyMirror {
    param([string]$Source, [string]$Destination)
    $xd = ($Script:RobocopyExcludeDirs | ForEach-Object { "/XD", $_ }) -join " "
    $robocopyExe = (Get-Command robocopy.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
    if (-not $robocopyExe) { $robocopyExe = "$env:SystemRoot\System32\robocopy.exe" }

    $argLine = @(
        "`"$Source`"", "`"$Destination`"",
        "/E", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS",
        $xd
    ) -join " "

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $robocopyExe
    $psi.Arguments = $argLine
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    $p = [System.Diagnostics.Process]::Start($psi)
    $out = if ($p.StandardOutput) { $p.StandardOutput.ReadToEnd() } else { "" }
    $err = if ($p.StandardError) { $p.StandardError.ReadToEnd() } else { "" }
    $p.WaitForExit()
    return @{ Ok = ($p.ExitCode -lt 8); Out = $out; Err = $err; ExitCode = $p.ExitCode }
}

function Invoke-LocalBackup {
    if (-not (Test-Path $Script:SnapshotsDir)) {
        New-Item -ItemType Directory -Path $Script:SnapshotsDir -Force | Out-Null
    }

    $stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $zipName = "CMP600_backup_$stamp.zip"
    $zipPath = Join-Path $Script:SnapshotsDir $zipName
    if (Test-Path $zipPath) {
        Write-Log "ZIP already exists: $zipPath" -Level error
        return
    }

    $tempRoot = Join-Path $env:TEMP "cmp600-backup-$stamp"
    $tempCopy = Join-Path $tempRoot "CMP600_Dissertation_Project"
    if (Test-Path $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $tempCopy -Force | Out-Null

    Write-Log "Local backup started -> snapshots\$zipName"
    Write-Log "Copying project (excluding node_modules, dist, .git)..."

    $copy = Invoke-RobocopyMirror -Source $Script:ProjectRoot -Destination $tempCopy
    foreach ($line in (($copy.Out + "`n" + $copy.Err) -split "`n")) {
        $t = $line.Trim()
        if ($t) { Write-Log $t }
    }
    if (-not $copy.Ok) {
        Write-Log "Robocopy failed (exit $($copy.ExitCode))." -Level error
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        [System.Windows.Forms.MessageBox]::Show(
            "Backup failed during file copy. See log.",
            "Local Backup",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
        return
    }

    Write-Log "Creating ZIP archive..."
    try {
        if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
        Compress-Archive -LiteralPath $tempCopy -DestinationPath $zipPath -CompressionLevel Optimal
    } catch {
        Write-Log $_.Exception.Message -Level error
        [System.Windows.Forms.MessageBox]::Show(
            "ZIP creation failed: $($_.Exception.Message)",
            "Local Backup",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
        return
    } finally {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }

    $sizeMb = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 1)
    Write-Log "Local backup done (~${sizeMb} MB)." -Level ok
    Write-Log "ZIP: $zipPath" -Level ok
    [System.Windows.Forms.MessageBox]::Show(
        "Local backup saved as ZIP.`n~${sizeMb} MB`n`n$zipPath",
        "Local Backup",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
}

function New-Button {
    param(
        [string]$Text, [int]$X, [int]$Y, [int]$W = 260, [int]$H = 48,
        [ValidateSet("Green", "Blue")][string]$Style = "Blue"
    )
    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = $Text
    $btn.Location = New-Object System.Drawing.Point($X, $Y)
    $btn.Size = New-Object System.Drawing.Size($W, $H)
    $btn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    switch ($Style) {
        "Green" {
            $btn.BackColor = [System.Drawing.Color]::FromArgb(34, 139, 84)
            $btn.ForeColor = [System.Drawing.Color]::White
            $btn.FlatAppearance.BorderSize = 0
        }
        "Blue" {
            $btn.BackColor = [System.Drawing.Color]::FromArgb(41, 98, 168)
            $btn.ForeColor = [System.Drawing.Color]::White
            $btn.FlatAppearance.BorderSize = 0
        }
    }
    return $btn
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "CMP600 Backup"
$form.Size = New-Object System.Drawing.Size(520, 520)
$form.MinimumSize = New-Object System.Drawing.Size(480, 460)
$form.StartPosition = "CenterScreen"
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.BackColor = [System.Drawing.Color]::FromArgb(245, 247, 250)

$header = New-Object System.Windows.Forms.Label
$header.Text = "Project backup"
$header.Location = New-Object System.Drawing.Point(16, 12)
$header.Size = New-Object System.Drawing.Size(460, 24)
$header.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($header)

$sub = New-Object System.Windows.Forms.Label
$sub.Text = 'Commit = local only  |  Push = upload to GitHub  |  ZIP in backup\snapshots'
$sub.Location = New-Object System.Drawing.Point(16, 38)
$sub.Size = New-Object System.Drawing.Size(460, 36)
$sub.ForeColor = [System.Drawing.Color]::FromArgb(80, 90, 100)
$form.Controls.Add($sub)

$grp = New-Object System.Windows.Forms.GroupBox
$grp.Text = "Actions"
$grp.Location = New-Object System.Drawing.Point(12, 82)
$grp.Size = New-Object System.Drawing.Size(468, 168)
$form.Controls.Add($grp)

$btnGit = New-Button -Text "Git Commit" -X 12 -Y 28 -W 140 -H 44 -Style Green
$btnPush = New-Button -Text "Push GitHub" -X 164 -Y 28 -W 140 -H 44 -Style Blue
$btnLocal = New-Button -Text "Local ZIP" -X 316 -Y 28 -W 140 -H 44 -Style Blue
$grp.Controls.Add($btnGit)
$grp.Controls.Add($btnPush)
$grp.Controls.Add($btnLocal)

$btnOpenSnapshots = New-Object System.Windows.Forms.Button
$btnOpenSnapshots.Text = "Open snapshots (ZIP files)"
$btnOpenSnapshots.Location = New-Object System.Drawing.Point(12, 82)
$btnOpenSnapshots.Size = New-Object System.Drawing.Size(444, 28)
$btnOpenSnapshots.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$grp.Controls.Add($btnOpenSnapshots)

$logLabel = New-Object System.Windows.Forms.Label
$logLabel.Text = "Log"
$logLabel.Location = New-Object System.Drawing.Point(16, 258)
$logLabel.Size = New-Object System.Drawing.Size(200, 18)
$form.Controls.Add($logLabel)

$Script:LogBox = New-Object System.Windows.Forms.TextBox
$Script:LogBox.Multiline = $true
$Script:LogBox.ReadOnly = $true
$Script:LogBox.ScrollBars = "Vertical"
$Script:LogBox.Location = New-Object System.Drawing.Point(12, 280)
$Script:LogBox.Size = New-Object System.Drawing.Size(468, 160)
$Script:LogBox.Font = New-Object System.Drawing.Font("Consolas", 8.5)
$Script:LogBox.BackColor = [System.Drawing.Color]::FromArgb(30, 34, 40)
$Script:LogBox.ForeColor = [System.Drawing.Color]::FromArgb(220, 230, 240)
$form.Controls.Add($Script:LogBox)

$btnClear = New-Object System.Windows.Forms.Button
$btnClear.Text = "Clear log"
$btnClear.Location = New-Object System.Drawing.Point(368, 254)
$btnClear.Size = New-Object System.Drawing.Size(112, 24)
$btnClear.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$form.Controls.Add($btnClear)

$actionButtons = @($btnGit, $btnPush, $btnLocal, $btnOpenSnapshots)

$btnGit.Add_Click({
    if ($Script:Busy) { return }
    Set-Busy -IsBusy $true -Buttons $actionButtons
    try { Invoke-GitCommit } catch { Write-Log $_.Exception.Message -Level error }
    finally { Set-Busy -IsBusy $false -Buttons $actionButtons }
})

$btnPush.Add_Click({
    if ($Script:Busy) { return }
    Set-Busy -IsBusy $true -Buttons $actionButtons
    try { Invoke-GitPush } catch { Write-Log $_.Exception.Message -Level error }
    finally { Set-Busy -IsBusy $false -Buttons $actionButtons }
})

$btnLocal.Add_Click({
    if ($Script:Busy) { return }
    Set-Busy -IsBusy $true -Buttons $actionButtons
    try { Invoke-LocalBackup } catch { Write-Log $_.Exception.Message -Level error }
    finally { Set-Busy -IsBusy $false -Buttons $actionButtons }
})

$btnOpenSnapshots.Add_Click({
    if (-not (Test-Path $Script:SnapshotsDir)) {
        New-Item -ItemType Directory -Path $Script:SnapshotsDir -Force | Out-Null
    }
    Start-Process "explorer.exe" -ArgumentList "`"$Script:SnapshotsDir`""
})

$btnClear.Add_Click({ $Script:LogBox.Clear() })

Write-Log "CMP600 Backup ready."
Write-Log "Project: $Script:ProjectRoot"
if (Get-GitExe) {
    Write-Log "Git: found"
} else {
    Write-Log "Git: NOT FOUND" -Level error
}
Write-Log "Snapshots: $Script:SnapshotsDir"
[void]$form.ShowDialog()
