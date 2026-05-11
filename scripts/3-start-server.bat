@echo off
title KithulFlow - Start Server
echo ============================================
echo   KithulFlow - Starting Web Server
echo ============================================
echo.
echo Starting both API server (port 4000) and
echo Vite client (port 5173)...
echo.
cd /d "%~dp0.."
npm run dev
pause
