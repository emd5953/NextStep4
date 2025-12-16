# CI/CD Pipeline - NextStep Backend

## Overview

NextStep uses **GitHub Actions** for continuous integration and deployment. Every push to the `main` branch automatically tests and deploys the backend to AWS EC2.

## Pipeline Architecture

```
Push to main branch
    ↓
GitHub Actions Triggered
    ↓
1. Install Dependencies
    ↓
2. Start ChromaDB (for testing)
    ↓
3. Run ALL Tests (including RAG)
    ↓
Tests Pass? ──NO──> ❌ Deployment Stops
    ↓ YES
4. SSH into EC2
    ↓
5. Pull Latest Code
    ↓
6. Install Dependencies
    ↓
7. Restart ChromaDB
    ↓
8. Re-ingest Docs (if changed)
    ↓
9. Restart PM2 Server
    ↓
10. Verify Deployment
    ↓
✅ Deployment Complete
```

## Workflow Details

### Trigger Conditions

The pipeline runs when you push to `main` and any of these files change:
- `server/**` - Any backend code
- `Dockerfile` - Docker configuration
- `docker-compose.yml` - Docker Compose config
- `.github/workflows/deploy-backend.yml` - The workflow itself

### CI Phase (Testing)

**1. Setup Environment**
- Checks out code from GitHub
- Installs Node.js 18
- Caches npm dependencies for faster builds

**2. Install Dependencies**
```bash
npm ci  # Clean install (faster than npm install)
```

**3. Start ChromaDB**
```bash
docker run -d --name chromadb -p 8000:8000 chromadb/chroma
```
- Starts ChromaDB container for testing
- Waits 5 seconds for startup
- Verifies with heartbeat check

**4. Run Tests**
```bash
npm test
```
Environment variables provided:
- `GEMINI_API_KEY` - For AI/RAG tests
- `MONGODB_URI` - For database tests
- `JWT_SECRET` - For auth tests
- `RAG_CHROMA_HOST=localhost` - ChromaDB location
- `RAG_CHROMA_PORT=8000` - ChromaDB port

**Tests include:**
- Authentication tests
- Job posting tests
- Application tracking tests
- RAG chatbot tests
- Vector store tests
- Document ingestion tests
- Embedding service tests

### CD Phase (Deployment)

**5. SSH Connection**
- Creates SSH key from GitHub secret
- Connects to EC2 instance
- Executes deployment commands

**6. Pull Latest Code**
```bash
git pull origin main
```

**7. Install Dependencies**
```bash
cd server
npm install
```

**8. Restart ChromaDB**
```bash
docker restart chromadb || docker start chromadb
```

**9. Smart Document Re-ingestion**
```bash
if git diff HEAD@{1} HEAD --name-only | grep -q "server/docs/"; then
  npm run ingest:docs
fi
```
- Checks if any files in `server/docs/` changed
- Only re-ingests if docs were modified
- Also re-ingests on first deployment (if chroma data missing)

**10. Restart Server**
```bash
pm2 restart nextstep-server || pm2 start server.js --name nextstep-server
```

**11. Verify Deployment**
- Checks PM2 status
- Verifies ChromaDB is running
- Tests health endpoint: `http://localhost:4000/api/health`

## Required GitHub Secrets

Configure these in: **GitHub Repo → Settings → Secrets and variables → Actions**

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `EC2_HOST` | EC2 public IP or domain | `54.123.45.67` |
| `EC2_USER` | SSH username | `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |

## Deployment Time

- **Typical deployment:** 3-5 minutes
- **With doc re-ingestion:** 5-7 minutes
- **First deployment:** 7-10 minutes

## Monitoring Deployments

### View Workflow Runs
1. Go to your GitHub repository
2. Click **Actions** tab
3. See all workflow runs with status

### Check Logs
- Click on any workflow run
- Expand steps to see detailed logs
- Red ❌ = failed, Green ✅ = passed

### Common Issues

**Tests Fail:**
- Check test logs in GitHub Actions
- Verify secrets are set correctly
- Ensure ChromaDB started successfully

**SSH Connection Fails:**
- Verify `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` secrets
- Check EC2 security group allows SSH from GitHub IPs
- Ensure SSH key has correct permissions

**Deployment Fails:**
- Check if EC2 has enough disk space
- Verify PM2 is installed on EC2
- Check if ChromaDB container exists

## Manual Deployment

If you need to deploy manually:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd ~/NextStep4/server

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Restart services
docker restart chromadb
pm2 restart nextstep-server

# Re-ingest docs (if needed)
npm run ingest:docs
```

## Rollback

If a deployment breaks production:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd ~/NextStep4

# Revert to previous commit
git reset --hard HEAD~1

# Restart server
cd server
npm install
pm2 restart nextstep-server
```

## Best Practices

### Before Pushing to Main

1. ✅ Run tests locally: `npm test`
2. ✅ Test RAG features with local ChromaDB
3. ✅ Review code changes
4. ✅ Update documentation if needed

### After Deployment

1. ✅ Check GitHub Actions for green checkmark
2. ✅ Test production endpoint
3. ✅ Monitor PM2 logs: `pm2 logs nextstep-server`
4. ✅ Verify RAG chatbot works

### Development Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test locally
npm test

# Commit changes
git add .
git commit -m "Add new feature"

# Push to feature branch
git push origin feature/new-feature

# Create Pull Request on GitHub
# After review, merge to main
# CI/CD automatically deploys
```

## Pipeline Configuration

The workflow file is located at:
```
.github/workflows/deploy-backend.yml
```

To modify the pipeline:
1. Edit the workflow file
2. Commit and push to main
3. Changes take effect immediately

## Security

- ✅ Secrets are encrypted in GitHub
- ✅ Never logged or exposed
- ✅ SSH key has restricted permissions
- ✅ Only authorized users can modify secrets
- ✅ EC2 security group restricts access

## Performance Optimizations

- **npm ci** instead of npm install (faster, more reliable)
- **npm cache** in GitHub Actions (speeds up installs)
- **Conditional doc re-ingestion** (only when needed)
- **Docker container reuse** (restart instead of recreate)

## Future Improvements

- [ ] Add Slack/Discord notifications on deployment
- [ ] Implement blue-green deployment
- [ ] Add automated rollback on health check failure
- [ ] Set up staging environment
- [ ] Add performance testing in CI
- [ ] Implement canary deployments

## Support

For CI/CD issues:
1. Check GitHub Actions logs
2. Review this documentation
3. Check EC2 logs: `pm2 logs`
4. Verify all secrets are set correctly

---

**Last Updated:** December 2025
**Pipeline Version:** 1.0
**Maintained By:** NextStep Development Team
