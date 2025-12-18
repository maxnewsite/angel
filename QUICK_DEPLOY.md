# AngelOS - Quick Deployment Guide

**For experienced users.** Full guide: See `HOSTINGER_DEPLOYMENT.md`

## Prerequisites
- Fresh Ubuntu/Debian VPS
- Domain pointed to VPS IP
- Supabase project ready

## 1. Initial Server Setup (5 minutes)

```bash
# SSH into server
ssh root@your_vps_ip

# Quick setup
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt update && apt upgrade -y
apt install -y nodejs nginx git build-essential certbot python3-certbot-nginx
npm install -g pm2
```

## 2. Deploy Application (5 minutes)

```bash
# Clone and setup
cd ~
git clone your-repo.git angel2
cd angel2

# Environment
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NODE_ENV=production
EOF

# Build and start
npm install
npm run build
pm2 start npm --name "angelos" -- start
pm2 save
pm2 startup  # Run the command it outputs
```

## 3. Configure Nginx (3 minutes)

```bash
# Create config
sudo tee /etc/nginx/sites-available/angelos > /dev/null << EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable and restart
sudo ln -s /etc/nginx/sites-available/angelos /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

## 4. Setup Firewall & SSL (3 minutes)

```bash
# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx HTTP'
sudo ufw allow 'Nginx HTTPS'
sudo ufw --force enable

# SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 5. Apply Database Migration (2 minutes)

**Option A - Supabase CLI:**
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-ref
supabase db push
```

**Option B - Manual:**
- Go to Supabase Dashboard → SQL Editor
- Copy/paste `supabase/migrations/20251218_dealflow_analytics.sql`
- Run

## 6. Verify (1 minute)

```bash
pm2 status                    # Should show "online"
curl https://yourdomain.com   # Should return HTML
```

Visit: **https://yourdomain.com**

## Deploy Updates

```bash
cd ~/angel2
git pull
npm install
npm run build
pm2 restart angelos
```

## Useful Commands

```bash
pm2 logs angelos              # View logs
pm2 restart angelos           # Restart app
sudo systemctl restart nginx  # Restart nginx
sudo certbot renew            # Renew SSL
```

## Troubleshooting

**App won't start?**
```bash
pm2 logs angelos --lines 100
cat .env.local  # Verify variables
```

**502 Bad Gateway?**
```bash
pm2 status  # Make sure app is running
sudo systemctl status nginx
```

**Domain not working?**
```bash
nslookup yourdomain.com  # Check DNS
sudo ufw status          # Check firewall
```

## Done! 🚀

Total time: ~20 minutes

See `HOSTINGER_DEPLOYMENT.md` for detailed explanations.
