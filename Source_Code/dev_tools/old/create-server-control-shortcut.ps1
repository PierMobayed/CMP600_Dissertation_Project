# Creates a desktop shortcut with the CMP600 Server Control icon (.bat files cannot have custom icons)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$iconIco = Join-Path $root "Source_Code\assets\favicon-server-control.ico"
$launcher = Join-Path $root "server-control-gui.vbs"

if (-not (Test-Path $launcher)) {
    Write-Error "Missing server-control-gui.vbs"
}

if (-not (Test-Path $iconIco)) {
    Write-Warning "Icon not found: $iconIco"
}

$shortcutPath = Join-Path $root "CMP600 Server Control.lnk"
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($shortcutPath)
$lnk.TargetPath = $env:WinDir + "\System32\wscript.exe"
$lnk.Arguments = "//nologo `"$launcher`""
$lnk.WorkingDirectory = $root
$lnk.Description = "CMP600 Server Control - start API and frontends"
if (Test-Path $iconIco) {
    $lnk.IconLocation = "$iconIco,0"
}
$lnk.Save()
Write-Host "Created: $shortcutPath"
Write-Host "Use this shortcut instead of .bat for the custom icon in Explorer."
