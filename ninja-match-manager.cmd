@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
title Games114514 - 3216 Local Match Manager
:restart
cls
echo =======================================
echo  Games114514 - Local Match Manager
echo  Target: 3216 Ninja Preview
echo =======================================
echo.
node scripts\local-match-manager.mjs
set "result=%errorlevel%"
echo.
echo Manager exited (code %result%).
echo Game server remains running.
echo.
choice /c RX /n /m "[R] Restart manager  [X] Close window: "
if errorlevel 2 exit /b %result%
goto restart
