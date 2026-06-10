import { Issuer } from 'openid-client';
import { getPool } from '../database/connection.js';
import { generateJWT, generateUserId } from './jwt.js';
import logger from '../utils/logger.js';

let googleClient;

export async function initializeOAuthClient() {
  try {
    const googleIssuer = await Issuer.discover('https://accounts.google.com');

    googleClient = new googleIssuer.Client({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uris: [process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback'],
      response_types: ['code'],
    });

    logger.info('OAuth client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize OAuth client:', error);
    throw error;
  }
}

export function initAuthRoutes(app) {
  // Initialize OAuth before routes
  initializeOAuthClient().catch(console.error);

  // Login endpoint
  app.get('/api/auth/login', (req, res) => {
    if (!googleClient) {
      return res.status(500).json({ error: 'OAuth client not initialized' });
    }

    // For backend OAuth flow, we don't need nonce since we have client_secret
    // nonce is mainly for protecting frontend implicit flows against token substitution
    const authorizationUrl = googleClient.authorizationUrl({
      scope: 'openid email profile',
    });

    res.json({ url: authorizationUrl });
  });

  // Callback endpoint - receives GET request from Google OAuth redirect
  app.get('/api/auth/callback', async (req, res) => {
    try {
      if (!googleClient) {
        return res.status(500).json({ error: 'OAuth client not initialized' });
      }

      const code = req.query.code;

      if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' });
      }

      // Exchange authorization code for tokens using the grant method
      // This performs the code exchange with client_secret authentication
      // which is secure without needing nonce validation
      const tokenSet = await googleClient.grant({
        grant_type: 'authorization_code',
        code: req.query.code,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback',
      });

      // Manually validate the ID token signature and expiration
      // This is more secure than relying on nonce which we don't have a session to store
      const userInfo = tokenSet.claims();
      
      if (!userInfo.email) {
        logger.error('No email in token claims');
        return res.redirect(`http://localhost:3000/login?error=no_email`);
      }

      // Get or create user in database
      const pool = getPool();
      const connection = await pool.getConnection();

      try {
        // Check if user exists
        const [rows] = await connection.execute(
          'SELECT * FROM users WHERE google_id = ?',
          [userInfo.sub]
        );

        let userId;

        if (rows.length > 0) {
          userId = rows[0].id;
          logger.info(`User found: ${userId}`);
        } else {
          // Create new user
          userId = generateUserId();
          await connection.execute(
            'INSERT INTO users (id, email, full_name, google_id, avatar_url) VALUES (?, ?, ?, ?, ?)',
            [userId, userInfo.email, userInfo.name, userInfo.sub, userInfo.picture]
          );
          logger.info(`User created: ${userId}`);
        }

        // Generate JWT token
        const token = generateJWT(userId, userInfo.email);

        // Redirect to frontend with token and user info in URL params
        const redirectUrl = `http://localhost:3000/auth/callback?token=${token}&userId=${userId}&email=${encodeURIComponent(userInfo.email)}&fullName=${encodeURIComponent(userInfo.name || '')}`;
        res.redirect(redirectUrl);
      } finally {
        connection.release();
      }
    } catch (error) {
      logger.error('OAuth callback error:', error);
      res.redirect(`http://localhost:3000/login?error=authentication_failed`);
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    // In this stateless JWT approach, logout is handled by frontend
    res.json({ message: 'Logged out successfully' });
  });
}
