/**
 * Start ChromaDB Server
 * 
 * This script starts a local ChromaDB server for development and testing.
 * ChromaDB will store data in ./data/chroma directory.
 */

const { spawn } = require('child_process');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'chroma');

console.log('Starting ChromaDB server...');
console.log(`Data directory: ${dataPath}`);
console.log('Server will be available at: http://localhost:8000');
console.log('\nPress Ctrl+C to stop the server\n');

// Start ChromaDB server
const chroma = spawn('chroma', ['run', '--path', dataPath, '--port', '8000'], {
  stdio: 'inherit',
  shell: true
});

chroma.on('error', (error) => {
  console.error('Failed to start ChromaDB:', error.message);
  console.error('\nMake sure ChromaDB is installed:');
  console.error('  pip install chromadb');
  console.error('or');
  console.error('  pip3 install chromadb');
  process.exit(1);
});

chroma.on('close', (code) => {
  console.log(`\nChromaDB server stopped with code ${code}`);
  process.exit(code);
});

// Handle termination
process.on('SIGINT', () => {
  console.log('\nStopping ChromaDB server...');
  chroma.kill('SIGINT');
});

process.on('SIGTERM', () => {
  chroma.kill('SIGTERM');
});
