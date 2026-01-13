/**
 * Cleanup Script for Fake Jobs
 * Removes any fake job data and ensures clean state for real API jobs
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const DB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.NODE_ENV === 'test' ? "mydb_test" : "db2";

async function cleanupFakeJobs() {
  let client;
  
  try {
    console.log('🧹 Starting fake jobs cleanup...');
    
    // Connect to database
    client = new MongoClient(DB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    
    // Check if jobs collection exists
    const collections = await db.listCollections({ name: 'jobs' }).toArray();
    
    if (collections.length === 0) {
      console.log('✅ No jobs collection found - already clean!');
      return;
    }
    
    const jobsCollection = db.collection('jobs');
    
    // Count existing jobs
    const totalJobs = await jobsCollection.countDocuments();
    console.log(`📊 Found ${totalJobs} jobs in database`);
    
    if (totalJobs === 0) {
      console.log('✅ Jobs collection is empty - already clean!');
      return;
    }
    
    // Identify fake jobs (jobs without external source indicators)
    const fakeJobsQuery = {
      $or: [
        { jobSource: { $exists: false } },
        { jobSource: null },
        { jobSource: '' },
        { isExternal: { $ne: true } }
      ]
    };
    
    const fakeJobsCount = await jobsCollection.countDocuments(fakeJobsQuery);
    console.log(`🎭 Found ${fakeJobsCount} fake jobs to remove`);
    
    if (fakeJobsCount === 0) {
      console.log('✅ No fake jobs found - all jobs appear to be from external sources!');
      return;
    }
    
    // Show sample of fake jobs to be removed
    const sampleFakeJobs = await jobsCollection.find(fakeJobsQuery).limit(5).toArray();
    console.log('\n📋 Sample fake jobs to be removed:');
    sampleFakeJobs.forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.title} at ${job.company}`);
    });
    
    // Remove fake jobs
    console.log('\n🗑️  Removing fake jobs...');
    const deleteResult = await jobsCollection.deleteMany(fakeJobsQuery);
    
    console.log(`✅ Removed ${deleteResult.deletedCount} fake jobs`);
    
    // Check remaining jobs
    const remainingJobs = await jobsCollection.countDocuments();
    console.log(`📊 Remaining jobs: ${remainingJobs}`);
    
    if (remainingJobs > 0) {
      console.log('\n🔍 Remaining jobs (should be external):');
      const externalJobs = await jobsCollection.find({}).limit(3).toArray();
      externalJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. ${job.title} at ${job.company} (Source: ${job.jobSource || 'Unknown'})`);
      });
    }
    
    // Clean up orphaned applications (applications to deleted jobs)
    console.log('\n🧹 Cleaning up orphaned applications...');
    const applicationsCollection = db.collection('applications');
    
    if (applicationsCollection) {
      // Find applications that reference non-existent jobs
      const allApplications = await applicationsCollection.find({}).toArray();
      let orphanedCount = 0;
      
      for (const app of allApplications) {
        if (app.jobId) {
          const jobExists = await jobsCollection.findOne({ _id: app.jobId });
          if (!jobExists) {
            // Check if it's a string ID that might reference an external job
            const isExternalJobId = typeof app.jobId === 'string' && !app.jobId.match(/^[0-9a-fA-F]{24}$/);
            
            if (!isExternalJobId) {
              // This is an orphaned application to a deleted internal job
              await applicationsCollection.deleteOne({ _id: app._id });
              orphanedCount++;
            }
          }
        }
      }
      
      console.log(`🗑️  Removed ${orphanedCount} orphaned applications`);
    }
    
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Fake jobs removed: ${deleteResult.deletedCount}`);
    console.log(`   Remaining jobs: ${remainingJobs}`);
    console.log(`   Orphaned applications removed: ${orphanedCount || 0}`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    if (client) await client.close();
  }
}

/**
 * Verify that job API integration is working
 */
async function verifyJobApiIntegration() {
  console.log('\n🔍 Verifying job API integration...');
  
  // Check environment variables
  const requiredVars = ['JSEARCH_API_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️  Missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Add these to your .env file to enable real job API integration');
  } else {
    console.log('✅ Job API environment variables are configured');
  }
  
  // Check if job API service exists
  const jobApiServicePath = require('path').join(__dirname, '../services/jobApiService.jsx');
  const fs = require('fs');
  
  if (fs.existsSync(jobApiServicePath)) {
    console.log('✅ Job API service file exists');
  } else {
    console.log('⚠️  Job API service file not found');
    console.log('   Expected: server/services/jobApiService.jsx');
  }
}

// Run cleanup if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'verify-api') {
    verifyJobApiIntegration();
  } else {
    cleanupFakeJobs()
      .then(() => {
        verifyJobApiIntegration();
        console.log('\n🎯 Next steps:');
        console.log('1. Test job browsing to ensure real API jobs are loading');
        console.log('2. Verify applications still work correctly');
        console.log('3. Check that messaging and other features work normally');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Cleanup failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { cleanupFakeJobs, verifyJobApiIntegration };