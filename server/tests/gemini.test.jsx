const mockGenerate = jest.fn();
const mockEmbed = jest.fn();
const mockJobSearch = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({ models: { generateContent: mockGenerate, embedContent: mockEmbed } }))
}));

jest.mock('../services/jobApiService.jsx', () => ({ searchJobs: mockJobSearch }));

process.env.GEMINI_API_KEY = 'test-key';
const ai = require('../services/geminiService.js');
const analyzePDF = require('../middleware/AnalyzePdf.jsx');
const { parseSearchCriteria, refineFoundPositions } = require('../middleware/genAI.jsx');
const express = require('express');
const request = require('supertest');
const chatRoutes = require('../routes/chatRoutes.jsx');

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-key';
  ai.clearEmbeddingCache();
  mockGenerate.mockReset();
  mockEmbed.mockReset();
  mockJobSearch.mockReset();
  mockEmbed.mockResolvedValue({ embeddings: [{ values: Array(1536).fill(0.1) }] });
});

test('missing key fails at request time without preventing imports/server setup', async () => {
  delete process.env.GEMINI_API_KEY;
  await expect(ai.generateText('Hello')).rejects.toMatchObject({ status: 503 });
  expect(mockGenerate).not.toHaveBeenCalled();
});

test('search criteria preserve the existing API response contract using structured JSON', async () => {
  const criteria = { locations: ['Boston'], salaryRange: { minimum: 80000 }, my_requirements: null, skills: ['JavaScript'], company: null };
  mockGenerate.mockResolvedValue({ text: JSON.stringify(criteria) });
  await expect(parseSearchCriteria('JavaScript jobs in Boston')).resolves.toEqual(criteria);
  expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({
    model: ai.generationModel,
    config: expect.objectContaining({ responseMimeType: 'application/json', responseJsonSchema: expect.any(Object) })
  }));
});

test.each([
  [{ text: '' }, 'no usable response'],
  [{ text: '{broken' }, 'invalid structured response'],
  [{ text: '{"ok":true}', candidates: [{ finishReason: 'MAX_TOKENS' }] }, 'truncated']
])('rejects empty, malformed and truncated model output', async (response, message) => {
  mockGenerate.mockResolvedValue(response);
  await expect(ai.generateJson('Test')).rejects.toThrow(message);
});

test('quota errors stay 429 and do not retry or expose upstream payloads', async () => {
  mockGenerate.mockRejectedValue({ status: 429, message: 'Sensitive upstream body and key' });
  await expect(ai.generateText('Test')).rejects.toMatchObject({ status: 429, message: expect.stringContaining('quota reached') });
  expect(mockGenerate).toHaveBeenCalledTimes(1);
});

test('invalid credentials are sanitized', async () => {
  mockGenerate.mockRejectedValue({ status: 403, message: 'SECRET_KEY' });
  await expect(ai.generateText('Test')).rejects.toMatchObject({ status: 503, message: expect.not.stringContaining('SECRET_KEY') });
});

test('embeddings use the requested dimension and cache the whole case-sensitive input', async () => {
  const prefix = 'x'.repeat(500);
  await ai.embedText(prefix + ' JavaScript');
  await ai.embedText(prefix + ' Python');
  await ai.embedText(prefix + ' JavaScript');
  expect(mockEmbed).toHaveBeenCalledTimes(2);
  expect(mockEmbed).toHaveBeenCalledWith(expect.objectContaining({
    model: ai.embeddingModel, config: { outputDimensionality: 1536 }
  }));
});

test('concurrent duplicates share one request and callers cannot mutate the cache', async () => {
  const [first, second] = await Promise.all([ai.embedText('same'), ai.embedText('same')]);
  expect(mockEmbed).toHaveBeenCalledTimes(1);
  first[0] = 999;
  expect(second[0]).toBe(0.1);
  expect((await ai.embedText('same'))[0]).toBe(0.1);
});

test.each([[], Array(1536).fill(0), Array(1536).fill(NaN), [1, 2]].map(vector => ({ vector })))('rejects unusable vectors', async ({ vector }) => {
  mockEmbed.mockResolvedValue({ embeddings: [{ values: vector }] });
  await expect(ai.embedText('Test')).rejects.toThrow('invalid embedding');
});

