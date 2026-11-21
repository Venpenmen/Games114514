@echo off
setlocal
cd /d "%~dp0"
if not exist node_modules (
 echo Dependencies missing. Run npm.cmd ci first.
 exit /b 1
)
node --env-file-if-exists=.env -e "const fs=require('node:fs');const p=require('node:path');if(!fs.existsSync(p.join(process.env.GAMES_WEB_ASSETS||'dist','index.html'))){console.error('Build missing. Run npm.cmd run build before starting.');process.exit(1)}"
if errorlevel 1 exit /b 1
node --env-file-if-exists=.env scripts/service.mjs start
exit /b %errorlevel%
