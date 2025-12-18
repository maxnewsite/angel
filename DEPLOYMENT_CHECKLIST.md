# AngelOS Deployment Checklist

Use this checklist to ensure a smooth deployment to Hostinger VPS.

## Pre-Deployment Preparation

### Local Machine
- [ ] Ensure all code is committed to Git
- [ ] Test build locally: `npm run build && npm start`
- [ ] Verify environment variables in `.env.local`
- [ ] Note your Supabase project URL and anon key
- [ ] Have your domain name ready
- [ ] Have Hostinger VPS credentials

### Supabase
- [ ] Database migrations are tested locally
- [ ] RLS (Row Level Security) policies are configured
- [ ] Storage buckets are created if needed
- [ ] API keys are accessible

---

## Server Setup (One-Time)

### Initial Access
- [ ] SSH into VPS: `ssh root@your_server_ip`
- [ ] Change root password (if needed): `passwd`
- [ ] Update system: `apt update && apt upgrade -y`

### Software Installation
- [ ] Install Node.js 20.x
- [ ] Install npm
- [ ] Install Git
- [ ] Install Nginx
- [ ] Install PM2: `npm install -g pm2`
- [ ] Install Certbot: `apt install -y certbot python3-certbot-nginx`

### Security Setup
- [ ] Create non-root user: `adduser angel`
- [ ] Add user to sudo: `usermod -aG sudo angel`
- [ ] Configure UFW firewall
  - [ ] Allow SSH: `ufw allow OpenSSH`
  - [ ] Allow HTTP: `ufw allow 'Nginx HTTP'`
  - [ ] Allow HTTPS: `ufw allow 'Nginx HTTPS'`
  - [ ] Enable: `ufw enable`

---

## Application Deployment

### Code Setup
- [ ] Clone repository or upload files
- [ ] Navigate to project: `cd ~/angel2`
- [ ] Create `.env.local` with production values
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  NEXT_PUBLIC_SITE_URL=https://yourdomain.com
  NODE_ENV=production
  ```
- [ ] Install dependencies: `npm install`
- [ ] Build application: `npm run build`

### PM2 Setup
- [ ] Start app: `pm2 start npm --name "angelos" -- start`
- [ ] Verify running: `pm2 status`
- [ ] Check logs: `pm2 logs angelos --lines 50`
- [ ] Save PM2 config: `pm2 save`
- [ ] Setup startup: `pm2 startup` (run the command it outputs)

### Test Application
- [ ] Test locally on server: `curl http://localhost:3000`
- [ ] Should return HTML content

---

## Nginx Configuration

### Setup Nginx
- [ ] Create config: `sudo nano /etc/nginx/sites-available/angelos`
- [ ] Copy template from `scripts/nginx-config.template`
- [ ] Replace `yourdomain.com` with your actual domain
- [ ] Link config: `sudo ln -s /etc/nginx/sites-available/angelos /etc/nginx/sites-enabled/`
- [ ] Remove default: `sudo rm /etc/nginx/sites-enabled/default`
- [ ] Test config: `sudo nginx -t`
- [ ] Restart Nginx: `sudo systemctl restart nginx`
- [ ] Enable on boot: `sudo systemctl enable nginx`

### Verify Nginx
- [ ] Check status: `sudo systemctl status nginx`
- [ ] Test from server: `curl http://localhost`
- [ ] Should proxy to Next.js app

---

## Domain Configuration

### DNS Setup (In Domain Registrar)
- [ ] Add A record: `@` → `your_vps_ip`
- [ ] Add A record: `www` → `your_vps_ip`
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Verify: `ping yourdomain.com`

### Test HTTP Access
- [ ] Visit: `http://yourdomain.com`
- [ ] Should see your application
- [ ] No SSL warning yet (expected)

---

## SSL Certificate Setup

### Install SSL with Certbot
- [ ] Run: `sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com`
- [ ] Enter email address
- [ ] Agree to terms
- [ ] Choose redirect HTTP to HTTPS (option 2)
- [ ] Wait for certificate generation

### Verify SSL
- [ ] Visit: `https://yourdomain.com`
- [ ] Should see green padlock
- [ ] Check certificate: Valid and not expired
- [ ] Test auto-renewal: `sudo certbot renew --dry-run`

---

## Database Migration

### Apply Supabase Migrations
- [ ] Option A: Using Supabase CLI
  ```bash
  npm install -g supabase
  supabase login
  supabase link --project-ref your-ref
  supabase db push
  ```
- [ ] Option B: Manual via Dashboard
  - [ ] Copy SQL from `supabase/migrations/20251218_dealflow_analytics.sql`
  - [ ] Paste in Supabase SQL Editor
  - [ ] Run migration
  - [ ] Verify views created: `SELECT * FROM dealflow_waterfall_stats;`

---

## Final Verification

