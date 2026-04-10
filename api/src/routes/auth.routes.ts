import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { login } from '../services/auth.service'
import { authMiddleware } from '../middleware/auth.middleware'
import { prisma } from '../db/prisma'
import { AuthenticatedRequest } from '../types'

const router = Router()

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const result = await login(email, password)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

router.get(
  '/me',
  authMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest
      const user = await prisma.user.findUnique({
        where: { id: authReq.user.id },
        select: { id: true, email: true, role: true, createdAt: true },
      })
      res.json({ success: true, data: user })
    } catch (err) {
      next(err)
    }
  }
)

export default router
