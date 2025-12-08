/**
 * Document Ingestion Service
 * 
 * Handles document processing, chunking, and metadata extraction for the RAG system.
 * Supports markdown and text files with configurable chunking parameters.
 * 
 * Validates: Requirements 2.1, 3.1, 3.2
 */

const fs = require('fs').promises;
const path = require('path');
const ragConfig = require('../config/ragConfig.jsx');
const VectorStoreService = require('./vectorStoreService.jsx');

class DocumentIngestionService {
  /**
   * Initialize document ingestion service
   * @param {VectorStoreService} vectorStore - Optional vector store instance
   */
  constructor(vectorStore = null) {
    this.chunkSize = ragConfig.chunkSize;
    this.chunkOverlap = Math.floor((ragConfig.chunkOverlap / 100) * ragConfig.chunkSize);
    this.separators = ['\n\n', '\n', '. ', ' ', ''];
    this.vectorStore = vectorStore;
  }

  /**
   * Custom text splitter implementation
   * Splits text recursively using different separators
   * 
   * @param {string} text - Text to split
   * @param {Array<string>} separators - List of separators to try
   * @returns {Array<string>} Array of text chunks
   * @private
   */
  _recursiveSplit(text, separators) {
    if (!text || text.length === 0) {
      return [];
    }

    // If text is small enough, return it
    if (text.length <= this.chunkSize) {
      return [text];
    }

    // Try each separator
    for (let i = 0; i < separators.length; i++) {
      const separator = separators[i];
      
      if (separator === '') {
        // Last resort: split by character
        const chunks = [];
        for (let j = 0; j < text.length; j += this.chunkSize - this.chunkOverlap) {
          chunks.push(text.substring(j, j + this.chunkSize));
        }
        return chunks;
      }

      if (text.includes(separator)) {
        const splits = text.split(separator);
        const chunks = [];
        let currentChunk = '';

        for (const split of splits) {
          const testChunk = currentChunk + (currentChunk ? separator : '') + split;
          
          if (testChunk.length <= this.chunkSize) {
            currentChunk = testChunk;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            
            // If split itself is too large, recursively split it
            if (split.length > this.chunkSize) {
              const subChunks = this._recursiveSplit(split, separators.slice(i + 1));
              chunks.push(...subChunks);
              currentChunk = '';
            } else {
              currentChunk = split;
            }
          }
        }

        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // Add overlap between chunks
        if (this.chunkOverlap > 0 && chunks.length > 1) {
          return this._addOverlap(chunks);
        }

        return chunks;
      }
    }

    return [text];
  }

  /**
   * Add overlap between chunks
   * 
   * @param {Array<string>} chunks - Array of chunks
   * @returns {Array<string>} Chunks with overlap
   * @private
   */
  _addOverlap(chunks) {
    if (chunks.length <= 1) {
      return chunks;
    }

    const overlappedChunks = [chunks[0]];

    for (let i = 1; i < chunks.length; i++) {
      const prevChunk = chunks[i - 1];
      const currentChunk = chunks[i];
      
      // Get overlap from previous chunk
      const overlapText = prevChunk.substring(Math.max(0, prevChunk.length - this.chunkOverlap));
      
      // Add overlap to current chunk if it doesn't already start with it
      if (!currentChunk.startsWith(overlapText)) {
        overlappedChunks.push(overlapText + currentChunk);
      } else {
        overlappedChunks.push(currentChunk);
      }
    }

    return overlappedChunks;
  }

  /**
   * Parse markdown file and extract text content
   * 
   * @param {string} content - Raw markdown content
   * @returns {string} Extracted text
   * 
   * Validates: Requirements 3.1
   */
  parseMarkdown(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }

    // Remove markdown syntax while preserving text content
    let text = content;

