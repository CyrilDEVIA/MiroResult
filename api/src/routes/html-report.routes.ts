import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import path from 'path'
import { readFile } from 'fs/promises'
import { authMiddleware } from '../middleware/auth.middleware'
import { prisma } from '../db/prisma'
import { readProvidersFile } from '../services/aiProvider'
import { AppError } from '../types'

const router = Router()

const auth = authMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void

const PROMPT_PATH = path.resolve(__dirname, '../../../prompt-mirofish.md')

const postBodySchema = z.object({
  providerId: z.string().optional(),
  userInstructions: z.string().max(2000).optional(),
})

async function loadSystemPrompt(): Promise<string> {
  const md = await readFile(PROMPT_PATH, 'utf8')
  const match = md.match(/```\n([\s\S]+)\n```\n\n---/)
  return match ? match[1] : md
}

function extractHtml(raw: string): string {
  return raw
    .replace(/^```(?:html)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()
}

// POST /api/html-report/:simulationId
router.post('/:simulationId', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { simulationId } = req.params
    const { providerId, userInstructions } = postBodySchema.parse(req.body)

    const simulation = await prisma.simulation.findUnique({
      where: { id: simulationId },
    })

    if (!simulation) {
      res.status(404).json({ error: 'Simulation non trouvée' })
      return
    }

    if (!simulation.rawData || simulation.rawData === '{}') {
      res.status(400).json({ error: 'Données de simulation non disponibles pour la génération du rapport.' })
      return
    }

    const { active, providers } = await readProvidersFile()
    const targetId = providerId ?? active
    const provider = providers.find((p) => p.id === targetId)

    if (!provider) {
      res.status(400).json({ error: 'Aucun provider configuré. Ajoutez un provider dans Paramètres.' })
      return
    }

    let systemPrompt: string
    try {
      systemPrompt = await loadSystemPrompt()
    } catch {
      res.status(500).json({ error: 'Impossible de lire prompt-mirofish.md à la racine du projet.' })
      return
    }

    // Composition du message utilisateur : données brutes + consignes supplémentaires
    const userContent = userInstructions
      ? `${simulation.rawData}\n\n---\nConsignes supplémentaires :\n${userInstructions}`
      : simulation.rawData

    const apiRes = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 8192,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(180000),
    })

    if (!apiRes.ok) {
      const body = await apiRes.text().catch(() => '')
      throw new AppError(`Erreur provider ${apiRes.status}: ${body.slice(0, 200)}`, 502)
    }

    const json = await apiRes.json() as { choices: Array<{ message: { content: string } }> }
    const html = extractHtml(json.choices[0].message.content)

    res.json({ success: true, html })
  } catch (err) {
    next(err)
  }
})

export default router
