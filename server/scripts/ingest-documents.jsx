#!/usr/bin/env node

/**
 * Document Ingestion Script
 * 
 * Standalone CLI script for ingesting documents into the RAG vector store.
 * Processes markdown and text files from a specified directory.
 * 
 * Usage:
 *   node scripts/ingest-documents.js [directory]
 *   npm run ingest [directory]
 * 
 * Examples:
 *   node scripts/ingest-documents.js ../docs
 *   npm run ingest:docs
 * 
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
 */

const DocumentIngestionService = require('../services/documentIngestionService');
const VectorStoreService = require('../services/vectorStoreService');
const path = require('path');
require('dotenv').config();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Print colored message to console
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printHeader(title) {
  console.log();
  print('='.repeat(60), 'cyan');
  print(title, 'bright');
  print('='.repeat(60), 'cyan');
  console.log();
}

/**
 * Main ingestion function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const directoryPath = args[0] || '../docs';
    const resolvedPath = path.resolve(__dirname, '..', directoryPath);

    printHeader('NextStep RAG Document Ingestion');

    print(`📁 Target directory: ${resolvedPath}`, 'blue');
    print(`🔧 Collection: ${process.env.RAG_COLLECTION_NAME || 'nextstep_docs'}`, 'blue');
    console.log();

    // Initialize services
    print('🚀 Initializing services...', 'yellow');
    const vectorStore = new VectorStoreService();
    await vectorStore.initialize();
    print('✓ Vector store connected', 'green');

    const ingestionService = new DocumentIngestionService(vectorStore);
    print('✓ Ingestion service ready', 'green');
    console.log();

    // Get current stats
    const beforeStats = await vectorStore.getStats();
    print(`📊 Current vector store: ${beforeStats.count} chunks`, 'blue');
    console.log();

    // Ask user if they want to clear existing data
    if (beforeStats.count > 0) {
      print('⚠️  Vector store contains existing data', 'yellow');
      print('   To clear and start fresh, run: npm run clear-vector-store', 'yellow');
      console.log();
    }

    // Start ingestion
    printHeader('Starting Document Ingestion');

    const startTime = Date.now();
    let lastProgress = 0;

    const stats = await ingestionService.ingestDirectory(resolvedPath, {
      recursive: true,
      onProgress: (file, current, total) => {
        const progress = Math.floor((current / total) * 100);
        if (progress !== lastProgress) {
          const bar = '█'.repeat(Math.floor(progress / 2)) + '░'.repeat(50 - Math.floor(progress / 2));
          process.stdout.write(`\r[${bar}] ${progress}% (${current}/${total})`);
          lastProgress = progress;
        }
      }
    });

    console.log(); // New line after progress bar
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Print results
    printHeader('Ingestion Complete');

    print(`✓ Files processed: ${stats.filesProcessed}`, 'green');
    print(`✓ Total chunks created: ${stats.totalChunks}`, 'green');
    print(`✓ Average chunks per file: ${stats.filesProcessed > 0 ? (stats.totalChunks / stats.filesProcessed).toFixed(1) : 0}`, 'green');
    
    if (stats.filesSkipped > 0) {
      print(`⚠️  Files skipped: ${stats.filesSkipped}`, 'yellow');
    }

    print(`⏱️  Duration: ${duration}s`, 'blue');
    console.log();

    // Print errors if any
    if (stats.errors.length > 0) {
      print('❌ Errors encountered:', 'red');
      stats.errors.forEach(err => {
        print(`   - ${path.basename(err.file)}: ${err.error}`, 'red');
      });
      console.log();
    }

    // Get final stats
    const afterStats = await vectorStore.getStats();
    print(`📊 Vector store now contains: ${afterStats.count} chunks`, 'blue');
    print(`📊 Embedding model: ${afterStats.embeddingModel}`, 'blue');
    print(`📊 Embedding dimension: ${afterStats.embeddingDimension}`, 'blue');
    console.log();

    // Test search
    if (afterStats.count > 0) {
      printHeader('Testing Search Functionality');
      
      const testQuery = 'What is NextStep?';
      print(`🔍 Test query: "${testQuery}"`, 'blue');
      
      const results = await vectorStore.similaritySearch(testQuery, 3);
      
      if (results.length > 0) {
        print(`✓ Found ${results.length} relevant chunks`, 'green');
        console.log();
        
        results.forEach((result, i) => {
          print(`Result ${i + 1}:`, 'cyan');
          print(`  Score: ${result.score.toFixed(4)}`, 'blue');
          print(`  Source: ${result.metadata.source}`, 'blue');
          print(`  Preview: ${result.document.substring(0, 100)}...`, 'reset');
          console.log();
        });
      } else {
        print('⚠️  No results found for test query', 'yellow');
      }
    }

    printHeader('Success!');
    print('✓ Document ingestion completed successfully', 'green');
    print('✓ RAG system is ready to use', 'green');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error();
    print('❌ Ingestion failed:', 'red');
    print(error.message, 'red');
    console.error();
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
