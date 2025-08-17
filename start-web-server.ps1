Write-Host "Starting YouTube Playlist Rooms Web Server..." -ForegroundColor Green
Write-Host ""
Write-Host "The application will be available at: http://213.181.206.134:9902" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

python -m http.server 9902


