@echo off
title KithulFlow - Build Mobile APK
echo ============================================
echo   KithulFlow - Build Android APK
echo ============================================
echo.
cd /d "%~dp0..\apps\mobile"
echo Running flutter pub get...
flutter pub get
echo.
echo Running flutter analyze...
flutter analyze
echo.
echo Building debug APK...
flutter build apk --debug
echo.
echo ============================================
echo   APK built at:
echo   apps\mobile\build\app\outputs\flutter-apk\app-debug.apk
echo ============================================
pause
