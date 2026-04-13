import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware'
import { prisma } from '../db/prisma'
import { listRecommendations } from '../services/recommendation.service'
import { AppError, AuthenticatedRequest } from '../types'

const router = Router()

const auth = authMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void

const querySchema = z.object({
  reportId: z.string().uuid('reportId invalide'),
})

router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = querySchema.safeParse(req.query)
    if (!result.success) {
      throw new AppError('reportId requis et doit être un UUID valide', 400)
    }
    const authReq = req as AuthenticatedRequest
    const report = await prisma.report.findFirst({
      where: { id: result.data.reportId, simulation: { userId: authReq.user.id } },
      select: { id: true },
    })
    if (!report) throw new AppError('Rapport introuvable', 404)
    const recommendations = await listRecommendations(result.data.reportId)
    res.json({ success: true, data: recommendations })
  } catch (err) {
    next(err)
  }
})

export default router
