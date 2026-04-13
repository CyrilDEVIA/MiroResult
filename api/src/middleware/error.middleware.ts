import { Request, Response, NextFunction } from 'express'
import { AppError } from '../types'

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message })
    return
  }

  console.error('[error]', err)
  res.status(500).json({ success: false, message: 'Erreur serveur interne' })
}
