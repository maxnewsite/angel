# AngelOS Deployment Guide - Hostinger VPS

Complete step-by-step guide to deploy your Next.js + Supabase application on Hostinger Virtual Server.

## Prerequisites

- Hostinger VPS account with root access
- Domain name pointed to your VPS IP
- Supabase project URL and anon key
- SSH client (Windows: PuTTY, WSL, or PowerShell; Mac/Linux: Terminal)

---

## Part 1: Initial Server Setup

### Step 1: Connect to Your VPS

```bash
# SSH into your server (replace with your IP)
ssh root@your_server_ip

# If you have a password, enter it when prompted
# If you have an SSH key, it should connect automatically
```

### Step 2: Update System Packages

```bash
# Update package lists
apt update

# Upgrade installed packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git build-essential
```

### Step 3: Create a Non-Root User (Recommended)

```bash
# Create new user
adduser angel

# Add user to sudo group
usermod -aG sudo angel

# Switch to new user
su - angel
```

---

## Part 2: Install Node.js and npm

### Option A: Install Node.js 20.x (Recommended for Next.js 14)

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Option B: Using NVM (Node Version Manager)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version
npm --version
```

---

## Part 3: Clone and Setup Your Application

### Step 1: Clone Repository

```bash
# Navigate to home directory
cd ~

# If using Git repository
git clone https://github.com/yourusername/angel2.git
cd angel2

# OR if uploading files manually, create directory
mkdir -p ~/angel2
cd ~/angel2
```

### Step 2: Upload Files (If Not Using Git)

**From your local machine:**

```bash
# Using SCP (from your Windows machine)
scp -r C:\Users\spiri\angel2\* angel@your_server_ip:~/angel2/

# OR using WinSCP (GUI tool for Windows)
# Download: https://winscp.net/
# Connect and drag/drop files
```

### Step 3: Create Environment File

```bash
# Navigate to project directory
cd ~/angel2

# Create .env.local file
nano .env.local
```

**Add the following content:**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Production URL
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Node Environment
NODE_ENV=production
```

**Save and exit:** Press `Ctrl + X`, then `Y`, then `Enter`

### Step 4: Install Dependencies

```bash
# Install all npm packages
npm install

# This may take 5-10 minutes
```

### Step 5: Build the Application

```bash
# Build Next.js for production
npm run build

# This creates an optimized production build
# Should take 2-5 minutes
```

---

## Part 4: Install and Configure PM2

PM2 keeps your application running and restarts it if it crashes.

### Step 1: Install PM2 Globally

```bash
sudo npm install -g pm2
```

### Step 2: Start Application with PM2

```bash
# Start the application
pm2 start npm --name "angelos" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# Copy and run the command that PM2 outputs
# It will look like: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u angel --hp /home/angel
```

### Step 3: PM2 Useful Commands

```bash
# View running applications
pm2 list

# View logs
pm2 logs angelos

# Restart application
pm2 restart angelos

# Stop application
pm2 stop angelos

# Monitor CPU/Memory
pm2 monit
```

---

## Part 5: Install and Configure Nginx

Nginx acts as a reverse proxy and handles SSL.

### Step 1: Install Nginx

```bash
sudo apt install -y nginx
```

### Step 2: Configure Nginx for Your Application

```bash
# Create nginx configuration file
sudo nano /etc/nginx/sites-available/angelos
```

**Add this configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect all HTTP to HTTPS (will be configured later)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Save and exit:** `Ctrl + X`, `Y`, `Enter`

### Step 3: Enable the Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/angelos /etc/nginx/sites-enabled/

# Remove default nginx page
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Enable nginx to start on boot
sudo systemctl enable nginx
```

---

## Part 6: Configure Domain and Firewall

### Step 1: Configure Firewall (UFW)

```bash
# Allow SSH
sudo ufw allow OpenSSH

# Allow HTTP
sudo ufw allow 'Nginx HTTP'

# Allow HTTPS
sudo ufw allow 'Nginx HTTPS'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 2: Point Domain to VPS

**In your domain registrar (Namecheap, GoDaddy, Hostinger, etc.):**

1. Go to DNS settings
2. Add/Update A records:
   ```
   Type: A
   Name: @
   Value: your_vps_ip_address
   TTL: 3600

   Type: A
   Name: www
   Value: your_vps_ip_address
   TTL: 3600
   ```
3. Wait 5-30 minutes for DNS propagation

### Step 3: Verify Domain

```bash
# Test if domain resolves
ping yourdomain.com

# You should see your VPS IP address
```

---

## Part 7: Setup SSL Certificate (HTTPS)

### Step 1: Install Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Obtain SSL Certificate

```bash
# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# 1. Enter your email address
# 2. Agree to terms (Y)
# 3. Choose whether to share email (Y/N)
# 4. Choose to redirect HTTP to HTTPS (option 2)
```

### Step 3: Test SSL Auto-Renewal

```bash
# Certbot auto-renews certificates before expiry
# Test the renewal process
sudo certbot renew --dry-run

# If successful, your SSL will auto-renew
```

---

## Part 8: Apply Database Migrations

### Step 1: Apply Analytics Migration

```bash
cd ~/angel2

# Install Supabase CLI if needed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Step 2: Manual Migration (Alternative)

If CLI doesn't work:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy content from `supabase/migrations/20251218_dealflow_analytics.sql`
4. Paste and run in SQL Editor

---

## Part 9: Verify Deployment

### Step 1: Check Application Status

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs angelos --lines 50

# Check if app is responding
curl http://localhost:3000
```

