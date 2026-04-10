import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware'
import { prisma } from '../db/prisma'
import { analyzeSimulation, readProvidersFile, writeActiveProvider } from '../services/aiProvider'

const router = Router()

const auth = authMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void

// ─── Schema de sortie ────────────────────────────────────────────────────────

const analysisEntrySchema = z.object({
  id: z.string(),
  simulationId: z.string(),
  provider: z.string(),
  model: z.string(),
  rawText: z.string(),
  createdAt: z.string(),
})

const analysisListSchema = z.array(analysisEntrySchema)

// ─── GET /:simulationId — Historique des analyses ────────────────────────────

router.get('/:simulationId', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { simulationId } = req.params

    const results = await prisma.analysisResult.findMany({
      where: { simulationId },
      orderBy: { createdAt: 'desc' },
    })

    const data = analysisListSchema.parse(
      results.map((r) => ({
        id: r.id,
        simulationId: r.simulationId,
        provider: r.provider,
        model: r.model,
        rawText: r.rawText,
        createdAt: r.createdAt.toISOString(),
      }))
    )

    res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
})

// ─── POST /:simulationId — Génération (force=true bypass le cache) ────────────

const postBodySchema = z.object({
  providerId: z.string().optional(),
})

router.post('/:simulationId', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { simulationId } = req.params
    const force = req.query.force === 'true'
    const { providerId } = postBodySchema.parse(req.body)

    const simulation = await prisma.simulation.findUnique({
      where: { id: simulationId },
    })

    if (!simulation) {
      res.status(404).json({ error: 'Simulation non trouvée' })
      return
    }

    // Résolution du provider : celui passé en body, sinon le provider actif
    const { active, providers } = await readProvidersFile()
    const targetId = providerId ?? active
    const provider = providers.find((p) => p.id === targetId)

    if (!provider) {
      res.status(400).json({ error: 'Aucun provider sélectionné. Choisissez un provider avant de lancer l\'analyse.' })
      return
    }

    // Retourner le cache sauf si force=true
    if (!force && simulation.aiAnalysis) {
      res.json({ analysis: simulation.aiAnalysis, provider: provider.name, cached: true })
      return
    }

    if (!simulation.rawData || simulation.rawData === '{}') {
      res.status(400).json({ error: 'Données de simulation non disponibles pour l\'analyse IA.' })
      return
    }

    const { analysis } = await analyzeSimulation(simulation.rawData, provider)

    // Mettre à jour le cache + persister dans l'historique
    await Promise.all([
      prisma.simulation.update({
        where: { id: simulationId },
        data: { aiAnalysis: analysis },
      }),
      prisma.analysisResult.create({
        data: {
          simulationId,
          provider: provider.name,
          model: provider.model,
          rawText: analysis,
        },
      }),
    ])

    // Mettre à jour le provider actif (non-bloquant)
    writeActiveProvider(provider.id)

    res.json({ analysis, provider: provider.name, cached: false })
  } catch (err) {
    next(err)
  }
})

export default router
