@echo off
setlocal EnableExtensions
cd /d "%~dp0\..\.."

set "BACKEND=%~dp0..\backend"
set "ROOT=%~dp0.."

:menu
echo.
echo === CMP600 - API + Dashboard + Client + Driver ===
echo   API:8000  Dashboard:5173  Client:5174  Driver:5175
echo.
echo [1] Start ALL        API + 3 frontends ^(4 new windows^)
echo [2] Stop ALL         free ports 8000, 5173, 5174, 5175
echo.
echo [3] Start API only   ^(8000^)
echo [4] Start Dashboard  ^(5173^)
echo [5] Start Client     ^(5174^)
echo [6] Start Driver     ^(5175^)
echo [7] Stop API only    ^(8000^)
echo [8] Stop frontends   ^(5173-5175^)
echo.
echo [9] Open in browser  docs + 3 apps
echo [0] Exit
echo.
set /p CHOICE=Select option: 

if "%CHOICE%"=="1" goto start_all
if "%CHOICE%"=="2" goto stop_all
if "%CHOICE%"=="3" goto start_backend
if "%CHOICE%"=="4" goto start_dashboard
if "%CHOICE%"=="5" goto start_client
if "%CHOICE%"=="6" goto start_driver
if "%CHOICE%"=="7" goto stop_backend
if "%CHOICE%"=="8" goto stop_frontends
if "%CHOICE%"=="9" goto open_pages
if "%CHOICE%"=="0" goto eof
echo Invalid choice.
goto menu

:start_all
if not exist "%BACKEND%\app\main.py" (
  echo ERROR: Cannot find "%BACKEND%\app\main.py"
  pause
  goto menu
)
if not exist "%ROOT%\dashboard\package.json" (
  echo ERROR: Cannot find frontends under "%ROOT%"
  pause
  goto menu
)
echo Starting API, then three Vite dev servers ^(npm install may take a minute the first time^)...
start "CMP600 API" cmd /k "cd /d ""%BACKEND%"" && python -m pip install -r requirements.txt -q && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
timeout /t 3 /nobreak >nul
start "CMP600 Dashboard" cmd /k "cd /d ""%ROOT%\dashboard"" && npm install --no-fund --no-audit && npm run dev"
start "CMP600 Client" cmd /k "cd /d ""%ROOT%\client_app"" && npm install --no-fund --no-audit && npm run dev"
start "CMP600 Driver" cmd /k "cd /d ""%ROOT%\driver_app"" && npm install --no-fund --no-audit && npm run dev"
echo.
echo URLs:  http://127.0.0.1:8000/docs
echo         http://127.0.0.1:5173  ^(admin / demo^)
echo         http://127.0.0.1:5174  ^(client1 / demo^)
echo         http://127.0.0.1:5175  ^(driver1 / demo^)
timeout /t 2 /nobreak >nul
goto menu

:start_backend
if not exist "%BACKEND%\app\main.py" (
  echo ERROR: Cannot find "%BACKEND%\app\main.py"
  pause
  goto menu
)
start "CMP600 API" cmd /k "cd /d ""%BACKEND%"" && python -m pip install -r requirements.txt -q && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
echo API: http://127.0.0.1:8000/docs
timeout /t 2 /nobreak >nul
goto menu

:start_dashboard
start "CMP600 Dashboard" cmd /k "cd /d ""%ROOT%\dashboard"" && npm install --no-fund --no-audit && npm run dev"
echo http://127.0.0.1:5173
goto menu

:start_client
start "CMP600 Client" cmd /k "cd /d ""%ROOT%\client_app"" && npm install --no-fund --no-audit && npm run dev"
echo http://127.0.0.1:5174
goto menu

:start_driver
start "CMP600 Driver" cmd /k "cd /d ""%ROOT%\driver_app"" && npm install --no-fund --no-audit && npm run dev"
echo http://127.0.0.1:5175
goto menu

:stop_all
echo Stopping listeners on 8000, 5173, 5174, 5175...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(8000,5173,5174,5175); foreach ($port in $ports) { $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if (-not $conns) { Write-Host ('Nothing on port ' + $port); continue }; $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($p in $pids) { Write-Host ('Stopping PID ' + $p + ' on port ' + $port); Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }"
echo Done.
pause
goto menu

:stop_backend
echo Stopping API on port 8000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$port = 8000; $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if (-not $conns) { Write-Host 'Nothing on port 8000' } else { $conns | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Write-Host ('Stopping PID ' + $_); Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"
pause
goto menu

:stop_frontends
echo Stopping frontends on 5173-5175...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(5173,5174,5175); foreach ($port in $ports) { $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue; if (-not $conns) { Write-Host ('Nothing on port ' + $port); continue }; $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($p in $pids) { Write-Host ('Stopping PID ' + $p + ' on port ' + $port); Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }"
pause
goto menu

:open_pages
start "" "http://127.0.0.1:8000/docs"
start "" "http://127.0.0.1:5173"
start "" "http://127.0.0.1:5174"
start "" "http://127.0.0.1:5175"
goto menu

:eof
endlocal
exit /b 0
