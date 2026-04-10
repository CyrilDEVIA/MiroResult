import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware'
import { listRecommendations } from '../services/recommendation.service'
import { AppError } from '../types'

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
    const recommendations = await listRecommendations(result.data.reportId)
    res.json({ success: true, data: recommendations })
  } catch (err) {
    next(err)
  }
})

export default router
