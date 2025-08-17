#!/bin/bash

# YouTube Playlist Rooms VPS Deployment Script
# This script sets up the application on a fresh Ubuntu/Debian VPS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="youtube-playlist-rooms"
APP_DIR="/opt/$APP_NAME"
SERVICE_USER="youtube-rooms"
DOMAIN="${1:-localhost}"
EMAIL="${2:-admin@example.com}"

echo -e "${BLUE}🚀 YouTube Playlist Rooms VPS Deployment Script${NC}"
echo -e "${YELLOW}Domain: $DOMAIN${NC}"
echo -e "${YELLOW}Email: $EMAIL${NC}"
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_status "Installing required packages..."
apt install -y python3 python3-pip python3-venv nginx curl certbot python3-certbot-nginx git supervisor

# Create application user
print_status "Creating application user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d $APP_DIR $SERVICE_USER
fi

# Create application directory
print_status "Creating application directory..."
mkdir -p $APP_DIR
chown $SERVICE_USER:$SERVICE_USER $APP_DIR

# Clone or copy application files
print_status "Setting up application files..."
if [ -d ".git" ]; then
    # If running from git repository
    cp -r . $APP_DIR/
else
    # If running from local files
    cp -r * $APP_DIR/
fi

# Set proper permissions
chown -R $SERVICE_USER:$SERVICE_USER $APP_DIR

# Create virtual environment
print_status "Setting up Python virtual environment..."
cd $APP_DIR
sudo -u $SERVICE_USER python3 -m venv venv
sudo -u $SERVICE_USER $APP_DIR/venv/bin/pip install --upgrade pip
sudo -u $SERVICE_USER $APP_DIR/venv/bin/pip install -r requirements.txt

# Create logs directory
mkdir -p $APP_DIR/logs
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/logs

# Generate secret key
SECRET_KEY=$(openssl rand -hex 32)

# Create environment file
print_status "Creating environment configuration..."
cat > $APP_DIR/.env << EOF
FLASK_ENV=production
HOST=127.0.0.1
PORT=5000
SECRET_KEY=$SECRET_KEY
CORS_ORIGINS=https://$DOMAIN
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
EOF

chown $SERVICE_USER:$SERVICE_USER $APP_DIR/.env

# Setup systemd service
print_status "Setting up systemd service..."
cp $APP_DIR/systemd.service /etc/systemd/system/$APP_NAME.service
sed -i "s|your-super-secret-key-change-this-in-production|$SECRET_KEY|g" /etc/systemd/system/$APP_NAME.service
sed -i "s|yourdomain.com|$DOMAIN|g" /etc/systemd/system/$APP_NAME.service

systemctl daemon-reload
systemctl enable $APP_NAME
systemctl start $APP_NAME

# Setup Nginx
print_status "Setting up Nginx..."
cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx

# Setup SSL with Let's Encrypt (if domain is not localhost)
if [ "$DOMAIN" != "localhost" ]; then
    print_status "Setting up SSL certificate with Let's Encrypt..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL
fi

# Setup firewall
print_status "Setting up firewall..."
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Create management script
print_status "Creating management script..."
cat > $APP_DIR/manage.sh << 'EOF'
#!/bin/bash

APP_NAME="youtube-playlist-rooms"
APP_DIR="/opt/$APP_NAME"

case "$1" in
    start)
        systemctl start $APP_NAME
        echo "Application started"
        ;;
    stop)
        systemctl stop $APP_NAME
        echo "Application stopped"
        ;;
    restart)
        systemctl restart $APP_NAME
        echo "Application restarted"
        ;;
    status)
        systemctl status $APP_NAME
        ;;
    logs)
        journalctl -u $APP_NAME -f
        ;;
    update)
        cd $APP_DIR
        git pull
        sudo -u youtube-rooms $APP_DIR/venv/bin/pip install -r requirements.txt
        systemctl restart $APP_NAME
        echo "Application updated and restarted"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|update}"
        exit 1
        ;;
esac
EOF

chmod +x $APP_DIR/manage.sh
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/manage.sh

# Final status check
print_status "Performing final status check..."
sleep 5
if systemctl is-active --quiet $APP_NAME; then
    print_status "Application is running successfully!"
else
    print_error "Application failed to start. Check logs with: journalctl -u $APP_NAME"
    exit 1
fi

# Print deployment summary
echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "  • Application: $APP_NAME"
echo -e "  • Directory: $APP_DIR"
echo -e "  • User: $SERVICE_USER"
echo -e "  • Domain: $DOMAIN"
echo -e "  • Port: 5000 (internal), 80/443 (external)"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo -e "  • Start: $APP_DIR/manage.sh start"
echo -e "  • Stop: $APP_DIR/manage.sh stop"
echo -e "  • Restart: $APP_DIR/manage.sh restart"
echo -e "  • Status: $APP_DIR/manage.sh status"
echo -e "  • Logs: $APP_DIR/manage.sh logs"
echo -e "  • Update: $APP_DIR/manage.sh update"
echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
if [ "$DOMAIN" != "localhost" ]; then
    echo -e "  • HTTPS: https://$DOMAIN"
    echo -e "  • HTTP: http://$DOMAIN (redirects to HTTPS)"
else
    echo -e "  • HTTP: http://localhost"
fi
echo ""
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo -e "  • Change the SECRET_KEY in $APP_DIR/.env for production"
echo -e "  • Update CORS_ORIGINS in $APP_DIR/.env if needed"
echo -e "  • Monitor logs: journalctl -u $APP_NAME -f"
echo -e "  • SSL certificate will auto-renew with Let's Encrypt"
echo ""
