@echo off
REM Console menu lives in Source_Code\dev_tools
call "%~dp0Source_Code\dev_tools\server-control.bat" %*
exit /b %ERRORLEVEL%
