# Creates CMP600 Control.lnk in project root (custom icon; .bat cannot have favicons in Explorer)
$ErrorActionPreference = "Stop"
$devTools = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path (Join-Path $devTools "..\..")).Path
$iconIco = Join-Path $root "Source_Code\assets\favicon-server-control.ico"
$launcher = Join-Path $devTools "cmp600-control.vbs"

if (-not (Test-Path $launcher)) {
    Write-Error "Missing cmp600-control.vbs in dev_tools."
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
Write-Host "Launcher: $launcher"
