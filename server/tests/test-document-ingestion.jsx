/**
 * Test script for DocumentIngestionService
 */

const DocumentIngestionService = require('./services/documentIngestionService');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function testDocumentIngestion() {
  console.log('🧪 Testing Document Ingestion Service...\n');

  const ingestionService = new DocumentIngestionService();

  try {
    // Test 1: Markdown parsing
    console.log('Test 1: Markdown parsing');
    const markdownContent = `
# NextStep Application

This is a **job matching** platform for *students*.

## Features

- Swipe-based interface
- AI-powered matching
- Real-time notifications

[Learn more](https://example.com)

\`\`\`javascript
const app = 'NextStep';
\`\`\`
    `;
    
    const parsedMd = ingestionService.parseMarkdown(markdownContent);
    console.log('✅ Parsed markdown:');
    console.log(`   Length: ${parsedMd.length} chars`);
    console.log(`   Preview: ${parsedMd.substring(0, 100)}...\n`);

    // Test 2: Text parsing
    console.log('Test 2: Text parsing');
    const textContent = 'This is a simple text file.\n\n\n\nWith multiple newlines.\n\n\nAnd more content.';
    const parsedTxt = ingestionService.parseText(textContent);
    console.log('✅ Parsed text:');
    console.log(`   Length: ${parsedTxt.length} chars`);
    console.log(`   Content: "${parsedTxt}"\n`);

    // Test 3: Text splitting
    console.log('Test 3: Text splitting');
    const longText = 'Lorem ipsum dolor sit amet. '.repeat(50); // ~1400 chars
    const chunks = ingestionService.splitText(longText);
    console.log(`✅ Split text into ${chunks.length} chunks`);
    chunks.forEach((chunk, i) => {
      console.log(`   Chunk ${i + 1}: ${chunk.length} chars`);
    });
    console.log();

    // Test 4: Create test markdown file
    console.log('Test 4: Process markdown file');
    const testMdPath = path.join(__dirname, 'test-doc.md');
    const testMdContent = `
# Test Document

This is a test document for the NextStep RAG system.

## Section 1

NextStep is a job matching application that helps students find employment opportunities.
The platform uses AI to match job seekers with relevant positions.

## Section 2

Employers can post job listings and review applications from qualified candidates.
The system provides analytics and insights to improve hiring outcomes.
    `.trim();
    
    await fs.writeFile(testMdPath, testMdContent);
    const mdDocuments = await ingestionService.processDocument(testMdPath);
    
    console.log(`✅ Processed markdown file into ${mdDocuments.length} chunks`);
    mdDocuments.forEach((doc, i) => {
      console.log(`\n   Chunk ${i + 1}:`);
      console.log(`   Text length: ${doc.text.length} chars`);
      console.log(`   Source: ${doc.metadata.source}`);
      console.log(`   Type: ${doc.metadata.documentType}`);
      console.log(`   Preview: ${doc.text.substring(0, 80)}...`);
    });
    console.log();

    // Test 5: Create test text file
    console.log('Test 5: Process text file');
    const testTxtPath = path.join(__dirname, 'test-doc.txt');
    const testTxtContent = 'This is a simple text document.\n\nIt contains multiple paragraphs.\n\nEach paragraph is separated by blank lines.';
    
    await fs.writeFile(testTxtPath, testTxtContent);
    const txtDocuments = await ingestionService.processDocument(testTxtPath);
    
    console.log(`✅ Processed text file into ${txtDocuments.length} chunks`);
    txtDocuments.forEach((doc, i) => {
      console.log(`\n   Chunk ${i + 1}:`);
      console.log(`   Text: "${doc.text}"`);
      console.log(`   Metadata:`, doc.metadata);
    });
    console.log();

    // Test 6: Error handling - unsupported file type
    console.log('Test 6: Error handling - unsupported file type');
    const testPdfPath = path.join(__dirname, 'test-doc.pdf');
    await fs.writeFile(testPdfPath, 'fake pdf content');
    
    try {
      await ingestionService.processDocument(testPdfPath);
      console.log('❌ Should have thrown error for unsupported file type');
    } catch (error) {
      console.log(`✅ Correctly rejected unsupported file: ${error.message}\n`);
    }

    // Test 7: Error handling - empty file
    console.log('Test 7: Error handling - empty file');
    const emptyPath = path.join(__dirname, 'empty.txt');
    await fs.writeFile(emptyPath, '');
    
    try {
      await ingestionService.processDocument(emptyPath);
      console.log('❌ Should have thrown error for empty file');
    } catch (error) {
      console.log(`✅ Correctly rejected empty file: ${error.message}\n`);
    }

    // Test 8: Get chunking config
    console.log('Test 8: Get chunking configuration');
    const config = ingestionService.getChunkingConfig();
    console.log('✅ Chunking config:', config);
    console.log();

    // Cleanup
    console.log('Cleanup: Removing test files');
    await fs.unlink(testMdPath);
    await fs.unlink(testTxtPath);
    await fs.unlink(testPdfPath);
    await fs.unlink(emptyPath);
    console.log('✅ Test files removed\n');

    console.log('✅ All document ingestion tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testDocumentIngestion();
