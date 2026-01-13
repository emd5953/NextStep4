/**
 * Script to regenerate user profile embeddings using consistent OpenAI model
 * Run this to fix any user profiles that might have inconsistent embeddings
 */

const { MongoClient } = require('mongodb');
const { generateEmbeddings } = require('../middleware/genAI.jsx');
require('dotenv').config();

async function fixUserEmbeddings() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Find users with skills/location but no embedding or inconsistent embeddings
    const users = await usersCollection.find({
      $and: [
        {
          $or: [
            { skills: { $exists: true, $ne: null, $ne: [] } },
            { location: { $exists: true, $ne: null, $ne: "" } }
          ]
        },
        {
          $or: [
            { skillsEmbedding: { $exists: false } },
            { skillsEmbedding: { $size: { $ne: 1536 } } } // Not 1536 dimensions
          ]
        }
      ]
    }).toArray();
    
    console.log(`📊 Found ${users.length} users needing embedding fixes`);
    
    if (users.length === 0) {
      console.log('✅ All users have consistent embeddings');
      return;
    }
    
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const user of users) {
      try {
        // Create text for embedding
        let textToEmbed = '';
        
        if (user.skills && user.skills.length > 0) {
          textToEmbed += `skills: ${user.skills.join(', ')}`;
        }
        
        if (user.location) {
          textToEmbed += ` location: ${user.location}`;
        }
        
        if (!textToEmbed.trim()) {
          console.log(`⏭️ Skipping user ${user._id} - no skills or location`);
          skipped++;
          continue;
        }
        
        console.log(`🔄 Processing user: ${user.email || user._id}`);
        
        // Generate new embedding
        const embedding = await generateEmbeddings(textToEmbed);
        
        // Update user with new embedding
        await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: { 
              skillsEmbedding: embedding,
              embeddingGeneratedAt: new Date(),
              embeddingModel: 'text-embedding-3-small'
            } 
          }
        );
        
        processed++;
        console.log(`✅ Updated embedding for user ${processed}/${users.length}`);
        
        // Rate limit to avoid API limits
        if (processed % 10 === 0) {
          console.log('⏳ Pausing to respect rate limits...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${user._id}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`✅ Successfully processed: ${processed}`);
    console.log(`⏭️ Skipped (no data): ${skipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total users: ${users.length}`);
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  fixUserEmbeddings()
    .then(() => {
      console.log('🎉 Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixUserEmbeddings };