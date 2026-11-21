@echo off
setlocal
cd /d "%~dp0"
set "PORT=3216"
set "PUBLIC_ORIGIN=http://127.0.0.1:3216"
set "DATABASE_PATH=work/logs/ninja-p20/preview.db"
set "SESSION_COOKIE_NAME=games_ninja_p20"
set "NODE_ENV=development"
set "GAMES_WEB_ASSETS=work/logs/ninja-p20/dist"
set "GAMES_SERVICE_SCOPE=ninja-p20"
if "%~1"=="" goto menu
if /i "%~1"=="status" goto status
if /i "%~1"=="stop" goto stop
if /i "%~1"=="start" goto start
echo Usage: ninja-p20.cmd [start^|stop^|status]
exit /b 2

:start
node scripts/service.mjs status
if not errorlevel 1 (
  echo Ninja P20 already running: %PUBLIC_ORIGIN%
  exit /b 0
)
if not exist "%GAMES_WEB_ASSETS%\index.html" (
  echo Run npm.cmd run build -- --outDir work/logs/ninja-p20/dist first.
  exit /b 1
)
node scripts/service.mjs start
exit /b %errorlevel%

:stop
node scripts/service.mjs stop
exit /b %errorlevel%

:status
curl.exe --fail --silent --show-error --max-time 4 -o NUL -w "Ninja P20 HTTP %%{http_code}\n" "%PUBLIC_ORIGIN%/api/catalog"
exit /b %errorlevel%

:menu
chcp 65001 >nul
title 忍者之夜 3216 测试服
set "message="
:refresh
cls
echo 忍者之夜 3216 测试服
echo %PUBLIC_ORIGIN%
echo.
curl.exe --fail --silent --max-time 2 -o NUL "%PUBLIC_ORIGIN%/api/catalog"
if errorlevel 1 (
  echo 状态：HTTP 无响应
) else (
  echo 状态：HTTP 正常
)
if defined message echo %message%
echo.
echo [1] 启动  [2] 停止  [R] 刷新  [0] 退出菜单
echo 每 5 秒刷新。退出菜单后，后台服务按原状态运行。
choice /c 12R0 /n /t 5 /d R
if errorlevel 255 exit /b 1
if errorlevel 4 exit /b 0
if errorlevel 3 goto refresh
if errorlevel 2 goto menu_stop
if errorlevel 1 goto menu_start
exit /b 0

:menu_start
call :start
if errorlevel 1 (set "message=启动失败，请查看 work/logs/ninja-p20/server-error.log") else (set "message=启动命令已完成。")
goto refresh

:menu_stop
call :stop
if errorlevel 1 (set "message=停止失败，请检查服务状态。") else (set "message=停止命令已完成。")
goto refresh
