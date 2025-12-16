// Quick test to check if new docs are in vector store
const { ChromaClient } = require('chromadb');

async function testIngestion() {
  try {
    console.log('Connecting to ChromaDB...');
    const client = new ChromaClient({ path: 'http://localhost:8000' });
    
    console.log('Getting collection...');
    const collection = await client.getCollection({ name: 'nextstep_docs' });
    
    console.log('Counting documents...');
    const count = await collection.count();
    console.log(`✓ Total chunks in vector store: ${count}`);
    
    console.log('\nSearching for "how to apply to a job"...');
    const results = await collection.query({
      queryTexts: ['how to apply to a job'],
      nResults: 5
    });
    
    console.log('\n📚 Top 5 Results:');
    if (results.documents && results.documents[0]) {
      results.documents[0].forEach((doc, i) => {
        const metadata = results.metadatas[0][i];
        const distance = results.distances[0][i];
        console.log(`\n${i + 1}. Source: ${metadata.source}`);
        console.log(`   Distance: ${distance.toFixed(4)}`);
        console.log(`   Preview: ${doc.substring(0, 100)}...`);
      });
    }
    
    console.log('\n\n✅ Test complete!');
    console.log('\nExpected to see:');
    console.log('- how-to-apply-jobs.md in top results');
    console.log('- Total chunks > 100');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Is ChromaDB running? (docker run -p 8000:8000 chromadb/chroma)');
    console.log('2. Did you ingest the docs? (node scripts/ingest-documents.js ../docs)');
  }
}

testIngestion();
