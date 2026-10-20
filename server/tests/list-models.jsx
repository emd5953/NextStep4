const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
(async () => {
  if (!process.env.GEMINI_API_KEY) throw new Error('Set GEMINI_API_KEY in server/.env.');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const models = await ai.models.list();
  for await (const model of models) console.log(model.name);
})().catch(() => { console.error('Could not list Gemini models. Check the key and project access.'); process.exitCode = 1; });
