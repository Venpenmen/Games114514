@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >NUL
node scripts/ninja-bots-cli.ts %*
exit /b %errorlevel%
