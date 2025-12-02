#!/usr/bin/env node

/**
 * Document Ingestion Script
 * 
 * Standalone script for ingesting documents into the RAG vector store.
 * Processes markdown and text files from a specified directory.
 * 
 * Usage:
 *   node scripts/ingest-documents.js <directory-path>
 *   node scripts/ingest-documents.js ../docs
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

require('dotenv').config();
const path = require('path');
const VectorStoreService = require('../services/vectorStoreService');
const DocumentIngestionService = require('../services/documentIngestionService');

/**
 * Main ingestion function
 */
async function ingestDocuments() {
  console.log('='.repeat(60));
  console.log('  NextStep RAG Document Ingestion');
  console.log('='.repeat(60));
  console.log();

  // Get directory path from command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Error: No directory path provided');
    console.log();
    console.log('Usage:');
    console.log('  node scripts/ingest-documents.js <directory-path>');
    console.log();
    console.log('Examples:');
    console.log('  node scripts/ingest-documents.js ../docs');
    console.log('  node scripts/ingest-documents.js ./data/knowledge-base');
    console.log();
    process.exit(1);
  }

  const directoryPath = path.resolve(args[0]);
  console.log(`📁 Target Directory: ${directoryPath}`);
  console.log();

  let vectorStore;
  let ingestionService;

  try {
    // Initialize vector store
    console.log('🔧 Initializing vector store...');
    vectorStore = new VectorStoreService();
    await vectorStore.initialize();
    console.log('✓ Vector store initialized');
    console.log();

    // Get current stats
    const beforeStats = await vectorStore.getStats();
    console.log('📊 Current Vector Store Stats:');
    console.log(`   Collection: ${beforeStats.collectionName}`);
    console.log(`   Documents: ${beforeStats.count}`);
    console.log(`   Embedding Model: ${beforeStats.embeddingModel}`);
    console.log();

    // Ask user if they want to clear existing documents
    if (beforeStats.count > 0) {
      console.log('⚠️  Warning: Vector store already contains documents');
      console.log('   Continuing will add new documents without removing existing ones.');
      console.log('   To clear the vector store first, use: node scripts/clear-vector-store.js');
      console.log();
    }

    // Initialize ingestion service
    console.log('🔧 Initializing ingestion service...');
    ingestionService = new DocumentIngestionService(vectorStore);
    console.log('✓ Ingestion service initialized');
    console.log();

    // Start ingestion
    console.log('📥 Starting document ingestion...');
    console.log('-'.repeat(60));
    console.log();

    const startTime = Date.now();
    const results = await ingestionService.ingestDirectory(directoryPath);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Display results
    console.log();
    console.log('='.repeat(60));
    console.log('  Ingestion Complete');
    console.log('='.repeat(60));
    console.log();
    console.log('📈 Results:');
    console.log(`   ✓ Processed: ${results.processed} files`);
    console.log(`   ✗ Failed: ${results.failed} files`);
    console.log(`   📄 Total Chunks: ${results.totalChunks}`);
    console.log(`   ⏱️  Duration: ${duration}s`);
    console.log();

    // Display errors if any
    if (results.errors.length > 0) {
      console.log('❌ Errors:');
      results.errors.forEach(error => {
        console.log(`   ${error.file}: ${error.error}`);
      });
      console.log();
    }

    // Get updated stats
    const afterStats = await vectorStore.getStats();
    console.log('📊 Updated Vector Store Stats:');
    console.log(`   Documents: ${afterStats.count} (+${afterStats.count - beforeStats.count})`);
    console.log();

    console.log('✅ Ingestion completed successfully!');
    console.log();
    console.log('Next steps:');
    console.log('  1. Start the server: npm start');
    console.log('  2. Test the RAG chat: POST /api/rag-chat');
    console.log('  3. Check status: GET /api/rag-chat/status');
    console.log();

    process.exit(0);

  } catch (error) {
    console.error();
    console.error('❌ Ingestion failed:');
    console.error(`   ${error.message}`);
    console.error();
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:');
      console.error(error.stack);
      console.error();
    }

    console.log('Troubleshooting:');
    console.log('  1. Ensure ChromaDB server is running:');
    console.log('     python -m chromadb.cli.cli run --path ./data/chroma --port 8000');
    console.log('  2. Check that GEMINI_API_KEY is set in .env');
    console.log('  3. Verify the directory path exists and contains .md or .txt files');
    console.log();

    process.exit(1);
  }
}

// Run the ingestion
ingestDocuments();