### Step 2: Check Nginx Status

```bash
# Check nginx status
sudo systemctl status nginx

# View nginx error logs if issues
sudo tail -f /var/log/nginx/error.log
```

### Step 3: Test Website

```bash
# Test from server
curl https://yourdomain.com

# Test from browser
# Visit: https://yourdomain.com
# Should see your application
```

---

## Part 10: Post-Deployment Configuration

### Step 1: Setup Automatic Deployments

Create a deployment script:

```bash
# Create deploy script
nano ~/deploy.sh
```

**Add this content:**

```bash
#!/bin/bash
cd ~/angel2

echo "Pulling latest changes..."
git pull origin master

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Restarting PM2..."
pm2 restart angelos

echo "Deployment complete!"
```

**Make executable:**

```bash
chmod +x ~/deploy.sh
```

**To deploy updates:**

```bash
~/deploy.sh
```

### Step 2: Setup Log Rotation

```bash
# PM2 handles log rotation automatically
pm2 install pm2-logrotate

# Configure (optional)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Step 3: Setup Monitoring

```bash
# Enable PM2 web dashboard (optional)
pm2 web

# Access at: http://your_server_ip:9615
```

---

## Part 11: Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs angelos --lines 100

# Check for port conflicts
sudo lsof -i :3000

# Restart application
pm2 restart angelos

# Rebuild if needed
cd ~/angel2
npm run build
pm2 restart angelos
```

### Nginx Issues

```bash
# Test nginx configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually if needed
sudo certbot renew --force-renewal

# Restart nginx after renewal
sudo systemctl restart nginx
```

### Domain Not Resolving

```bash
# Check DNS propagation
nslookup yourdomain.com

# Check if nginx is listening
sudo netstat -tlnp | grep nginx

# Check firewall
sudo ufw status
```

### Out of Memory

```bash
# Check memory usage
free -h

# If low, add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Part 12: Maintenance Tasks

### Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js packages
cd ~/angel2
npm update

# Rebuild and restart
npm run build
pm2 restart angelos
```

### Backup Database

Your data is in Supabase (already backed up automatically), but for configs:

```bash
# Backup environment file
cp ~/angel2/.env.local ~/angel2/.env.local.backup

# Backup nginx config
sudo cp /etc/nginx/sites-available/angelos ~/angelos-nginx.backup
```

### Monitor Disk Space

```bash
# Check disk usage
df -h

# Clean up old logs if needed
pm2 flush

# Clean npm cache
npm cache clean --force
```

---

## Part 13: Security Checklist

- [ ] Firewall enabled (UFW)
- [ ] SSH key authentication (disable password auth)
- [ ] Non-root user created
- [ ] SSL certificate installed
- [ ] Environment variables secured (.env.local not public)
- [ ] Regular system updates scheduled
- [ ] PM2 running as non-root user
- [ ] Nginx configured with security headers

### Optional Security Enhancements

```bash
# Disable SSH password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd

# Install fail2ban (protects against brute force)
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Quick Reference Commands

```bash
# Application Management
pm2 list                    # List all apps
pm2 logs angelos           # View logs
pm2 restart angelos        # Restart app
pm2 stop angelos           # Stop app
pm2 start angelos          # Start app

# Nginx Management
sudo systemctl status nginx    # Check status
sudo systemctl restart nginx   # Restart
sudo nginx -t                  # Test config

# SSL Certificate
sudo certbot renew            # Renew SSL
sudo certbot certificates     # Check status

# System
df -h                         # Disk space
free -h                       # Memory usage
htop                          # Resource monitor
sudo ufw status               # Firewall status

# Deployment
cd ~/angel2 && git pull && npm install && npm run build && pm2 restart angelos
```

---

## Environment-Specific Notes

### Production vs Development

**Development (local):**
- Uses `npm run dev`
- Hot reload enabled
- Detailed error messages

**Production (VPS):**
- Uses `npm run build` then `npm start`
- Optimized build
- Generic error messages (more secure)

### Port Configuration

- **Next.js**: Runs on port 3000 internally
- **Nginx**: Listens on port 80 (HTTP) and 443 (HTTPS)
- **Nginx proxies**: External requests → Port 80/443 → Port 3000 (Next.js)

---

## Support Resources

- **Hostinger Support**: https://www.hostinger.com/tutorials/vps
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/usage/quick-start/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Certbot Documentation**: https://certbot.eff.org/

---

## Quick Start Summary

```bash
# 1. Connect
ssh root@your_server_ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

# 3. Clone project
git clone your-repo.git ~/angel2
cd ~/angel2

# 4. Setup environment
nano .env.local
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 5. Install and build
npm install
npm run build

# 6. Setup PM2
sudo npm install -g pm2
pm2 start npm --name "angelos" -- start
pm2 save
pm2 startup

# 7. Configure Nginx
sudo nano /etc/nginx/sites-available/angelos
# Add proxy configuration
sudo ln -s /etc/nginx/sites-available/angelos /etc/nginx/sites-enabled/
sudo systemctl restart nginx

# 8. Setup SSL
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com

# 9. Done!
# Visit https://yourdomain.com
```

---

## Need Help?

If you encounter issues:
1. Check PM2 logs: `pm2 logs angelos`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify environment variables: `cat ~/angel2/.env.local`
4. Test build locally first: `npm run build && npm start`
5. Ensure Supabase URL and keys are correct
