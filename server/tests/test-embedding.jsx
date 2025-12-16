/**
 * Test script for EmbeddingService
 */

const EmbeddingService = require('./services/embeddingService');
require('dotenv').config();

async function testEmbeddingService() {
  console.log('🧪 Testing Embedding Service...\n');

  const embeddingService = new EmbeddingService();

  try {
    // Test 1: Single text embedding
    console.log('Test 1: Single text embedding');
    const text = 'NextStep is a job matching application';
    const embedding = await embeddingService.embedText(text);
    console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);

    // Test 2: Batch embedding
    console.log('Test 2: Batch embedding');
    const texts = [
      'Job seekers can swipe through job recommendations',
      'Employers can post job listings',
      'The app uses AI for matching'
    ];
    const embeddings = await embeddingService.embedBatch(texts);
    console.log(`✅ Generated ${embeddings.length} embeddings`);
    embeddings.forEach((emb, i) => {
      console.log(`   Text ${i + 1}: ${emb.length} dimensions`);
    });
    console.log();

    // Test 3: Error handling - empty text
    console.log('Test 3: Error handling - empty text');
    try {
      await embeddingService.embedText('');
      console.log('❌ Should have thrown error for empty text');
    } catch (error) {
      console.log(`✅ Correctly rejected empty text: ${error.message}\n`);
    }

    // Test 4: Error handling - invalid batch
    console.log('Test 4: Error handling - invalid batch');
    try {
      await embeddingService.embedBatch(['valid text', '', 'another valid']);
      console.log('❌ Should have thrown error for invalid batch');
    } catch (error) {
      console.log(`✅ Correctly rejected invalid batch: ${error.message}\n`);
    }

    console.log('✅ All embedding service tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testEmbeddingService();
