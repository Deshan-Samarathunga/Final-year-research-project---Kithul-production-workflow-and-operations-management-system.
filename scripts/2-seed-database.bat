@echo off
title KithulFlow - Seed Database
echo ============================================
echo   KithulFlow - Seed Database
echo ============================================
echo.
cd /d "%~dp0.."
echo Running database migrations...
npm run db:migrate
echo.
echo Seeding local data...
npm run seed:local
echo.
echo ============================================
echo   Database seeded successfully!
echo ============================================
pause
