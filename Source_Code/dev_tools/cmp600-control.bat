@echo off
cd /d "%~dp0\..\.."

if not exist "%~dp0\..\..\CMP600 Control.lnk" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-desktop-shortcut.ps1" >nul 2>&1
)

wscript.exe //nologo "%~dp0cmp600-control.vbs"
exit /b 0
