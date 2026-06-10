import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export function generateJWT(userId, email) {
  const payload = {
    userId,
    email,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', {
    expiresIn: '7d',
  });

  return token;
}

export function verifyJWT(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch (error) {
    return null;
  }
}

export function generateUserId() {
  return uuidv4();
}
