const { randomUUID } = require('crypto');
const { getAdminClient, unwrap } = require('./supabaseService.js');
const config = require('../config/ragConfig.jsx');
const EmbeddingService = require('./embeddingService.jsx');
class VectorStoreService {
  constructor(collectionName = config.collectionName) {
    this.collectionName = collectionName;
    this.embeddingService = new EmbeddingService();
    this.isInitialized = false;
  }
  async initialize() {
    this.client = getAdminClient();
    unwrap(await this.client.from('rag_documents').select('id').eq('collection', this.collectionName).limit(1));
    this.isInitialized = true;
  }
  _ensureInitialized() {
    if (!this.isInitialized) throw new Error('Vector store not initialized. Call initialize() first.');
  }
  async addDocuments(documents) {
    this._ensureInitialized();
    if (!Array.isArray(documents) || !documents.length || documents.some(d => typeof d.text !== 'string' || !d.text.trim() || !d.metadata || typeof d.metadata !== 'object')) throw new Error('Documents must be a non-empty array of text and metadata objects');
    const embeddings = await this.embeddingService.embedBatch(documents.map(d => d.text));
    // Bounded writes avoid a large API request during ingestion.
    for (let i = 0; i < documents.length; i += 25) {
      unwrap(await this.client.from('rag_documents').upsert(documents.slice(i, i + 25).map((d, n) => ({
        collection: this.collectionName, id: String(d.metadata.id || randomUUID()), content: d.text,
        metadata: d.metadata, embedding: embeddings[i + n], embedding_model: config.embeddingModel
      })), { onConflict: 'collection,id' }));
    }
  }
  async similaritySearch(query, topK = config.retrievalCount) {
    this._ensureInitialized();
    if (typeof query !== 'string' || !query.trim()) throw new Error('Query must be a non-empty string');
    const k = topK ?? config.retrievalCount;
    if (!Number.isInteger(k) || k < 1 || k > 100) throw new Error('topK must be between 1 and 100');
    const embedding = await this.embeddingService.embedText(query);
    const rows = unwrap(await this.client.rpc('match_documents', {
      query_embedding: embedding, model: config.embeddingModel, collection_name: this.collectionName, match_count: k
    }));
    return rows.map(r => ({ id: r.id, document: r.content, metadata: r.metadata, distance: r.distance, score: r.score }));
  }
  async clear() {
    this._ensureInitialized();
    unwrap(await this.client.from('rag_documents').delete().eq('collection', this.collectionName));
  }
  async getStats() {
    this._ensureInitialized();
    const result = await this.client.from('rag_documents').select('id', { count: 'exact', head: true }).eq('collection', this.collectionName);
    unwrap(result);
    return { count: result.count, collectionName: this.collectionName, embeddingModel: config.embeddingModel, embeddingDimension: config.embeddingDimensions };
  }
  isReady() { return this.isInitialized; }
  getCollectionName() { return this.collectionName; }
}
module.exports = VectorStoreService;
