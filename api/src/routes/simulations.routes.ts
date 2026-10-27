import path from 'path'
import { unlink } from 'fs/promises'
import { Router, Request, Response, NextFunction } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { upload } from '../middleware/upload.middleware'
import {
  createSimulation,
  listSimulations,
  getSimulation,
  extractAndParseZip,
  computeScore,
  buildZipScoresDetail,
  summarizeZip,
  generateZipRecommendations,
} from '../services/simulation.service'
import { generateReport, getReport } from '../services/report.service'
import { computeAdvancedMetrics } from '../services/scoring.service'
import { prisma } from '../db/prisma'
import { AuthenticatedRequest, AppError } from '../types'

const router = Router()

const auth = authMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void

const ZIP_MIMES = ['application/zip', 'application/x-zip-compressed']

router.post(
  '/',
  auth,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest

      if (!req.file) {
        throw new AppError('Fichier requis', 400)
      }

      const ext = path.extname(req.file.originalname).toLowerCase()
      const isZip = ext === '.zip' || ZIP_MIMES.includes(req.file.mimetype)

      // ── Flux ZIP ────────────────────────────────────────────────────────────
      if (isZip) {
        let parsed
        try {
          parsed = extractAndParseZip(req.file.path)
        } catch {
          throw new AppError('Impossible de lire le fichier ZIP. Vérifiez que le fichier est valide.', 400)
        }

        const raw = JSON.stringify(parsed)
        if (raw.length > 5 * 1024 * 1024) throw new AppError('rawData dépasse 5 MB', 413)

        const simulation = await prisma.simulation.create({
          data: {
            userId: authReq.user.id,
            filename: path.basename(req.file.originalname),
            filePath: req.file.path,
            rawData: raw,
            status: 'processed',
          },
        })

        const scores = computeScore(parsed)
        const scoresDetail = buildZipScoresDetail(scores)
        const summary = summarizeZip(scores)
        const v2 = computeAdvancedMetrics({
          actions: parsed.actions,
          profiles: parsed.profiles,
          v1Global: scores.global,
        })

        const report = await prisma.report.create({
          data: {
            simulationId: simulation.id,
            scoreGlobal: scores.global,
            scoresDetail: JSON.stringify(scoresDetail),
            scoresV2: JSON.stringify(v2),
            summary,
          },
        })

        const recInputs = generateZipRecommendations(scores)
        let recommendations: unknown[] = []
        if (recInputs.length > 0) {
          await prisma.recommendation.createMany({
            data: recInputs.map((r) => ({ ...r, reportId: report.id })),
          })
          recommendations = await prisma.recommendation.findMany({
            where: { reportId: report.id },
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
          })
        }

        return res.status(201).json({ success: true, data: { simulation, report, recommendations } })
      }

      // ── Flux JSON ───────────────────────────────────────────────────────────
      const simulation = await createSimulation(
        authReq.user.id,
        req.file.path,
        req.file.originalname
      )

      if (simulation.status !== 'processed') {
        return res.status(201).json({ success: true, data: { simulation, report: null, recommendations: [] } })
      }

      const report = await generateReport(simulation.id, authReq.user.id)
      const fullReport = await getReport(report.id, authReq.user.id)

      return res.status(201).json({
        success: true,
        data: {
          simulation,
          report: fullReport,
          recommendations: fullReport.recommendations,
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const simulations = await listSimulations(authReq.user.id)
    res.json({ success: true, data: simulations })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const simulation = await getSimulation(req.params.id, authReq.user.id)
    res.json({ success: true, data: simulation })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const simulation = await prisma.simulation.findFirst({
      where: { id: req.params.id, userId: authReq.user.id },
      include: { report: { include: { recommendations: true } } },
    })

    if (!simulation) {
      throw new AppError('Simulation introuvable', 404)
    }

    await prisma.$transaction(async (tx) => {
      if (simulation.report) {
        await tx.recommendation.deleteMany({ where: { reportId: simulation.report.id } })
        await tx.report.delete({ where: { id: simulation.report.id } })
      }
      await tx.simulation.delete({ where: { id: simulation.id } })
    })

    if (simulation.filePath) {
      try {
        await unlink(simulation.filePath)
      } catch {
        // fichier absent ou déjà supprimé — ignoré silencieusement
      }
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
