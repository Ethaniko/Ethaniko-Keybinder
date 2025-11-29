@echo off
echo ========================================
echo  Ethaniko Keybinder - Setup Script
echo ========================================
echo.

:: Create assets folder
if not exist "assets" (
    mkdir assets
    echo [OK] Created assets folder
) else (
    echo [OK] Assets folder exists
)

:: Check for icon.ico
if not exist "assets\icon.ico" (
    echo.
    echo [WARNING] icon.ico not found in assets folder!
    echo.
    echo You need to create or download an icon file.
    echo.
    echo Option 1: Create your own 256x256 blue icon and save as assets\icon.ico
    echo Option 2: Download a free icon from https://icon-icons.com
    echo Option 3: Use the PowerShell command below to create a placeholder:
    echo.
    echo Creating a placeholder icon...
    
    :: Create a simple icon using PowerShell
    powershell -Command "$icon = [System.Drawing.Icon]::ExtractAssociatedIcon([System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName); $bitmap = $icon.ToBitmap(); $bitmap.Save('assets\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)" 2>nul
    
    if exist "assets\icon.png" (
        echo [OK] Created placeholder icon.png - Please convert to .ico
        echo     Use https://convertico.com to convert PNG to ICO
    ) else (
        echo [INFO] Could not create placeholder. Please add icon.ico manually.
    )
) else (
    echo [OK] icon.ico exists
)

echo.
echo ========================================
echo  Checking Node.js and npm...
echo ========================================

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install from https://nodejs.org
    pause
    exit /b 1
) else (
    echo [OK] Node.js installed
)

:: Check npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
) else (
    echo [OK] npm installed
)

echo.
echo ========================================
echo  Installing dependencies...
echo ========================================
call npm install

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Before building, make sure you have:
echo   1. assets\icon.ico (256x256 icon file)
echo.
echo Commands:
echo   npm start     - Run the app in development mode
echo   npm run build - Build the installer
echo.
pause
