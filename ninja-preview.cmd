@echo off
setlocal
cd /d "%~dp0"
set "PORT=3213"
set "PUBLIC_ORIGIN=http://127.0.0.1:3213"
set "DATABASE_PATH=work/logs/ninja-preview.db"
set "SESSION_COOKIE_NAME=games_ninja_preview"
set "NODE_ENV=development"
if /i "%~1"=="stop" goto stop
if /i "%~1"=="status" goto status
if not exist "dist\index.html" (
  echo Build the isolated workspace first with npm.cmd run build.
  exit /b 1
)
node scripts/service.mjs start
exit /b %errorlevel%

:stop
node scripts/service.mjs stop
exit /b %errorlevel%

:status
curl.exe --fail --silent --show-error --max-time 4 -o NUL -w "Ninja preview HTTP %%{http_code}\n" "%PUBLIC_ORIGIN%/api/catalog"
exit /b %errorlevel%
