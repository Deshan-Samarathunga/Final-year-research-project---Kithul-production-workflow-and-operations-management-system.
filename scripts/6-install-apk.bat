@echo off
title KithulFlow - Install APK via USB
echo ============================================
echo   KithulFlow - Install APK on Phone (USB)
echo ============================================
echo.

set "APK_PATH=%~dp0..\apps\mobile\build\app\outputs\flutter-apk\app-debug.apk"

echo Checking for connected device...
adb devices
echo.

if not exist "%APK_PATH%" (
    echo APK not found! Building first...
    echo.
    cd /d "%~dp0..\apps\mobile"
    flutter pub get
    flutter build apk --debug
    echo.
)

echo ============================================
echo   Installing APK on connected device...
echo ============================================
echo.
adb install -r "%APK_PATH%"
echo.
echo ============================================
echo   Done! Open "KithulFlow" app on your phone.
echo ============================================
echo.
echo   Next steps:
echo   1. Disconnect USB cable
echo   2. Connect phone to the same WiFi as PC
echo   3. Run 4-mobile-login-info.bat to get the
echo      Server URL and login credentials
echo.
pause
