#!/bin/bash

# Production Verification Script for NextStep Server
# Run this after deployment to verify everything is working

echo "=========================================="
echo "NextStep Production Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo "1. Checking Docker..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker is installed"
    if sudo systemctl is-active --quiet docker; then
        echo -e "${GREEN}✓${NC} Docker service is running"
    else
        echo -e "${RED}✗${NC} Docker service is NOT running"
        echo "   Run: sudo systemctl start docker"
    fi
else
    echo -e "${RED}✗${NC} Docker is NOT installed"
fi
echo ""

# Check ChromaDB Container
echo "2. Checking ChromaDB..."
if docker ps | grep -q chromadb; then
    echo -e "${GREEN}✓${NC} ChromaDB container is running"
    
    # Check restart policy
    RESTART_POLICY=$(docker inspect chromadb | grep -A 1 '"RestartPolicy"' | grep '"Name"' | cut -d'"' -f4)
    if [ "$RESTART_POLICY" = "always" ]; then
        echo -e "${GREEN}✓${NC} ChromaDB restart policy: always"
    else
        echo -e "${YELLOW}⚠${NC} ChromaDB restart policy: $RESTART_POLICY (should be 'always')"
    fi
    
    # Check if responding
    if curl -s http://localhost:8000/api/v1/heartbeat > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} ChromaDB is responding on port 8000"
    else
        echo -e "${RED}✗${NC} ChromaDB is NOT responding"
    fi
else
    echo -e "${RED}✗${NC} ChromaDB container is NOT running"
    echo "   Run: docker start chromadb"
fi
echo ""

# Check ChromaDB Data
echo "3. Checking ChromaDB Data..."
if [ -d ~/chroma-data ]; then
    DATA_SIZE=$(du -sh ~/chroma-data 2>/dev/null | cut -f1)
    echo -e "${GREEN}✓${NC} ChromaDB data directory exists (Size: $DATA_SIZE)"
else
    echo -e "${RED}✗${NC} ChromaDB data directory NOT found"
fi
echo ""

# Check Node.js
echo "4. Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js is installed ($NODE_VERSION)"
else
    echo -e "${RED}✗${NC} Node.js is NOT installed"
fi
echo ""

# Check PM2
echo "5. Checking PM2..."
if command -v pm2 &> /dev/null; then
    echo -e "${GREEN}✓${NC} PM2 is installed"
    
    if pm2 list | grep -q nextstep-server; then
        STATUS=$(pm2 list | grep nextstep-server | awk '{print $10}')
        if [ "$STATUS" = "online" ]; then
            echo -e "${GREEN}✓${NC} NextStep server is running"
        else
            echo -e "${RED}✗${NC} NextStep server status: $STATUS"
        fi
    else
        echo -e "${RED}✗${NC} NextStep server is NOT running in PM2"
        echo "   Run: pm2 start server.js --name nextstep-server"
    fi
else
    echo -e "${RED}✗${NC} PM2 is NOT installed"
fi
echo ""

# Check Server Port
echo "6. Checking Server Port..."
if netstat -tuln 2>/dev/null | grep -q ':4000' || ss -tuln 2>/dev/null | grep -q ':4000'; then
    echo -e "${GREEN}✓${NC} Server is listening on port 4000"
else
    echo -e "${RED}✗${NC} Nothing is listening on port 4000"
fi
echo ""

# Check Nginx (optional)
echo "7. Checking Nginx (optional)..."
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✓${NC} Nginx is installed"
    if sudo systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓${NC} Nginx service is running"
    else
        echo -e "${YELLOW}⚠${NC} Nginx service is NOT running"
    fi
else
    echo -e "${YELLOW}⚠${NC} Nginx is NOT installed (optional)"
fi
echo ""

# Check Cron Jobs
echo "8. Checking Cron Jobs..."
if crontab -l 2>/dev/null | grep -q check-chromadb; then
    echo -e "${GREEN}✓${NC} ChromaDB health check cron job is configured"
else
    echo -e "${YELLOW}⚠${NC} ChromaDB health check cron job NOT found"
fi

if crontab -l 2>/dev/null | grep -q backup-chromadb; then
    echo -e "${GREEN}✓${NC} ChromaDB backup cron job is configured"
else
    echo -e "${YELLOW}⚠${NC} ChromaDB backup cron job NOT found"
fi
echo ""

# Test API Endpoint
echo "9. Testing API Endpoint..."
if curl -s http://localhost:4000/api/jobs > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API endpoint /api/jobs is responding"
else
    echo -e "${RED}✗${NC} API endpoint /api/jobs is NOT responding"
fi
echo ""

# Summary
echo "=========================================="
echo "Verification Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. If any checks failed, follow the suggestions above"
echo "2. Check logs: pm2 logs nextstep-server"
echo "3. Check ChromaDB logs: docker logs chromadb"
echo "4. Test from browser: http://your-server-ip:4000/api/jobs"
echo ""
