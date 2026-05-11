@echo off
title KithulFlow - Run Mobile App
echo ============================================
echo   KithulFlow - Run Mobile App on Device
echo ============================================
echo.
cd /d "%~dp0..\apps\mobile"
echo Running flutter pub get...
flutter pub get
echo.
echo Launching app on connected device...
flutter run
pause
