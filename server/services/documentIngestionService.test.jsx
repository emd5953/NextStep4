const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const Ingestion = require('./documentIngestionService.jsx');
let dir, service, store;
beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nextstep-ingestion-'));
  await fs.writeFile(path.join(dir, 'help.md'), '# Help\n\nSave jobs and open their employer links.');
  await fs.writeFile(path.join(dir, 'notes.txt'), 'Private storage holds resume PDFs.');
  await fs.writeFile(path.join(dir, 'ignore.json'), '{}');
  await fs.mkdir(path.join(dir, 'nested'));
  await fs.writeFile(path.join(dir, 'nested', 'extra.md'), '# Extra\nMore help.');
});
afterAll(async () => {
  // Only remove the exact temporary directory created by this test.
  if (path.dirname(dir) !== path.resolve(os.tmpdir()) || !path.basename(dir).startsWith('nextstep-ingestion-')) throw new Error('Unexpected cleanup path');
  await fs.rm(dir, { recursive: true, force: true });
});
beforeEach(() => {
  store = { isReady: () => true, addDocuments: jest.fn().mockResolvedValue() };
  service = new Ingestion(store);
});
test('markdown preserves user-facing text and strips code, images, and markup', () => {
  const result = service.parseMarkdown('# Title\n**Bold** [Link](https://example.com) ![image](x.png)\n\x60\x60\x60js\nsecret()\n\x60\x60\x60');
  expect(result).toContain('Title');
  expect(result).toContain('Bold Link');
  expect(result).not.toContain('secret()');
  expect(result).not.toContain('image');
});
test('plain text normalizes line endings', () => expect(service.parseText('  text\r\n\r\n\r\nmore  ')).toBe('text\n\nmore'));
test.each(['', '  ', null, 123])('empty or invalid chunking input fails: %j', input => expect(() => service.splitText(input)).toThrow('non-empty'));
test('chunking preserves content with overlap and a strict size bound', () => {
  const text = Array.from({ length: 400 }, (_, i) => 'word' + i).join(' ');
  const chunks = service.splitText(text);
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.every(c => c.length <= service.chunkSize)).toBe(true);
  for (const word of text.split(' ')) expect(chunks.some(c => c.includes(word))).toBe(true);
});
test('chunk IDs survive re-ingestion and metadata does not expose absolute local paths', async () => {
  const file = path.join(dir, 'help.md');
  const first = await service.processDocument(file), second = await service.processDocument(file);
  expect(first[0].metadata.id).toBe(second[0].metadata.id);
  expect(first[0].metadata.source).toBe('help.md');
  expect(first[0].metadata.filePath).toBeUndefined();
});
test('unsupported files fail without being embedded', async () => await expect(service.processDocument(path.join(dir, 'ignore.json'))).rejects.toThrow('Unsupported'));
test('recursive ingestion handles only supported files', async () => {
  const result = await service.ingestDirectory(dir);
  expect(result.filesProcessed).toBe(3);
  expect(result.errors).toEqual([]);
  expect(store.addDocuments).toHaveBeenCalledTimes(3);
});
test('nonrecursive ingestion skips child directories', async () => expect((await service.ingestDirectory(dir, { recursive: false })).filesProcessed).toBe(2));
test('provider failures are surfaced in ingestion statistics', async () => {
  store.addDocuments.mockRejectedValue(new Error('quota reached'));
  const result = await service.ingestDirectory(dir, { recursive: false });
  expect(result.filesSkipped).toBe(2);
  expect(result.filesProcessed).toBe(0);
  expect(result.errors).toHaveLength(2);
});
test('ingestion requires a ready vector store', async () => {
  store.isReady = () => false;
  await expect(service.ingestDirectory(dir)).rejects.toThrow('not initialized');
});
