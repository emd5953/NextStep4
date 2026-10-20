const { MongoClient } = require('mongodb');
const { embedText, embeddingModel, isCurrentEmbedding } = require('../services/geminiService.js');

async function migrateEmbeddings(kind) {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in server/.env first.');
  const client = new MongoClient(process.env.MONGODB_URI);
  let updated = 0;
  let skipped = 0;
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME || (process.env.NODE_ENV === 'test' ? 'mydb_test' : 'db2'));
    const collections = kind ? [kind] : ['Jobs', 'users'];
    for (const name of collections) {
      const collection = db.collection(name);
      const field = name === 'users' ? 'skillsEmbedding' : 'embedding';
      for await (const record of collection.find({})) {
        if (isCurrentEmbedding(record, field)) { skipped++; continue; }
        const text = name === 'users'
          ? [record.skills?.length ? 'skills: ' + record.skills.join(', ') : '', record.location ? 'location: ' + record.location : ''].filter(Boolean).join(' ')
          : [record.title, record.jobDescription, record.skills?.join(' '), record.locations?.join(' ')].filter(Boolean).join(' ');
        if (!text.trim()) { skipped++; continue; }
        // Sequential requests stop at the first error/quota limit. Reruns resume
        // by skipping records already tagged with the current model.
        const embedding = await embedText(text);
        await collection.updateOne({ _id: record._id }, { $set: {
          [field]: embedding, embeddingModel, embeddingGeneratedAt: new Date()
        } });
        updated++;
        console.log('Updated embeddings: ' + updated);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    console.log({ updated, skipped, embeddingModel });
  } finally {
    await client.close();
  }
}
if (require.main === module) {
  migrateEmbeddings().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { migrateEmbeddings };
