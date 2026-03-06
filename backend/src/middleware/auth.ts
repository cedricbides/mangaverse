import { Request, Response, NextFunction } from 'express'
import { IUser } from '../models/User'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  next()
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if ((req.user as IUser).role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
  next()
}