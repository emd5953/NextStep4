# AWS Deployment Guide - NextStep Server

## Overview

Deploy the NextStep server with RAG chatbot to AWS EC2 using the free tier.

## Prerequisites

- AWS Account (with free tier eligibility)
- SSH client (PuTTY for Windows or built-in terminal)
- Your project code
- Domain name (optional)

## Architecture

```
Internet
    ↓
AWS EC2 Instance (t2.micro)
    ├── Docker (ChromaDB on port 8000)
    ├── Node.js Server (port 4000)
    └── Nginx (reverse proxy, port 80/443)
    
MongoDB Atlas (separate, free tier)
```

## Part 1: AWS EC2 Setup

### 1.1 Create EC2 Instance

1. **Go to AWS Console** → EC2 → Launch Instance

2. **Configure Instance:**
   - **Name:** `nextstep-server`
   - **AMI:** Ubuntu Server 22.04 LTS (Free tier eligible)
   - **Instance Type:** t2.micro (1 vCPU, 1GB RAM) - Free tier
   - **Key Pair:** Create new key pair
     - Name: `nextstep-key`
     - Type: RSA
     - Format: `.pem` (for Mac/Linux) or `.ppk` (for PuTTY/Windows)
     - **Download and save securely!**

3. **Network Settings:**
   - Create security group: `nextstep-sg`
   - Allow:
     - SSH (port 22) - Your IP only
     - HTTP (port 80) - Anywhere
     - HTTPS (port 443) - Anywhere
     - Custom TCP (port 4000) - Anywhere (for testing)

4. **Storage:** 8GB gp3 (Free tier includes 30GB)

5. **Launch Instance**

### 1.2 Connect to Instance

**For Windows (using PuTTY):**
```bash
# Convert .pem to .ppk using PuTTYgen
# Then connect via PuTTY using the .ppk file
Host: ubuntu@<your-ec2-public-ip>
```

**For Mac/Linux:**
```bash
chmod 400 nextstep-key.pem
ssh -i nextstep-key.pem ubuntu@<your-ec2-public-ip>
```

## Part 2: Server Setup

### 2.1 Update System

```bash
sudo apt update
sudo apt upgrade -y
```

### 2.2 Install Node.js

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v20.x
npm --version
```

### 2.3 Install Docker

```bash
# Install Docker
sudo apt install -y docker.io

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (no sudo needed)
sudo usermod -aG docker ubuntu

# Log out and back in for group changes
exit
# Then reconnect via SSH
```

### 2.4 Install Git

```bash
sudo apt install -y git
```

## Part 3: Deploy Application

### 3.1 Clone Repository

```bash
cd ~
git clone https://github.com/your-username/NextStep4.git
cd NextStep4/server
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Configure Environment

```bash
# Create .env file
nano .env
```

Add your environment variables:
```env
# MongoDB
MONGODB_URI=your_mongodb_atlas_connection_string

# Authentication
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://your-ec2-ip:4000/auth/google/callback

# Email
MJ_API_KEY=your_mailjet_api_key
MJ_PRIVATE_KEY=your_mailjet_private_key
EMAIL_FROM=your_email@example.com

# AI/RAG
GEMINI_API_KEY=your_gemini_api_key
RAG_GENERATION_MODEL=gemini-2.5-flash
RAG_EMBEDDING_MODEL=text-embedding-004

# Vector Store
RAG_CHROMA_HOST=localhost
RAG_CHROMA_PORT=8000
RAG_COLLECTION_NAME=nextstep_docs

# Server
PORT=4000
SERVER_DOMAIN=http://your-ec2-ip:4000
NODE_ENV=production
```

Save: `Ctrl+X`, `Y`, `Enter`

### 3.4 Start ChromaDB

```bash
# Start ChromaDB container
docker run -d \
  --name chromadb \
  --restart unless-stopped \
  -p 8000:8000 \
  -v ~/chroma-data:/chroma/chroma \
  chromadb/chroma

# Verify it's running
docker ps
```

### 3.5 Ingest Documentation

```bash
# Ingest your documentation
npm run ingest:docs

# You should see:
# ✓ Files processed: X
# ✓ Total chunks created: XX
```

## Part 4: Run Server with PM2

### 4.1 Install PM2

```bash
sudo npm install -g pm2
```

