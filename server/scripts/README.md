# Database Migration Scripts

This directory contains scripts to help you migrate from your current MongoDB database to a new one, removing fake jobs and keeping only real user data.

## 🚀 Quick Start

### Option 1: Interactive Setup (Recommended)
```bash
cd server
npm run setup-migration
```

This will guide you through the entire process step by step.

### Option 2: Manual Process
```bash
cd server

# 1. Create backup
npm run backup-db

# 2. Set up new database URI in .env
# Add: NEW_MONGODB_URI='your_new_connection_string'
# Add: NEW_DB_NAME='your_new_database_name'

# 3. Run migration
npm run migrate-db

# 4. Verify migration
npm run verify-migration

# 5. Update .env to use new database
# Change: MONGODB_URI='your_new_connection_string'

# 6. Clean up any remaining fake jobs
npm run cleanup-fake-jobs
```

## 📁 Script Files

| Script | Purpose |
|--------|---------|
| `setup-migration.jsx` | Interactive setup wizard |
| `backup-database.jsx` | Creates backup of current database |
| `migrate-database.jsx` | Migrates data to new database |
| `cleanup-fake-jobs.jsx` | Removes fake job data |

## 🎯 What Gets Migrated

### ✅ Migrated Collections
- **users** - All user accounts and authentication data
- **applications** - Job applications (will work with external jobs)
- **messages** - User messaging and company communications
- **companies** - Company profiles and information
- **profiles** - Extended user profile data

### ❌ Skipped Collections
- **jobs** - Fake job postings (replaced with real API jobs)

## 🔧 Available Commands

```bash
# Interactive setup
npm run setup-migration

# Individual steps
npm run backup-db           # Backup current database
npm run migrate-db          # Run migration
npm run verify-migration    # Verify migration success
npm run cleanup-fake-jobs   # Remove fake jobs from current DB
npm run verify-job-api      # Check job API configuration
```

## 📊 Migration Benefits

1. **Clean Database** - No fake job data
2. **Real Jobs** - All jobs from real job boards via API
3. **Better Performance** - Smaller, optimized database
4. **Fresh Start** - Proper indexing and structure
5. **Cost Efficiency** - Reduced storage usage

## 🔍 Verification

After migration, test these features:
- ✅ User login/signup
- ✅ Job browsing (should show real API jobs)
- ✅ Job applications
- ✅ User messaging
- ✅ Company profiles

## 🆘 Troubleshooting

**Migration fails?**
- Your original database is safe and untouched
- Check connection strings and credentials
- Ensure sufficient disk space
- Re-run migration (it's safe to repeat)

**Need to rollback?**
- Change `MONGODB_URI` back to original in `.env`
- Restart your application
- Everything returns to previous state

**Missing data?**
- Run `npm run verify-migration`
- Check backup files in `server/backups/`
- Contact support if needed

## 📞 Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Test database connections with MongoDB Compass
4. Review the detailed migration guide: `MIGRATION_GUIDE.md`

---

**Remember:** This migration is designed to be safe. Your original database remains untouched until you explicitly update your configuration.