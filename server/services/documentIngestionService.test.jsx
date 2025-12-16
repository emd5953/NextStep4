/**
 * Tests for Document Ingestion Service
 * Validates: Requirements 2.1, 3.1, 3.2
 */

const fs = require('fs').promises;
const path = require('path');
const DocumentIngestionService = require('./documentIngestionService');

// Mock vector store
class MockVectorStore {
  constructor() {
    this.documents = [];
  }

  async addDocuments(docs) {
    this.documents.push(...docs);
  }

  clear() {
    this.documents = [];
  }

  getDocuments() {
    return this.documents;
  }
}

describe('DocumentIngestionService', () => {
  let ingestionService;
  let mockVectorStore;
  const testDir = path.join(__dirname, '../test-documents');

  beforeAll(async () => {
    // Create test directory and files
    await fs.mkdir(testDir, { recursive: true });

    // Create test markdown file
    await fs.writeFile(
      path.join(testDir, 'test.md'),
      '# Test Document\n\nThis is a **test** document with *markdown* formatting.\n\n## Section 1\n\nSome content here.'
    );

    // Create test text file
    await fs.writeFile(
      path.join(testDir, 'test.txt'),
      'This is a plain text document.\n\nIt has multiple paragraphs.\n\nAnd some content.'
    );

    // Create unsupported file
    await fs.writeFile(
      path.join(testDir, 'test.json'),
      '{"test": "data"}'
    );
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  });

  beforeEach(() => {
    mockVectorStore = new MockVectorStore();
    ingestionService = new DocumentIngestionService(mockVectorStore);
  });

  describe('Constructor', () => {
    test('should initialize with vector store', () => {
      expect(ingestionService.vectorStore).toBe(mockVectorStore);
      expect(ingestionService.getSupportedExtensions()).toEqual(['.md', '.txt']);
    });
  });

  describe('splitText', () => {
    test('should split text into chunks', async () => {
      const text = 'This is a test. '.repeat(100); // Create long text
      const chunks = await ingestionService.splitText(text, { chunkSize: 200, chunkOverlap: 20 });

      expect(chunks).toBeDefined();
      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(1);
    });

    test('should respect chunk size constraints', async () => {
      const text = 'Word '.repeat(500);
      const chunkSize = 500;
      const chunks = await ingestionService.splitText(text, { chunkSize, chunkOverlap: 50 });

      // Most chunks should be close to chunk size (allowing for last chunk)
      for (let i = 0; i < chunks.length - 1; i++) {
        expect(chunks[i].length).toBeLessThanOrEqual(chunkSize + 100); // Some tolerance
      }
    });

    test('should handle small text that fits in one chunk', async () => {
      const text = 'This is a short text that fits in one chunk.';
      const chunks = await ingestionService.splitText(text);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toBe(text);
    });

    test('should reject empty string', async () => {
      await expect(ingestionService.splitText('')).rejects.toThrow('Text must be a non-empty string');
    });

    test('should reject whitespace-only string', async () => {
      await expect(ingestionService.splitText('   \n  \t  ')).rejects.toThrow('Text cannot be empty');
    });

    test('should reject null input', async () => {
      await expect(ingestionService.splitText(null)).rejects.toThrow('Text must be a non-empty string');
    });

    test('should reject invalid chunk size', async () => {
      await expect(
        ingestionService.splitText('test text', { chunkSize: 50 })
      ).rejects.toThrow('Chunk size must be between 100 and 2000');
    });

    test('should reject invalid chunk overlap', async () => {
      await expect(
        ingestionService.splitText('test text', { chunkOverlap: 60 })
      ).rejects.toThrow('Chunk overlap must be between 0 and 50');
    });
  });

  describe('_parseMarkdown', () => {
    test('should remove markdown heading syntax', () => {
      const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
      const result = ingestionService._parseMarkdown(markdown);

      expect(result).not.toContain('#');
      expect(result).toContain('Heading 1');
      expect(result).toContain('Heading 2');
    });

    test('should remove bold and italic markers', () => {
      const markdown = 'This is **bold** and *italic* text.';
      const result = ingestionService._parseMarkdown(markdown);

      expect(result).not.toContain('**');
      expect(result).not.toContain('*');
      expect(result).toContain('bold');
      expect(result).toContain('italic');
    });

    test('should remove link syntax but keep text', () => {
      const markdown = 'Check out [this link](https://example.com) for more info.';
      const result = ingestionService._parseMarkdown(markdown);

      expect(result).not.toContain('[');
      expect(result).not.toContain(']');
      expect(result).not.toContain('(https://');
      expect(result).toContain('this link');
    });

    test('should remove code block markers', () => {
      const markdown = '```javascript\nconst x = 1;\n```';
      const result = ingestionService._parseMarkdown(markdown);

      expect(result).not.toContain('```');
      expect(result).toContain('const x = 1');
    });

    test('should remove list markers', () => {
      const markdown = '- Item 1\n- Item 2\n1. Numbered item';
      const result = ingestionService._parseMarkdown(markdown);

      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
      expect(result).not.toMatch(/^-\s/m);
      expect(result).not.toMatch(/^\d+\.\s/m);
    });

    test('should handle empty markdown', () => {
      const result = ingestionService._parseMarkdown('');
      expect(result).toBe('');
    });
  });

  describe('_parseText', () => {
    test('should normalize line endings', () => {
      const text = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const result = ingestionService._parseText(text);

      expect(result).not.toContain('\r');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 4');
    });

    test('should remove excessive blank lines', () => {
      const text = 'Paragraph 1\n\n\n\n\nParagraph 2';
      const result = ingestionService._parseText(text);

      expect(result).not.toContain('\n\n\n');
      expect(result).toContain('Paragraph 1');
      expect(result).toContain('Paragraph 2');
    });

    test('should trim whitespace', () => {
      const text = '  \n  Some text  \n  ';
      const result = ingestionService._parseText(text);

      expect(result).toBe('Some text');
    });
  });

  describe('processDocument', () => {
    test('should process markdown file', async () => {
      const filePath = path.join(testDir, 'test.md');
      const documents = await ingestionService.processDocument(filePath);

      expect(documents).toBeDefined();
      expect(Array.isArray(documents)).toBe(true);
      expect(documents.length).toBeGreaterThan(0);

      const doc = documents[0];
      expect(doc).toHaveProperty('text');
      expect(doc).toHaveProperty('metadata');
      expect(doc.metadata.source).toBe('test.md');
      expect(doc.metadata.documentType).toBe('md');
      expect(doc.metadata.chunkIndex).toBe(0);
    });

    test('should process text file', async () => {
      const filePath = path.join(testDir, 'test.txt');
      const documents = await ingestionService.processDocument(filePath);

      expect(documents).toBeDefined();
      expect(Array.isArray(documents)).toBe(true);
      expect(documents.length).toBeGreaterThan(0);

      const doc = documents[0];
      expect(doc.metadata.documentType).toBe('txt');
    });

    test('should include chunk metadata', async () => {
      const filePath = path.join(testDir, 'test.md');
      const documents = await ingestionService.processDocument(filePath);

      documents.forEach((doc, index) => {
        expect(doc.metadata.chunkIndex).toBe(index);
        expect(doc.metadata.totalChunks).toBe(documents.length);
        expect(doc.metadata).toHaveProperty('processedAt');
        expect(doc.metadata).toHaveProperty('sourcePath');
      });
    });

    test('should reject non-existent file', async () => {
      await expect(
        ingestionService.processDocument(path.join(testDir, 'nonexistent.md'))
      ).rejects.toThrow('File not found');
    });

    test('should reject unsupported file format', async () => {
      await expect(
        ingestionService.processDocument(path.join(testDir, 'test.json'))
      ).rejects.toThrow('Unsupported file format');
    });
  });

  describe('ingestDirectory', () => {
    test('should ingest all supported files from directory', async () => {
      const results = await ingestionService.ingestDirectory(testDir);

      expect(results).toHaveProperty('processed');
      expect(results).toHaveProperty('failed');
      expect(results).toHaveProperty('totalChunks');
      expect(results).toHaveProperty('errors');

      expect(results.processed).toBe(2); // test.md and test.txt
      expect(results.totalChunks).toBeGreaterThan(0);
      expect(mockVectorStore.getDocuments().length).toBe(results.totalChunks);
    });

    test('should handle directory with no supported files', async () => {
      const emptyDir = path.join(testDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      const results = await ingestionService.ingestDirectory(emptyDir);

      expect(results.processed).toBe(0);
      expect(results.totalChunks).toBe(0);

      await fs.rmdir(emptyDir);
    });

    test('should reject non-existent directory', async () => {
      await expect(
        ingestionService.ingestDirectory(path.join(testDir, 'nonexistent'))
      ).rejects.toThrow('Invalid directory path');
    });

    test('should reject file path instead of directory', async () => {
      await expect(
        ingestionService.ingestDirectory(path.join(testDir, 'test.md'))
      ).rejects.toThrow('Path is not a directory');
    });

    test('should track errors for failed files', async () => {
      // Create a file that will cause processing error (empty file)
      const emptyFile = path.join(testDir, 'empty.md');
      await fs.writeFile(emptyFile, '');

      const results = await ingestionService.ingestDirectory(testDir);

      expect(results.failed).toBeGreaterThan(0);
      expect(results.errors.length).toBeGreaterThan(0);

      await fs.unlink(emptyFile);
    });
  });

  describe('getSupportedExtensions', () => {
    test('should return array of supported extensions', () => {
      const extensions = ingestionService.getSupportedExtensions();

      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions).toContain('.md');
      expect(extensions).toContain('.txt');
    });
  });
});
