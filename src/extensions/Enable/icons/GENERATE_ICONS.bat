@echo off
title AccessNow Icon Generator

echo.
echo ========================================
echo    AccessNow Icon Generator
echo ========================================
echo.

cd /d "%~dp0"

if exist "generate-icons-standalone.html" (
    echo [OK] Found icon generator
    echo.
    echo Opening icon generator in your browser...
    echo.
    echo INSTRUCTIONS:
    echo 1. Click 'Download All Icons' button
    echo 2. Allow multiple downloads when prompted
    echo 3. Four PNG files will download
    echo 4. Move all 4 files to this icons folder
    echo 5. Reload extension in chrome://extensions/
    echo.
    
    start "" "generate-icons-standalone.html"
    
    echo.
    echo Browser opened! Follow the instructions above.
    echo.
) else (
    echo [ERROR] Could not find generate-icons-standalone.html
    echo.
)

pause
