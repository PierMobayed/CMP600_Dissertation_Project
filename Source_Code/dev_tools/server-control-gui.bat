@echo off
REM Opens CMP600 Control GUI (same as CMP600 Control.lnk)
cd /d "%~dp0\..\.."

if exist "%~dp0\..\..\CMP600 Control.lnk" (
  start "" "%~dp0\..\..\CMP600 Control.lnk"
) else (
  wscript.exe //nologo "%~dp0cmp600-control.vbs"
)
exit /b 0
