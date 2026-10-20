const { migrateEmbeddings } = require('./migrate-gemini-embeddings.js');
const fixUserEmbeddings = () => migrateEmbeddings('users');
if (require.main === module) {
  fixUserEmbeddings().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { fixUserEmbeddings };
