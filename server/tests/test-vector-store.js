/**
 * Test script for VectorStoreService
 */

const VectorStoreService = require('./services/vectorStoreService');
require('dotenv').config();

async function testVectorStore() {
  console.log('🧪 Testing Vector Store Service...\n');

  const vectorStore = new VectorStoreService('test_collection');

  try {
    // Test 1: Initialize
    console.log('Test 1: Initialize vector store');
    await vectorStore.initialize();
    console.log(`✅ Initialized: ${vectorStore.isReady()}\n`);

    // Test 2: Clear any existing data
    console.log('Test 2: Clear collection');
    await vectorStore.clear();
    console.log('✅ Collection cleared\n');

    // Test 3: Add documents
    console.log('Test 3: Add documents');
    const documents = [
      {
        text: 'NextStep is a job matching application for Penn State students',
        metadata: {
          source: 'test.md',
          chunkIndex: 0,
          documentType: 'markdown'
        }
      },
      {
        text: 'Job seekers can swipe through personalized job recommendations',
        metadata: {
          source: 'test.md',
          chunkIndex: 1,
          documentType: 'markdown'
        }
      },
      {
        text: 'Employers can post job listings and view applicants',
        metadata: {
          source: 'test.md',
          chunkIndex: 2,
          documentType: 'markdown'
        }
      }
    ];
    
    await vectorStore.addDocuments(documents);
    console.log('✅ Documents added\n');

    // Test 4: Get stats
    console.log('Test 4: Get collection stats');
    const stats = await vectorStore.getStats();
    console.log(`✅ Collection stats:`, stats);
    console.log();

    // Test 5: Similarity search
    console.log('Test 5: Similarity search');
    const query = 'How do students find jobs?';
    const results = await vectorStore.similaritySearch(query, 2);
    
    console.log(`✅ Found ${results.length} results for: "${query}"`);
    results.forEach((result, i) => {
      console.log(`\n   Result ${i + 1}:`);
      console.log(`   Score: ${result.score.toFixed(4)}`);
      console.log(`   Text: ${result.document.substring(0, 60)}...`);
      console.log(`   Source: ${result.metadata.source}`);
    });
    console.log();

    // Test 6: Search with different query
    console.log('Test 6: Search for employer features');
    const query2 = 'What can employers do?';
    const results2 = await vectorStore.similaritySearch(query2, 2);
    
    console.log(`✅ Found ${results2.length} results for: "${query2}"`);
    results2.forEach((result, i) => {
      console.log(`\n   Result ${i + 1}:`);
      console.log(`   Score: ${result.score.toFixed(4)}`);
      console.log(`   Text: ${result.document.substring(0, 60)}...`);
    });
    console.log();

    // Test 7: Error handling - empty query
    console.log('Test 7: Error handling - empty query');
    try {
      await vectorStore.similaritySearch('');
      console.log('❌ Should have thrown error for empty query');
    } catch (error) {
      console.log(`✅ Correctly rejected empty query: ${error.message}\n`);
    }

    // Test 8: Error handling - invalid documents
    console.log('Test 8: Error handling - invalid documents');
    try {
      await vectorStore.addDocuments([{ invalid: 'document' }]);
      console.log('❌ Should have thrown error for invalid documents');
    } catch (error) {
      console.log(`✅ Correctly rejected invalid documents: ${error.message}\n`);
    }

    // Cleanup
    console.log('Cleanup: Clearing test collection');
    await vectorStore.clear();
    console.log('✅ Test collection cleared\n');

    console.log('✅ All vector store tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testVectorStore();
