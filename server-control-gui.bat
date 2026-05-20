@echo off
REM Legacy launcher - opens unified CMP600 Control GUI
cd /d "%~dp0"
wscript.exe //nologo "%~dp0cmp600-control.vbs"
exit /b 0
