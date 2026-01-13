/**
 * Database Backup Script
 * Creates a backup of the current database before migration
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const DB_URI = process.env.MONGODB_URI;
const DB_NAME = 'db2';
const BACKUP_DIR = path.join(__dirname, '../backups');

async function backupDatabase() {
  let client;
  
  try {
    console.log('💾 Starting database backup...');
    
    // Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // Connect to database
    client = new MongoClient(DB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    console.log(`📋 Found ${collections.length} collections to backup`);
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`📦 Backing up collection: ${collectionName}`);
      
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      
      const backupFile = path.join(BACKUP_DIR, `${collectionName}_${timestamp}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(documents, null, 2));
      
      console.log(`   ✅ Saved ${documents.length} documents to ${backupFile}`);
    }
    
    // Create backup summary
    const summary = {
      timestamp: new Date().toISOString(),
      database: DB_NAME,
      collections: collections.map(c => c.name),
      totalCollections: collections.length
    };
    
    const summaryFile = path.join(BACKUP_DIR, `backup_summary_${timestamp}.json`);
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    console.log('🎉 Backup completed successfully!');
    console.log(`📁 Backup location: ${BACKUP_DIR}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    if (client) await client.close();
  }
}

// Run backup if called directly
if (require.main === module) {
  backupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Backup failed:', error);
      process.exit(1);
    });
}

module.exports = { backupDatabase };