# YouTube Playlist Rooms - VPS Installation Tutorial

This tutorial will guide you through installing the YouTube Playlist Rooms application on a VPS with Pterodactyl panel, setting up the domain `yt.vzone.hu` with SSL, and configuring everything for production use.

## Prerequisites

- VPS with Ubuntu 20.04/22.04 LTS
- Pterodactyl panel already installed and configured
- Domain `yt.vzone.hu` pointing to your VPS
- Root or sudo access to the VPS
- Basic knowledge of Linux commands

## Step 1: System Preparation

### Update the system
```bash
sudo apt update && sudo apt upgrade -y
```

### Install required packages
```bash
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git curl wget unzip
```

### Install Node.js (for potential frontend builds)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Step 2: Create Application Directory

### Create application directory
```bash
sudo mkdir -p /var/www/youtube-playlist-rooms
sudo chown $USER:$USER /var/www/youtube-playlist-rooms
cd /var/www/youtube-playlist-rooms
```

### Clone or upload the application
```bash
# If using git (replace with your repository URL)
git clone https://github.com/yourusername/youtube-playlist-rooms.git .

# Or upload files manually via SFTP/SCP
```

## Step 3: Python Environment Setup

### Create virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

### Install Python dependencies
```bash
pip install -r requirements.txt
```

### Test the application
```bash
python app.py
# Should start without errors
# Press Ctrl+C to stop
```

## Step 4: Environment Configuration

### Create environment file
```bash
cp env.example .env
nano .env
```

### Configure environment variables
```bash
# Edit .env file with these settings:
SECRET_KEY=your-super-secret-key-here-make-it-long-and-random
HOST=0.0.0.0
PORT=9904
CORS_ORIGINS=https://yt.vzone.hu,http://yt.vzone.hu
FLASK_ENV=production
```

### Generate a secure secret key
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
# Copy the output and use it as SECRET_KEY
```

## Step 5: Systemd Service Setup

### Create systemd service file
```bash
sudo nano /etc/systemd/system/youtube-playlist-rooms.service
```

### Add service configuration
```ini
[Unit]
Description=YouTube Playlist Rooms
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/youtube-playlist-rooms
Environment=PATH=/var/www/youtube-playlist-rooms/venv/bin
ExecStart=/var/www/youtube-playlist-rooms/venv/bin/gunicorn --config gunicorn.conf.py wsgi:app
Restart=always
RestartSec=10
SyslogIdentifier=youtube-playlist-rooms