test('equal vector length does not make old OpenAI vectors compatible', () => {
  const embedding = Array(1536).fill(0.1);
  expect(ai.isCurrentEmbedding({ embedding, embeddingModel: 'text-embedding-3-small' })).toBe(false);
  expect(ai.isCurrentEmbedding({ embedding })).toBe(false);
  expect(ai.isCurrentEmbedding({ embedding, embeddingModel: ai.embeddingModel })).toBe(true);
  expect(ai.isCurrentEmbedding({ skillsEmbedding: embedding, embeddingModel: ai.embeddingModel }, 'skillsEmbedding')).toBe(true);
});

test('resume analysis sends an inline PDF and returns the same structured fields', async () => {
  const pdf = Buffer.from('%PDF-1.4\nsynthetic fixture');
  const result = { skills: ['JavaScript'], experiences: ['Example Co - Developer - 2024'], jobTitle: 'Developer' };
  mockGenerate.mockResolvedValue({ text: JSON.stringify(result) });
  await expect(analyzePDF(pdf.toString('base64'))).resolves.toEqual(result);
  expect(mockGenerate.mock.calls[0][0].contents[1]).toEqual({ inlineData: { mimeType: 'application/pdf', data: pdf.toString('base64') } });
});

test('invalid files are rejected before sending anything to Gemini', async () => {
  await expect(analyzePDF(Buffer.from('not a PDF'))).rejects.toMatchObject({ status: 400 });
  const large = Buffer.alloc(10 * 1024 * 1024 + 1);
  large.write('%PDF-');
  await expect(analyzePDF(large)).rejects.toMatchObject({ status: 413 });
  expect(mockGenerate).not.toHaveBeenCalled();
});

test('malformed resume fields do not reach profile clients', async () => {
  mockGenerate.mockResolvedValue({ text: '{"skills":"JavaScript","experiences":[],"jobTitle":"Developer"}' });
  await expect(analyzePDF(Buffer.from('%PDF-1.4'))).rejects.toThrow('invalid resume analysis');
});

test('failed match analysis preserves all jobs without claiming they are good matches', async () => {
  mockGenerate.mockRejectedValue({ status: 429 });
  const jobs = Array.from({ length: 12 }, (_, index) => ({ _id: index, title: 'Developer' }));
  const result = await refineFoundPositions(jobs, 'JavaScript');
  expect(result).toHaveLength(12);
  expect(result.every(job => job.match === 'unknown')).toBe(true);
  expect(mockGenerate).toHaveBeenCalledTimes(1);
});

test('chat keeps its response shape and reports quota errors to the client', async () => {
  const app = express();
  app.use(express.json());
  app.use('/chat', chatRoutes);
  mockGenerate.mockResolvedValueOnce({ text: 'NextStep tracks applications.' });
  const success = await request(app).post('/chat').send({ message: 'What is NextStep?' });
  expect(success.status).toBe(200);
  expect(success.body).toEqual({ response: 'NextStep tracks applications.' });
  mockGenerate.mockRejectedValueOnce({ status: 429 });
  const limited = await request(app).post('/chat').send({ message: 'Help' });
  expect(limited.status).toBe(429);
  expect(limited.body.error).toContain('quota reached');
  expect((await request(app).post('/chat').send({ message: 42 })).status).toBe(400);
});

test('RAG embeddings use the same provider with their separate 768-dimensional space', async () => {
  const EmbeddingService = require('../services/embeddingService.jsx');
  mockEmbed.mockResolvedValue({ embeddings: [{ values: Array(768).fill(0.1) }] });
  const vector = await new EmbeddingService().embedText('Help documentation');
  expect(vector).toHaveLength(768);
  expect(mockEmbed.mock.calls[0][0].config.outputDimensionality).toBe(768);
});

test('documentation chat generates through Gemini and preserves sources', async () => {
  const RAGService = require('../services/ragService.jsx');
  const vectorStore = { similaritySearch: jest.fn().mockResolvedValue([
    { document: 'NextStep tracks job applications.', score: 0.9, metadata: { source: 'help.md' } }
  ]) };
  mockGenerate.mockResolvedValue({ text: 'Use the application tracker.' });
  const result = await new RAGService(vectorStore).generateResponse('How can I track my applications?');
  expect(result.response).toBe('Use the application tracker.');
  expect(result.sources[0].document).toBe('help.md');
  expect(mockGenerate).toHaveBeenCalledTimes(1);
});

