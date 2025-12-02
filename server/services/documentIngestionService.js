/**
 * Document Ingestion Service
 * 
 * Processes documents and loads them into the vector store.
 * Handles file parsing, text splitting, and metadata extraction.
 * 
 * Validates: Requirements 2.1, 3.1, 3.2
 */

const fs = require('fs').promises;
const path = require('path');
const ragConfig = require('../config/ragConfig');

class DocumentIngestionService {
  /**
   * Initialize ingestion service
   * @param {VectorStoreService} vectorStore - Vector store instance
   */
  constructor(vectorStore) {
    this.vectorStore = vectorStore;
    this.supportedExtensions = ['.md', '.txt'];
  }

  /**
   * Ingest documents from a directory
   * 
   * @param {string} directoryPath - Path to documents directory
   * @param {Object} options - Processing options
   * @param {number} options.chunkSize - Size of chunks (default: from config)
   * @param {number} options.chunkOverlap - Overlap between chunks (default: from config)
   * @returns {Promise<Object>} Statistics: { processed, failed, totalChunks, errors }
   * @throws {Error} If directory doesn't exist or is invalid
   * 
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
   */
  async ingestDirectory(directoryPath, options = {}) {
    // Validate directory exists
    try {
      const stats = await fs.stat(directoryPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${directoryPath}`);
      }
    } catch (error) {
      throw new Error(`Invalid directory path: ${error.message}`);
    }

    const results = {
      processed: 0,
      failed: 0,
      totalChunks: 0,
      errors: []
    };

    console.log(`Starting document ingestion from: ${directoryPath}`);

    try {
      // Get all files recursively
      const files = await this._getFilesRecursively(directoryPath);
      console.log(`Found ${files.length} files to process`);

      // Filter supported files
      const supportedFiles = files.filter(file => 
        this.supportedExtensions.includes(path.extname(file).toLowerCase())
      );

      console.log(`Processing ${supportedFiles.length} supported files`);

      // Process each file
      for (const filePath of supportedFiles) {
        try {
          console.log(`Processing: ${filePath}`);
          const chunks = await this.processDocument(filePath, options);
          
          // Add chunks to vector store
          await this.vectorStore.addDocuments(chunks);
          
          results.processed++;
          results.totalChunks += chunks.length;
          console.log(`✓ Processed ${filePath}: ${chunks.length} chunks`);
        } catch (error) {
          results.failed++;
          results.errors.push({
            file: filePath,
            error: error.message
          });
          console.error(`✗ Failed to process ${filePath}:`, error.message);
        }
      }

      console.log('\nIngestion complete:');
      console.log(`  Processed: ${results.processed} files`);
      console.log(`  Failed: ${results.failed} files`);
      console.log(`  Total chunks: ${results.totalChunks}`);

      return results;
    } catch (error) {
      console.error('Error during directory ingestion:', error);
      throw new Error(`Failed to ingest directory: ${error.message}`);
    }
  }

  /**
   * Process a single document
   * 
   * @param {string} filePath - Path to document
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Array of processed chunks with metadata
   * @throws {Error} If file cannot be read or processed
   * 
   * Validates: Requirements 2.1, 3.1, 3.2
   */
  async processDocument(filePath, options = {}) {
    // Validate file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    if (!this.supportedExtensions.includes(ext)) {
      throw new Error(`Unsupported file format: ${ext}. Supported formats: ${this.supportedExtensions.join(', ')}`);
    }

    try {
      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse based on file type
      let text;
      if (ext === '.md') {
        text = this._parseMarkdown(content);
      } else if (ext === '.txt') {
        text = this._parseText(content);
      } else {
        throw new Error(`Unsupported file extension: ${ext}`);
      }

      // Validate content
      if (!text || text.trim().length === 0) {
        throw new Error('Document contains no text content');
      }

      // Split into chunks
      const textChunks = await this.splitText(text, options);

      // Create document objects with metadata
      const documents = textChunks.map((chunk, index) => ({
        text: chunk,
        metadata: {
          source: path.basename(filePath),
          sourcePath: filePath,
          chunkIndex: index,
          totalChunks: textChunks.length,
          documentType: ext.substring(1), // Remove the dot
          processedAt: new Date().toISOString()
        }
      }));

      return documents;
    } catch (error) {
      throw new Error(`Failed to process document ${filePath}: ${error.message}`);
    }
  }

  /**
   * Split text into chunks
   * 
   * @param {string} text - Text to split
   * @param {Object} options - Chunking options
   * @param {number} options.chunkSize - Size of chunks (default: from config)
   * @param {number} options.chunkOverlap - Overlap between chunks (default: from config)
   * @returns {Promise<Array<string>>} Array of text chunks
   * @throws {Error} If text is invalid or splitting fails
   * 
   * Validates: Requirements 2.1
   */
  async splitText(text, options = {}) {
    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    if (text.trim().length === 0) {
      throw new Error('Text cannot be empty or whitespace only');
    }

    // Get chunk size and overlap from options or config
    const chunkSize = options.chunkSize || ragConfig.chunkSize;
    const chunkOverlap = options.chunkOverlap || ragConfig.chunkOverlap;

    // Validate chunk size
    if (chunkSize < 100 || chunkSize > 2000) {
      throw new Error('Chunk size must be between 100 and 2000 characters');
    }

    // Validate chunk overlap
    if (chunkOverlap < 0 || chunkOverlap > 50) {
      throw new Error('Chunk overlap must be between 0 and 50 characters');
    }

    try {
      // Split text using custom recursive splitter
      const chunks = this._recursiveSplit(text, chunkSize, chunkOverlap);

      // Validate chunks
      for (const chunk of chunks) {
        if (chunk.length < 100) {
          // Allow last chunk to be smaller
          if (chunks.indexOf(chunk) !== chunks.length - 1) {
            console.warn(`Warning: Chunk smaller than minimum size: ${chunk.length} characters`);
          }
        }
        if (chunk.length > chunkSize) {
          console.warn(`Warning: Chunk exceeds maximum size: ${chunk.length} characters`);
        }
      }

      return chunks;
    } catch (error) {
      throw new Error(`Failed to split text: ${error.message}`);
    }
  }

  /**
   * Parse markdown file and extract text content
   * 
   * @param {string} content - Markdown content
   * @returns {string} Extracted text
   * @private
   * 
   * Validates: Requirements 3.1
   */
  _parseMarkdown(content) {
    // Remove markdown syntax while preserving structure
    let text = content;

    // Remove HTML comments
    text = text.replace(/<!--[\s\S]*?-->/g, '');

    // Remove code block markers but keep content
    text = text.replace(/```[\s\S]*?\n/g, '');
    text = text.replace(/```/g, '');

    // Remove inline code markers but keep content
    text = text.replace(/`([^`]+)`/g, '$1');

    // Remove image syntax
    text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');

    // Remove link syntax but keep text
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // Remove heading markers but keep text
    text = text.replace(/^#{1,6}\s+/gm, '');

    // Remove bold/italic markers
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
    text = text.replace(/\*([^*]+)\*/g, '$1');
    text = text.replace(/___([^_]+)___/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');

    // Remove list markers
    text = text.replace(/^\s*[-*+]\s+/gm, '');
    text = text.replace(/^\s*\d+\.\s+/gm, '');

    // Remove blockquote markers
    text = text.replace(/^\s*>\s+/gm, '');

    // Remove horizontal rules
    text = text.replace(/^[-*_]{3,}$/gm, '');

    // Normalize whitespace
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();

    return text;
  }

  /**
   * Parse text file
   * 
   * @param {string} content - Text content
   * @returns {string} Processed text
   * @private
   * 
   * Validates: Requirements 3.2
   */
  _parseText(content) {
    // For plain text, just normalize whitespace
    let text = content;

    // Normalize line endings
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');

    // Remove excessive blank lines
    text = text.replace(/\n{3,}/g, '\n\n');

    // Trim
    text = text.trim();

    return text;
  }

  /**
   * Recursively split text into chunks
   * 
   * @param {string} text - Text to split
   * @param {number} chunkSize - Maximum chunk size
   * @param {number} chunkOverlap - Overlap between chunks
   * @returns {Array<string>} Array of text chunks
   * @private
   */
  _recursiveSplit(text, chunkSize, chunkOverlap) {
    const separators = ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ', ''];
    return this._splitTextRecursive(text, chunkSize, chunkOverlap, separators);
  }

  /**
   * Split text recursively using different separators
   * 
   * @param {string} text - Text to split
   * @param {number} chunkSize - Maximum chunk size
   * @param {number} chunkOverlap - Overlap between chunks
   * @param {Array<string>} separators - Array of separators to try
   * @returns {Array<string>} Array of text chunks
   * @private
   */
  _splitTextRecursive(text, chunkSize, chunkOverlap, separators) {
    const chunks = [];
    
    // If text is small enough, return as single chunk
    if (text.length <= chunkSize) {
      return [text];
    }

    // Try each separator
    for (const separator of separators) {
      if (separator === '') {
        // Last resort: split by character
        return this._splitByCharacter(text, chunkSize, chunkOverlap);
      }

      const splits = text.split(separator);
      
      // If we got meaningful splits, process them
      if (splits.length > 1) {
        let currentChunk = '';
        
        for (let i = 0; i < splits.length; i++) {
          const split = splits[i];
          const testChunk = currentChunk + (currentChunk ? separator : '') + split;
          
          if (testChunk.length <= chunkSize) {
            currentChunk = testChunk;
          } else {
            // Current chunk is full
            if (currentChunk) {
              chunks.push(currentChunk);
              
              // Start new chunk with overlap
              if (chunkOverlap > 0 && currentChunk.length > chunkOverlap) {
                currentChunk = currentChunk.slice(-chunkOverlap) + separator + split;
              } else {
                currentChunk = split;
              }
            } else {
              // Single split is too large, need to split it further
              const subChunks = this._splitTextRecursive(
                split,
                chunkSize,
                chunkOverlap,
                separators.slice(separators.indexOf(separator) + 1)
              );
              chunks.push(...subChunks);
              currentChunk = '';
            }
          }
        }
        
        // Add remaining chunk
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        return chunks;
      }
    }

    // Fallback: split by character
    return this._splitByCharacter(text, chunkSize, chunkOverlap);
  }

  /**
   * Split text by character (last resort)
   * 
   * @param {string} text - Text to split
   * @param {number} chunkSize - Maximum chunk size
   * @param {number} chunkOverlap - Overlap between chunks
   * @returns {Array<string>} Array of text chunks
   * @private
   */
  _splitByCharacter(text, chunkSize, chunkOverlap) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - chunkOverlap;
      
      // Prevent infinite loop
      if (start >= end) {
        start = end;
      }
    }
    
    return chunks;
  }

  /**
   * Get all files recursively from a directory
   * 
   * @param {string} dirPath - Directory path
   * @returns {Promise<Array<string>>} Array of file paths
   * @private
   */
  async _getFilesRecursively(dirPath) {
    const files = [];

    async function traverse(currentPath) {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await traverse(fullPath);
          }
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }
    }

    await traverse(dirPath);
    return files;
  }

  /**
   * Get supported file extensions
   * 
   * @returns {Array<string>} Array of supported extensions
   */
  getSupportedExtensions() {
    return [...this.supportedExtensions];
  }
}

module.exports = DocumentIngestionService;