[Install]
WantedBy=multi-user.target
```

### Set proper permissions
```bash
sudo chown -R www-data:www-data /var/www/youtube-playlist-rooms
sudo chmod -R 755 /var/www/youtube-playlist-rooms
```

### Enable and start the service
```bash
sudo systemctl daemon-reload
sudo systemctl enable youtube-playlist-rooms
sudo systemctl start youtube-playlist-rooms
sudo systemctl status youtube-playlist-rooms
```

## Step 6: Nginx Configuration

### Create Nginx configuration
```bash
sudo nano /etc/nginx/sites-available/yt.vzone.hu
```

### Add Nginx configuration
```nginx
server {
    listen 80;
    server_name yt.vzone.hu;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yt.vzone.hu;
    
    # SSL Configuration (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/yt.vzone.hu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yt.vzone.hu/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    
    # Client max body size
    client_max_body_size 10M;
    
    # Static files
    location /static/ {
        alias /var/www/youtube-playlist-rooms/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Favicon
    location = /favicon.ico {
        alias /var/www/youtube-playlist-rooms/favicon.ico;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:9904;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:9904;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:9904;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Enable the site
```bash
sudo ln -s /etc/nginx/sites-available/yt.vzone.hu /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7: SSL Certificate Setup

### Obtain SSL certificate
```bash
sudo certbot --nginx -d yt.vzone.hu
```

### Test SSL renewal
```bash
sudo certbot renew --dry-run
```

### Set up automatic renewal
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Step 8: Firewall Configuration

### Configure UFW firewall
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 9904
sudo ufw enable
sudo ufw status
```

## Step 9: Application Testing

### Test the application locally
```bash
curl http://localhost:9904/health
# Should return: {"status": "healthy"}
```

### Test through Nginx
```bash
curl -I https://yt.vzone.hu
# Should return 200 OK
```

### Test API endpoints
```bash
curl https://yt.vzone.hu/api/health
# Should return: {"status": "healthy"}
```

## Step 10: Monitoring and Logs

### View application logs
```bash
sudo journalctl -u youtube-playlist-rooms -f
```

### View Nginx logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Monitor system resources
```bash
htop
df -h
free -h
```

## Step 11: Pterodactyl Integration (Optional)

If you want to manage the application through Pterodactyl:

### Create a new server in Pterodactyl
1. Go to your Pterodactyl admin panel
2. Create a new server
3. Set the startup command to: `gunicorn --config gunicorn.conf.py wsgi:app`
4. Set the working directory to: `/var/www/youtube-playlist-rooms`
5. Configure environment variables in Pterodactyl

### Pterodactyl startup script
```bash
#!/bin/bash
cd /var/www/youtube-playlist-rooms
source venv/bin/activate
exec gunicorn --config gunicorn.conf.py wsgi:app
```

## Step 12: Backup Configuration

### Create backup script
```bash
sudo nano /usr/local/bin/backup-youtube-rooms.sh
```

### Add backup script content
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/youtube-playlist-rooms"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/youtube-playlist-rooms"

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C $APP_DIR .

# Backup database (if using one)
# mysqldump -u username -p database_name > $BACKUP_DIR/db_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/app_$DATE.tar.gz"
```

### Make backup script executable
```bash
sudo chmod +x /usr/local/bin/backup-youtube-rooms.sh
```

### Add to crontab for daily backups
```bash
sudo crontab -e
# Add this line:
0 2 * * * /usr/local/bin/backup-youtube-rooms.sh
```

## Step 13: Performance Optimization

### Optimize Nginx
```bash
sudo nano /etc/nginx/nginx.conf
```

Add to http block:
```nginx
# Worker processes
worker_processes auto;

# Worker connections
events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # Buffer sizes
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    
    # Gzip settings
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
}
```

### Optimize Gunicorn
```bash
nano /var/www/youtube-playlist-rooms/gunicorn.conf.py
```

Update configuration:
```python
bind = "127.0.0.1:9904"
workers = 4
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50
timeout = 30
keepalive = 2
preload_app = True
```

## Step 14: Security Hardening

### Secure file permissions
```bash
sudo chown -R www-data:www-data /var/www/youtube-playlist-rooms
sudo chmod -R 755 /var/www/youtube-playlist-rooms
sudo chmod 600 /var/www/youtube-playlist-rooms/.env
```

### Install fail2ban
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Configure fail2ban for Nginx
```bash
sudo nano /etc/fail2ban/jail.local
```

Add:
```ini
[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
bantime = 3600
findtime = 600
```

### Restart fail2ban
```bash
sudo systemctl restart fail2ban
```

## Step 15: Final Verification

### Check all services
```bash
sudo systemctl status nginx
sudo systemctl status youtube-playlist-rooms
sudo systemctl status fail2ban
```

### Test the complete setup
```bash
# Test HTTP to HTTPS redirect
curl -I http://yt.vzone.hu

# Test HTTPS
curl -I https://yt.vzone.hu

# Test API
curl https://yt.vzone.hu/api/health

# Test WebSocket (if applicable)
# You may need to test this in a browser
```

### Performance test
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test performance
ab -n 1000 -c 10 https://yt.vzone.hu/
```

## Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   sudo journalctl -u youtube-playlist-rooms -f
   # Check logs for errors
   ```

2. **Nginx 502 Bad Gateway**
   ```bash
   sudo systemctl status youtube-playlist-rooms
   # Check if app is running
   sudo netstat -tlnp | grep 9904
   # Check if port is listening
   ```

3. **SSL certificate issues**
   ```bash
   sudo certbot certificates
   # Check certificate status
   sudo certbot renew --dry-run
   # Test renewal
   ```

4. **Permission issues**
   ```bash
   sudo chown -R www-data:www-data /var/www/youtube-playlist-rooms
   sudo chmod -R 755 /var/www/youtube-playlist-rooms
   ```

### Useful Commands

```bash
# Restart all services
sudo systemctl restart nginx youtube-playlist-rooms

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Monitor network connections
netstat -tlnp

# Check SSL certificate expiry
openssl x509 -in /etc/letsencrypt/live/yt.vzone.hu/cert.pem -text -noout | grep "Not After"
```

## Maintenance

### Regular maintenance tasks
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update application
cd /var/www/youtube-playlist-rooms
git pull
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart youtube-playlist-rooms

# Check logs
sudo journalctl -u youtube-playlist-rooms --since "1 hour ago"

# Monitor disk space
df -h

# Check SSL certificate
sudo certbot certificates
```

## Conclusion

Your YouTube Playlist Rooms application is now installed and configured on your VPS with:
- ✅ Domain `yt.vzone.hu` with SSL certificate
- ✅ Nginx reverse proxy
- ✅ Systemd service for automatic startup
- ✅ Firewall configuration
- ✅ Monitoring and logging
- ✅ Backup system
- ✅ Security hardening
- ✅ Performance optimization

The application should be accessible at `https://yt.vzone.hu` and ready for production use!

## Support

If you encounter any issues:
1. Check the logs: `sudo journalctl -u youtube-playlist-rooms -f`
2. Verify service status: `sudo systemctl status youtube-playlist-rooms`
3. Test connectivity: `curl https://yt.vzone.hu/api/health`
4. Check Nginx configuration: `sudo nginx -t`
