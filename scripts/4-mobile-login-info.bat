@echo off
title KithulFlow - Mobile Login Info
echo ============================================
echo   KithulFlow - What to Enter on Mobile App
echo ============================================
echo.
echo Detecting your PC's WiFi IP address...
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "IP=%%a"
)
set "IP=%IP: =%"

echo ============================================
echo.
echo   YOUR PC's IP ADDRESS: %IP%
echo.
echo ============================================
echo.
echo   On the mobile app login screen, enter:
echo.
echo   Server URL :  http://%IP%:4000
echo   User ID    :  field01
echo   Password   :  password123
echo.
echo ============================================
echo.
echo   STEPS:
echo   1. Connect phone to the SAME WiFi as this PC
echo   2. Open KithulFlow app on your phone
echo   3. Enter the Server URL shown above
echo   4. Tap "Test" to verify connection
echo   5. Enter User ID and Password
echo   6. Tap "Login"
echo.
echo ============================================
echo.
echo   TROUBLESHOOTING:
echo   - If "Test" fails, run open-firewall.bat first
echo   - Make sure start-server.bat is running
echo   - Phone and PC must be on the same WiFi
echo.
echo ============================================
pause
