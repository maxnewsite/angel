#!/bin/bash
# AngelOS Initial Server Setup Script
# Run this script once on a fresh VPS

set -e

echo "🔧 AngelOS Server Setup Script"
echo "================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (or use sudo)"
  exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential tools
echo "🛠️  Installing essential tools..."
apt install -y curl wget git build-essential nginx ufw

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installations
echo "✅ Verifying installations..."
node --version
npm --version
nginx -v

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Setup firewall
echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx HTTP'
ufw allow 'Nginx HTTPS'
echo "y" | ufw enable

# Create application user (optional but recommended)
read -p "Create non-root user 'angel'? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if id "angel" &>/dev/null; then
        echo "ℹ️  User 'angel' already exists"
    else
        adduser --gecos "" angel
        usermod -aG sudo angel
        echo "✅ User 'angel' created"
    fi
fi

# Install Certbot for SSL
echo "🔐 Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

echo ""
echo "✅ Initial setup complete!"
echo ""
echo "Next steps:"
echo "1. Switch to angel user: su - angel"
echo "2. Clone your repository: git clone <your-repo> ~/angel2"
echo "3. Navigate to project: cd ~/angel2"
echo "4. Create .env.local file with your environment variables"
echo "5. Run: npm install && npm run build"
echo "6. Start with PM2: pm2 start npm --name angelos -- start"
echo "7. Configure Nginx (see HOSTINGER_DEPLOYMENT.md)"
echo "8. Setup SSL: sudo certbot --nginx -d yourdomain.com"
