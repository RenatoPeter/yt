# 🎵 YouTube Playlist Rooms

A real-time collaborative YouTube playlist sharing application that allows users to create rooms, share videos, and synchronize playback across multiple devices.

## ✨ Features

- **🎬 Real-time Video Synchronization**: Watch YouTube videos together with friends
- **👥 Multi-user Rooms**: Create and join rooms with multiple participants
- **🎮 Permission System**: Granular control over who can control playback
- **📱 Responsive Design**: Works on desktop, tablet, and mobile devices
- **🔒 Password Protection**: Secure rooms with optional passwords
- **📋 Playlist Management**: Add, remove, and reorder videos
- **🌐 Cross-platform**: Works on any modern web browser
- **🇭🇺 Hungarian Language Support**: Fully translated interface

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/RenatoPeter/yt.git
cd youtube-playlist-rooms

# Copy environment file
cp env.example .env
# Edit .env with your configuration

# Start with Docker Compose
docker-compose up -d

# Access the application at http://213.181.206.134:9904
```

### Option 2: Local Development

```bash
# Clone the repository
git clone https://github.com/RenatoPeter/yt.git
cd youtube-playlist-rooms

# Install Python dependencies
pip install -r requirements.txt

# Start the Flask server
python app.py

# Access the application at http://213.181.206.134:9904
```

### Option 3: VPS Deployment

```bash
# One-command deployment
curl -sSL https://raw.githubusercontent.com/RenatoPeter/yt/main/deploy.sh | bash -s yourdomain.com admin@yourdomain.com
```

## 🏗️ Architecture

### Frontend
- **HTML5/CSS3**: Modern, responsive interface
- **Vanilla JavaScript**: No framework dependencies
- **YouTube IFrame API**: Direct video integration
- **Font Awesome**: Beautiful icons

### Backend
- **Flask**: Lightweight Python web framework
- **Gunicorn**: Production WSGI server
- **Nginx**: Reverse proxy and static file serving
- **In-memory Storage**: Room and user data (can be extended to database)

### Production Features
- **SSL/TLS**: Automatic HTTPS with Let's Encrypt
- **Load Balancing**: Nginx reverse proxy
- **Process Management**: Systemd service
- **Logging**: Comprehensive application logging
- **Security**: Firewall, rate limiting, security headers

## 📁 Project Structure

```
youtube-playlist-rooms/
├── app.py                 # Main Flask application
├── server.py             # API routes (Blueprint)
├── config.py             # Configuration management
├── wsgi.py               # WSGI entry point
├── requirements.txt      # Python dependencies
├── Dockerfile            # Docker container definition
├── docker-compose.yml    # Docker Compose configuration
├── gunicorn.conf.py      # Gunicorn configuration
├── nginx.conf            # Nginx configuration
├── systemd.service       # Systemd service file
├── deploy.sh             # Automated deployment script
├── env.example           # Environment variables template
├── static/               # Static files (HTML, CSS, JS)
│   ├── index.html        # Main page
│   ├── room.html         # Room page
│   ├── styles.css        # Main page styles
│   ├── room-styles.css   # Room page styles
│   ├── script.js         # Main page JavaScript
│   ├── room-script.js    # Room page JavaScript
│   └── favicon.ico       # Application icon
├── DEPLOYMENT_GUIDE.md   # Comprehensive deployment guide
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | Flask environment | `development` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `5000` |
| `SECRET_KEY` | Flask secret key | Auto-generated |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `LOG_FILE` | Log file path | `app.log` |

### Example Configuration

```bash
# .env file
FLASK_ENV=production
HOST=0.0.0.0
PORT=5000
SECRET_KEY=your-super-secret-key-here
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
```

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Using Docker Only

```bash
# Build image
docker build -t youtube-playlist-rooms .

# Run container
docker run -d -p 5000:5000 --name youtube-playlist-rooms youtube-playlist-rooms
```

## 🌐 VPS Deployment

### Automated Deployment

```bash
# Deploy to VPS with domain
curl -sSL https://raw.githubusercontent.com/RenatoPeter/yt/main/deploy.sh | bash -s yourdomain.com admin@yourdomain.com

# Deploy to VPS without domain (localhost)
curl -sSL https://raw.githubusercontent.com/RenatoPeter/yt/main/deploy.sh | bash
```

### Manual Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed manual deployment instructions.

## 🔒 Security Features

- **HTTPS/SSL**: Automatic SSL certificate management
- **CORS Protection**: Configurable cross-origin restrictions
- **Rate Limiting**: API endpoint rate limiting
- **Security Headers**: XSS, CSRF, and other security headers
- **Firewall**: UFW firewall configuration
- **Non-root User**: Application runs as dedicated user
- **Process Isolation**: Systemd security features

## 📊 Monitoring

### Health Checks

```bash
# Application health
curl http://localhost:5000/health

# Service status
sudo systemctl status youtube-playlist-rooms
```

### Logs

```bash
# Application logs
sudo journalctl -u youtube-playlist-rooms -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Management Commands

```bash
# Start/Stop/Restart
sudo systemctl start youtube-playlist-rooms
sudo systemctl stop youtube-playlist-rooms
sudo systemctl restart youtube-playlist-rooms

# Using management script (if deployed with deploy.sh)
/opt/youtube-playlist-rooms/manage.sh start
/opt/youtube-playlist-rooms/manage.sh stop
/opt/youtube-playlist-rooms/manage.sh restart
/opt/youtube-playlist-rooms/manage.sh status
/opt/youtube-playlist-rooms/manage.sh logs
/opt/youtube-playlist-rooms/manage.sh update
```

## 🔄 Updates and Maintenance

### Application Updates

```bash
# Git-based updates
cd /opt/youtube-playlist-rooms
sudo git pull
sudo -u youtube-rooms venv/bin/pip install -r requirements.txt
sudo systemctl restart youtube-playlist-rooms
```

### System Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services
sudo systemctl restart youtube-playlist-rooms nginx
```

## 🚨 Troubleshooting

### Common Issues

1. **Application won't start**
   ```bash
   sudo systemctl status youtube-playlist-rooms
   sudo journalctl -u youtube-playlist-rooms -n 50
   ```

2. **Nginx errors**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. **Permission issues**
   ```bash
   sudo chown -R youtube-rooms:youtube-rooms /opt/youtube-playlist-rooms
   ```

### Performance Optimization

- **Gunicorn Workers**: Adjust based on CPU cores
- **Nginx Caching**: Static file caching enabled
- **Gzip Compression**: Enabled for all text content
- **Rate Limiting**: API endpoint protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- YouTube IFrame API for video integration
- Font Awesome for beautiful icons
- Flask community for the excellent framework
- Let's Encrypt for free SSL certificates

## 📞 Support

If you encounter issues:

1. Check the [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. Review the logs: `sudo journalctl -u youtube-playlist-rooms -f`
3. Verify configuration files
4. Test individual components
5. Check system resources

## 🎉 Success!

Your YouTube Playlist Rooms application is now ready for production use!

- **Local Development**: `http://localhost:5000`
- **Docker**: `http://localhost:5000`
- **VPS with Domain**: `https://yourdomain.com`
- **Health Check**: `https://yourdomain.com/health`

Remember to:
- Monitor logs regularly
- Keep the system updated
- Backup your configuration
- Test functionality periodically
