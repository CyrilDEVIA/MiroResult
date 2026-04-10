import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AuthenticatedRequest, AppError } from '../types'

interface JwtPayload {
  id: string
  email: string
  role: string
}

export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Token manquant', 401))
  }

  const token = authHeader.slice(7)
  const secret = process.env.JWT_SECRET

  if (!secret) {
    return next(new AppError('Configuration JWT manquante', 500))
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role }
    next()
  } catch {
    next(new AppError('Token invalide ou expiré', 401))
  }
}
