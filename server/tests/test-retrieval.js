// Quick test to see what's being retrieved
const VectorStoreService = require('./services/vectorStoreService');

async function test() {
  const vectorStore = new VectorStoreService();
  await vectorStore.initialize();
  
  const results = await vectorStore.similaritySearch('What is NextStep?', 5);
  
  console.log('\n=== Retrieved Documents ===\n');
  results.forEach((doc, i) => {
    console.log(`${i + 1}. Score: ${doc.score.toFixed(4)} | Distance: ${doc.distance.toFixed(4)}`);
    console.log(`   Source: ${doc.metadata.source}`);
    console.log(`   Text: ${doc.document.substring(0, 100)}...`);
    console.log('');
  });
  
  process.exit(0);
}

test().catch(console.error);
