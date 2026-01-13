/**
 * Script to regenerate job embeddings using consistent OpenAI model
 * Run this to fix any jobs that might have inconsistent embeddings
 */

const { MongoClient } = require('mongodb');
const { generateEmbeddings } = require('../middleware/genAI.jsx');
require('dotenv').config();

async function fixJobEmbeddings() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const jobsCollection = db.collection('Jobs');
    
    // Find jobs without embeddings or with potentially inconsistent embeddings
    const jobs = await jobsCollection.find({
      $or: [
        { embedding: { $exists: false } },
        { embedding: { $size: { $ne: 1536 } } } // Not 1536 dimensions
      ]
    }).toArray();
    
    console.log(`📊 Found ${jobs.length} jobs needing embedding fixes`);
    
    if (jobs.length === 0) {
      console.log('✅ All jobs have consistent embeddings');
      return;
    }
    
    let processed = 0;
    let errors = 0;
    
    for (const job of jobs) {
      try {
        // Create text for embedding
        const textToEmbed = [
          job.title,
          job.jobDescription,
          job.skills?.join(' '),
          job.companyName,
          job.locations?.join(' '),
          job.salaryRange,
          job.benefits?.join(' '),
          job.schedule
        ].filter(Boolean).join(' ');
        
        console.log(`🔄 Processing job: ${job.title} (${job._id})`);
        
        // Generate new embedding
        const embedding = await generateEmbeddings(textToEmbed);
        
        // Update job with new embedding
        await jobsCollection.updateOne(
          { _id: job._id },
          { 
            $set: { 
              embedding: embedding,
              embeddingUpdatedAt: new Date(),
              embeddingModel: 'text-embedding-3-small'
            } 
          }
        );
        
        processed++;
        console.log(`✅ Updated embedding for job ${processed}/${jobs.length}`);
        
        // Rate limit to avoid API limits
        if (processed % 10 === 0) {
          console.log('⏳ Pausing to respect rate limits...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing job ${job._id}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`✅ Successfully processed: ${processed}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total jobs: ${jobs.length}`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  fixJobEmbeddings()
    .then(() => {
      console.log('🎉 Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixJobEmbeddings };