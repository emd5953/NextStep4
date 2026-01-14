/**
 * Database Migration Script
 * Migrates data from old MongoDB database to new database
 * Removes fake jobs and keeps only real user data
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Configuration
const OLD_DB_URI = process.env.MONGODB_URI; // Current database
const NEW_DB_URI = process.env.NEW_MONGODB_URI; // New database URI (set in .env)
const OLD_DB_NAME = 'db2'; // Current database name
const NEW_DB_NAME = process.env.NEW_DB_NAME || 'nextstep_production'; // New database name

/**
 * Collections to migrate (excluding jobs collection to remove fake data)
 */
const COLLECTIONS_TO_MIGRATE = [
  'users',
  'applications', 
  'messages',
  'companies',
  'profiles'
];

/**
 * Collections to skip (fake data)
 */
const COLLECTIONS_TO_SKIP = [
  'jobs' // Skip jobs collection to remove fake jobs
];

async function migrateDatabase() {
  let oldClient, newClient;
  
  try {
    console.log('🚀 Starting database migration...');
    
    // Validate environment variables
    if (!NEW_DB_URI) {
      throw new Error('NEW_MONGODB_URI not set in environment variables');
    }
    
    // Connect to both databases
    console.log('📡 Connecting to databases...');
    oldClient = new MongoClient(OLD_DB_URI);
    newClient = new MongoClient(NEW_DB_URI);
    
    await oldClient.connect();
    await newClient.connect();
    
    const oldDb = oldClient.db(OLD_DB_NAME);
    const newDb = newClient.db(NEW_DB_NAME);
    
    console.log('✅ Connected to both databases');
    
    // Get list of collections in old database
    const collections = await oldDb.listCollections().toArray();
    console.log(`📋 Found ${collections.length} collections in old database`);
    
    // Migrate each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      if (COLLECTIONS_TO_SKIP.includes(collectionName)) {
        console.log(`⏭️  Skipping collection: ${collectionName} (fake data)`);
        continue;
      }
      
      if (!COLLECTIONS_TO_MIGRATE.includes(collectionName)) {
        console.log(`⚠️  Unknown collection: ${collectionName} - skipping`);
        continue;
      }
      
      console.log(`📦 Migrating collection: ${collectionName}`);
      
      const oldCollection = oldDb.collection(collectionName);
      const newCollection = newDb.collection(collectionName);
      
      // Get document count
      const count = await oldCollection.countDocuments();
      console.log(`   📊 Documents to migrate: ${count}`);
      
      if (count === 0) {
        console.log(`   ✅ Collection ${collectionName} is empty - skipping`);
        continue;
      }
      
      // Migrate documents in batches
      const batchSize = 1000;
      let migrated = 0;
      
      const cursor = oldCollection.find({});
      
      while (await cursor.hasNext()) {
        const batch = [];
        
        // Collect batch
        for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
          const doc = await cursor.next();
          batch.push(doc);
        }
        
        if (batch.length > 0) {
          // Insert batch into new database
          await newCollection.insertMany(batch, { ordered: false });
          migrated += batch.length;
          console.log(`   📈 Migrated ${migrated}/${count} documents`);
        }
      }
      
      console.log(`   ✅ Completed migration of ${collectionName}: ${migrated} documents`);
    }
    
    // Create indexes on new database
    console.log('🔍 Creating indexes...');
    await createIndexes(newDb);
    
    console.log('🎉 Migration completed successfully!');
    console.log('\n📋 Migration Summary:');
    console.log(`   Old Database: ${OLD_DB_NAME}`);
    console.log(`   New Database: ${NEW_DB_NAME}`);
    console.log(`   Collections migrated: ${COLLECTIONS_TO_MIGRATE.join(', ')}`);
    console.log(`   Collections skipped: ${COLLECTIONS_TO_SKIP.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close connections
    if (oldClient) await oldClient.close();
    if (newClient) await newClient.close();
  }
}

/**
 * Create necessary indexes on the new database
 */
async function createIndexes(db) {
  try {
    // Users collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ phone: 1 });
    await db.collection('users').createIndex({ verificationToken: 1 });
    
    // Applications collection indexes
    await db.collection('applications').createIndex({ userId: 1 });
    await db.collection('applications').createIndex({ jobId: 1 });
    await db.collection('applications').createIndex({ employerId: 1 });
    await db.collection('applications').createIndex({ status: 1 });
    
    // Messages collection indexes
    await db.collection('messages').createIndex({ senderId: 1 });
    await db.collection('messages').createIndex({ receiverId: 1 });
    await db.collection('messages').createIndex({ timestamp: -1 });
    
    // Companies collection indexes
    await db.collection('companies').createIndex({ userId: 1 });
    await db.collection('companies').createIndex({ companyName: 1 });
    
    console.log('✅ Indexes created successfully');
  } catch (error) {
    console.error('⚠️  Error creating indexes:', error);
  }
}

/**
 * Verify migration by comparing document counts
 */
async function verifyMigration() {
  let oldClient, newClient;
  
  try {
    console.log('🔍 Verifying migration...');
    
    oldClient = new MongoClient(OLD_DB_URI);
    newClient = new MongoClient(NEW_DB_URI);
    
    await oldClient.connect();
    await newClient.connect();
    
    const oldDb = oldClient.db(OLD_DB_NAME);
    const newDb = newClient.db(NEW_DB_NAME);
    
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      const oldCount = await oldDb.collection(collectionName).countDocuments();
      const newCount = await newDb.collection(collectionName).countDocuments();
      
      console.log(`📊 ${collectionName}: ${oldCount} → ${newCount}`);
      
      if (oldCount !== newCount) {
        console.warn(`⚠️  Count mismatch in ${collectionName}!`);
      }
    }
    
    console.log('✅ Migration verification completed');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    if (oldClient) await oldClient.close();
    if (newClient) await newClient.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'verify') {
    verifyMigration();
  } else {
    migrateDatabase()
      .then(() => {
        console.log('\n🎯 Next steps:');
        console.log('1. Update MONGODB_URI in .env to point to new database');
        console.log('2. Test the application with new database');
        console.log('3. Run: node scripts/migrate-database.jsx verify');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { migrateDatabase, verifyMigration };