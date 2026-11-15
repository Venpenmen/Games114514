@echo off
setlocal
cd /d "%~dp0"
node scripts\service.mjs stop
exit /b %errorlevel%
