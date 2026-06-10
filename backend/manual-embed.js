#!/usr/bin/env node

/**
 * Manual script to trigger embedding generation for a project
 * Usage: node manual-embed.js <projectId> [projectPath]
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { ChunkingEmbeddingService } from './src/embeddings/chunking-service.js';
import { getPool } from './src/database/connection.js';
import logger from './src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function manualEmbed() {
  try {
    const projectId = 'c0153e71-ad41-4748-b7ff-64e80e1270b6'; // Newly cloned project
    const projectPath = path.join(__dirname, 'data', 'projects', projectId);
    
    console.log(`Starting manual embedding for project: ${projectId}`);
    console.log(`Project path: ${projectPath}`);
    
    // Initialize the embedding service
    const embeddingService = new ChunkingEmbeddingService();
    await embeddingService.initialize();
    
    // Process chunks
    console.log('Processing project chunks...');
    const result = await embeddingService.processProjectChunks(projectId, projectPath);
    
    console.log('✓ Embedding generation completed!');
    console.log(`Result:`, result);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during manual embedding:', error);
    logger.error('Manual embedding failed:', error);
    process.exit(1);
  }
}

// Run the script
manualEmbed();
