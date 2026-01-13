# MongoDB Database Migration Guide

This guide will help you migrate from your current MongoDB database to a new one, removing fake jobs and keeping only real user data.

## 🎯 Migration Goals

1. **Move to a new MongoDB database** (fresh start)
2. **Remove fake job data** (keep only real API jobs)
3. **Preserve user data** (users, applications, messages, etc.)
4. **Maintain data integrity** (relationships and indexes)

## 📋 Pre-Migration Checklist

### 1. Set Up New MongoDB Database

**Option A: MongoDB Atlas (Recommended)**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Create a new cluster or use existing one
3. Create a new database (e.g., `nextstep_production`)
4. Get the connection string
5. Add your IP to whitelist
6. Create a database user with read/write permissions

**Option B: Self-Hosted MongoDB**
1. Install MongoDB on your server
2. Create a new database
3. Configure authentication if needed

### 2. Update Environment Configuration

1. Copy `.env.migration` to `.env.new`:
   ```bash
   cp .env.migration .env.new
   ```

2. Edit `.env.new` and update:
   ```env
   NEW_MONGODB_URI='your_new_database_connection_string'
   NEW_DB_NAME='your_new_database_name'
   ```

3. Add the new environment variables to your current `.env`:
   ```bash
   # Add these lines to your current .env file
   NEW_MONGODB_URI='your_new_database_connection_string'
   NEW_DB_NAME='nextstep_production'
   ```

## 🚀 Migration Process

### Step 1: Backup Current Database

```bash
cd server
npm run backup-db
```

This creates a backup in `server/backups/` with timestamp.

### Step 2: Run Migration

```bash
npm run migrate-db
```

The migration will:
- ✅ Copy users, applications, messages, companies, profiles
- ❌ Skip jobs collection (removes fake jobs)
- 🔍 Create necessary indexes
- 📊 Show progress and summary

### Step 3: Verify Migration

```bash
npm run verify-migration
```

This compares document counts between old and new databases.

### Step 4: Update Production Configuration

1. **Test with new database first:**
   ```bash
   # Temporarily update .env
   MONGODB_URI='your_new_database_connection_string'
   
   # Test the application
   npm run dev
   ```

2. **If everything works, make it permanent:**
   - Update `MONGODB_URI` in your production `.env`
   - Update database name if needed
   - Remove migration-specific variables

### Step 5: Clean Up

1. **Remove migration files (optional):**
   ```bash
   rm .env.migration .env.new
   ```

2. **Keep backups safe** (don't delete backup files)

## 🔧 Troubleshooting

### Common Issues

**1. Connection Errors**
```
Error: Authentication failed
```
- Check username/password in connection string
- Verify IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

**2. Migration Fails Midway**
```
Error: Document insertion failed
```
- Check disk space on new database
- Verify network connectivity
- Run migration again (it's safe to re-run)

**3. Missing Data After Migration**
```
Some collections are empty
```
- Run verification: `npm run verify-migration`
- Check backup files in `server/backups/`
- Re-run migration if needed

### Recovery Options

**If migration fails:**
1. Your original database is untouched
2. Restore from backup if needed:
   ```bash
   # Manual restore process
   mongoimport --uri="your_db_uri" --collection=users --file=backups/users_timestamp.json --jsonArray
   ```

**If you need to rollback:**
1. Change `MONGODB_URI` back to original
2. Restart your application
3. Everything returns to previous state

## 📊 What Gets Migrated

### ✅ Migrated Collections
- **users** - All user accounts and profiles
- **applications** - Job applications (will reference external jobs)
- **messages** - User-to-user and company messages
- **companies** - Company profiles and information
- **profiles** - Extended user profile data

### ❌ Skipped Collections
- **jobs** - Fake job postings (replaced with real API jobs)

### 🔄 Data Transformations
- No data transformation needed
- Applications will work with both internal and external jobs
- External jobs are fetched via JSearch API (already configured)

## 🎉 Post-Migration Benefits

1. **Clean Database** - No fake job data cluttering your database
2. **Real Jobs** - All jobs come from real job boards via API
3. **Better Performance** - Smaller database, faster queries
4. **Scalability** - Fresh start with proper indexing
5. **Cost Efficiency** - Less storage usage

## 🔍 Verification Steps

After migration, verify these features work:

1. **User Authentication** - Login/signup
2. **Job Browsing** - Should show real API jobs
3. **Applications** - Apply to jobs and view applications
4. **Messaging** - Send/receive messages
5. **Company Profiles** - View and edit company info

## 📞 Support

If you encounter issues:

1. **Check logs** - Look for error messages in console
2. **Verify environment** - Ensure all variables are set correctly
3. **Test connections** - Use MongoDB Compass to connect to new database
4. **Rollback if needed** - Change back to original database URI

## 🎯 Next Steps After Migration

1. **Monitor Performance** - Watch for any issues in production
2. **Update Documentation** - Update any references to old database
3. **Set Up Monitoring** - Configure alerts for new database
4. **Plan Cleanup** - Schedule cleanup of old database (after testing period)

---

**Remember:** This migration is designed to be safe. Your original database remains untouched, and you can always rollback by changing the connection string.