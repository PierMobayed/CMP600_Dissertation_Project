# CMP600 Server Control tab (dot-sourced from cmp600-control.ps1)
#Requires -Version 5.1

function Initialize-ServerControlModule {
    param([string]$ProjectRoot)
    $Script:ProjectRoot = $ProjectRoot
    $Script:Backend     = Join-Path $ProjectRoot "Source_Code\backend"
    $Script:SourceRoot  = Join-Path $ProjectRoot "Source_Code"
    $Script:ServerLogBox = $null
    $Script:Processes   = @{}
    $Script:ActionButtons = [System.Collections.Generic.List[System.Windows.Forms.Button]]::new()
    $Script:Busy        = $false
    $Script:Ports = @{
        API       = 8000
        Dashboard = 5173
        Client    = 5174
        Driver    = 5175
    }
    $Script:Urls = @{
        API       = "http://127.0.0.1:8000/docs"
        Dashboard = "http://127.0.0.1:5173"
        Client    = "http://127.0.0.1:5174"
        Driver    = "http://127.0.0.1:5175"
    }
    Initialize-Environment
}

function Initialize-Environment {
    # WScript/.vbs launch often gets a minimal PATH - merge User + Machine paths
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($machinePath -and $userPath) {
        $env:Path = "$machinePath;$userPath"
    } elseif ($machinePath) {
        $env:Path = $machinePath
    } elseif ($userPath) {
        $env:Path = $userPath
    }

    $py = Get-Command python.exe -ErrorAction SilentlyContinue |
        Where-Object { $_.Source -notmatch '\\WindowsApps\\' } |
        Select-Object -First 1
    if (-not $py) {
        $pyGuess = Get-ChildItem -Path @(
            "$env:LOCALAPPDATA\Programs\Python\Python*\python.exe",
            "C:\Program Files\Python*\python.exe"
        ) -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
        if ($pyGuess) { $Script:PythonExe = $pyGuess.FullName }
    } else {
        $Script:PythonExe = $py.Source
    }

    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $npm) {
        $npmGuess = @(
            "$env:ProgramFiles\nodejs\npm.cmd",
            "${env:ProgramFiles(x86)}\nodejs\npm.cmd"
        ) | Where-Object { Test-Path $_ } | Select-Object -First 1
        if ($npmGuess) { $Script:NpmCmd = $npmGuess }
    } else {
        $Script:NpmCmd = $npm.Source
    }

    $Script:CmdExe = "$env:ComSpec"
    if (-not $Script:CmdExe) { $Script:CmdExe = "$env:SystemRoot\System32\cmd.exe" }
}

