@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul
title Games114514 - 3216 Local Match Manager
node scripts\local-match-manager.mjs
echo.
echo 管理器已退出，游戏服务器不受影响。
pause
