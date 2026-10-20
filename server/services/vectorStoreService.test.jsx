const mockDb = { from: jest.fn(), rpc: jest.fn() };
jest.mock('./supabaseService.js', () => ({
  ...jest.requireActual('./supabaseService.js'), getAdminClient: () => mockDb
}));
jest.mock('./embeddingService.jsx', () => jest.fn(() => ({
  embedBatch: jest.fn(async texts => texts.map(() => Array(768).fill(0.1))),
  embedText: jest.fn(async () => Array(768).fill(0.1))
})));
const VectorStore = require('./vectorStoreService.jsx');
let store, chain;
beforeEach(() => {
  chain = {};
  for (const method of ['select','eq','limit','upsert','delete']) chain[method] = jest.fn(() => chain);
  chain.then = resolve => Promise.resolve({ data: [], count: 2 }).then(resolve);
  mockDb.from.mockReset().mockReturnValue(chain);
  mockDb.rpc.mockReset().mockResolvedValue({ data: [{ id: 'doc', content: 'Help', metadata: { source: 'help.md' }, score: 0.8, distance: 0.2 }] });
  store = new VectorStore('test_help');
});
test('uninitialized operations fail without contacting storage', async () => {
  await expect(store.similaritySearch('help')).rejects.toThrow('not initialized');
  expect(mockDb.from).not.toHaveBeenCalled();
});
test('schema connection failure does not mark store ready', async () => {
  chain.then = resolve => Promise.resolve({ error: { code: 'PGRST205' } }).then(resolve);
  await expect(store.initialize()).rejects.toThrow('Database request failed');
  expect(store.isReady()).toBe(false);
});
test.each([[], [{ text: '', metadata: {} }], [{ text: 'help' }]].map(docs => ({ docs })))('rejects invalid documents: %j', async ({ docs }) => {
  await store.initialize();
  await expect(store.addDocuments(docs)).rejects.toThrow('non-empty');
});
test('document writes use stable IDs and upsert by collection and ID', async () => {
  await store.initialize();
  await store.addDocuments([{ text: 'Help', metadata: { id: 'stable-id', source: 'help.md' } }]);
  expect(chain.upsert).toHaveBeenCalledWith([expect.objectContaining({ id: 'stable-id', collection: 'test_help', content: 'Help', embedding: expect.any(Array) })], { onConflict: 'collection,id' });
});
test.each(['', '   ', null])('rejects invalid search query: %j', async value => {
  await store.initialize(); await expect(store.similaritySearch(value)).rejects.toThrow('non-empty');
});
test.each([0, 101, 2.5])('rejects invalid retrieval count %s', async n => {
  await store.initialize(); await expect(store.similaritySearch('help', n)).rejects.toThrow('between 1 and 100');
});
test('returns normalized source records', async () => {
  await store.initialize();
  expect((await store.similaritySearch('help'))[0]).toEqual({ id: 'doc', document: 'Help', metadata: { source: 'help.md' }, score: 0.8, distance: 0.2 });
});
test('clear is scoped to this documentation collection', async () => {
  await store.initialize(); await store.clear();
  expect(chain.delete).toHaveBeenCalled();
  expect(chain.eq).toHaveBeenCalledWith('collection', 'test_help');
});
test('statistics include the count and current embedding space', async () => {
  await store.initialize();
  expect(await store.getStats()).toMatchObject({ count: 2, collectionName: 'test_help', embeddingDimension: 768, embeddingModel: 'gemini-embedding-2' });
});
