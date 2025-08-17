# 🚀 YouTube Playlist Rooms - VPS Deployment Guide

This guide will help you deploy the YouTube Playlist Rooms application on a VPS (Virtual Private Server) with production-ready configuration.

## 📋 Prerequisites

- **VPS Provider**: Any VPS provider (DigitalOcean, Linode, Vultr, AWS, etc.)
- **Operating System**: Ubuntu 20.04+ or Debian 11+
- **Domain Name**: (Optional but recommended for SSL)
- **SSH Access**: Root or sudo access to your VPS

## 🎯 Quick Start (Automated Deployment)

### Option 1: One-Click Deployment Script

1. **Connect to your VPS via SSH**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Download and run the deployment script**
   ```bash
   # For localhost deployment
   curl -sSL https://raw.githubusercontent.com/RenatoPeter/yt/main/deploy.sh | bash
   
   # For domain deployment
   curl -sSL https://raw.githubusercontent.com/RenatoPeter/yt/main/deploy.sh | bash -s yourdomain.com admin@yourdomain.com
   ```

3. **Access your application**
   - Localhost: `http://your-vps-ip`
   - Domain: `https://yourdomain.com`

## 🔧 Manual Deployment

### Step 1: Server Preparation

1. **Update system packages**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install required packages**
   ```bash
   sudo apt install -y python3 python3-pip python3-venv nginx curl certbot python3-certbot-nginx git supervisor
   ```

### Step 2: Application Setup

1. **Create application user**
   ```bash
   sudo useradd -r -s /bin/bash -d /opt/youtube-playlist-rooms youtube-rooms
   ```

2. **Clone or upload application**
   ```bash
   # Option A: Git clone
   sudo git clone https://github.com/RenatoPeter/yt.git /opt/youtube-playlist-rooms
   
   # Option B: Upload files manually
   sudo mkdir -p /opt/youtube-playlist-rooms
   # Upload your files to /opt/youtube-playlist-rooms/
   ```

3. **Set permissions**
   ```bash
   sudo chown -R youtube-rooms:youtube-rooms /opt/youtube-playlist-rooms
   ```

### Step 3: Python Environment

1. **Create virtual environment**
   ```bash
   cd /opt/youtube-playlist-rooms
   sudo -u youtube-rooms python3 -m venv venv
   sudo -u youtube-rooms venv/bin/pip install --upgrade pip
   sudo -u youtube-rooms venv/bin/pip install -r requirements.txt
   ```

2. **Create logs directory**
   ```bash
   sudo mkdir -p /opt/youtube-playlist-rooms/logs
   sudo chown youtube-rooms:youtube-rooms /opt/youtube-playlist-rooms/logs
   ```

### Step 4: Configuration

1. **Create environment file**
   ```bash
   sudo -u youtube-rooms tee /opt/youtube-playlist-rooms/.env > /dev/null << EOF
   FLASK_ENV=production
   HOST=213.181.206.134
   PORT=9904
   SECRET_KEY=$(openssl rand -hex 32)
   CORS_ORIGINS=https://yourdomain.com
   LOG_LEVEL=INFO
   LOG_FILE=logs/app.log
   EOF
   ```

2. **Setup systemd service**
   ```bash
   sudo cp /opt/youtube-playlist-rooms/systemd.service /etc/systemd/system/youtube-playlist-rooms.service
   sudo systemctl daemon-reload
   sudo systemctl enable youtube-playlist-rooms
   sudo systemctl start youtube-playlist-rooms
   ```

### Step 5: Nginx Configuration

1. **Create Nginx site configuration**
   ```bash
   sudo tee /etc/nginx/sites-available/youtube-playlist-rooms > /dev/null << EOF
   server {
       listen 80;
       server_name yourdomain.com;
   
               location / {
            proxy_pass http://213.181.206.134:9904;
           proxy_set_header Host \$host;
           proxy_set_header X-Real-IP \$remote_addr;
           proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto \$scheme;
       }
   }
   EOF
   ```

2. **Enable site and restart Nginx**
   ```bash
   sudo ln -sf /etc/nginx/sites-available/youtube-playlist-rooms /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Step 6: SSL Certificate (Optional)

1. **Obtain SSL certificate**
   ```bash
   sudo certbot --nginx -d yourdomain.com --non-interactive --agree-tos --email admin@yourdomain.com
   ```

2. **Setup auto-renewal**
   ```bash
   sudo crontab -e
   # Add this line:
   # 0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Step 7: Firewall Setup

