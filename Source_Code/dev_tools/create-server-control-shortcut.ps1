# Alias - same as create-desktop-shortcut.ps1
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $here "create-desktop-shortcut.ps1")
