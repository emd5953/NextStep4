#!/usr/bin/env node

/**
 * Clear Vector Store Script
 * 
 * Utility script to clear all documents from the RAG vector store.
 * 
 * Usage:
 *   node scripts/clear-vector-store.js
 *   npm run clear-vector-store
 */

const VectorStoreService = require('../services/vectorStoreService');
require('dotenv').config();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  try {
    console.log();
    print('='.repeat(60), 'cyan');
    print('Clear Vector Store', 'bright');
    print('='.repeat(60), 'cyan');
    console.log();

    // Initialize vector store
    print('🔧 Connecting to vector store...', 'yellow');
    const vectorStore = new VectorStoreService();
    await vectorStore.initialize();
    print('✓ Connected', 'green');
    console.log();

    // Get current stats
    const stats = await vectorStore.getStats();
    print(`📊 Current collection: ${stats.collectionName}`, 'blue');
    print(`📊 Current chunks: ${stats.count}`, 'blue');
    console.log();

    if (stats.count === 0) {
      print('ℹ️  Vector store is already empty', 'blue');
      console.log();
      process.exit(0);
    }

    // Clear the store
    print(`⚠️  Clearing ${stats.count} chunks...`, 'yellow');
    await vectorStore.clear();
    print('✓ Vector store cleared successfully', 'green');
    console.log();

    // Verify
    const afterStats = await vectorStore.getStats();
    print(`📊 Chunks remaining: ${afterStats.count}`, 'green');
    console.log();

    print('✓ Done!', 'green');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error();
    print('❌ Failed to clear vector store:', 'red');
    print(error.message, 'red');
    console.error();
    console.error(error.stack);
    process.exit(1);
  }
}

main();
