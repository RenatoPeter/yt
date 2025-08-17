Write-Host "Starting YouTube Playlist Rooms Flask Server..." -ForegroundColor Green
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
        & python -m pip install -r requirements.txt
    } else {
        & $pipCmd install -r requirements.txt
    }
    Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies. Trying to continue anyway..." -ForegroundColor Yellow
    Write-Host "Error: $_" -ForegroundColor Red
}

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
    & python app.py
} catch {
    Write-Host "❌ Failed to start server: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
}
