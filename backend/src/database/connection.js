import mysql from 'mysql2/promise';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

let pool;

export async function initializeDatabase() {
  pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB || 'codebase_intelligence',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // Test connection
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    logger.info('Database connection successful');
  } finally {
    connection.release();
  }

  // Initialize schema
  await initializeSchema(pool);
}

export function getPool() {
  return pool;
}

async function initializeSchema(pool) {
  const connection = await pool.getConnection();
  try {
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        avatar_url VARCHAR(512),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_google_id (google_id)
      )
    `);

    // Projects table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        repository_url VARCHAR(512),
        storage_path VARCHAR(512),
        status VARCHAR(50) DEFAULT 'uploaded',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_user_id (user_id),
        INDEX idx_status (status)
      )
    `);

    // Files table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS files (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        file_path VARCHAR(512) NOT NULL,
        file_name VARCHAR(255),
        language VARCHAR(50),
        file_size INT,
        lines_of_code INT,
        comment_lines INT,
        blank_lines INT,
        total_lines INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        UNIQUE KEY unique_file (project_id, file_path)
      )
    `);

    // Chunks table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS chunks (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        file_id VARCHAR(36),
        file_path VARCHAR(512),
        language VARCHAR(50),
        chunk_type VARCHAR(100),
        chunk_name VARCHAR(255),
        start_line INT,
        end_line INT,
        content LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        INDEX idx_file_id (file_id),
        INDEX idx_chunk_type (chunk_type)
      )
    `);

    // Embeddings table (stores vector IDs from Qdrant)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id VARCHAR(36) PRIMARY KEY,
        chunk_id VARCHAR(36) NOT NULL,
        project_id VARCHAR(36) NOT NULL,
        qdrant_vector_id BIGINT UNIQUE,
        embedding_model VARCHAR(100),
        embedding_dimensions INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project_id (project_id),
        INDEX idx_chunk_id (chunk_id),
        INDEX idx_qdrant_vector_id (qdrant_vector_id)
      )
    `);;

    // Conversations table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_project_id (project_id),
        INDEX idx_user_id (user_id)
      )
    `);

    // Messages table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(36) PRIMARY KEY,
        conversation_id VARCHAR(36) NOT NULL,
        role VARCHAR(20),
        content LONGTEXT,
        source_chunks JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_created_at (created_at)
      )
    `);

    logger.info('Database schema initialized');
  } finally {
    connection.release();
  }
}
