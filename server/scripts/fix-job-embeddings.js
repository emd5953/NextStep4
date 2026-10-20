const { migrateEmbeddings } = require('./migrate-gemini-embeddings.js');
const fixJobEmbeddings = () => migrateEmbeddings('Jobs');
if (require.main === module) {
  fixJobEmbeddings().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { fixJobEmbeddings };
