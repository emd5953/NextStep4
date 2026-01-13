/**
 * Interactive Migration Setup Script
 * Guides user through the migration process step by step
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupMigration() {
  console.log('🚀 NextStep Database Migration Setup');
  console.log('=====================================\n');
  
  console.log('This script will help you migrate to a new MongoDB database and remove fake jobs.\n');
  
  // Step 1: Confirm current setup
  console.log('📋 Step 1: Current Setup Verification');
  console.log('--------------------------------------');
  
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('Please create a .env file in the server directory first.');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasMongoUri = envContent.includes('MONGODB_URI=');
  const hasJSearchKey = envContent.includes('JSEARCH_API_KEY=');
  
  console.log(`✅ .env file found`);
  console.log(`${hasMongoUri ? '✅' : '❌'} MongoDB URI configured`);
  console.log(`${hasJSearchKey ? '✅' : '⚠️ '} JSearch API key ${hasJSearchKey ? 'configured' : 'missing (optional)'}`);
  
  if (!hasMongoUri) {
    console.log('\n❌ MONGODB_URI not found in .env file!');
    console.log('Please add your current MongoDB connection string first.');
    process.exit(1);
  }
  
  // Step 2: Get new database info
  console.log('\n📋 Step 2: New Database Configuration');
  console.log('-------------------------------------');
  
  const newDbUri = await question('Enter your NEW MongoDB connection string: ');
  if (!newDbUri.trim()) {
    console.log('❌ Database URI is required!');
    process.exit(1);
  }
  
  const newDbName = await question('Enter new database name (default: nextstep_production): ') || 'nextstep_production';
  
  // Step 3: Confirm migration plan
  console.log('\n📋 Step 3: Migration Plan');
  console.log('-------------------------');
  console.log('The migration will:');
  console.log('✅ Backup your current database');
  console.log('✅ Copy users, applications, messages, companies, profiles');
  console.log('❌ Skip jobs collection (removes fake jobs)');
  console.log('✅ Create indexes on new database');
  console.log('✅ Verify migration success');
  
  const confirm = await question('\nProceed with migration? (y/N): ');
  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('Migration cancelled.');
    process.exit(0);
  }
  
  // Step 4: Update environment
  console.log('\n📋 Step 4: Updating Environment Configuration');
  console.log('----------------------------------------------');
  
  const newEnvVars = `
# Migration Configuration (added by setup script)
NEW_MONGODB_URI='${newDbUri}'
NEW_DB_NAME='${newDbName}'
`;
  
  fs.appendFileSync(envPath, newEnvVars);
  console.log('✅ Environment variables added to .env');
  
  // Step 5: Run migration
  console.log('\n📋 Step 5: Running Migration');
  console.log('-----------------------------');
  
  const runNow = await question('Run migration now? (Y/n): ');
  if (runNow.toLowerCase() !== 'n' && runNow.toLowerCase() !== 'no') {
    console.log('\n🚀 Starting migration process...\n');
    
    const { spawn } = require('child_process');
    
    // Run backup
    console.log('💾 Creating backup...');
    const backup = spawn('npm', ['run', 'backup-db'], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    
    backup.on('close', (code) => {
      if (code !== 0) {
        console.log('❌ Backup failed!');
        process.exit(1);
      }
      
      console.log('✅ Backup completed');
      
      // Run migration
      console.log('\n📦 Running migration...');
      const migrate = spawn('npm', ['run', 'migrate-db'], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
      
      migrate.on('close', (code) => {
        if (code !== 0) {
          console.log('❌ Migration failed!');
          process.exit(1);
        }
        
        console.log('\n🎉 Migration completed successfully!');
        console.log('\n📋 Next Steps:');
        console.log('1. Update MONGODB_URI in .env to point to new database');
        console.log('2. Test your application with the new database');
        console.log('3. Run: npm run verify-migration');
        console.log('4. Run: npm run cleanup-fake-jobs (if needed)');
        
        rl.close();
      });
    });
  } else {
    console.log('\n📋 Manual Migration Steps:');
    console.log('1. npm run backup-db');
    console.log('2. npm run migrate-db');
    console.log('3. npm run verify-migration');
    console.log('4. Update MONGODB_URI in .env');
    console.log('5. npm run cleanup-fake-jobs');
    
    rl.close();
  }
}

// Handle cleanup
rl.on('close', () => {
  console.log('\n👋 Migration setup complete!');
  process.exit(0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Migration setup cancelled.');
  rl.close();
});

// Run setup
setupMigration().catch((error) => {
  console.error('❌ Setup failed:', error);
  rl.close();
  process.exit(1);
});