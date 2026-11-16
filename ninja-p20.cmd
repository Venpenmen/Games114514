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
if /i "%~1"=="status" goto status
if /i "%~1"=="stop" goto stop
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