    // Remove code blocks
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`[^`]+`/g, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Remove markdown links but keep text: [text](url) -> text
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // Remove images: ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');

    // Remove headers but keep text: ## Header -> Header
    text = text.replace(/^#{1,6}\s+/gm, '');

    // Remove bold/italic markers: **text** or *text* -> text
    text = text.replace(/\*\*([^\*]+)\*\*/g, '$1');
    text = text.replace(/\*([^\*]+)\*/g, '$1');
    text = text.replace(/__([^_]+)__/g, '$1');
    text = text.replace(/_([^_]+)_/g, '$1');

    // Remove horizontal rules
    text = text.replace(/^[-*_]{3,}$/gm, '');

    // Remove blockquotes
    text = text.replace(/^>\s+/gm, '');

    // Clean up multiple newlines
    text = text.replace(/\n{3,}/g, '\n\n');

    // Trim whitespace
    text = text.trim();

    return text;
  }

  /**
   * Parse text file content
   * 
   * @param {string} content - Raw text content
   * @returns {string} Cleaned text
   * 
   * Validates: Requirements 3.2
   */
  parseText(content) {
    if (!content || typeof content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }

    // Clean up excessive whitespace
    let text = content;
    text = text.replace(/\r\n/g, '\n'); // Normalize line endings
    text = text.replace(/\n{3,}/g, '\n\n'); // Reduce multiple newlines
    text = text.trim();

    return text;
  }

  /**
   * Split text into chunks
   * 
   * @param {string} text - Text to split
   * @returns {Array<string>} Array of text chunks
   * @throws {Error} If text is invalid or splitting fails
   * 
   * Validates: Requirements 2.1
   */
  splitText(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text must be a non-empty string');
    }

    try {
      const chunks = this._recursiveSplit(text, this.separators);
      
      // Validate chunk sizes
      for (let i = 0; i < chunks.length; i++) {
        if (chunks[i].length > this.chunkSize * 1.5) {
          console.warn(`Warning: Chunk ${i} exceeds expected size: ${chunks[i].length} chars`);
        }
      }

      return chunks.filter(chunk => chunk.trim().length > 0);
    } catch (error) {
      console.error('Error splitting text:', error);
      throw new Error(`Failed to split text: ${error.message}`);
    }
  }

  /**
   * Process a single document file
   * 
   * @param {string} filePath - Path to the document file
   * @returns {Promise<Array<Object>>} Array of {text, metadata} chunks
   * @throws {Error} If file cannot be read or processed
   * 
   * Validates: Requirements 2.1, 3.1, 3.2
   */
  async processDocument(filePath) {
    // Validate file path
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path must be a non-empty string');
    }

    try {
      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');
      
      if (!content || content.trim().length === 0) {
        throw new Error('File is empty');
      }

      // Determine file type and parse accordingly
      const ext = path.extname(filePath).toLowerCase();
      let text;
      let documentType;

      if (ext === '.md' || ext === '.markdown') {
        text = this.parseMarkdown(content);
        documentType = 'markdown';
        
        // If markdown parsing resulted in empty text, skip this file
        if (!text || text.trim().length === 0) {
          console.warn(`Skipping ${path.basename(filePath)}: No text content after markdown parsing`);
          return [];
        }
      } else if (ext === '.txt') {
        text = this.parseText(content);
        documentType = 'text';
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }

      // Split into chunks
      const chunks = this.splitText(text);

      // Create document objects with metadata
      const documents = chunks.map((chunk, index) => ({
        text: chunk,
        metadata: {
          source: path.basename(filePath),
          filePath: filePath,
          chunkIndex: index,
          totalChunks: chunks.length,
          documentType: documentType,
          processedAt: new Date().toISOString()
        }
      }));

      return documents;
    } catch (error) {
      console.error(`Error processing document ${filePath}:`, error);
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  /**
   * Get chunking configuration
   * 
   * @returns {Object} Chunking configuration
   */
  getChunkingConfig() {
    return {
      chunkSize: this.chunkSize,
      chunkOverlap: this.chunkOverlap,
      overlapPercentage: ragConfig.chunkOverlap
    };
  }

  /**
   * Ingest all documents from a directory
   * 
   * @param {string} directoryPath - Path to directory containing documents
   * @param {Object} options - Ingestion options
   * @param {boolean} options.recursive - Process subdirectories (default: true)
   * @param {Function} options.onProgress - Progress callback (file, current, total)
   * @returns {Promise<Object>} Ingestion statistics
   * @throws {Error} If directory cannot be read or ingestion fails
   * 
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.5
   */
  async ingestDirectory(directoryPath, options = {}) {
    const { recursive = true, onProgress = null } = options;

    // Validate directory path
    if (!directoryPath || typeof directoryPath !== 'string') {
      throw new Error('Directory path must be a non-empty string');
    }

    // Ensure vector store is available
    if (!this.vectorStore) {
      throw new Error('Vector store not configured. Pass vectorStore to constructor.');
    }

    if (!this.vectorStore.isReady()) {
      throw new Error('Vector store not initialized. Call vectorStore.initialize() first.');
    }

    try {
      // Get all files from directory
      const files = await this._getFilesFromDirectory(directoryPath, recursive);
      
      // Filter for supported file types
      const supportedFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.md' || ext === '.markdown' || ext === '.txt';
      });

      if (supportedFiles.length === 0) {
        console.warn(`No supported files found in ${directoryPath}`);
        return {
          filesProcessed: 0,
          filesSkipped: 0,
          totalChunks: 0,
          errors: []
        };
      }

      console.log(`Found ${supportedFiles.length} supported files to process`);

      // Process files and collect statistics
      const stats = {
        filesProcessed: 0,
        filesSkipped: 0,
        totalChunks: 0,
        errors: []
      };

      // Process files in batches
      const batchSize = 5;
      for (let i = 0; i < supportedFiles.length; i += batchSize) {
        const batch = supportedFiles.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (file, batchIndex) => {
          const fileIndex = i + batchIndex;
          
          try {
            // Report progress
            if (onProgress) {
              onProgress(file, fileIndex + 1, supportedFiles.length);
            }

            // Process document
            const documents = await this.processDocument(file);
            
            // Add to vector store
            await this.vectorStore.addDocuments(documents);
            
            stats.filesProcessed++;
            stats.totalChunks += documents.length;
            
            console.log(`✓ Processed ${path.basename(file)}: ${documents.length} chunks`);
          } catch (error) {
            console.error(`✗ Failed to process ${file}:`, error.message);
            stats.filesSkipped++;
            stats.errors.push({
              file: file,
              error: error.message
            });
          }
        }));
      }

      return stats;
    } catch (error) {
      console.error('Error ingesting directory:', error);
      throw new Error(`Failed to ingest directory: ${error.message}`);
    }
  }

  /**
   * Get all files from a directory (optionally recursive)
   * 
   * @param {string} dirPath - Directory path
   * @param {boolean} recursive - Include subdirectories
   * @returns {Promise<Array<string>>} Array of file paths
   * @private
   */
  async _getFilesFromDirectory(dirPath, recursive) {
    const files = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          if (recursive) {
            // Skip node_modules and hidden directories
            if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
              const subFiles = await this._getFilesFromDirectory(fullPath, recursive);
              files.push(...subFiles);
            }
          }
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
      }

      return files;
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Get ingestion statistics summary
   * 
   * @param {Object} stats - Statistics object from ingestDirectory
   * @returns {string} Formatted statistics summary
   */
  formatStats(stats) {
    const lines = [
      '\n=== Ingestion Summary ===',
      `Files processed: ${stats.filesProcessed}`,
      `Files skipped: ${stats.filesSkipped}`,
      `Total chunks created: ${stats.totalChunks}`,
      `Average chunks per file: ${stats.filesProcessed > 0 ? (stats.totalChunks / stats.filesProcessed).toFixed(1) : 0}`
    ];

    if (stats.errors.length > 0) {
      lines.push('\nErrors:');
      stats.errors.forEach(err => {
        lines.push(`  - ${path.basename(err.file)}: ${err.error}`);
      });
    }

    lines.push('========================\n');

    return lines.join('\n');
  }
}

module.exports = DocumentIngestionService;
