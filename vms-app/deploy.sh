#!/bin/bash

# VMS Enterprise - Production 1-Click Deployment Script
# Operating System Compatibility: Ubuntu/Debian (Proxmox LXC or VMs)

set -e

echo "=========================================================="
echo "🚀 VMS 2026 Enterprise - Production Setup Initiated"
echo "=========================================================="

# 1. Install Docker & Docker Compose if missing
if ! command -v docker &> /dev/null; then
    echo "📦 Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed successfully."
else
    echo "✅ Docker is already installed."
fi

if ! command -v docker-compose &> /dev/null; then
    echo "📦 Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed successfully."
else
    echo "✅ Docker Compose is already installed."
fi

# 2. Environment Verification
if [ ! -f .env ]; then
    echo "⚙️  Generating production .env file..."
    cat <<EOF > .env
DATABASE_URL="postgresql://vms_user:vmspassword@db:5432/vmsdb?schema=public"
NEXTAUTH_SECRET="vms-secret-key-prod-randomized-$(date +%s)"
NEXTAUTH_URL="http://localhost:3000"
EOF
    echo "✅ Generated .env file."
fi

# 3. Build & Deploy Containers
echo "🏗️  Building and Deploying Containers (PostgreSQL, Next.js Web, Mail Worker)..."
docker-compose down || true
docker-compose up -d --build

# 4. Wait for Database
echo "⏳ Waiting 10 seconds for PostgreSQL to initialize..."
sleep 10

# 5. Execute Prisma Migrations & Seeding
echo "🔐 Pushing Database Schema..."
docker exec -it vms_web npx prisma db push --accept-data-loss || echo "⚠️  Schema push issue, please check DB."

echo "🌱 Seeding initial Data and User Roles..."
docker exec -it vms_web node seed.js || true
docker exec -it vms_web node seed_tenant.js || true

echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "🌐 Your VMS Panel is now running at: http://<your-server-ip>:3000"
echo "👉 Login to the system:"
echo "   User: admin@vms.local"
echo "   Pass: admin123"
echo "=========================================================="
echo "To view logs: docker-compose logs -f web"
