import jwt from 'jsonwebtoken';
import type { Env } from '../config/env.js';

export interface JWTPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JWTPayload, env: Env): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'vakkya-api',
  });
}

export function verifyToken(token: string, env: Env): JWTPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'vakkya-api',
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}
