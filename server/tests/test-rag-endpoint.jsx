// Test RAG endpoint
const axios = require('axios');

async function testRAG() {
  try {
    console.log('\n🧪 Testing RAG Endpoint...\n');
    
    const response = await axios.post('http://localhost:4000/api/rag-chat', {
      message: 'What is NextStep?'
    });
    
    console.log('✅ Response received!\n');
    console.log('📝 Answer:');
    console.log(response.data.response);
    console.log('\n📚 Sources:');
    response.data.sources.forEach((source, i) => {
      console.log(`\n${i + 1}. ${source.document} (score: ${source.score})`);
      console.log(`   ${source.chunk.substring(0, 150)}...`);
    });
    console.log('\n✅ RAG system is working!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
  
  process.exit(0);
}

testRAG();
