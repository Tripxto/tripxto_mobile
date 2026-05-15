import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { User } from '../models/User.js';

export type AuthedRequest = Request & { userId?: string; phoneE164?: string };

export function authJwt(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; phoneE164: string };
    req.userId = payload.sub;
    req.phoneE164 = payload.phoneE164;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function attachUser(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const user = await User.findOne({ id: req.userId });
  if (!user || !user.get('phoneVerified')) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  next();
}
