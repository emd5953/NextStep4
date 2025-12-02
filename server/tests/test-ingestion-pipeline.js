/**
 * Test script for Document Ingestion Pipeline
 */

const DocumentIngestionService = require('./services/documentIngestionService');
const VectorStoreService = require('./services/vectorStoreService');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function testIngestionPipeline() {
  console.log('🧪 Testing Document Ingestion Pipeline...\n');

  // Create test directory structure
  const testDir = path.join(__dirname, 'test-docs');
  const subDir = path.join(testDir, 'subdocs');

  try {
    // Setup: Create test directory and files
    console.log('Setup: Creating test directory structure');
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(subDir, { recursive: true });

    // Create test markdown files
    await fs.writeFile(
      path.join(testDir, 'doc1.md'),
      '# Document 1\n\nThis is the first test document about NextStep job matching.'
    );
    await fs.writeFile(
      path.join(testDir, 'doc2.md'),
      '# Document 2\n\nThis document describes employer features and job posting capabilities.'
    );
    await fs.writeFile(
      path.join(subDir, 'doc3.txt'),
      'Document 3 contains information about student profiles and resume building.'
    );
    await fs.writeFile(
      path.join(testDir, 'readme.txt'),
      'This is a readme file with general information about the NextStep platform.'
    );
    
    // Create an unsupported file
    await fs.writeFile(path.join(testDir, 'image.png'), 'fake image data');

    console.log('✅ Test directory created\n');

    // Initialize services
    console.log('Test 1: Initialize services');
    const vectorStore = new VectorStoreService('test_ingestion');
    await vectorStore.initialize();
    await vectorStore.clear(); // Clear any existing data
    
    const ingestionService = new DocumentIngestionService(vectorStore);
    console.log('✅ Services initialized\n');

    // Test 2: Ingest directory (recursive)
    console.log('Test 2: Ingest directory (recursive)');
    let fileCount = 0;
    const stats = await ingestionService.ingestDirectory(testDir, {
      recursive: true,
      onProgress: (file, current, total) => {
        fileCount++;
        console.log(`   Processing ${current}/${total}: ${path.basename(file)}`);
      }
    });

    console.log('\n✅ Ingestion complete');
    console.log(ingestionService.formatStats(stats));

    // Test 3: Verify documents in vector store
    console.log('Test 3: Verify documents in vector store');
    const storeStats = await vectorStore.getStats();
    console.log(`✅ Vector store contains ${storeStats.count} chunks\n`);

    // Test 4: Search for ingested content
    console.log('Test 4: Search for ingested content');
    const searchResults = await vectorStore.similaritySearch('job matching', 3);
    console.log(`✅ Found ${searchResults.length} results for "job matching"`);
    searchResults.forEach((result, i) => {
      console.log(`\n   Result ${i + 1}:`);
      console.log(`   Score: ${result.score.toFixed(4)}`);
      console.log(`   Source: ${result.metadata.source}`);
      console.log(`   Text: ${result.document.substring(0, 60)}...`);
    });
    console.log();

    // Test 5: Search for different content
    console.log('Test 5: Search for employer features');
    const results2 = await vectorStore.similaritySearch('employer posting jobs', 2);
    console.log(`✅ Found ${results2.length} results`);
    results2.forEach((result, i) => {
      console.log(`   ${i + 1}. ${result.metadata.source} (score: ${result.score.toFixed(4)})`);
    });
    console.log();

    // Test 6: Non-recursive ingestion
    console.log('Test 6: Test non-recursive ingestion');
    await vectorStore.clear();
    
    const stats2 = await ingestionService.ingestDirectory(testDir, {
      recursive: false
    });
    
    console.log(`✅ Non-recursive: processed ${stats2.filesProcessed} files (should skip subdirectory)`);
    console.log(`   Total chunks: ${stats2.totalChunks}\n`);

    // Test 7: Error handling - invalid directory
    console.log('Test 7: Error handling - invalid directory');
    try {
      await ingestionService.ingestDirectory('/nonexistent/path');
      console.log('❌ Should have thrown error for invalid directory');
    } catch (error) {
      console.log(`✅ Correctly rejected invalid directory: ${error.message}\n`);
    }

    // Test 8: Error handling - no vector store
    console.log('Test 8: Error handling - no vector store configured');
    const serviceWithoutStore = new DocumentIngestionService();
    try {
      await serviceWithoutStore.ingestDirectory(testDir);
      console.log('❌ Should have thrown error for missing vector store');
    } catch (error) {
      console.log(`✅ Correctly rejected: ${error.message}\n`);
    }

    // Cleanup
    console.log('Cleanup: Removing test files and collection');
    await fs.rm(testDir, { recursive: true, force: true });
    await vectorStore.clear();
    console.log('✅ Cleanup complete\n');

    console.log('✅ All ingestion pipeline tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    
    // Cleanup on error
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

testIngestionPipeline();
