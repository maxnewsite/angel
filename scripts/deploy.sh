#!/bin/bash
# AngelOS Deployment Script
# Run this script on your VPS to deploy updates

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Navigate to project directory
cd ~/angel2

# Pull latest changes
echo "📥 Pulling latest changes from Git..."
git pull origin master

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build application
echo "🔨 Building application..."
npm run build

# Restart PM2
echo "♻️  Restarting application..."
pm2 restart angelos

# Show status
echo "✅ Deployment complete!"
pm2 status
pm2 logs angelos --lines 20
