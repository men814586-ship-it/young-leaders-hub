@echo off
title Young Leaders Hub - Website + Admin
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js is not installed.
  echo   Install it once with:  winget install -e --id OpenJS.NodeJS.LTS
  echo   Then close this window, open it again, and re-run this file.
  echo.
  pause
  exit /b 1
)

echo Starting Young Leaders Hub...
start "" http://localhost:3000/
node server/server.js
pause
