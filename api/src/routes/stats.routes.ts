import path from 'path'
import { readFile } from 'fs/promises'
import { Router, Request, Response, NextFunction } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { prisma } from '../db/prisma'
import { AuthenticatedRequest } from '../types'

const router = Router()

const auth = authMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void

const PROVIDERS_PATH = path.resolve(__dirname, '../../providers.json')

interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  model: string
}

interface ProvidersFile {
  active: string | null
  providers: Provider[]
}

router.get('/', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest
    const userId = authReq.user.id

    const [
      totalSimulations,
      processedSimulations,
      totalReports,
      totalAnalyses,
      recentSimulations,
      avgScore,
      allReportsScoresV2,
    ] = await Promise.all([
      prisma.simulation.count({ where: { userId } }),
      prisma.simulation.count({ where: { userId, status: 'processed' } }),
      prisma.report.count({ where: { simulation: { userId } } }),
      prisma.analysisResult.count({ where: { simulation: { userId } } }),
      prisma.simulation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          filename: true,
          status: true,
          createdAt: true,
          report: { select: { id: true, scoreGlobal: true, scoresV2: true } },
        },
      }),
      prisma.report.aggregate({
        where: { simulation: { userId } },
        _avg: { scoreGlobal: true },
      }),
      prisma.report.findMany({
        where: { simulation: { userId }, scoresV2: { not: null } },
        select: { scoresV2: true },
      }),
    ])

    // Calcul avgScoreV2 depuis les champs JSON stockés
    const v2Scores: number[] = []
    for (const r of allReportsScoresV2) {
      if (!r.scoresV2) continue
      try {
        const parsed = JSON.parse(r.scoresV2) as { globalScoreV2?: number | null }
        if (typeof parsed.globalScoreV2 === 'number') {
          v2Scores.push(parsed.globalScoreV2)
        }
      } catch {
        // JSON invalide, ignoré
      }
    }
    const avgScoreV2 =
      v2Scores.length > 0
        ? Math.round(v2Scores.reduce((a, b) => a + b, 0) / v2Scores.length)
        : null

    // Lecture provider actif depuis providers.json
    let activeProvider: { name: string; model: string; baseUrl: string } | null = null
    try {
      const content = await readFile(PROVIDERS_PATH, 'utf8')
      const data = JSON.parse(content) as ProvidersFile
      if (data.active) {
        const found = data.providers.find((p) => p.id === data.active)
        if (found) {
          activeProvider = { name: found.name, model: found.model, baseUrl: found.baseUrl }
        }
      }
    } catch {
      // providers.json absent ou invalide — pas de provider actif
    }

    res.json({
      success: true,
      data: {
        totalSimulations,
        processedSimulations,
        totalReports,
        totalAnalyses,
        avgScore: avgScore._avg.scoreGlobal ? Math.round(avgScore._avg.scoreGlobal) : null,
        avgScoreV2,
        activeProvider,
        recentSimulations,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router
