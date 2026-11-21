@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if /i "%~1"=="status" goto status
if /i "%~1"=="stop" goto stop
if not exist node_modules (
 echo Dependencies missing. Run npm.cmd ci first.
 goto failed
)
node --env-file-if-exists=.env -e "const fs=require('node:fs');const p=require('node:path');if(!fs.existsSync(p.join(process.env.GAMES_WEB_ASSETS||'dist','index.html'))){console.error('Build missing. Run npm.cmd run build before starting.');process.exit(1)}"
if errorlevel 1 goto failed
node --env-file-if-exists=.env scripts/service.mjs status >nul 2>&1
if not errorlevel 1 goto started
node --env-file-if-exists=.env scripts/service.mjs start
if errorlevel 1 goto failed
:started
if not "%~1"=="" exit /b 0
:menu
echo.
echo Games114514 - verified production build, no automatic rebuild
node --env-file-if-exists=.env scripts/service.mjs status
if errorlevel 1 (echo Status: stopped) else (echo Status: running)
echo [1] Refresh  [2] Recent log  [3] Stop server  [0] Close console only
set "option="
set /p "option=Choose: "
if errorlevel 1 exit /b 0
if "%option%"=="0" exit /b 0
if "%option%"=="2" powershell -NoProfile -Command "Get-Content -LiteralPath 'work/logs/server.log' -Tail 25 -ErrorAction SilentlyContinue"
if "%option%"=="3" node --env-file-if-exists=.env scripts/service.mjs stop
goto menu
:status
node --env-file-if-exists=.env scripts/service.mjs status
exit /b %errorlevel%
:stop
node --env-file-if-exists=.env scripts/service.mjs stop
exit /b %errorlevel%
:failed
if "%~1"=="" pause
exit /b 1
