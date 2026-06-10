import jwt from 'jsonwebtoken';

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    // Set userId from decoded token (could be 'id', 'userId', 'sub', etc.)
    req.userId = decoded.id || decoded.userId || decoded.sub || decoded.user_id || 'anonymous';
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
