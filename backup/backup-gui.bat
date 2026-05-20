@echo off
REM Legacy - opens CMP600 Control (shortcut or dev_tools launcher)
cd /d "%~dp0\.."
if exist "%~dp0..\CMP600 Control.lnk" (
  start "" "%~dp0..\CMP600 Control.lnk"
) else (
  call "%~dp0..\Source_Code\dev_tools\server-control-gui.bat"
)
exit /b 0
