@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >NUL
title Games114514 - Bot Manager
echo.
echo ================================
echo    Games114514 Bot Manager
echo ================================
echo.
:again
node scripts/ninja-bots-manager.ts
set "code=%errorlevel%"
echo.
if not "%code%"=="0" echo Manager exited with code %code%.
echo Press any key to close, or R to restart manager.
choice /c RX /n /m "[R] Restart  [X] Exit: "
if errorlevel 2 exit /b %code%
goto again
