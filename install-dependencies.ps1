Write-Host "Installing Python Dependencies for YouTube Playlist Rooms..." -ForegroundColor Green
Write-Host ""

# Try to find Python and pip
$pythonCmd = $null
$pipCmd = $null

# Check if python is available
try {
    $pythonCmd = Get-Command python -ErrorAction Stop
    Write-Host "Found Python at: $($pythonCmd.Source)" -ForegroundColor Green
} catch {
    try {
        $pythonCmd = Get-Command python3 -ErrorAction Stop
        Write-Host "Found Python3 at: $($pythonCmd.Source)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Python not found! Please install Python and add it to your PATH." -ForegroundColor Red
        Write-Host "Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
        Write-Host "Make sure to check 'Add Python to PATH' during installation!" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check if pip is available
try {
    $pipCmd = Get-Command pip -ErrorAction Stop
    Write-Host "Found pip at: $($pipCmd.Source)" -ForegroundColor Green
} catch {
    try {
        $pipCmd = Get-Command pip3 -ErrorAction Stop
        Write-Host "Found pip3 at: $($pipCmd.Source)" -ForegroundColor Green
    } catch {
        # Try using python -m pip
        Write-Host "pip not found, trying python -m pip..." -ForegroundColor Yellow
        $pipCmd = "python -m pip"
    }
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Install dependencies
try {
    if ($pipCmd -eq "python -m pip") {
        & python -m pip install flask flask-cors requests
    } else {
        & $pipCmd install flask flask-cors requests
    }
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run:" -ForegroundColor Cyan
    Write-Host "  .\start-flask-server-simple.ps1" -ForegroundColor White
    Write-Host "  .\start-web-server.ps1" -ForegroundColor White
} catch {
    Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try running these commands manually:" -ForegroundColor Yellow
    Write-Host "  python -m pip install flask flask-cors requests" -ForegroundColor Cyan
}

Read-Host "Press Enter to exit"


