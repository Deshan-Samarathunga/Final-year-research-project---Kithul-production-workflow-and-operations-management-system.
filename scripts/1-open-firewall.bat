@echo off
title KithulFlow - Open Firewall Port
echo ============================================
echo   KithulFlow - Open Firewall for Port 4000
echo ============================================
echo.
echo This requires Administrator privileges.
echo A UAC prompt will appear - please click Yes.
echo.
powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-Command', 'New-NetFirewallRule -DisplayName \"KithulFlow Dev Server\" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow; Write-Host \"Firewall rule added successfully!\" -ForegroundColor Green; Start-Sleep 3'"
echo.
echo Done! Port 4000 is now open for mobile connections.
echo (You only need to run this once)
pause
