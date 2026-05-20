# CMP600 Backup tab (dot-sourced from cmp600-control.ps1)
#Requires -Version 5.1

function Initialize-BackupControlModule {
    param(
        [string]$ProjectRoot,
        [string]$DevToolsDir
    )
    $Script:ProjectRoot  = $ProjectRoot
    $Script:DevToolsDir   = $DevToolsDir
    $Script:SnapshotsDir  = Join-Path $DevToolsDir "snapshots"
    $Script:BackupLogBox  = $null
    $Script:Busy          = $false
}

$Script:RobocopyExcludeDirs = @(
    "node_modules", "dist", ".git", ".vite", "__pycache__", ".pytest_cache",
    ".venv", "venv", "snapshots"
)

function Write-BackupLog {
    param([string]$Message, [ValidateSet("info", "ok", "warn", "error")][string]$Level = "info")
    if (-not $Script:BackupLogBox) { return }
    $stamp = Get-Date -Format "HH:mm:ss"
    $prefix = switch ($Level) {
        "ok"    { "[OK] " }
        "warn"  { "[WARN] " }
        "error" { "[ERR] " }
        default { "" }
    }
    $Script:BackupLogBox.AppendText("[$stamp] $prefix$Message`r`n")
    $Script:BackupLogBox.SelectionStart = $Script:BackupLogBox.Text.Length
    $Script:BackupLogBox.ScrollToCaret()
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
        Write-BackupLog "No .git folder in project root." -Level error
        [System.Windows.Forms.MessageBox]::Show(
            "This folder is not a Git repository.`nProject: $Script:ProjectRoot",
            "Git Commit",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
        return
    }

    $msg = "Backup $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-BackupLog "Staging all changes..."
    $add = Invoke-GitCommand -GitArgs @("add", "-A")
    if ($add.ExitCode -ne 0) {
        Write-BackupLog $(if ($add.Err) { $add.Err } else { $add.Out }) -Level error
        return
    }

    $status = Invoke-GitCommand -GitArgs @("status", "--porcelain")
    if ($status.ExitCode -ne 0) {
        Write-BackupLog $(if ($status.Err) { $status.Err } else { "git status failed" }) -Level error
        return
    }
    if (-not $status.Out) {
        Write-BackupLog "Nothing to commit - working tree clean." -Level warn
        [System.Windows.Forms.MessageBox]::Show(
            "No changes to commit.",
            "Git Commit",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null
        return
    }

    Write-BackupLog "Committing: $msg"
    $msgFile = Join-Path ([System.IO.Path]::GetTempPath()) "cmp600-commit-msg.txt"
    try {
        [System.IO.File]::WriteAllText($msgFile, $msg, [System.Text.UTF8Encoding]::new($false))
        $commit = Invoke-GitCommand -GitArgs @("commit", "-F", $msgFile)
    } finally {
        Remove-Item -LiteralPath $msgFile -Force -ErrorAction SilentlyContinue
    }
    if ($commit.ExitCode -ne 0) {
        Write-BackupLog $(if ($commit.Err) { $commit.Err } else { $commit.Out }) -Level error
        return
    }

    if ($commit.Out) {
        foreach ($line in ($commit.Out -split "`n")) {
            $t = $line.Trim()
            if ($t) { Write-BackupLog $t -Level ok }
        }
    }

    $hash = Invoke-GitCommand -GitArgs @("rev-parse", "--short", "HEAD")
    if ($hash.ExitCode -eq 0 -and $hash.Out) {
        Write-BackupLog "Commit created: $($hash.Out)" -Level ok
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
        Write-BackupLog "No .git folder in project root." -Level error
        return
    }

    $branch = (Invoke-GitCommand -GitArgs @("rev-parse", "--abbrev-ref", "HEAD")).Out
    if (-not $branch) { $branch = "main" }

    Write-BackupLog "Pushing to GitHub (origin $branch)..."
    $push = Invoke-GitCommand -GitArgs @("push", "origin", $branch)
    if ($push.ExitCode -ne 0) {
        Write-BackupLog $(if ($push.Err) { $push.Err } else { $push.Out }) -Level error
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
            if ($t) { Write-BackupLog $t -Level ok }
        }
    }
    if ($push.Err) {
        foreach ($line in ($push.Err -split "`n")) {
            $t = $line.Trim()
            if ($t) { Write-BackupLog $t -Level ok }
        }
    }

    Write-BackupLog "Push completed - GitHub is up to date." -Level ok
    [System.Windows.Forms.MessageBox]::Show(
        "Changes uploaded to GitHub.`nBranch: $branch",
        "Push to GitHub",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
}

function Invoke-GitArchive {
    if (-not (Test-Path (Join-Path $Script:ProjectRoot ".git"))) {
        Write-BackupLog "No .git folder in project root." -Level error
        return
    }

    if (-not (Test-Path $Script:SnapshotsDir)) {
        New-Item -ItemType Directory -Path $Script:SnapshotsDir -Force | Out-Null
    }

    $stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $hash = Invoke-GitCommand -GitArgs @("rev-parse", "--short", "HEAD")
    if ($hash.ExitCode -ne 0 -or -not $hash.Out) {
        Write-BackupLog "Cannot read HEAD commit." -Level error
        return
    }
    $short = $hash.Out

    $zipName = "CMP600_git_${short}_$stamp.zip"
    $zipPath = Join-Path $Script:SnapshotsDir $zipName
    if (Test-Path -LiteralPath $zipPath) {
        Write-BackupLog "ZIP already exists: $zipPath" -Level error
        return
    }

    Write-BackupLog "Git archive (HEAD $short) -> snapshots\$zipName"
    Write-BackupLog "Note: only committed files; uncommitted edits are not included."

    $arch = Invoke-GitCommand -GitArgs @(
        "archive",
        "--format=zip",
        "-o", $zipPath,
        "--prefix=CMP600_Dissertation_Project/",
        "HEAD"
    )
    if ($arch.ExitCode -ne 0) {
        Write-BackupLog $(if ($arch.Err) { $arch.Err } else { $arch.Out }) -Level error
        if (Test-Path -LiteralPath $zipPath) {
            Remove-Item -LiteralPath $zipPath -Force -ErrorAction SilentlyContinue
        }
        [System.Windows.Forms.MessageBox]::Show(
            "Git archive failed. See log.",
            "Git Archive",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
        return
    }

    if (-not (Test-Path -LiteralPath $zipPath)) {
        Write-BackupLog "Archive file was not created." -Level error
        return
    }

    $sizeMb = [math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 1)
    Write-BackupLog "Git archive done (~${sizeMb} MB)." -Level ok
    Write-BackupLog "ZIP: $zipPath" -Level ok
    [System.Windows.Forms.MessageBox]::Show(
        "Git archive saved (commit $short).`n~${sizeMb} MB`n`n$zipPath",
        "Git Archive",
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
        Write-BackupLog "ZIP already exists: $zipPath" -Level error
        return
    }

    $tempRoot = Join-Path $env:TEMP "cmp600-backup-$stamp"
    $tempCopy = Join-Path $tempRoot "CMP600_Dissertation_Project"
    if (Test-Path $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $tempCopy -Force | Out-Null

    Write-BackupLog "Local backup started -> snapshots\$zipName"
    Write-BackupLog "Copying project (excluding node_modules, dist, .git)..."

    $copy = Invoke-RobocopyMirror -Source $Script:ProjectRoot -Destination $tempCopy
    foreach ($line in (($copy.Out + "`n" + $copy.Err) -split "`n")) {
        $t = $line.Trim()
        if ($t) { Write-BackupLog $t }
    }
    if (-not $copy.Ok) {
        Write-BackupLog "Robocopy failed (exit $($copy.ExitCode))." -Level error
        Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
        [System.Windows.Forms.MessageBox]::Show(
            "Backup failed during file copy. See log.",
            "Local Backup",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
        return
    }

    Write-BackupLog "Creating ZIP archive..."
    try {
        if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
        Compress-Archive -LiteralPath $tempCopy -DestinationPath $zipPath -CompressionLevel Optimal
    } catch {
        Write-BackupLog $_.Exception.Message -Level error
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
    Write-BackupLog "Local backup done (~${sizeMb} MB)." -Level ok
    Write-BackupLog "ZIP: $zipPath" -Level ok
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

function Build-BackupControlTab {
    param([System.Windows.Forms.TabPage]$TabPage)

    $panel = New-Object System.Windows.Forms.Panel
    $panel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $panel.BackColor = [System.Drawing.Color]::FromArgb(245, 247, 250)
    $panel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    [void]$TabPage.Controls.Add($panel)

    $header = New-Object System.Windows.Forms.Label
    $header.Text = "Project backup"
    $header.Location = New-Object System.Drawing.Point(8, 8)
    $header.Size = New-Object System.Drawing.Size(560, 24)
    $header.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $panel.Controls.Add($header)

    $sub = New-Object System.Windows.Forms.Label
    $sub.Text = 'Git: commit then push  |  Backup: git archive (committed) or local folder ZIP'
    $sub.Location = New-Object System.Drawing.Point(8, 32)
    $sub.Size = New-Object System.Drawing.Size(560, 32)
    $sub.ForeColor = [System.Drawing.Color]::FromArgb(80, 90, 100)
    $panel.Controls.Add($sub)

    $grpGit = New-Object System.Windows.Forms.GroupBox
    $grpGit.Text = "Git (GitHub)"
    $grpGit.Location = New-Object System.Drawing.Point(4, 68)
    $grpGit.Size = New-Object System.Drawing.Size(572, 72)
    $panel.Controls.Add($grpGit)

    $btnGit = New-Button -Text "Git Commit" -X 16 -Y 24 -W 210 -H 40 -Style Green
    $btnPush = New-Button -Text "Push GitHub" -X 242 -Y 24 -W 210 -H 40 -Style Blue
    $grpGit.Controls.Add($btnGit)
    $grpGit.Controls.Add($btnPush)

    $grpBackup = New-Object System.Windows.Forms.GroupBox
    $grpBackup.Text = "Backup (snapshots ZIP)"
    $grpBackup.Location = New-Object System.Drawing.Point(4, 148)
    $grpBackup.Size = New-Object System.Drawing.Size(572, 118)
    $panel.Controls.Add($grpBackup)

    $btnArchive = New-Button -Text "Git Archive" -X 16 -Y 24 -W 210 -H 40 -Style Blue
    $btnLocal = New-Button -Text "Local ZIP" -X 242 -Y 24 -W 210 -H 40 -Style Blue
    $grpBackup.Controls.Add($btnArchive)
    $grpBackup.Controls.Add($btnLocal)

    $btnOpenSnapshots = New-Object System.Windows.Forms.Button
    $btnOpenSnapshots.Text = "Open snapshots folder"
    $btnOpenSnapshots.Location = New-Object System.Drawing.Point(16, 72)
    $btnOpenSnapshots.Size = New-Object System.Drawing.Size(536, 28)
    $btnOpenSnapshots.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $grpBackup.Controls.Add($btnOpenSnapshots)

    $logPanel = New-Object System.Windows.Forms.Panel
    $logPanel.Dock = [System.Windows.Forms.DockStyle]::Bottom
    $logPanel.Height = 200
    $panel.Controls.Add($logPanel)

    $logLabel = New-Object System.Windows.Forms.Label
    $logLabel.Text = "Log"
    $logLabel.Dock = [System.Windows.Forms.DockStyle]::Top
    $logLabel.Height = 22
    $logPanel.Controls.Add($logLabel)

    $btnClear = New-Object System.Windows.Forms.Button
    $btnClear.Text = "Clear log"
    $btnClear.Location = New-Object System.Drawing.Point(452, 0)
    $btnClear.Size = New-Object System.Drawing.Size(112, 24)
    $btnClear.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $logPanel.Controls.Add($btnClear)

    $Script:BackupLogBox = New-Object System.Windows.Forms.TextBox
    $Script:BackupLogBox.Multiline = $true
    $Script:BackupLogBox.ReadOnly = $true
    $Script:BackupLogBox.ScrollBars = "Vertical"
    $Script:BackupLogBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $Script:BackupLogBox.Font = New-Object System.Drawing.Font("Consolas", 8.5)
    $Script:BackupLogBox.BackColor = [System.Drawing.Color]::FromArgb(30, 34, 40)
    $Script:BackupLogBox.ForeColor = [System.Drawing.Color]::FromArgb(220, 230, 240)
    $logPanel.Controls.Add($Script:BackupLogBox)

    $actionButtons = @($btnGit, $btnPush, $btnArchive, $btnLocal, $btnOpenSnapshots)

    $btnGit.Add_Click({
        if ($Script:Busy) { return }
        Set-Busy -IsBusy $true -Buttons $actionButtons
        try { Invoke-GitCommit } catch { Write-BackupLog $_.Exception.Message -Level error }
        finally { Set-Busy -IsBusy $false -Buttons $actionButtons }
    })

    $btnPush.Add_Click({
        if ($Script:Busy) { return }
        Set-Busy -IsBusy $true -Buttons $actionButtons
        try { Invoke-GitPush } catch { Write-BackupLog $_.Exception.Message -Level error }
        finally { Set-Busy -IsBusy $false -Buttons $actionButtons }
    })

    $btnArchive.Add_Click({
        if ($Script:Busy) { return }
        Set-Busy -IsBusy $true -Buttons $actionButtons
        try { Invoke-GitArchive } catch { Write-BackupLog $_.Exception.Message -Level error }
        finally { Set-Busy -IsBusy $false -Buttons $actionButtons }
    })

    $btnLocal.Add_Click({
        if ($Script:Busy) { return }
        Set-Busy -IsBusy $true -Buttons $actionButtons
        try { Invoke-LocalBackup } catch { Write-BackupLog $_.Exception.Message -Level error }
        finally { Set-Busy -IsBusy $false -Buttons $actionButtons }
    })

    $btnOpenSnapshots.Add_Click({
        if (-not (Test-Path $Script:SnapshotsDir)) {
            New-Item -ItemType Directory -Path $Script:SnapshotsDir -Force | Out-Null
        }
        Start-Process "explorer.exe" -ArgumentList "`"$Script:SnapshotsDir`""
    })

    $btnClear.Add_Click({ $Script:BackupLogBox.Clear() })

    Write-BackupLog "Backup tab ready."
    Write-BackupLog "Project: $Script:ProjectRoot"
    if (Get-GitExe) {
        Write-BackupLog "Git: found"
    } else {
        Write-BackupLog "Git: NOT FOUND" -Level error
    }
    Write-BackupLog "Snapshots: $Script:SnapshotsDir"
}
