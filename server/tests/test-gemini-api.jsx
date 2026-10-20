// Manual smoke test: only synthetic text is sent to Gemini.
const assert = require('node:assert/strict');
const { parseSearchCriteria, generateEmbeddings } = require('../middleware/genAI.jsx');
const { generationModel, embeddingModel } = require('../services/geminiService.js');

function syntheticResumePdf() {
  const content = 'BT /F1 16 Tf 50 750 Td (Sample Candidate - Software Developer) Tj 0 -30 Td (Skills: JavaScript, React, Node.js) Tj 0 -30 Td (Experience: Example Company - Developer - 2023 to 2025) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + Buffer.byteLength(content) + ' >>\nstream\n' + content + '\nendstream'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
  });
  const xref = Buffer.byteLength(pdf);
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  pdf += offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n \n').join('');
  pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(pdf);
}

(async () => {
  const result = await parseSearchCriteria('Find remote JavaScript developer jobs paying at least 80000 USD a year.');
  assert(Array.isArray(result.skills));
  assert(result.skills.some(skill => /javascript/i.test(skill)));
  console.log('PASS: Gemini structured generation (' + generationModel + ')');
  const vector = await generateEmbeddings('Synthetic JavaScript developer job.');
  assert.equal(vector.length, 1536);
  assert(vector.every(Number.isFinite));
  console.log('PASS: Gemini job embeddings (' + embeddingModel + ', 1536 dimensions)');
  const EmbeddingService = require('../services/embeddingService.jsx');
  const ragVector = await new EmbeddingService().embedText('NextStep helps users track job applications.');
  assert.equal(ragVector.length, 768);
  console.log('PASS: Gemini documentation embeddings (768 dimensions)');
  const analyzePDF = require('../middleware/AnalyzePdf.jsx');
  const resume = await analyzePDF(syntheticResumePdf());
  assert(resume.skills.some(skill => /javascript/i.test(skill)));
  assert(Array.isArray(resume.experiences));
  assert.equal(typeof resume.jobTitle, 'string');
  console.log('PASS: Gemini PDF resume analysis (synthetic resume only)');
})().catch(error => { console.error('FAIL: ' + error.message); process.exitCode = 1; });
