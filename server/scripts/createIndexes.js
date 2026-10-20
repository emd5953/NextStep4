const { MongoClient } = require('mongodb');
const { embeddingDimensions, vectorIndex } = require('../services/geminiService.js');

/**
 * Script to create necessary database indexes for optimal performance
 */
async function createIndexes() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(process.env.DB_NAME || (process.env.NODE_ENV === 'test' ? 'mydb_test' : 'db2'));
    
    // Create indexes on Jobs collection
    const jobsCollection = db.collection('Jobs');
    
    // Text search indexes
    await jobsCollection.createIndex({
      title: 'text',
      jobDescription: 'text',
      skills: 'text',
      locations: 'text',
      benefits: 'text',
      schedule: 'text'
    }, { name: 'jobs_text_search' });
    
    // Regular indexes for faster queries
    await jobsCollection.createIndex({ companyId: 1 });
    await jobsCollection.createIndex({ employerId: 1 });
    await jobsCollection.createIndex({ createdAt: -1 });
    await jobsCollection.createIndex({ locations: 1 });
    await jobsCollection.createIndex({ skills: 1 });
    
    // Create indexes on applications collection
    const applicationsCollection = db.collection('applications');
    await applicationsCollection.createIndex({ user_id: 1 });
    await applicationsCollection.createIndex({ job_id: 1 });
    await applicationsCollection.createIndex({ user_id: 1, job_id: 1 }, { unique: true });
    
    // Create indexes on users collection
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ companyId: 1 });
    
    console.log('✅ All indexes created successfully');
    
    // Note about vector index
    console.log('\n📝 IMPORTANT: Vector search index needs to be created manually in MongoDB Atlas:');
    console.log('1. Go to your MongoDB Atlas cluster');
    console.log('2. Navigate to Search > Create Search Index');
    console.log('3. Choose "Vector Search" and use this configuration:');
    console.log(JSON.stringify({
      "fields": [
        {
          "numDimensions": embeddingDimensions,
          "path": "embedding",
          "similarity": "cosine",
          "type": "vector"
        },
        { "type": "filter", "path": "embeddingModel" }
      ]
    }, null, 2));
    console.log('4. Name the index: ' + vectorIndex);
    console.log('5. Select the Jobs collection');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await client.close();
  }
}

createIndexes();