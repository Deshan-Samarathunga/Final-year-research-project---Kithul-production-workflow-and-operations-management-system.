@echo off
title KithulFlow - Setup Database
echo ============================================
echo   KithulFlow - Database Setup (PostgreSQL)
echo ============================================
echo.
echo This script will:
echo   1. Create the PostgreSQL database
echo   2. Run all Prisma migrations (full schema)
echo   3. Generate the Prisma client
echo   4. Seed all data (admin, employees, centers,
echo      system cans, issue notes)
echo.
echo ============================================
echo   PREREQUISITES:
echo   - PostgreSQL must be installed and running
echo   - pgAdmin or psql must be available
echo   - Default connection: localhost:5432
echo   - User: kithulflow / Password: kithulflow
echo ============================================
echo.
pause

echo.
echo [Step 1/5] Creating PostgreSQL database...
echo -------------------------------------------
echo Creating user "kithulflow" and database "kithulflow"...
echo.

:: Try using psql to create the database
where psql >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Using psql to create database...
    psql -U postgres -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kithulflow') THEN CREATE ROLE kithulflow WITH LOGIN PASSWORD 'kithulflow'; END IF; END $$;" 2>nul
    psql -U postgres -c "SELECT 'exists' FROM pg_database WHERE datname='kithulflow'" | findstr "exists" >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        psql -U postgres -c "CREATE DATABASE kithulflow OWNER kithulflow;"
        echo Database "kithulflow" created!
    ) else (
        echo Database "kithulflow" already exists.
    )
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE kithulflow TO kithulflow;"
) else (
    echo.
    echo !! psql not found in PATH.
    echo !! Please create the database manually in pgAdmin:
    echo.
    echo    1. Open pgAdmin
    echo    2. Right-click "Login/Group Roles" ^> Create ^> Login/Group Role
    echo       - Name: kithulflow
    echo       - Password: kithulflow
    echo       - Privileges: Can login = Yes
    echo    3. Right-click "Databases" ^> Create ^> Database
    echo       - Database: kithulflow
    echo       - Owner: kithulflow
    echo.
    echo    Or run this SQL in pgAdmin Query Tool:
    echo.
    echo    CREATE ROLE kithulflow WITH LOGIN PASSWORD 'kithulflow';
    echo    CREATE DATABASE kithulflow OWNER kithulflow;
    echo    GRANT ALL PRIVILEGES ON DATABASE kithulflow TO kithulflow;
    echo.
    pause
)

echo.
echo [Step 2/5] Installing npm dependencies...
echo -------------------------------------------
cd /d "%~dp0.."
call npm install
echo.

echo [Step 3/5] Generating Prisma client...
echo -------------------------------------------
call npm run db:generate
echo.

echo [Step 4/5] Running Prisma migrations...
echo -------------------------------------------
echo This creates all tables in the database.
call npm run db:migrate -- --name init 2>nul || call npm run db:migrate
echo.

echo [Step 5/5] Seeding all data...
echo -------------------------------------------
echo Seeding admin, employees, centers, cans, and issue notes...
call npm run seed:local
echo.

echo ============================================
echo   DATABASE SETUP COMPLETE!
echo ============================================
echo.
echo   Connection URL:
echo   postgresql://kithulflow:kithulflow@localhost:5432/kithulflow
echo.
echo   You can verify in pgAdmin:
echo   - Connect to localhost:5432
echo   - Database: kithulflow
echo   - Tables should be under: kithulflow ^> Schemas ^> public ^> Tables
echo.
echo   Tables created:
echo   - AdminUser
echo   - Employee
echo   - Center
echo   - SystemCan
echo   - CanHistory
echo   - IssueNote
echo   - IssueNoteItem
echo   - TransferNote
echo   - TransferNoteItem
echo   - MobileSyncEvent
echo   - _prisma_migrations
echo.
echo   Seeded data:
echo   - 1 Admin user (admin / admin123)
echo   - 5 Employees (field01 / password123)
echo   - 5 Centers
echo   - 30 System Cans (AR001-AR030)
echo   - 20 Issue Notes with items
echo.
echo   Next: Run 3-start-server.bat to start the server
echo ============================================
pause
