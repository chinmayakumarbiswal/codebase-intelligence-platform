import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../database/connection.js';
import { generateId } from '../utils/helpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECTS_ROOT = path.join(__dirname, '../..', 'data', 'projects');

// Ensure projects directory exists
await fs.mkdir(PROJECTS_ROOT, { recursive: true }).catch(() => {});

export const projectService = {
  // Create a new project
  async createProject(userId, name, description, repositoryUrl) {
    const pool = getPool();
    const projectId = generateId();
    const storagePath = path.join(PROJECTS_ROOT, projectId);

    try {
      // Create project directory
      await fs.mkdir(storagePath, { recursive: true });

      // Insert into database
      const [result] = await pool.query(
        `INSERT INTO projects (id, user_id, name, description, repository_url, storage_path, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [projectId, userId, name, description, repositoryUrl || null, storagePath, 'active']
      );

      return {
        id: projectId,
        userId,
        name,
        description,
        repositoryUrl,
        storagePath,
        status: 'active',
        fileCount: 0,
        totalSize: 0
      };
    } catch (error) {
      // Clean up directory if creation fails
      await fs.rm(storagePath, { recursive: true, force: true });
      throw error;
    }
  },

  // Get user projects
  async getUserProjects(userId) {
    const pool = getPool();
    const [projects] = await pool.query(
      `SELECT p.*, COUNT(f.id) as fileCount
       FROM projects p
       LEFT JOIN files f ON p.id = f.project_id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [userId]
    );

    return projects.map(p => ({
      ...p,
      fileCount: p.fileCount || 0
    }));
  },

  // Get project details
  async getProjectDetails(projectId, userId) {
    const pool = getPool();
    const [projects] = await pool.query(
      `SELECT p.*, COUNT(f.id) as fileCount, SUM(f.lines_of_code) as totalLines
       FROM projects p
       LEFT JOIN files f ON p.id = f.project_id
       WHERE p.id = ? AND p.user_id = ?
       GROUP BY p.id`,
      [projectId, userId]
    );

    if (projects.length === 0) {
      throw new Error('Project not found');
    }

    return projects[0];
  },

  // Delete project
  async deleteProject(projectId, userId) {
    const pool = getPool();
    
    // Verify ownership
    const [projects] = await pool.query(
      'SELECT storage_path FROM projects WHERE id = ? AND user_id = ?',
      [projectId, userId]
    );

    if (projects.length === 0) {
      throw new Error('Project not found');
    }

    const storagePath = projects[0].storage_path;

    try {
      // Delete from database (cascades to files, chunks, conversations)
      await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);

      // Delete storage directory
      await fs.rm(storagePath, { recursive: true, force: true });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  },

  // Get storage path for project
  getProjectStoragePath(projectId) {
    return path.join(PROJECTS_ROOT, projectId);
  },

  // Validate project directory exists
  async validateProject(projectId) {
    const storagePath = this.getProjectStoragePath(projectId);
    try {
      await fs.access(storagePath);
      return true;
    } catch {
      return false;
    }
  }
};

export async function cloneRepository(userId, repoUrl) {
  throw new Error('Not implemented');
}

export async function getProject(projectId) {
  throw new Error('Not implemented');
}

export async function listProjects(userId) {
  throw new Error('Not implemented');
}

export async function deleteProject(projectId) {
  throw new Error('Not implemented');
}
