/**
 * RAG Service Unit Tests
 * 
 * Test RAG service components:
 * - Document loading
 * - Chunking
 * - Vector store operations
 * - Query execution
 */

import ragService from '../src/rag/rag-service-langchain.js';
import { getConfigSummary } from '../src/rag/langchain-config.js';

const tests = [];
let passCount = 0;
let failCount = 0;

// Test helper
function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ===== TESTS =====

test('Configuration should load correctly', () => {
  const config = getConfigSummary();
  assert(config.llm.type, 'LLM type missing');
  assert(config.rag.chunkSize > 0, 'Chunk size invalid');
  assert(config.rag.fileExtensions, 'File extensions missing');
  console.log('✅ Config:', config.llm.type, config.rag.chunkSize);
});

test('RAG service should be defined', () => {
  assert(ragService, 'RAG service not defined');
  assert(typeof ragService.initialize === 'function', 'initialize method missing');
  assert(typeof ragService.indexProject === 'function', 'indexProject method missing');
  assert(typeof ragService.query === 'function', 'query method missing');
  console.log('✅ RAG service methods available');
});

test('Initial status should show uninitialized', () => {
  const status = ragService.getStatus();
  assert(status.isInitialized === false, 'Should not be initialized initially');
  assert(Array.isArray(status.indexedProjects), 'Projects array missing');
  console.log('✅ Initial status:', status);
});

test('Configuration should support multiple LLMs', () => {
  const config = getConfigSummary();
  const llmTypes = ['ollama', 'openai', 'anthropic', 'google'];
  assert(llmTypes.includes(config.llm.type) || config.llm.type === 'ollama', 
    `Unsupported LLM type: ${config.llm.type}`);
  console.log('✅ LLM type supported:', config.llm.type);
});

test('Configuration should support multiple vector stores', () => {
  const config = getConfigSummary();
  const storeTypes = ['chroma', 'qdrant'];
  assert(storeTypes.includes(config.vectorStore.type),
    `Unsupported vector store: ${config.vectorStore.type}`);
  console.log('✅ Vector store type supported:', config.vectorStore.type);
});

test('Chunking parameters should be valid', () => {
  const config = getConfigSummary();
  assert(config.rag.chunkSize >= 100, 'Chunk size too small');
  assert(config.rag.chunkSize <= 10000, 'Chunk size too large');
  assert(config.rag.chunkOverlap < config.rag.chunkSize, 'Overlap larger than chunk size');
  assert(config.rag.chunkOverlap >= 0, 'Overlap cannot be negative');
  console.log('✅ Chunking config valid:', `${config.rag.chunkSize}/${config.rag.chunkOverlap}`);
});

test('File extensions should be configurable', () => {
  const config = getConfigSummary();
  const extensions = config.rag.fileExtensions.split(',');
  assert(extensions.length > 0, 'No file extensions configured');
  assert(extensions.every(ext => ext.startsWith('.')), 'Extensions should start with .');
  console.log('✅ File extensions:', extensions.join(', '));
});

// ===== RUN TESTS =====

async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 RAG Service Unit Tests');
  console.log('='.repeat(60) + '\n');

  for (const test of tests) {
    try {
      await test.fn();
      passCount++;
      console.log(`\n✅ PASS: ${test.name}`);
    } catch (error) {
      failCount++;
      console.error(`\n❌ FAIL: ${test.name}`);
      console.error(`   Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${passCount} passed, ${failCount} failed`);
  console.log('='.repeat(60) + '\n');

  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
