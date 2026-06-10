/**
 * LangChain Configuration Factory
 * 
 * Multi-LLM support: Ollama (local), OpenAI, Anthropic, Google
 * Multi-Vector Store: Chroma (dev), Qdrant (production)
 * 
 * Configuration via .env - change LLM_TYPE to switch models
 * Add API keys to .env when deploying with external LLMs
 */

import { Ollama } from '@langchain/ollama';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OllamaEmbeddings } from '@langchain/ollama';

/**
 * Dynamically load external LLM and embeddings based on LLM_TYPE
 */
async function loadExternalLLM(llmType) {
  if (llmType === 'openai') {
    const { ChatOpenAI } = await import('@langchain/openai');
    return ChatOpenAI;
  } else if (llmType === 'anthropic') {
    const { ChatAnthropic } = await import('@langchain/anthropic');
    return ChatAnthropic;
  } else if (llmType === 'google') {
    const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
    return ChatGoogleGenerativeAI;
  }
  return null;
}

/**
 * Initialize LLM based on .env configuration
 * Supports: ollama, openai, anthropic, google
 */
export async function initializeLLM() {
  const llmType = process.env.LLM_TYPE?.toLowerCase() || 'ollama';

  switch (llmType) {
    case 'openai': {
      try {
        const { ChatOpenAI } = await import('@langchain/openai');
        return new ChatOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          modelName: process.env.OPENAI_MODEL || 'gpt-4o',
          temperature: 0.7,
          timeout: 30000,
        });
      } catch (error) {
        console.warn('[LLM] OpenAI package not installed, falling back to Ollama');
        return initializeOllama();
      }
    }

    case 'anthropic': {
      try {
        const { ChatAnthropic } = await import('@langchain/anthropic');
        return new ChatAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
          modelName: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          timeout: 30000,
        });
      } catch (error) {
        console.warn('[LLM] Anthropic package not installed, falling back to Ollama');
        return initializeOllama();
      }
    }

    case 'google': {
      try {
        const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
        return new ChatGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_API_KEY,
          modelName: process.env.GOOGLE_MODEL || 'gemini-2.0-flash',
          temperature: 0.7,
        });
      } catch (error) {
        console.warn('[LLM] Google package not installed, falling back to Ollama');
        return initializeOllama();
      }
    }

    case 'ollama':
    default:
      return initializeOllama();
  }
}

/**
 * Initialize Ollama (default fallback)
 */
function initializeOllama() {
  return new Ollama({
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'mistral:7b',
    temperature: 0.7,
    timeout: 120000, // Ollama can be slower
  });
}

/**
 * Initialize embeddings based on .env configuration
 * Matches the LLM type for consistency
 */
export async function initializeEmbeddings() {
  const llmType = process.env.LLM_TYPE?.toLowerCase() || 'ollama';

  switch (llmType) {
    case 'openai': {
      try {
        const { OpenAIEmbeddings } = await import('@langchain/openai');
        return new OpenAIEmbeddings({
          apiKey: process.env.OPENAI_API_KEY,
          modelName: 'text-embedding-3-small',
        });
      } catch (error) {
        console.warn('[Embeddings] OpenAI package not installed, using Ollama');
        return new OllamaEmbeddings({
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
        });
      }
    }

    case 'google': {
      try {
        const { GoogleGenerativeAIEmbeddings } = await import('@langchain/google-genai');
        return new GoogleGenerativeAIEmbeddings({
          apiKey: process.env.GOOGLE_API_KEY,
          modelName: 'embedding-001',
        });
      } catch (error) {
        console.warn('[Embeddings] Google package not installed, using Ollama');
        return new OllamaEmbeddings({
          baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
        });
      }
    }

    case 'anthropic':
    case 'ollama':
    default:
      return new OllamaEmbeddings({
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
      });
  }
}

/**
 * Initialize vector store based on .env configuration
 * Supports: chroma (server or local), qdrant (persistent, prod)
 */
export async function initializeVectorStore(embeddings) {
  const vectorStoreType = process.env.VECTOR_STORE_TYPE?.toLowerCase() || 'chroma';
  const collectionName = 'codebase_documents';

  if (vectorStoreType === 'qdrant') {
    try {
      const { Qdrant } = await import('@langchain/community/vectorstores/qdrant');
      const { QdrantClient } = await import('@qdrant/js-client-rest');

      const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
      const qdrantApiKey = process.env.QDRANT_API_KEY || '';

      const client = new QdrantClient({
        url: qdrantUrl,
        apiKey: qdrantApiKey || undefined,
      });

      return new Qdrant(embeddings, {
        client,
        collectionName,
      });
    } catch (error) {
      console.warn('[VectorStore] Qdrant setup failed, using Chroma');
      return initializeChroma(embeddings, collectionName);
    }
  } else {
    return initializeChroma(embeddings, collectionName);
  }
}

/**
 * Initialize Chroma - either via HTTP server or local persistence
 */
function initializeChroma(embeddings, collectionName) {
  const chromaHost = process.env.CHROMA_HOST;
  
  if (chromaHost) {
    // Server mode: connect via HTTP to Chroma server
    console.log('[VectorStore] Connecting to Chroma server at', chromaHost);
    return new Chroma(embeddings, {
      collectionName,
      url: chromaHost,
    });
  } else {
    // Local mode: use local persistence directory
    const persistDir = process.env.CHROMA_PERSIST_DIR || './data/chroma';
    console.log('[VectorStore] Using local Chroma at', persistDir);
    return new Chroma(embeddings, {
      collectionName,
      path: persistDir,
    });
  }
}

/**
 * Get configuration summary for logging
 */
export function getConfigSummary() {
  return {
    llm: {
      type: process.env.LLM_TYPE || 'ollama',
      model: process.env.OLLAMA_MODEL || process.env.OPENAI_MODEL || 'default',
    },
    embeddings: {
      model: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
    },
    vectorStore: {
      type: process.env.VECTOR_STORE_TYPE || 'chroma',
      persistDir: process.env.CHROMA_PERSIST_DIR || './data/chroma',
    },
    rag: {
      chunkSize: parseInt(process.env.CHUNK_SIZE || '1000'),
      chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200'),
      fileExtensions: process.env.CODEBASE_FILE_EXTENSIONS || '.js,.jsx,.ts,.tsx',
      paths: process.env.CODEBASE_PATHS || './src',
    },
  };
}

export default {
  initializeLLM,
  initializeEmbeddings,
  initializeVectorStore,
  getConfigSummary,
};
