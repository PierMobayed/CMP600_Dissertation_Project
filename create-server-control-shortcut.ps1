# Legacy name - creates CMP600 Control.lnk via dev_tools script
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $here "Source_Code\dev_tools\create-desktop-shortcut.ps1")