function Write-ServerLog {
    param(
        [string]$Message,
        [string]$Tag = "",
        [string]$Level = "info"
    )
    if ([string]::IsNullOrWhiteSpace($Message)) {
        $Message = "(no message)"
    }
    if (-not $Script:ServerLogBox) { return }
    $ts = Get-Date -Format "HH:mm:ss"
    $levelMark = switch ($Level) {
        "error"   { "!" }
        "success" { "+" }
        "warn"    { "~" }
        default   { " " }
    }
    $tagPart = if ($Tag) { "[$Tag] " } else { "" }
    $Script:ServerLogBox.AppendText("$ts $levelMark $tagPart$Message`r`n")
    $Script:ServerLogBox.SelectionStart = $Script:ServerLogBox.Text.Length
    $Script:ServerLogBox.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

function Write-ErrorDetail {
    param(
        [string]$Context,
        [System.Management.Automation.ErrorRecord]$ErrorRecord
    )
    $msg = if ($ErrorRecord.Exception.Message) { $ErrorRecord.Exception.Message } else { $ErrorRecord.ToString() }
    Write-ServerLog "$Context : $msg" -Level error
}

function Test-BackendExists {
    $main = Join-Path $Script:Backend "app\main.py"
    if (-not (Test-Path $main)) {
        Write-ServerLog "Cannot find: $main" -Level error
        [System.Windows.Forms.MessageBox]::Show(
            "Backend not found:`n$main",
            "CMP600 Server Control",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
        return $false
    }
    return $true
}

function Test-FrontendsExist {
    $dash = Join-Path $Script:SourceRoot "dashboard\package.json"
    if (-not (Test-Path $dash)) {
        Write-ServerLog "Frontends not found under: $Script:SourceRoot" -Level error
        [System.Windows.Forms.MessageBox]::Show(
            "Frontends not found under:`n$Script:SourceRoot",
            "CMP600 Server Control",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
        return $false
    }
    return $true
}

function Test-PortListening {
    param([int]$Port)
    $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-Port {
    param(
        [int]$Port,
        [string]$Tag,
        [int]$Seconds = 12
    )
    for ($i = 0; $i -lt $Seconds; $i++) {
        if (Test-PortListening -Port $Port) {
            Write-ServerLog "Listening on port $Port" -Tag $Tag -Level success
            return $true
        }
        Start-Sleep -Seconds 1
        [System.Windows.Forms.Application]::DoEvents()
    }
    Write-ServerLog "Port $Port not ready yet (service may still be starting)" -Tag $Tag -Level warn
    return $false
}

function Invoke-HiddenCommand {
    param(
        [string]$Tag,
        [string]$FileName,
        [string]$Arguments,
        [string]$WorkingDirectory
    )
    Write-ServerLog "$FileName $Arguments" -Tag $Tag
    try {
        $proc = Start-Process -FilePath $FileName -ArgumentList $Arguments `
            -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru -Wait
        if ($proc.ExitCode -ne 0) {
            Write-ServerLog "Command exited with code $($proc.ExitCode)" -Tag $Tag -Level warn
        }
        [System.Windows.Forms.Application]::DoEvents()
        return $proc.ExitCode
    } catch {
        Write-ServerLog "Command failed: $($_.Exception.Message)" -Tag $Tag -Level error
        throw
    }
}

function Start-HiddenService {
    param(
        [string]$Key,
        [string]$Tag,
        [string]$FileName,
        [string]$Arguments,
        [string]$WorkingDirectory,
        [int]$Port
    )

    if ($Script:Processes[$Key] -and -not $Script:Processes[$Key].HasExited) {
        Write-ServerLog "Already running (PID $($Script:Processes[$Key].Id))" -Tag $Tag -Level warn
        return
    }
    if (Test-PortListening -Port $Port) {
        Write-ServerLog "Port $Port is already in use" -Tag $Tag -Level warn
        return
    }

    try {
        Write-ServerLog "Launching process..." -Tag $Tag
        $proc = Start-Process -FilePath $FileName -ArgumentList $Arguments `
            -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru
        $Script:Processes[$Key] = $proc
        Write-ServerLog "Started PID $($proc.Id)" -Tag $Tag -Level success
        Wait-Port -Port $Port -Tag $Tag | Out-Null
    } catch {
        Write-ServerLog "Failed to start: $($_.Exception.Message)" -Tag $Tag -Level error
    }
}

function Stop-TrackedProcess {
    param([string]$Key, [string]$Tag = $Key)
    if ($Script:Processes[$Key] -and -not $Script:Processes[$Key].HasExited) {
        $procId = $Script:Processes[$Key].Id
        Write-ServerLog "Stopping tracked process PID $procId" -Tag $Tag -Level warn
        try {
            $Script:Processes[$Key].Kill()
            $Script:Processes[$Key].WaitForExit(3000)
        } catch {
            Write-ServerLog "Kill failed: $($_.Exception.Message)" -Tag $Tag -Level warn
        }
        $Script:Processes.Remove($Key)
    }
}

function Stop-Ports {
    param(
        [int[]]$PortList,
        [string[]]$Keys = @()
    )
    foreach ($key in $Keys) {
        Stop-TrackedProcess -Key $key
    }
    foreach ($port in $PortList) {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if (-not $conns) {
            Write-ServerLog "Nothing listening on port $port"
            continue
        }
        $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $procIds) {
            Write-ServerLog "Stopping PID $procId on port $port" -Level warn
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
    Write-ServerLog "Stop complete." -Level success
}

function Set-ActionButtonsEnabled {
    param([bool]$Enabled)
    foreach ($btn in $Script:ActionButtons) {
        if ($btn) { $btn.Enabled = $Enabled }
    }
    [System.Windows.Forms.Application]::DoEvents()
}

function Start-ApiCore {
    $tag = "API"
    if (-not $Script:PythonExe) {
        Write-ServerLog "Python not found. Install Python 3." -Tag $tag -Level error
        return
    }
    if ($Script:Processes.API -and -not $Script:Processes.API.HasExited) {
        Write-ServerLog "API is already running" -Tag $tag -Level warn
        return
    }
    Write-ServerLog "Using: $Script:PythonExe" -Tag $tag
    Write-ServerLog "Installing Python dependencies..." -Tag $tag
    [void](Invoke-HiddenCommand -Tag $tag -FileName $Script:PythonExe `
        -Arguments "-m pip install -r requirements.txt -q" `
        -WorkingDirectory $Script:Backend)
    Start-HiddenService -Key "API" -Tag $tag `
        -FileName $Script:PythonExe `
        -Arguments "-m uvicorn app.main:app --host 127.0.0.1 --port 8000" `
        -WorkingDirectory $Script:Backend `
        -Port $Script:Ports.API
    Write-ServerLog "Docs: $($Script:Urls.API)" -Tag $tag
}

function Start-Api {
    if (-not (Test-BackendExists)) { return }
    Set-ActionButtonsEnabled $false
    try {
        Start-ApiCore
    } catch {
        Write-ErrorDetail -Context "Start API failed" -ErrorRecord $_
    } finally {
        Set-ActionButtonsEnabled $true
    }
}

function Start-FrontendCore {
    param(
        [string]$Key,
        [string]$FolderName
    )
    $tag = $Key
    $dir = Join-Path $Script:SourceRoot $FolderName
    $port = $Script:Ports[$Key]

    if ($Script:Processes[$Key] -and -not $Script:Processes[$Key].HasExited) {
        Write-ServerLog "$tag is already running" -Tag $tag -Level warn
        return
    }

    if (-not $Script:NpmCmd) {
        Write-ServerLog "npm not found. Install Node.js (nodejs.org) and restart this app." -Tag $tag -Level error
        return
    }
    $npmQuoted = "`"$Script:NpmCmd`""
    Write-ServerLog "Using: $Script:NpmCmd" -Tag $tag
    Write-ServerLog "Running npm install (first time may take a minute)..." -Tag $tag
    [void](Invoke-HiddenCommand -Tag $tag -FileName $Script:CmdExe `
        -Arguments "/c $npmQuoted install --no-fund --no-audit" `
        -WorkingDirectory $dir)

    Start-HiddenService -Key $Key -Tag $tag `
        -FileName $Script:CmdExe `
        -Arguments "/c $npmQuoted run dev" `
        -WorkingDirectory $dir `
        -Port $port
    Write-ServerLog "URL: $($Script:Urls[$Key])" -Tag $tag
}

function Start-Frontend {
    param([string]$Key, [string]$FolderName)
    if (-not (Test-FrontendsExist)) { return }
    Set-ActionButtonsEnabled $false
    try {
        Start-FrontendCore -Key $Key -FolderName $FolderName
    } catch {
        Write-ErrorDetail -Context "Start $Key failed" -ErrorRecord $_
    } finally {
        Set-ActionButtonsEnabled $true
    }
}

function Start-Dashboard { Start-Frontend -Key "Dashboard" -FolderName "dashboard" }
function Start-ClientApp { Start-Frontend -Key "Client" -FolderName "client_app" }
function Start-DriverApp  { Start-Frontend -Key "Driver" -FolderName "driver_app" }

function Start-AllServices {
    if (-not (Test-BackendExists)) { return }
    if (-not (Test-FrontendsExist)) { return }
    Set-ActionButtonsEnabled $false
    try {
        Write-ServerLog "Starting all services..." -Level success
        Start-ApiCore
        Start-Sleep -Seconds 2
        Start-FrontendCore -Key "Dashboard" -FolderName "dashboard"
        Start-FrontendCore -Key "Client" -FolderName "client_app"
        Start-FrontendCore -Key "Driver" -FolderName "driver_app"
        Write-ServerLog "Done. Open browser when ports show Listening." -Level success
    } catch {
        Write-ErrorDetail -Context "Start ALL failed" -ErrorRecord $_
    } finally {
        Set-ActionButtonsEnabled $true
    }
}

function Open-AllBrowsers {
    foreach ($pair in $Script:Urls.GetEnumerator()) {
        Start-Process $pair.Value
        Write-ServerLog "Opened: $($pair.Value)" -Tag $pair.Key
    }
}

function Stop-AllServices {
    Stop-Ports -PortList @(8000, 5173, 5174, 5175) -Keys @("API", "Dashboard", "Client", "Driver")
}

function Set-FormIcon {
    param([System.Windows.Forms.Form]$TargetForm)
    $iconIco = Join-Path $Script:ProjectRoot "Source_Code\assets\favicon-server-control.ico"
    try {
        if (Test-Path $iconIco) {
            $TargetForm.Icon = New-Object System.Drawing.Icon($iconIco)
        }
    } catch {
        # LogBox not ready yet at form init
    }
}

function Build-ServerControlTab {
    param([System.Windows.Forms.TabPage]$TabPage)

    $panel = New-Object System.Windows.Forms.Panel
    $panel.Dock = [System.Windows.Forms.DockStyle]::Fill
    $panel.BackColor = [System.Drawing.Color]::FromArgb(245, 247, 250)
    $panel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    [void]$TabPage.Controls.Add($panel)

    $header = New-Object System.Windows.Forms.Label
    $header.Text = "API + Dashboard + Client + Driver"
    $header.Location = New-Object System.Drawing.Point(8, 8)
    $header.Size = New-Object System.Drawing.Size(580, 22)
    $header.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
    $panel.Controls.Add($header)

    $portsLabel = New-Object System.Windows.Forms.Label
    $portsLabel.Text = "Ports: API :8000  |  Dashboard :5173  |  Client :5174  |  Driver :5175"
    $portsLabel.Location = New-Object System.Drawing.Point(8, 32)
    $portsLabel.Size = New-Object System.Drawing.Size(580, 18)
    $portsLabel.ForeColor = [System.Drawing.Color]::FromArgb(80, 90, 100)
    $panel.Controls.Add($portsLabel)

    function New-ServerButton {
    param(
        [string]$Text,
        [int]$X,
        [int]$Y,
        [int]$W = 140,
        [int]$H = 36,
        [System.Windows.Forms.Control]$Parent = $null,
        [ValidateSet("Green", "Red", "Blue")]
        [string]$Style = ""
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
        "Red" {
            $btn.BackColor = [System.Drawing.Color]::FromArgb(192, 57, 43)
            $btn.ForeColor = [System.Drawing.Color]::White
            $btn.FlatAppearance.BorderSize = 0
        }
        "Blue" {
            $btn.BackColor = [System.Drawing.Color]::FromArgb(41, 98, 168)
            $btn.ForeColor = [System.Drawing.Color]::White
            $btn.FlatAppearance.BorderSize = 0
        }
    }
    [void]$Parent.Controls.Add($btn)
        return $btn
    }

    $grpMain = New-Object System.Windows.Forms.GroupBox
    $grpMain.Text = "Quick actions"
    $grpMain.Location = New-Object System.Drawing.Point(4, 56)
    $grpMain.Size = New-Object System.Drawing.Size(580, 88)
    $panel.Controls.Add($grpMain)

    $btnStartAll = New-ServerButton -Text "Start ALL" -X 16 -Y 28 -W 270 -H 44 -Parent $grpMain -Style Green
    if ($btnStartAll) { [void]$Script:ActionButtons.Add($btnStartAll) }

    $btnStopAll = New-ServerButton -Text "Stop ALL" -X 300 -Y 28 -W 270 -H 44 -Parent $grpMain -Style Red

    $grpApi = New-Object System.Windows.Forms.GroupBox
    $grpApi.Text = "API (port 8000)"
    $grpApi.Location = New-Object System.Drawing.Point(4, 152)
    $grpApi.Size = New-Object System.Drawing.Size(280, 72)
    $panel.Controls.Add($grpApi)

    $btnStartApi = New-ServerButton -Text "Start API" -X 12 -Y 26 -W 125 -H 32 -Parent $grpApi
    if ($btnStartApi) { [void]$Script:ActionButtons.Add($btnStartApi) }
    $btnStopApi = New-ServerButton -Text "Stop API" -X 145 -Y 26 -W 125 -H 32 -Parent $grpApi

    $grpFe = New-Object System.Windows.Forms.GroupBox
    $grpFe.Text = "Frontends (5173-5175)"
    $grpFe.Location = New-Object System.Drawing.Point(292, 152)
    $grpFe.Size = New-Object System.Drawing.Size(292, 130)
    $panel.Controls.Add($grpFe)

    $btnDash = New-ServerButton -Text "Dashboard" -X 12 -Y 26 -W 130 -H 30 -Parent $grpFe
    if ($btnDash) { [void]$Script:ActionButtons.Add($btnDash) }
    $btnClient = New-ServerButton -Text "Client" -X 152 -Y 26 -W 130 -H 30 -Parent $grpFe
    if ($btnClient) { [void]$Script:ActionButtons.Add($btnClient) }
    $btnDriver = New-ServerButton -Text "Driver" -X 12 -Y 62 -W 130 -H 30 -Parent $grpFe
    if ($btnDriver) { [void]$Script:ActionButtons.Add($btnDriver) }
    $btnStopFe = New-ServerButton -Text "Stop all FE" -X 152 -Y 62 -W 130 -H 30 -Parent $grpFe

    $btnOpenBrowser = New-ServerButton -Text "Open all in browser" -X 4 -Y 292 -W 580 -H 36 -Parent $panel -Style Blue

    $logPanel = New-Object System.Windows.Forms.Panel
    $logPanel.Dock = [System.Windows.Forms.DockStyle]::Bottom
    $logPanel.Height = 220
    $panel.Controls.Add($logPanel)

    $logLabel = New-Object System.Windows.Forms.Label
    $logLabel.Text = "Server output (all services)"
    $logLabel.Dock = [System.Windows.Forms.DockStyle]::Top
    $logLabel.Height = 22
    $logPanel.Controls.Add($logLabel)

    $btnClearLog = New-ServerButton -Text "Clear log" -X 460 -Y 0 -W 112 -H 24 -Parent $logPanel
    $btnClearLog.Add_Click({ $Script:ServerLogBox.Clear() })

    $Script:ServerLogBox = New-Object System.Windows.Forms.TextBox
    $Script:ServerLogBox.Multiline = $true
    $Script:ServerLogBox.ReadOnly = $true
    $Script:ServerLogBox.ScrollBars = "Vertical"
    $Script:ServerLogBox.Dock = [System.Windows.Forms.DockStyle]::Fill
    $Script:ServerLogBox.Font = New-Object System.Drawing.Font("Consolas", 8.5)
    $Script:ServerLogBox.BackColor = [System.Drawing.Color]::FromArgb(30, 34, 40)
    $Script:ServerLogBox.ForeColor = [System.Drawing.Color]::FromArgb(220, 230, 240)
    $Script:ServerLogBox.WordWrap = $false
    $logPanel.Controls.Add($Script:ServerLogBox)

    $btnStartAll.Add_Click({
        try { Start-AllServices } catch { Write-ServerLog $_.Exception.Message -Level error }
    })
    $btnStopAll.Add_Click({
        Write-ServerLog "Stopping all services..."
        Stop-AllServices
    })
    $btnStartApi.Add_Click({
        try { Start-Api } catch { Write-ServerLog $_.Exception.Message -Level error }
    })
    $btnStopApi.Add_Click({
        Write-ServerLog "Stopping API..."
        Stop-Ports -PortList @(8000) -Keys @("API")
    })
    $btnDash.Add_Click({
        try { Start-Dashboard } catch { Write-ServerLog $_.Exception.Message -Level error }
    })
    $btnClient.Add_Click({
        try { Start-ClientApp } catch { Write-ServerLog $_.Exception.Message -Level error }
    })
    $btnDriver.Add_Click({
        try { Start-DriverApp } catch { Write-ServerLog $_.Exception.Message -Level error }
    })
    $btnStopFe.Add_Click({
        Write-ServerLog "Stopping frontends..."
        Stop-Ports -PortList @(5173, 5174, 5175) -Keys @("Dashboard", "Client", "Driver")
    })
    $btnOpenBrowser.Add_Click({ Open-AllBrowsers })

    Write-ServerLog "Servers tab ready."
    Write-ServerLog "Project: $Script:ProjectRoot"
    if ($Script:PythonExe) {
        Write-ServerLog "Python: $Script:PythonExe"
    } else {
        Write-ServerLog "Python: NOT FOUND - API cannot start" -Level error
    }
    if ($Script:NpmCmd) {
        Write-ServerLog "npm: $Script:NpmCmd"
    } else {
        Write-ServerLog "npm: NOT FOUND - frontends cannot start" -Level error
    }
}

function Test-ServerControlRunning {
    @($Script:Processes.Values | Where-Object { $_ -and -not $_.HasExited }).Count -gt 0
}

function Stop-ServerControlCleanup {
    foreach ($key in @($Script:Processes.Keys)) {
        Stop-TrackedProcess -Key $key
    }
}
