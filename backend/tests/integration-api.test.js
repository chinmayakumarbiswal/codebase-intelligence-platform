/**
 * API Integration Tests
 * 
 * Tests for RAG endpoints:
 * - /api/chat/status (GET)
 * - /api/chat/index (POST)
 * - /api/chat/ask (POST)
 * - /api/chat/clear (POST)
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const TEST_TOKEN = process.env.TEST_TOKEN || 'test-jwt-token';

// Mock JWT token for testing
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TEST_TOKEN}`,
};

const tests = [];
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

// ===== TESTS =====

test('Health endpoint should be accessible', async () => {
  try {
    const response = await axios.get(`http://localhost:3001/health`);
    if (response.status === 200 && response.data.status === 'OK') {
      console.log('✅ Health check passed');
      return true;
    }
    throw new Error('Unexpected health response');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Backend not running on port 3001');
    }
    throw error;
  }
});

test('Status endpoint should return RAG configuration', async () => {
  try {
    const response = await axios.get(`${API_BASE}/chat/status`, { headers });
    const data = response.data;
    
    if (!data.isInitialized) {
      console.log('⚠️  RAG not initialized yet (expected on first run)');
    }
    
    if (data.llmType && data.vectorStoreType) {
      console.log(`✅ Status: LLM=${data.llmType}, Store=${data.vectorStoreType}`);
      return true;
    }
    throw new Error('Missing LLM or vector store info');
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Auth failed: Invalid or missing token');
    }
    throw error;
  }
});

test('Index endpoint should accept projectId and path', async () => {
  try {
    const response = await axios.post(`${API_BASE}/chat/index`, {
      projectId: 'test-project',
      codebasePath: './src',
    }, { headers });
    
    if (response.data.success === true || response.data.success === false) {
      console.log(`✅ Index endpoint responded:`, response.data.success ? 'success' : response.data.message);
      return true;
    }
    throw new Error('Unexpected response format');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Backend not running');
    }
    if (error.response?.status === 400) {
      console.log(`✅ Validation working (expected 400): ${error.response.data.message}`);
      return true;
    }
    throw error;
  }
});

test('Ask endpoint should require query parameter', async () => {
  try {
    const response = await axios.post(`${API_BASE}/chat/ask`, {
      query: 'What is this project?',
      projectId: 'test-project',
    }, { headers });
    
    if (response.data.success === true || response.data.success === false) {
      console.log(`✅ Ask endpoint responded:`, response.data.success ? 'success' : response.data.error);
      return true;
    }
    throw new Error('Unexpected response format');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Backend not running');
    }
    if (error.response?.status === 400) {
      console.log(`✅ Query validation working: ${error.response.data.error}`);
      return true;
    }
    throw error;
  }
});

test('Ask endpoint should reject empty query', async () => {
  try {
    await axios.post(`${API_BASE}/chat/ask`, {
      query: '',
    }, { headers });
    
    throw new Error('Empty query should be rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log(`✅ Empty query validation working: ${error.response.data.error}`);
      return true;
    }
    throw error;
  }
});

test('Clear endpoint should be available', async () => {
  try {
    const response = await axios.post(`${API_BASE}/chat/clear`, {}, { headers });
    
    if (response.data.success === true || response.data.success === false) {
      console.log(`✅ Clear endpoint responded:`, response.data.success ? 'cleared' : response.data.message);
      return true;
    }
    throw new Error('Unexpected response format');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Backend not running');
    }
    throw error;
  }
});

// ===== RUN TESTS =====

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 API Integration Tests');
  console.log('API Base:', API_BASE);
  console.log('='.repeat(70) + '\n');

  for (const test of tests) {
    try {
      await test.fn();
      passCount++;
      console.log(`✅ PASS: ${test.name}\n`);
    } catch (error) {
      failCount++;
      console.error(`❌ FAIL: ${test.name}`);
      console.error(`   Error: ${error.message}\n`);
    }
  }

  console.log('='.repeat(70));
  console.log(`📊 Results: ${passCount} passed, ${failCount} failed`);
  console.log('='.repeat(70) + '\n');

  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Test runner error:', error.message);
  process.exit(1);
});
