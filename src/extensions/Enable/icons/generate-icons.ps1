# AccessNow Icon Generator - PowerShell Script
# This script opens the icon generator in your browser

Write-Host "🎨 AccessNow Icon Generator" -ForegroundColor Cyan
Write-Host "===========================`n" -ForegroundColor Cyan

$iconsPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$generatorPath = Join-Path $iconsPath "generate-icons-standalone.html"

if (Test-Path $generatorPath) {
    Write-Host "✅ Found icon generator" -ForegroundColor Green
    Write-Host "`nOpening icon generator in your browser..." -ForegroundColor Yellow
    Write-Host "`nInstructions:" -ForegroundColor Cyan
    Write-Host "1. Click 'Download All Icons' button" -ForegroundColor White
    Write-Host "2. Allow multiple downloads when prompted" -ForegroundColor White
    Write-Host "3. Four PNG files will download to your Downloads folder" -ForegroundColor White
    Write-Host "4. Move all 4 files from Downloads to this icons/ folder" -ForegroundColor White
    Write-Host "5. Reload your extension in chrome://extensions/`n" -ForegroundColor White
    
    Start-Process $generatorPath
    
    Write-Host "✨ Browser opened! Follow the instructions above.`n" -ForegroundColor Green
} else {
    Write-Host "❌ Error: Could not find generate-icons-standalone.html" -ForegroundColor Red
    Write-Host "Expected location: $generatorPath`n" -ForegroundColor Red
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
