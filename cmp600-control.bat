@echo off
cd /d "%~dp0"

if not exist "%~dp0CMP600 Control.lnk" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Source_Code\dev_tools\create-desktop-shortcut.ps1" >nul 2>&1
)

wscript.exe //nologo "%~dp0cmp600-control.vbs"
exit /b 0
