import fs from 'fs/promises';
import path from 'path';
import { getPool } from '../database/connection.js';
import logger from '../utils/logger.js';

// Supported file extensions and their language mappings
const LANGUAGE_MAP = {
  // JavaScript/TypeScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  
  // Python
  '.py': 'python',
  
  // Java
  '.java': 'java',
  
  // C/C++/C#
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.cs': 'csharp',
  '.h': 'c',
  '.hpp': 'cpp',
  
  // Go
  '.go': 'go',
  
  // Rust
  '.rs': 'rust',
  
  // Ruby
  '.rb': 'ruby',
  
  // PHP
  '.php': 'php',
  
  // Swift
  '.swift': 'swift',
  
  // Kotlin
  '.kt': 'kotlin',
  
  // Shell
  '.sh': 'shell',
  '.bash': 'shell',
  
  // SQL
  '.sql': 'sql',
  
  // HTML/CSS
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  
  // Markup
  '.md': 'markdown',
  '.json': 'json',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  
  // Others
  '.lua': 'lua',
  '.vim': 'vim',
  '.pl': 'perl',
};

// Directories to skip during scanning
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.github',
  'dist',
  'build',
  'bin',
  'obj',
  '.gradle',
  '__pycache__',
  '.venv',
  'venv',
  'env',
  'target',
  '.env',
  '.vscode',
  '.idea',
  'coverage',
  '.nyc_output',
  'vendor',
  '.next',
  'out',
]);

// Count lines of code in a file
export async function countLines(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let totalLines = lines.length;
    let blankLines = 0;
    let commentLines = 0;
    let codeLines = 0;

    const ext = path.extname(filePath).toLowerCase();
    const language = LANGUAGE_MAP[ext] || 'unknown';

    // Simple comment/blank line detection
    let inMultilineComment = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        blankLines++;
        continue;
      }

      // Detect multiline comments (/* */ for C-style languages)
      if (language.match(/javascript|typescript|java|c|cpp|csharp|go|rust|swift/i)) {
        if (trimmed.includes('/*')) inMultilineComment = true;
        if (inMultilineComment) {
          commentLines++;
          if (trimmed.includes('*/')) inMultilineComment = false;
          continue;
        }
        
        if (trimmed.startsWith('//')) {
          commentLines++;
          continue;
        }
      }

      // Python comments
      if (language === 'python' && trimmed.startsWith('#')) {
        commentLines++;
        continue;
      }

      // Shell comments
      if (language === 'shell' && trimmed.startsWith('#')) {
        commentLines++;
        continue;
      }

      codeLines++;
    }

    return {
      totalLines,
      blankLines,
      commentLines,
      codeLines,
      language,
    };
  } catch (error) {
    logger.error(`Error counting lines in ${filePath}:`, error);
    return {
      totalLines: 0,
      blankLines: 0,
      commentLines: 0,
      codeLines: 0,
      language: 'unknown',
    };
  }
}

// Recursively scan directory for code files
export async function scanDirectory(dirPath, basePath = dirPath) {
  const files = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files and excluded directories
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await scanDirectory(fullPath, basePath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        
        // Only process known code file types
        if (LANGUAGE_MAP[ext]) {
          const lineData = await countLines(fullPath);
          
          files.push({
            path: relativePath,
            name: entry.name,
            size: (await fs.stat(fullPath)).size,
            language: lineData.language,
            totalLines: lineData.totalLines,
            codeLines: lineData.codeLines,
            commentLines: lineData.commentLines,
            blankLines: lineData.blankLines,
          });
        }
      }
    }
  } catch (error) {
    logger.error(`Error scanning directory ${dirPath}:`, error);
  }

  return files;
}

