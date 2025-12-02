#!/usr/bin/env node

/**
 * Clear Vector Store Script
 * 
 * Utility script to clear all documents from the vector store.
 * Use this before re-ingesting documents to start fresh.
 * 
 * Usage:
 *   node scripts/clear-vector-store.js
 */

require('dotenv').config();
const VectorStoreService = require('../services/vectorStoreService');

/**
 * Main clear function
 */
async function clearVectorStore() {
  console.log('='.repeat(60));
  console.log('  Clear Vector Store');
  console.log('='.repeat(60));
  console.log();

  let vectorStore;

  try {
    // Initialize vector store
    console.log('🔧 Initializing vector store...');
    vectorStore = new VectorStoreService();
    await vectorStore.initialize();
    console.log('✓ Vector store initialized');
    console.log();

    // Get current stats
    const beforeStats = await vectorStore.getStats();
    console.log('📊 Current Stats:');
    console.log(`   Collection: ${beforeStats.collectionName}`);
    console.log(`   Documents: ${beforeStats.count}`);
    console.log();

    if (beforeStats.count === 0) {
      console.log('ℹ️  Vector store is already empty. Nothing to clear.');
      console.log();
      process.exit(0);
    }

    // Clear the vector store
    console.log('🗑️  Clearing vector store...');
    await vectorStore.clear();
    console.log('✓ Vector store cleared');
    console.log();

    // Verify
    const afterStats = await vectorStore.getStats();
    console.log('📊 Updated Stats:');
    console.log(`   Documents: ${afterStats.count}`);
    console.log();

    console.log('✅ Vector store cleared successfully!');
    console.log();
    console.log('Next steps:');
    console.log('  Run ingestion: node scripts/ingest-documents.js <directory>');
    console.log();

    process.exit(0);

  } catch (error) {
    console.error();
    console.error('❌ Failed to clear vector store:');
    console.error(`   ${error.message}`);
    console.error();
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:');
      console.error(error.stack);
      console.error();
    }

    console.log('Troubleshooting:');
    console.log('  Ensure ChromaDB server is running:');
    console.log('  python -m chromadb.cli.cli run --path ./data/chroma --port 8000');
    console.log();

    process.exit(1);
  }
}

// Run the clear operation
clearVectorStore();
