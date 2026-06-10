// Utility functions

import { v4 as uuidv4 } from 'uuid';

export function generateId() {
  return uuidv4();
}

export function getCurrentTimestamp() {
  return new Date().toISOString();
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
