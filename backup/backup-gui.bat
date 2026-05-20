@echo off
cd /d "%~dp0\.."
wscript.exe //nologo "%~dp0..\cmp600-control.vbs"
exit /b 0
