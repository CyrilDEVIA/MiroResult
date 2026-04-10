import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware'
import { generateReport, getReport } from '../services/report.service'
import { AuthenticatedRequest } from '../types'

const router = Router()

const auth = authMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void

const generateSchema = z.object({
  simulationId: z.string().uuid('simulationId invalide'),
})

router.post('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const { simulationId } = generateSchema.parse(req.body)
    const generated = await generateReport(simulationId, authReq.user.id)
    const report = await getReport(generated.id, authReq.user.id)
    res.status(201).json({ success: true, data: report })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const report = await getReport(req.params.id, authReq.user.id)
    res.json({ success: true, data: report })
  } catch (err) {
    next(err)
  }
})

router.get('/:id/export/json', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const report = await getReport(req.params.id, authReq.user.id)
    const filename = `rapport-${report.simulation.filename.replace('.json', '')}-${report.id.slice(0, 8)}.json`
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Content-Type', 'application/json')
    res.send(JSON.stringify({ ...report, exportedAt: new Date().toISOString() }, null, 2))
  } catch (err) {
    next(err)
  }
})

export default router
