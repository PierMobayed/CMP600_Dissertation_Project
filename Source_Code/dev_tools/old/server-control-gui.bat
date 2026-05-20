@echo off

cd /d "%~dp0"

REM Use "CMP600 Server Control.lnk" for custom icon (.bat files cannot have favicons in Explorer)

if not exist "%~dp0CMP600 Server Control.lnk" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-server-control-shortcut.ps1" >nul 2>&1
)

wscript.exe //nologo "%~dp0server-control-gui.vbs"

exit /b 0

