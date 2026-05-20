# CMP600 Control - unified Servers + Backup/Git GUI
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

$Script:ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Script:DevToolsDir   = Join-Path $Script:ProjectRoot "Source_Code\dev_tools"

. (Join-Path $Script:DevToolsDir "ServerControl.ps1")
. (Join-Path $Script:DevToolsDir "BackupControl.ps1")

Initialize-ServerControlModule -ProjectRoot $Script:ProjectRoot
Initialize-BackupControlModule -ProjectRoot $Script:ProjectRoot -DevToolsDir $Script:DevToolsDir

function Set-MainFormIcon {
    param([System.Windows.Forms.Form]$TargetForm)
    $iconIco = Join-Path $Script:ProjectRoot "Source_Code\assets\favicon-server-control.ico"
    try {
        if (Test-Path $iconIco) {
            $TargetForm.Icon = New-Object System.Drawing.Icon($iconIco)
        }
    } catch { }
}

function Invoke-CreateDesktopShortcut {
    $script = Join-Path $Script:DevToolsDir "create-desktop-shortcut.ps1"
    if (-not (Test-Path $script)) {
        [System.Windows.Forms.MessageBox]::Show(
            "Missing: $script",
            "CMP600 Control",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
        return
    }
    try {
        & $script
        [System.Windows.Forms.MessageBox]::Show(
            "Shortcut created in project folder:`nCMP600 Control.lnk`n`nCopy to Desktop if needed.",
            "CMP600 Control",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        ) | Out-Null
    } catch {
        [System.Windows.Forms.MessageBox]::Show(
            $_.Exception.Message,
            "CMP600 Control",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        ) | Out-Null
    }
}

$form = New-Object System.Windows.Forms.Form
$form.Text = "CMP600 Control"
Set-MainFormIcon -TargetForm $form
$form.Size = New-Object System.Drawing.Size(640, 640)
$form.MinimumSize = New-Object System.Drawing.Size(580, 580)
$form.StartPosition = "CenterScreen"
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.BackColor = [System.Drawing.Color]::FromArgb(245, 247, 250)

$footer = New-Object System.Windows.Forms.Panel
$footer.Dock = [System.Windows.Forms.DockStyle]::Bottom
$footer.Height = 40
$form.Controls.Add($footer)

$btnShortcut = New-Object System.Windows.Forms.Button
$btnShortcut.Text = "Create shortcut (.lnk)"
$btnShortcut.Location = New-Object System.Drawing.Point(12, 6)
$btnShortcut.Size = New-Object System.Drawing.Size(180, 28)
$btnShortcut.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$btnShortcut.Add_Click({ Invoke-CreateDesktopShortcut })
$footer.Controls.Add($btnShortcut)

$lblFooter = New-Object System.Windows.Forms.Label
$lblFooter.Text = "Console menu: Source_Code\dev_tools\server-control.bat"
$lblFooter.Location = New-Object System.Drawing.Point(200, 10)
$lblFooter.Size = New-Object System.Drawing.Size(420, 20)
$lblFooter.ForeColor = [System.Drawing.Color]::FromArgb(80, 90, 100)
$footer.Controls.Add($lblFooter)

$tabs = New-Object System.Windows.Forms.TabControl
$tabs.Dock = [System.Windows.Forms.DockStyle]::Fill
$form.Controls.Add($tabs)
$tabs.BringToFront()

$tabServers = New-Object System.Windows.Forms.TabPage
$tabServers.Text = "Servers"
[void]$tabs.TabPages.Add($tabServers)

$tabBackup = New-Object System.Windows.Forms.TabPage
$tabBackup.Text = "Backup and Git"
[void]$tabs.TabPages.Add($tabBackup)

Build-ServerControlTab -TabPage $tabServers
Build-BackupControlTab -TabPage $tabBackup

$form.Add_FormClosing({
    if (-not (Test-ServerControlRunning)) { return }
    $answer = [System.Windows.Forms.MessageBox]::Show(
        "Stop all running servers before closing?",
        "CMP600 Control",
        [System.Windows.Forms.MessageBoxButtons]::YesNoCancel,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    if ($answer -eq [System.Windows.Forms.DialogResult]::Cancel) {
        $_.Cancel = $true
    } elseif ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
        Stop-AllServices
    }
})

[void]$form.ShowDialog()
Stop-ServerControlCleanup