1. **Configure UFW firewall**
   ```bash
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   sudo ufw --force enable
   ```

## 🐳 Docker Deployment

### Option 1: Docker Compose (Recommended)

1. **Create environment file**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Option 2: Docker Only

1. **Build and run container**
   ```bash
   docker build -t youtube-playlist-rooms .
   docker run -d -p 5000:5000 --name youtube-playlist-rooms youtube-playlist-rooms
   ```

## 🔧 Management Commands

### Application Management
```bash
# Start application
sudo systemctl start youtube-playlist-rooms

# Stop application
sudo systemctl stop youtube-playlist-rooms

# Restart application
sudo systemctl restart youtube-playlist-rooms

# Check status
sudo systemctl status youtube-playlist-rooms

# View logs
sudo journalctl -u youtube-playlist-rooms -f
```

### Using Management Script
```bash
# If you used the automated deployment script
/opt/youtube-playlist-rooms/manage.sh start
/opt/youtube-playlist-rooms/manage.sh stop
/opt/youtube-playlist-rooms/manage.sh restart
/opt/youtube-playlist-rooms/manage.sh status
/opt/youtube-playlist-rooms/manage.sh logs
/opt/youtube-playlist-rooms/manage.sh update
```

## 🔒 Security Considerations

### 1. Environment Variables
- **SECRET_KEY**: Generate a strong random key
- **CORS_ORIGINS**: Restrict to your domain(s)
- **LOG_LEVEL**: Set to INFO or WARNING in production

### 2. Firewall Configuration
```bash
# Allow only necessary ports
    sudo ufw allow ssh
    sudo ufw allow 'Nginx Full'
    sudo ufw deny 9904  # Block direct access to Flask
```

### 3. SSL/TLS
- Always use HTTPS in production
- Enable HSTS headers
- Use strong SSL ciphers

### 4. Application Security
- Run as non-root user
- Use systemd security features
- Regular security updates

## 📊 Monitoring and Logging

### 1. Application Logs
```bash
# View application logs
sudo journalctl -u youtube-playlist-rooms -f

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Health Checks
```bash
    # Check application health
    curl http://213.181.206.134:9904/health

# Check Nginx status
sudo systemctl status nginx
```

### 3. Resource Monitoring
```bash
# Monitor system resources
htop
df -h
free -h
```

## 🔄 Updates and Maintenance

### 1. Application Updates
```bash
cd /opt/youtube-playlist-rooms
sudo git pull
sudo -u youtube-rooms venv/bin/pip install -r requirements.txt
sudo systemctl restart youtube-playlist-rooms
```

### 2. System Updates
```bash
sudo apt update && sudo apt upgrade -y
sudo systemctl restart youtube-playlist-rooms nginx
```

### 3. Backup Strategy
```bash
# Backup application files
sudo tar -czf backup-$(date +%Y%m%d).tar.gz /opt/youtube-playlist-rooms

# Backup Nginx configuration
sudo cp /etc/nginx/sites-available/youtube-playlist-rooms /backup/
```

## 🚨 Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   sudo systemctl status youtube-playlist-rooms
   sudo journalctl -u youtube-playlist-rooms -n 50
   ```

2. **Nginx configuration errors**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. **Permission issues**
   ```bash
   sudo chown -R youtube-rooms:youtube-rooms /opt/youtube-playlist-rooms
   ```

4. **Port conflicts**
   ```bash
       sudo netstat -tlnp | grep :9904
    sudo lsof -i :9904
   ```

### Performance Optimization

1. **Gunicorn Configuration**
   - Adjust workers based on CPU cores
   - Monitor memory usage
   - Set appropriate timeouts

2. **Nginx Optimization**
   - Enable gzip compression
   - Configure caching for static files
   - Use rate limiting

3. **Database Considerations**
   - Consider using PostgreSQL for production
   - Implement connection pooling
   - Regular database maintenance

## 📞 Support

If you encounter issues:

1. Check the logs: `sudo journalctl -u youtube-playlist-rooms -f`
2. Verify configuration files
3. Test individual components
4. Check system resources
5. Review firewall settings

## 🎉 Success!

Your YouTube Playlist Rooms application is now deployed and ready to use!

- **Local Access**: `http://your-vps-ip`
- **Domain Access**: `https://yourdomain.com`
- **Health Check**: `https://yourdomain.com/health`

Remember to:
- Monitor logs regularly
- Keep the system updated
- Backup your configuration
- Test functionality periodically