### 4.2 Start Server

```bash
# Start server with PM2
pm2 start server.js --name nextstep-server

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs
```

### 4.3 Verify Server

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs nextstep-server

# Test endpoint
curl http://localhost:4000/api/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"What is NextStep?"}'
```

## Part 5: Setup Nginx (Optional but Recommended)

### 5.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 5.2 Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/nextstep
```

Add configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or your EC2 public IP

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 5.3 Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/nextstep /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 5.4 Setup SSL (Optional - Free with Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (requires domain name)
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

## Part 6: Frontend Deployment

Update your frontend to point to the AWS server:

```javascript
// In src/components/ChatWidget.js or config
const API_URL = 'http://your-ec2-ip:4000';  // Or https://your-domain.com

const response = await fetch(`${API_URL}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: currentInput }),
});
```

## Part 7: Monitoring & Maintenance

### 7.1 PM2 Commands

```bash
# View logs
pm2 logs nextstep-server

# Restart server
pm2 restart nextstep-server

# Stop server
pm2 stop nextstep-server

# Monitor resources
pm2 monit
```

### 7.2 Docker Commands

```bash
# Check ChromaDB status
docker ps

# View ChromaDB logs
docker logs chromadb

# Restart ChromaDB
docker restart chromadb

# Stop ChromaDB
docker stop chromadb
```

### 7.3 Update Application

```bash
cd ~/NextStep4
git pull origin main
cd server
npm install
pm2 restart nextstep-server
```

### 7.4 Re-ingest Documentation

```bash
cd ~/NextStep4/server
npm run ingest:docs
```

## Troubleshooting

### Server Won't Start

```bash
# Check logs
pm2 logs nextstep-server

# Check if port is in use
sudo lsof -i :4000

# Restart
pm2 restart nextstep-server
```

### ChromaDB Connection Failed

```bash
# Check if running
docker ps

# Check logs
docker logs chromadb

# Restart
docker restart chromadb
```

### Out of Memory

```bash
# Check memory usage
free -h

# If low, create swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Can't Connect from Browser

1. Check security group allows port 80/443
2. Check Nginx is running: `sudo systemctl status nginx`
3. Check server is running: `pm2 status`
4. Check firewall: `sudo ufw status`

## Cost Estimation

### Free Tier (First 12 Months)
- EC2 t2.micro: 750 hours/month - **FREE**
- 30GB EBS storage - **FREE**
- Data transfer: 15GB/month - **FREE**

### After Free Tier
- EC2 t2.micro: ~$8.50/month
- 8GB EBS storage: ~$0.80/month
- Data transfer: ~$1-5/month
- **Total: ~$10-15/month**

### Ways to Reduce Costs
1. Use t3.micro instead (slightly cheaper)
2. Use Reserved Instances (save 30-40%)
3. Stop instance when not in use
4. Use AWS Lightsail instead (~$3.50/month)

## Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Use environment variables** (never commit secrets)

3. **Restrict SSH access** to your IP only

4. **Use SSL/HTTPS** in production

5. **Regular backups:**
   ```bash
   # Backup ChromaDB data
   docker exec chromadb tar czf /tmp/chroma-backup.tar.gz /chroma/chroma
   docker cp chromadb:/tmp/chroma-backup.tar.gz ~/backups/
   ```

6. **Monitor logs regularly:**
   ```bash
   pm2 logs
   docker logs chromadb
   ```

## Alternative: AWS Lightsail (Simpler)

If EC2 is too complex, use **AWS Lightsail**:
- Fixed pricing: $3.50/month (512MB RAM)
- Simpler interface
- Includes static IP
- Same setup process

## Support

For issues:
1. Check PM2 logs: `pm2 logs`
2. Check Docker logs: `docker logs chromadb`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Review this guide
5. Check AWS documentation

---

**Deployment Checklist:**
- [ ] EC2 instance created
- [ ] SSH access working
- [ ] Node.js installed
- [ ] Docker installed
- [ ] Repository cloned
- [ ] .env configured
- [ ] ChromaDB running
- [ ] Documentation ingested
- [ ] Server running with PM2
- [ ] Nginx configured (optional)
- [ ] SSL setup (optional)
- [ ] Frontend updated with API URL
- [ ] Tested from browser

**Estimated Setup Time:** 1-2 hours

Good luck! 🚀
