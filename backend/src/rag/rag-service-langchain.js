/**
 * LangChain RAG Service (Simplified)
 * 
 * Handles:
 * - Document loading from configured codebase paths
 * - Text chunking with configurable parameters
 * - Embedding generation
 * - Vector store management
 * - Similarity search for retrieval
 * - LLM-based answer generation
 */

import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { initializeLLM, initializeEmbeddings, initializeVectorStore } from './langchain-config.js';

class RAGServiceLangChain {
  constructor() {
    this.llm = null;
    this.embeddings = null;
    this.vectorStore = null;
    this.chromaCollection = null; // Store reference to Chroma collection
    this.retrievalChain = null;
    this.isInitialized = false;
    this.projectIndexMap = {}; // Track which projects are indexed
    this.indexingProgress = {}; // Track indexing progress: { projectId: { fileCount, chunkCount, embeddedChunks, percent } }
    this.progressCallback = null; // Callback function for progress updates
  }

  /**
   * Set callback for progress updates during indexing
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
  }

  /**
   * Emit progress update
   */
  emitProgress(projectId, fileCount, chunkCount, embeddedChunks) {
    const percent = chunkCount > 0 ? Math.round((embeddedChunks / chunkCount) * 100) : 0;
    
    this.indexingProgress[projectId] = {
      fileCount,
      chunkCount,
      embeddedChunks,
      percent,
      status: percent === 100 ? 'completed' : 'indexing',
      updatedAt: new Date().toISOString(),
    };

    // Log progress with bar visualization
    const barLength = 30;
    const filled = Math.round((percent / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`[RAG] 📊 Indexing ${projectId}: [${bar}] ${percent}% (${embeddedChunks}/${chunkCount} chunks)`);

    // Call progress callback if set
    if (this.progressCallback) {
      this.progressCallback(projectId, this.indexingProgress[projectId]);
    }
  }

  /**
   * Get progress for a project
   */
  getIndexingProgress(projectId) {
    return this.indexingProgress[projectId] || null;
  }

  /**
   * Load documents from a directory recursively
   */
  async loadDocumentsFromDirectory(dirPath, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
    const documents = [];
    
    const walkDir = (currentPath) => {
      const files = fs.readdirSync(currentPath);
      
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // Skip node_modules, .git, etc
          if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(file)) {
            walkDir(filePath);
          }
        } else if (stat.isFile()) {
          // Check if file has matching extension
          const ext = path.extname(file);
          if (extensions.includes(ext)) {
            try {
              const content = fs.readFileSync(filePath, 'utf-8');
              documents.push(new Document({
                pageContent: content,
                metadata: {
                  source: filePath,
                  fileName: file,
                  extension: ext,
                },
              }));
            } catch (error) {
              console.warn(`[RAG] Warning reading file ${filePath}:`, error.message);
            }
          }
        }
      }
    };
    
    walkDir(dirPath);
    return documents;
  }

  /**
   * Initialize RAG service components
   */
  async initialize() {
    try {
      console.log('[RAG] Initializing LangChain RAG service...');

      // Initialize LLM (must await - async function)
      this.llm = await initializeLLM();
      console.log(`[RAG] ✅ LLM initialized: ${process.env.LLM_TYPE || 'ollama'}`);

      // Initialize embeddings (must await - async function)
      this.embeddings = await initializeEmbeddings();
      console.log(`[RAG] ✅ Embeddings initialized: ${process.env.EMBEDDING_MODEL || 'nomic-embed-text'}`);

      // Initialize vector store
      this.vectorStore = await initializeVectorStore(this.embeddings);
      console.log(`[RAG] ✅ Vector store initialized: ${process.env.VECTOR_STORE_TYPE || 'chroma'}`);

      this.isInitialized = true;
      console.log('[RAG] ✅ RAG service fully initialized');
      return true;
    } catch (error) {
      console.error('[RAG] ❌ Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Index a project's codebase
   */
  async indexProject(projectId, codebasePath = null) {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized. Call initialize() first.');
    }

    try {
      const basePath = codebasePath || process.env.CODEBASE_PATHS || './src';
      const fullPath = path.resolve(basePath);

      console.log(`[RAG] 📁 Indexing project: ${projectId}`);
      console.log(`[RAG]    Path: ${fullPath}`);

      // Check if path exists
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Codebase path does not exist: ${fullPath}`);
      }

      // Parse file extensions
      const extensions = (process.env.CODEBASE_FILE_EXTENSIONS || '.js,.jsx,.ts,.tsx')
        .split(',')
        .map(ext => ext.trim());

      console.log(`[RAG]    Extensions: ${extensions.join(', ')}`);

      // Load documents from directory
      const docs = await this.loadDocumentsFromDirectory(fullPath, extensions);
      console.log(`[RAG]    📄 Loaded ${docs.length} files`);

      if (docs.length === 0) {
        console.warn('[RAG] ⚠️  No documents found in path');
        return { success: false, message: 'No documents found' };
      }

      // Split documents into chunks
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),
        chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
      });

      const chunks = await splitter.splitDocuments(docs);
      console.log(`[RAG]    ✂️  Split into ${chunks.length} chunks`);

      // Add project metadata to chunks
      const chunksWithMetadata = chunks.map((chunk, idx) => ({
        ...chunk,
        metadata: {
          ...chunk.metadata,
          projectId,
          chunkIndex: idx,
          indexedAt: new Date().toISOString(),
        },
      }));

      // Add documents to vector store with progress tracking
      const batchSize = 10; // Add chunks in batches to avoid memory issues
      console.log(`[RAG]    🔄 Starting to embed ${chunks.length} chunks...`);
      
      this.emitProgress(projectId, docs.length, chunks.length, 0); // Initial progress
      
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunksWithMetadata.slice(i, i + batchSize);
        await this.vectorStore.addDocuments(batch);
        
        // Emit progress after each batch
        const embeddedChunks = Math.min(i + batchSize, chunks.length);
        this.emitProgress(projectId, docs.length, chunks.length, embeddedChunks);
      }
      
      console.log(`[RAG]    ✅ All ${chunks.length} chunks embedded and added to vector store`);

      // Track indexing
      this.projectIndexMap[projectId] = {
        path: fullPath,
        fileCount: docs.length,
        chunkCount: chunks.length,
        indexedAt: new Date().toISOString(),
      };

      return {
        success: true,
        projectId,
        filesLoaded: docs.length,
        chunksCreated: chunks.length,
        indexedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[RAG] ❌ Indexing failed for project ${projectId}:`, error.message);
      throw error;
    }
  }

  /**
   * Query the RAG system with improved retrieval
   */
  async query(question, projectId = 'default') {
    if (!this.isInitialized) {
      throw new Error('RAG service not initialized. Call initialize() first.');
    }

    if (!this.vectorStore) {
      throw new Error('Vector store not initialized. Ensure indexing completed.');
    }

    try {
      console.log(`[RAG] 🔍 Query (${projectId}): ${question}`);

      const startTime = Date.now();

      // Get retriever with more results for better context
      const retriever = this.vectorStore.asRetriever({ k: 6 });
      let relevantDocs = await retriever.invoke(question);
      
      console.log(`[RAG] 📚 Retrieved ${relevantDocs.length} initial documents`);
      
      // Improve retrieval: if question contains specific keywords, filter for those
      const keywords = this.extractKeywords(question);
      if (keywords.length > 0) {
        console.log(`[RAG] 🎯 Keywords found: ${keywords.join(', ')}`);
        
        // Score and rerank documents based on keyword matching
        const scoredDocs = relevantDocs.map(doc => {
          const source = doc.metadata?.source || '';
          const content = doc.pageContent || '';
          
          // Count keyword matches in source path and content
          let score = 0;
          keywords.forEach(kw => {
            if (source.toLowerCase().includes(kw.toLowerCase())) score += 3;
            if (content.toLowerCase().includes(kw.toLowerCase())) score += 1;
          });
          
          return { doc, score };
        });
        
        // Sort by score and take top results
        relevantDocs = scoredDocs
          .sort((a, b) => b.score - a.score)
          .slice(0, 4)
          .map(item => item.doc);
        
        console.log(`[RAG] 🔄 Reranked ${relevantDocs.length} documents by keyword relevance`);
      }

      // Create context from documents
      const context = relevantDocs
        .map((doc, idx) => {
          const source = doc.metadata?.source || 'unknown';
          return `[Source ${idx + 1}: ${source}]\n${doc.pageContent}`;
        })
        .join('\n\n---\n\n');

      // Simple, direct prompt for tinyllama
      const simplePrompt = `Based on the following code context, answer this question:

Question: ${question}

Code Context:
${context}

Answer:`;

      console.log(`[RAG] 📝 Sending prompt to LLM...`);
      console.log(`[RAG] 📊 Context length: ${context.length} characters`);

      // Generate answer
      const answer = await this.llm.invoke(simplePrompt);
      
      // Extract answer content
      let answerText = typeof answer === 'string' ? answer : answer.content || answer.text || String(answer);
      
      // Clean up the answer - remove any prompt echoing
      answerText = answerText.trim();
      
      // If answer still contains the question, extract just the answer part
      if (answerText.toLowerCase().includes('question:')) {
        const parts = answerText.split(/(?:^|\n)Answer:\s*/i);
        answerText = parts[parts.length - 1].trim();
      }

      const duration = Date.now() - startTime;
      console.log(`[RAG] ⏱️  Response time: ${duration}ms`);
      console.log(`[RAG] 💬 Answer length: ${answerText.length} characters`);

      // Format response
      return {
        success: true,
        query: question,
        answer: answerText || 'Could not generate answer from context',
        sources: relevantDocs.map(doc => ({
          file: doc.metadata?.source || 'unknown',
          content: doc.pageContent?.substring(0, 200) + '...',
          metadata: doc.metadata,
        })),
        responseTime: duration,
      };
    } catch (error) {
      console.error('[RAG] ❌ Query failed:', error.message);
      throw error;
    }
  }

  /**
   * Extract keywords from question for better retrieval
   */
  extractKeywords(question) {
    // Common programming and codebase keywords
    const keywords = [];
    
    const keywordPatterns = [
      'auth', 'authen', 'login', 'token', 'jwt', 'oauth',
      'middleware', 'route', 'endpoint', 'api', 'database', 'query',
      'config', 'environment', 'variable', 'setup', 'initialize',
      'error', 'exception', 'validation', 'permission', 'role',
      'function', 'class', 'method', 'service', 'controller',
      'request', 'response', 'header', 'body', 'param'
    ];
    
    const lowerQuestion = question.toLowerCase();
    
    for (const pattern of keywordPatterns) {
      if (lowerQuestion.includes(pattern)) {
        keywords.push(pattern);
      }
    }
    
    return keywords;
  }

  /**
   * Get all indexed chunks for a project
   * Uses LangChain's vector store to query documents
   */
  async getChunks(projectId, limit = 100) {
    try {
      if (!this.vectorStore) {
        return {
          success: false,
          chunks: [],
          message: 'Vector store not initialized',
        };
      }

      // Use similarity search with a generic query to get documents
      // Filter by projectId using proper metadata filter syntax
      const results = await this.vectorStore.similaritySearch('', limit * 3);

      // Transform into readable format and filter by projectId manually
      const chunks = results
        .filter(doc => doc.metadata?.projectId === projectId)
        .slice(0, limit)
        .map((doc, idx) => ({
          id: `${projectId}-${idx}`,
          content: doc.pageContent,
          metadata: doc.metadata,
          distance: 0,
        }));

      return {
        success: true,
        chunks,
        total: chunks.length,
        projectId,
      };
    } catch (error) {
      console.error('[RAG] ❌ getChunks failed:', error.message);
      
      // Fallback: Return empty list with success=true to avoid UI errors
      return {
        success: true,
        chunks: [],
        total: 0,
        projectId,
        message: 'No chunks found yet. Project may still be indexing.',
      };
    }
  }

  /**
   * Search for similar chunks using semantic similarity
   * Returns chunks most similar to the query
   */
  async searchChunks(query, projectId, limit = 10) {
    try {
      if (!this.vectorStore) {
        return { success: false, chunks: [], message: 'Vector store not initialized' };
      }

      // Use similarity search without metadata filter (will filter manually)
      const results = await this.vectorStore.similaritySearchWithScore(query, limit * 2);

      // Filter by project and transform
      const chunks = results
        .filter(([doc, score]) => doc.metadata?.projectId === projectId)
        .slice(0, limit)
        .map(([doc, score]) => ({
          content: doc.pageContent,
          metadata: doc.metadata,
          similarityScore: score,
        }));

      return {
        success: true,
        chunks,
        query,
        projectId,
      };
    } catch (error) {
      console.error('[RAG] ❌ searchChunks failed:', error.message);
      return { success: false, chunks: [], error: error.message };
    }
  }

  /**
   * Get indexing status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      llmType: process.env.LLM_TYPE || 'ollama',
      vectorStoreType: process.env.VECTOR_STORE_TYPE || 'chroma',
      indexedProjects: Object.keys(this.projectIndexMap),
      projectDetails: this.projectIndexMap,
    };
  }

  /**
   * Clear vector store
   */
  async clear() {
    try {
      if (this.vectorStore && this.vectorStore.delete) {
        await this.vectorStore.delete({ where: {} });
        this.projectIndexMap = {};
        console.log('[RAG] ✅ Vector store cleared');
        return { success: true, message: 'Vector store cleared' };
      }
      return { success: false, message: 'Vector store does not support deletion' };
    } catch (error) {
      console.error('[RAG] ❌ Clear failed:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
const ragService = new RAGServiceLangChain();

export default ragService;
