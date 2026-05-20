@echo off
cd /d "%~dp0"
wscript.exe //nologo "%~dp0backup-gui.vbs"
exit /b 0
