/**
 * Diagnostic script to check homepage jobs functionality
 * Run with: node scripts/diagnose-homepage-jobs.js
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = 'db2';

async function diagnose() {
  console.log('\n🔍 HOMEPAGE JOBS DIAGNOSTIC TOOL\n');
  console.log('='.repeat(50));
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(dbName);
    const jobsCollection = db.collection('Jobs');
    const usersCollection = db.collection('users');
    const applicationsCollection = db.collection('applications');
    
    // Check 1: Total jobs
    console.log('📊 DATABASE STATISTICS');
    console.log('-'.repeat(50));
    const totalJobs = await jobsCollection.countDocuments();
    console.log(`Total jobs in database: ${totalJobs}`);
    
    if (totalJobs === 0) {
      console.log('❌ No jobs found! You need to add jobs to the database.');
      return;
    }
    
    // Check 2: Jobs with embeddings
    const jobsWithEmbeddings = await jobsCollection.countDocuments({ 
      embedding: { $exists: true } 
    });
    console.log(`Jobs with embeddings: ${jobsWithEmbeddings}`);
    
    if (jobsWithEmbeddings === 0) {
      console.log('⚠️  No jobs have embeddings. Vector search will not work.');
      console.log('   Fallback to regular search will be used.');
    } else {
      // Check embedding dimensions
      const sampleJob = await jobsCollection.findOne({ 
        embedding: { $exists: true } 
      });
      console.log(`Sample embedding dimensions: ${sampleJob.embedding.length}`);
      
      if (sampleJob.embedding.length !== 1536) {
        console.log('❌ Incorrect embedding dimensions! Should be 1536.');
      }
    }
    
    // Check 3: Sample job
    console.log('\n📄 SAMPLE JOB');
    console.log('-'.repeat(50));
    const sampleJob = await jobsCollection.findOne({}, {
      projection: { 
        title: 1, 
        companyId: 1, 
        locations: 1, 
        skills: 1,
        embedding: 1 
      }
    });
    console.log(`Title: ${sampleJob.title}`);
    console.log(`Company ID: ${sampleJob.companyId}`);
    console.log(`Locations: ${sampleJob.locations}`);
    console.log(`Skills: ${sampleJob.skills?.slice(0, 3).join(', ')}...`);
    console.log(`Has embedding: ${!!sampleJob.embedding}`);
    
    // Check 4: Users with profiles
    console.log('\n👥 USER STATISTICS');
    console.log('-'.repeat(50));
    const totalUsers = await usersCollection.countDocuments();
    console.log(`Total users: ${totalUsers}`);
    
    const usersWithSkills = await usersCollection.countDocuments({ 
      skills: { $exists: true, $ne: [] } 
    });
    console.log(`Users with skills: ${usersWithSkills}`);
    
    const usersWithEmbeddings = await usersCollection.countDocuments({ 
      skillsEmbedding: { $exists: true } 
    });
    console.log(`Users with embeddings: ${usersWithEmbeddings}`);
    
    // Check 5: Sample user
    const sampleUser = await usersCollection.findOne(
      { skills: { $exists: true, $ne: [] } },
      { projection: { email: 1, skills: 1, location: 1, skillsEmbedding: 1 } }
    );
    
    if (sampleUser) {
      console.log('\n👤 SAMPLE USER WITH SKILLS');
      console.log('-'.repeat(50));
      console.log(`Email: ${sampleUser.email}`);
      console.log(`Skills: ${sampleUser.skills?.slice(0, 3).join(', ')}...`);
      console.log(`Location: ${sampleUser.location || 'Not set'}`);
      console.log(`Has embedding: ${!!sampleUser.skillsEmbedding}`);
      
      if (sampleUser.skillsEmbedding) {
        console.log(`Embedding dimensions: ${sampleUser.skillsEmbedding.length}`);
      }
      
      // Check applications for this user
      const userApplications = await applicationsCollection.countDocuments({
        user_id: sampleUser._id
      });
      console.log(`Applications submitted: ${userApplications}`);
    } else {
      console.log('\n⚠️  No users with skills found.');
    }
    
    // Check 6: Companies
    console.log('\n🏢 COMPANY STATISTICS');
    console.log('-'.repeat(50));
    const companiesCollection = db.collection('companies');
    const totalCompanies = await companiesCollection.countDocuments();
    console.log(`Total companies: ${totalCompanies}`);
    
    if (totalCompanies === 0) {
      console.log('⚠️  No companies found. Job listings may not show company names.');
    }
    
    // Check 7: Vector search index (this will fail if not configured)
    console.log('\n🔍 VECTOR SEARCH TEST');
    console.log('-'.repeat(50));
    
    if (jobsWithEmbeddings > 0 && sampleUser?.skillsEmbedding) {
      try {
        const testResults = await jobsCollection.aggregate([
          {
            $vectorSearch: {
              queryVector: sampleUser.skillsEmbedding,
              path: "embedding",
              numCandidates: 10,
              limit: 5,
              index: "js_vector_index",
            }
          },
          {
            $project: {
              title: 1,
              score: { $meta: "vectorSearchScore" }
            }
          }
        ]).toArray();
        
        console.log('✅ Vector search is working!');
        console.log(`Found ${testResults.length} results`);
        
        if (testResults.length > 0) {
          console.log('\nTop 3 matches:');
          testResults.slice(0, 3).forEach((job, i) => {
            console.log(`  ${i + 1}. ${job.title} (score: ${job.score.toFixed(3)})`);
          });
        }
      } catch (error) {
        console.log('❌ Vector search failed!');
        console.log(`Error: ${error.message}`);
        console.log('\nPossible causes:');
        console.log('  1. Vector search index not created in MongoDB Atlas');
        console.log('  2. Index name is not "js_vector_index"');
        console.log('  3. Index path is not "embedding"');
        console.log('  4. Using local MongoDB (vector search requires Atlas)');
        console.log('\n⚠️  Fallback to regular search will be used.');
      }
    } else {
      console.log('⚠️  Cannot test vector search:');
      if (jobsWithEmbeddings === 0) {
        console.log('  - No jobs have embeddings');
      }
      if (!sampleUser?.skillsEmbedding) {
        console.log('  - No users have embeddings');
      }
    }
    
    // Summary
    console.log('\n📋 SUMMARY');
    console.log('='.repeat(50));
    
    const issues = [];
    const warnings = [];
    
    if (totalJobs === 0) {
      issues.push('No jobs in database');
    }
    if (jobsWithEmbeddings === 0) {
      warnings.push('No job embeddings (vector search disabled)');
    }
    if (usersWithSkills === 0) {
      warnings.push('No users with skills (no personalization)');
    }
    if (totalCompanies === 0) {
      warnings.push('No companies (company names will be missing)');
    }
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ Everything looks good!');
      console.log('\nIf homepage jobs still not working:');
      console.log('  1. Check browser console for errors');
      console.log('  2. Check server console for errors');
      console.log('  3. Verify user is logged in (token in localStorage)');
      console.log('  4. Test the endpoint: GET /api/retrieveJobsForHomepage');
    } else {
      if (issues.length > 0) {
        console.log('\n❌ CRITICAL ISSUES:');
        issues.forEach(issue => console.log(`  - ${issue}`));
      }
      if (warnings.length > 0) {
        console.log('\n⚠️  WARNINGS:');
        warnings.forEach(warning => console.log(`  - ${warning}`));
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('Diagnostic complete!\n');
    
  } catch (error) {
    console.error('❌ Error running diagnostic:', error);
  } finally {
    await client.close();
  }
}

diagnose();
