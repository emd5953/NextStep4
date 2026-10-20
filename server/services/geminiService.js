const path = require('path');
const { createHash } = require('crypto');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// These models offer a free tier. Billing/quotas belong to the AI Studio project.
// Quota errors never trigger a provider switch or a billing upgrade.
const generationModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2';
const embeddingDimensions = 1536;
const vectorIndex = process.env.GEMINI_VECTOR_INDEX || 'js_gemini_vector_index';
let client;
let clientKey;
const embeddingCache = new Map();
const pendingEmbeddings = new Map();
const stats = { generationCalls: 0, embeddingCalls: 0, cacheHits: 0 };

function aiError(message, status = 502) {
  return Object.assign(new Error(message), { status });
}

function getClient() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || /^(your_|paste_)/i.test(key)) {
    throw aiError('Add GEMINI_API_KEY to server/.env and restart the server.', 503);
  }
  if (!client || clientKey !== key) {
    client = new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 30000 } });
    clientKey = key;
  }
  return client;
}

function publicError(error) {
  // Do not forward upstream bodies/URLs, which can include credentials or input.
  if (error.status === 503 && error.message.startsWith('Add GEMINI_API_KEY')) return error;
  const status = Number(error.status || error.code);
  if (status === 429) return aiError('Gemini free-tier quota reached. Wait and try again, or check the project limits in Google AI Studio.', 429);
  if (status === 400 || status === 401 || status === 403) return aiError('Gemini rejected the request. Check the API key, project access, and configured model in Google AI Studio.', 503);
  if (status === 404) return aiError('The configured Gemini model is unavailable. Check GEMINI_MODEL and GEMINI_EMBEDDING_MODEL in server/.env.', 503);
  return aiError('Gemini could not complete this request. Please try again later.');
}

async function generateText(contents, options = {}) {
  const ai = getClient();
  let response;
  try {
    stats.generationCalls++;
    response = await ai.models.generateContent({
      model: options.model || generationModel,
      contents,
      config: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxOutputTokens || 2048,
        ...(options.systemInstruction && { systemInstruction: options.systemInstruction }),
        ...(options.json && { responseMimeType: 'application/json' }),
        ...(options.schema && { responseJsonSchema: options.schema })
      }
    });
  } catch (error) {
    throw publicError(error);
  }
  if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
    throw aiError('Gemini response was truncated. Please use a shorter input.');
  }
  if (!response.text?.trim()) throw aiError('Gemini returned no usable response.');
  return response.text;
}

async function generateJson(contents, options = {}) {
  const text = await generateText(contents, { ...options, json: true });
  try {
    return JSON.parse(text);
  } catch {
    throw aiError('Gemini returned an invalid structured response. Please try again.');
  }
}

function isValidEmbedding(vector, dimensions = embeddingDimensions) {
  return Array.isArray(vector) && vector.length === dimensions &&
    vector.every(Number.isFinite) && vector.some(value => value !== 0);
}

function isCurrentEmbedding(record, field = 'embedding') {
  return record?.embeddingModel === embeddingModel && isValidEmbedding(record[field]);
}

async function embedText(text, options = {}) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Text must be a non-empty string');
  const model = options.model || embeddingModel;
  const dimensions = options.dimensions || embeddingDimensions;
  const cacheKey = createHash('sha256').update(JSON.stringify([model, dimensions, text])).digest('hex');
  if (embeddingCache.has(cacheKey)) {
    stats.cacheHits++;
    const vector = embeddingCache.get(cacheKey);
    embeddingCache.delete(cacheKey);
    embeddingCache.set(cacheKey, vector);
    return [...vector];
  }
  if (pendingEmbeddings.has(cacheKey)) return [...await pendingEmbeddings.get(cacheKey)];
  const request = (async () => {
    const ai = getClient();
    let response;
    try {
      stats.embeddingCalls++;
      response = await ai.models.embedContent({
        model, contents: text,
        config: { outputDimensionality: dimensions }
      });
    } catch (error) {
      throw publicError(error);
    }
    const vector = response.embeddings?.[0]?.values;
    if (!isValidEmbedding(vector, dimensions)) throw aiError('Gemini returned an invalid embedding.');
    if (embeddingCache.size >= 100) embeddingCache.delete(embeddingCache.keys().next().value);
    embeddingCache.set(cacheKey, vector);
    return vector;
  })();
  pendingEmbeddings.set(cacheKey, request);
  try {
    return [...await request];
  } finally {
    pendingEmbeddings.delete(cacheKey);
  }
}

function getStats() {
  const total = stats.embeddingCalls + stats.cacheHits;
  return {
    ...stats, apiCalls: stats.generationCalls + stats.embeddingCalls,
    cacheSize: embeddingCache.size,
    hitRate: total ? (stats.cacheHits / total * 100).toFixed(1) + '%' : '0%',
    generationModel, embeddingModel
  };
}

module.exports = {
  generateText, generateJson, embedText, isCurrentEmbedding,
  generationModel, embeddingModel, embeddingDimensions, vectorIndex,
  getStats, clearEmbeddingCache: () => embeddingCache.clear()
};