### Application Health Check
- [ ] PM2 status: `pm2 status` (should show "online")
- [ ] PM2 logs: `pm2 logs angelos --lines 20` (no errors)
- [ ] Disk space: `df -h` (sufficient space)
- [ ] Memory: `free -h` (not maxed out)

### Website Functionality
- [ ] Homepage loads: `https://yourdomain.com`
- [ ] Authentication works (login/signup)
- [ ] Supabase connection works
- [ ] Navigation works
- [ ] Analytics page loads: `/app/analytics`
- [ ] Portfolio page loads: `/app/portfolio`
- [ ] Deal pages work
- [ ] File uploads work (if applicable)

### Performance Check
- [ ] Page load time < 3 seconds
- [ ] No console errors in browser
- [ ] Mobile responsive
- [ ] SSL certificate valid

---

## Post-Deployment Tasks

### Documentation
- [ ] Document server IP address
- [ ] Document SSH credentials
- [ ] Save `.env.local` backup securely
- [ ] Document deployment process for team

### Monitoring Setup
- [ ] Setup PM2 monitoring: `pm2 web` (optional)
- [ ] Configure log rotation: `pm2 install pm2-logrotate`
- [ ] Setup uptime monitoring (UptimeRobot, Pingdom, etc.)

### Backups
- [ ] Backup `.env.local`: `cp .env.local .env.backup`
- [ ] Backup Nginx config: `sudo cp /etc/nginx/sites-available/angelos ~/angelos-nginx.backup`
- [ ] Document backup strategy

### Security Hardening
- [ ] Setup SSH key authentication (disable password)
- [ ] Install fail2ban: `sudo apt install fail2ban`
- [ ] Regular security updates schedule
- [ ] Monitor access logs

---

## Deployment Script Setup

### Create Deploy Script
- [ ] Copy `scripts/deploy.sh` to server
- [ ] Make executable: `chmod +x ~/deploy.sh`
- [ ] Test: `~/deploy.sh`

### Future Deployments
To deploy updates:
```bash
ssh angel@your_server_ip
cd ~/angel2
./deploy.sh
```

Or directly:
```bash
cd ~/angel2 && git pull && npm install && npm run build && pm2 restart angelos
```

---

## Troubleshooting Checklist

### If Application Won't Start
- [ ] Check PM2 logs: `pm2 logs angelos --lines 100`
- [ ] Verify `.env.local` exists and has correct values
- [ ] Check port 3000 not in use: `sudo lsof -i :3000`
- [ ] Rebuild: `npm run build`
- [ ] Restart: `pm2 restart angelos`

### If Website Not Accessible
- [ ] Check Nginx status: `sudo systemctl status nginx`
- [ ] Test Nginx config: `sudo nginx -t`
- [ ] Check firewall: `sudo ufw status`
- [ ] Verify DNS: `nslookup yourdomain.com`
- [ ] Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### If SSL Issues
- [ ] Check certificate: `sudo certbot certificates`
- [ ] Renew manually: `sudo certbot renew --force-renewal`
- [ ] Restart Nginx: `sudo systemctl restart nginx`

### If Database Issues
- [ ] Verify Supabase URL and key in `.env.local`
- [ ] Test connection from server
- [ ] Check RLS policies in Supabase
- [ ] Verify migrations applied

---

## Maintenance Schedule

### Daily
- [ ] Check PM2 status: `pm2 status`
- [ ] Review logs for errors: `pm2 logs angelos --lines 50`

### Weekly
- [ ] Check disk space: `df -h`
- [ ] Check memory: `free -h`
- [ ] Review Nginx access logs

### Monthly
- [ ] Update system: `sudo apt update && sudo apt upgrade`
- [ ] Update npm packages: `npm update`
- [ ] Backup environment and configs
- [ ] Review SSL certificate status

---

## Emergency Contacts

- **Hostinger Support**: https://www.hostinger.com/tutorials/vps
- **Supabase Support**: https://supabase.com/support
- **Server Admin**: [Your contact]
- **Domain Registrar**: [Your registrar support]

---

## Quick Commands Reference

```bash
# Application
pm2 list                      # List apps
pm2 logs angelos             # View logs
pm2 restart angelos          # Restart
pm2 stop angelos             # Stop

# Nginx
sudo systemctl restart nginx  # Restart
sudo nginx -t                # Test config
sudo tail -f /var/log/nginx/error.log  # View errors

# SSL
sudo certbot renew           # Renew SSL
sudo certbot certificates    # Check status

# System
df -h                        # Disk space
free -h                      # Memory
htop                         # Monitor

# Deploy updates
cd ~/angel2 && git pull && npm install && npm run build && pm2 restart angelos
```

---

## Deployment Complete! 🎉

Your AngelOS application should now be live at: **https://yourdomain.com**

Remember to:
- Monitor logs regularly
- Keep system updated
- Backup important data
- Document any changes
