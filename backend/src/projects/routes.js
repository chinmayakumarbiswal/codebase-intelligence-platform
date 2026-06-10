import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { fileURLToPath } from 'url';
import { simpleGit } from 'simple-git';
import decompress from 'decompress';
import { projectService } from './service.js';
import { indexProject, getProjectStats } from './indexing.js';
import logger from '../utils/logger.js';
import ragService from '../rag/rag-service-langchain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../..', 'data', 'uploads');
    // Create directory if it doesn't exist
    try {
      if (!fsSync.existsSync(uploadDir)) {
        fsSync.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// GET /api/projects - List user projects
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const projects = await projectService.getUserProjects(userId);
    res.json(projects);
  } catch (error) {
    logger.error('Failed to fetch projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id - Get project details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const project = await projectService.getProjectDetails(id, userId);
    res.json(project);
  } catch (error) {
    logger.error('Failed to fetch project:', error);
    res.status(error.message === 'Project not found' ? 404 : 500).json({
      error: error.message || 'Failed to fetch project'
    });
  }
});

// POST /api/projects/upload - Upload ZIP repository
router.post('/upload', upload.single('zipFile'), async (req, res) => {
  let uploadedFile = null;
  try {
    const userId = req.user.userId;
    const { projectName, description } = req.body;
    uploadedFile = req.file;

    if (!projectName || !uploadedFile) {
      return res.status(400).json({ error: 'Project name and ZIP file are required' });
    }

    // Create project record
    const project = await projectService.createProject(userId, projectName, description || '');

    // Extract ZIP to project directory
    const projectPath = projectService.getProjectStoragePath(project.id);
    await decompress(uploadedFile.path, projectPath);

    logger.info(`Project uploaded: ${project.id} (${projectName})`);

    // Clean up uploaded file
    await fs.unlink(uploadedFile.path);

    // Index files immediately (synchronous)
    logger.info(`====== START: Synchronous indexing for uploaded project: ${project.id} ======`);
    try {
      const indexResult = await indexProject(project.id, projectPath);
      logger.info(`Indexing returned:`, indexResult);
      
      const stats = await getProjectStats(project.id);
      logger.info(`Database stats after indexing:`, stats);
      logger.info(`====== END: Indexing complete. Returning response with fileCount: ${stats.fileCount} ======`);
      
      // Trigger background embedding generation (non-blocking)
      setImmediate(async () => {
        try {
          const { getChunkingEmbeddingService } = await import('../embeddings/chunking-service.js');
          const embeddingService = getChunkingEmbeddingService();
          await embeddingService.processProjectChunks(project.id, projectPath);
          logger.info(`Background embedding generation completed for project: ${project.id}`);
        } catch (embeddingError) {
          logger.error(`Background embedding generation failed for project ${project.id}:`, embeddingError.message);
        }
      });
      
      // Return success with file counts
      return res.status(201).json({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        message: 'Project uploaded and indexed successfully (embeddings generating in background)',
        fileCount: stats.fileCount || 0,
        totalLines: stats.codeLines || 0
      });
    } catch (indexError) {
      logger.error(`====== ERROR during indexing ======`);
      logger.error(`Error message: ${indexError.message}`);
      logger.error(`Full error:`, indexError);
      throw indexError;
    }
  } catch (error) {
    logger.error('Upload failed:', error);
    
    // Clean up uploaded file on error
    if (uploadedFile) {
      await fs.unlink(uploadedFile.path).catch(() => {});
    }

    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// POST /api/projects/clone - Clone Git repository
router.post('/clone', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { gitUrl, projectName, description } = req.body;

    if (!gitUrl || !projectName) {
      return res.status(400).json({ error: 'Git URL and project name are required' });
    }

    // Create project record
    const project = await projectService.createProject(userId, projectName, description || '', gitUrl);

    // Clone repository
    const projectPath = projectService.getProjectStoragePath(project.id);
    const git = simpleGit();
    
    await git.clone(gitUrl, projectPath);

    logger.info(`Repository cloned: ${project.id} from ${gitUrl}`);

    // Index files immediately (synchronous)
    logger.info(`====== START: Synchronous indexing for cloned project: ${project.id} ======`);
    try {
      const indexResult = await indexProject(project.id, projectPath);
      logger.info(`Indexing returned:`, indexResult);
      
      const stats = await getProjectStats(project.id);
      logger.info(`Database stats after indexing:`, stats);
      logger.info(`====== END: Indexing complete. Returning response with fileCount: ${stats.fileCount} ======`);
      
      // Trigger background embedding generation (non-blocking)
      setImmediate(async () => {
        try {
          const { getChunkingEmbeddingService } = await import('../embeddings/chunking-service.js');
          const embeddingService = getChunkingEmbeddingService();
          await embeddingService.processProjectChunks(project.id, projectPath);
          logger.info(`Background embedding generation completed for project: ${project.id}`);
        } catch (embeddingError) {
          logger.error(`Background embedding generation failed for project ${project.id}:`, embeddingError.message);
        }
      });

      // Trigger RAG indexing (chunks to Chroma) in background (non-blocking)
      setImmediate(async () => {
        try {
          logger.info(`[RAG] 🔄 Starting background RAG indexing for project: ${project.id}`);
          const result = await ragService.indexProject(project.id, projectPath);
          logger.info(`[RAG] ✅ Background RAG indexing completed: ${result.chunksCreated} chunks created`);
        } catch (ragError) {
          logger.error(`[RAG] ❌ Background RAG indexing failed for project ${project.id}:`, ragError.message);
        }
      });
      
      // Return success with file counts
      return res.status(201).json({
        id: project.id,
        name: project.name,
        description: project.description,
        repositoryUrl: project.repositoryUrl,
        status: project.status,
        message: 'Repository cloned and indexing started (embeddings generating in background)',
        fileCount: stats.fileCount || 0,
        totalLines: stats.totalLines || 0
      });
    } catch (indexError) {
      logger.error(`====== ERROR during indexing ======`);
      logger.error(`Error message: ${indexError.message}`);
      logger.error(`Full error:`, indexError);
      throw indexError;
    }

  } catch (error) {
    logger.error('Clone failed:', error);
    res.status(500).json({ error: error.message || 'Clone failed' });
  }
});

// POST /api/projects/:id/index - Index project files and count LOC
router.post('/:id/index', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify project ownership
    const project = await projectService.getProjectDetails(id, userId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get storage path
    const projectPath = projectService.getProjectStoragePath(id);

    // Index the project
    const indexResult = await indexProject(id, projectPath);

    logger.info(`Project indexed: ${id}, ${indexResult.fileCount} files`);

    // Get updated stats
    const stats = await getProjectStats(id);

    res.json({
      id,
      message: 'Project indexed successfully',
      fileCount: stats.fileCount,
      totalLines: stats.totalLines,
      codeLines: stats.codeLines,
      commentLines: stats.commentLines,
      blankLines: stats.blankLines,
      languages: stats.languages,
      indexedFiles: indexResult.fileCount,
    });
  } catch (error) {
    logger.error('Indexing failed:', error);
    res.status(500).json({ error: error.message || 'Indexing failed' });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await projectService.deleteProject(id, userId);

    logger.info(`Project deleted: ${id}`);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error('Delete failed:', error);
    res.status(error.message === 'Project not found' ? 404 : 500).json({
      error: error.message || 'Delete failed'
    });
  }
});

export default router;
