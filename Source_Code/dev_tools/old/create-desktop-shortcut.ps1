# Creates CMP600 Control shortcut with custom icon (.bat files cannot have favicons in Explorer)
$ErrorActionPreference = "Stop"
$devTools = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent (Split-Path -Parent $devTools)
$iconIco = Join-Path $root "Source_Code\assets\favicon-server-control.ico"
$launcher = Join-Path $root "cmp600-control.vbs"

if (-not (Test-Path $launcher)) {
    Write-Error "Missing cmp600-control.vbs in project root."
}

if (-not (Test-Path $iconIco)) {
    Write-Warning "Icon not found: $iconIco"
}

$shortcutPath = Join-Path $root "CMP600 Control.lnk"
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($shortcutPath)
$lnk.TargetPath = $env:WinDir + "\System32\wscript.exe"
$lnk.Arguments = "//nologo `"$launcher`""
$lnk.WorkingDirectory = $root
$lnk.Description = "CMP600 Control - servers, backup, and Git"
if (Test-Path $iconIco) {
    $lnk.IconLocation = "$iconIco,0"
}
$lnk.Save()
Write-Host "Created: $shortcutPath"
Write-Host "Use this shortcut for the custom icon in Explorer."
