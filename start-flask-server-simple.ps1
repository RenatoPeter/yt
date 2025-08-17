Write-Host "Starting YouTube Playlist Rooms Flask Server (Simple Mode)..." -ForegroundColor Green
Write-Host ""

Write-Host "Note: This script assumes Flask is already installed." -ForegroundColor Yellow
Write-Host "If you get 'ModuleNotFoundError: No module named flask', please:" -ForegroundColor Yellow
Write-Host "1. Install Python from https://www.python.org/downloads/" -ForegroundColor Cyan
Write-Host "2. Run: pip install flask flask-cors requests" -ForegroundColor Cyan
Write-Host ""

Write-Host "The Flask server will be available at: http://213.181.206.134:9904" -ForegroundColor Cyan
Write-Host "The web application will be available at: http://213.181.206.134:9902" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

# Start the server
try {
    $env:HOST = "213.181.206.134"
    $env:PORT = "9904"
    python app.py
} catch {
    Write-Host "❌ Failed to start server: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure Python is installed and in your PATH" -ForegroundColor Cyan
    Write-Host "2. Install Flask: pip install flask flask-cors requests" -ForegroundColor Cyan
    Write-Host "3. Or use the full script: .\start-flask-server.ps1" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
}