// Index a project - scan files and store in database
export async function indexProject(projectId, projectPath) {
  try {
    logger.info(`====== STARTING INDEXING FOR PROJECT: ${projectId} ======`);
    logger.info(`Project path: ${projectPath}`);
    
    // Check if directory exists
    try {
      const stats = await fs.stat(projectPath);
      logger.info(`Directory exists: ${stats.isDirectory()}`);
    } catch (statError) {
      logger.error(`Directory does not exist: ${projectPath}`, statError.message);
      throw statError;
    }
    
    // Scan the project directory
    logger.info(`Starting directory scan...`);
    const files = await scanDirectory(projectPath);
    logger.info(`====== SCAN COMPLETE: Found ${files.length} code files in project ${projectId} ======`);

    if (files.length === 0) {
      return {
        success: true,
        projectId,
        fileCount: 0,
        totalLines: 0,
        codeLines: 0,
        languages: {},
        message: 'No code files found',
      };
    }

    // Store files in database
    const pool = getPool();
    
    logger.info(`Clearing existing files for project ${projectId}...`);
    // Clear existing files for this project
    const deleteResult = await pool.query('DELETE FROM files WHERE project_id = ?', [projectId]);
    logger.info(`Deleted old files. Rows affected: ${deleteResult[0]?.affectedRows || 0}`);

    logger.info(`====== INSERTING ${files.length} FILES INTO DATABASE ======`);
    // Insert file records
    let totalLines = 0;
    let totalCodeLines = 0;
    const languages = {};

    for (const file of files) {
      logger.info(`Inserting file: ${file.name} (${file.language})`);
      await pool.query(
        `INSERT INTO files (id, project_id, file_path, file_name, language, file_size, 
         lines_of_code, comment_lines, blank_lines, total_lines, created_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          projectId,
          file.path,
          file.name,
          file.language,
          file.size,
          file.codeLines,
          file.commentLines,
          file.blankLines,
          file.totalLines,
        ]
      );

      totalLines += file.totalLines;
      totalCodeLines += file.codeLines;
      
      if (!languages[file.language]) {
        languages[file.language] = { files: 0, lines: 0 };
      }
      languages[file.language].files += 1;
      languages[file.language].lines += file.codeLines;
    }

    logger.info(`====== INDEXING COMPLETE FOR PROJECT: ${projectId} ======`);
    logger.info(`Total files: ${files.length}, Code lines: ${totalCodeLines}, Total lines: ${totalLines}`);

    return {
      success: true,
      projectId,
      fileCount: files.length,
      totalLines,
      codeLines: totalCodeLines,
      languages,
      indexedFiles: files,
    };
  } catch (error) {
    logger.error(`====== FAILED TO INDEX PROJECT ${projectId} ======`);
    logger.error(`Error message: ${error.message}`);
    logger.error(`Full error:`, error);
    throw error;
  }
}

// Get file statistics for a project
export async function getProjectStats(projectId) {
  try {
    const pool = getPool();
    
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as fileCount,
        SUM(total_lines) as totalLines,
        SUM(lines_of_code) as codeLines,
        SUM(comment_lines) as commentLines,
        SUM(blank_lines) as blankLines
       FROM files 
       WHERE project_id = ?`,
      [projectId]
    );

    if (stats.length === 0 || !stats[0].fileCount) {
      return {
        fileCount: 0,
        totalLines: 0,
        codeLines: 0,
        commentLines: 0,
        blankLines: 0,
        languages: {},
      };
    }

    const stat = stats[0];

    // Get language breakdown
    const [langStats] = await pool.query(
      `SELECT language, COUNT(*) as files, SUM(lines_of_code) as lineCount
       FROM files
       WHERE project_id = ?
       GROUP BY language
       ORDER BY lineCount DESC`,
      [projectId]
    );

    const languages = {};
    for (const lang of langStats) {
      languages[lang.language] = {
        files: lang.files,
        lines: lang.lineCount || 0,
      };
    }

    return {
      fileCount: stat.fileCount || 0,
      totalLines: stat.totalLines || 0,
      codeLines: stat.codeLines || 0,
      commentLines: stat.commentLines || 0,
      blankLines: stat.blankLines || 0,
      languages,
    };
  } catch (error) {
    logger.error(`Failed to get project stats for ${projectId}:`, error);
    throw error;
  }
}
