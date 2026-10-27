import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import rateLimit from 'express-rate-limit'
import { authMiddleware } from '../middleware/auth.middleware'
import { prisma } from '../db/prisma'
import { readProvidersFile } from '../services/aiProvider'
import { AppError, AuthenticatedRequest } from '../types'
import { LLM_TIMEOUT_MS } from '../config/constants'

const router = Router()

const auth = authMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void

const llmLimiter = rateLimit({
  windowMs: 60 * 60_000,
  max: 10,
  keyGenerator: (req) => (req as AuthenticatedRequest).user?.id ?? req.ip ?? 'anonymous',
  message: { error: 'Limite de requêtes IA atteinte (10/heure). Réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
})

const simulationParamsSchema = z.object({
  simulationId: z.string().uuid('simulationId invalide'),
})

const postBodySchema = z.object({
  providerId: z.string().optional(),
  userInstructions: z.string().max(2000).optional(),
})

// GET /api/html-report/:simulationId
router.get('/:simulationId', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { simulationId } = simulationParamsSchema.parse(req.params)
    const authReq = req as AuthenticatedRequest

    const simulation = await prisma.simulation.findFirst({
      where: { id: simulationId, userId: authReq.user.id },
      select: { htmlReport: true },
    })

    if (!simulation) {
      res.status(404).json({ error: 'Simulation non trouvée' })
      return
    }

    res.json({ success: true, html: simulation.htmlReport ?? null })
  } catch (err) {
    next(err)
  }
})

const SYSTEM_PROMPT = `Tu es un expert en analyse de simulations MiroFish.
Tu reçois des données brutes de simulation multi-agents.
Tu dois générer UN FICHIER HTML COMPLET, standalone, sans dépendance externe.
RÈGLES ABSOLUES :
- Commence par <!DOCTYPE html> et termine par </html>
- Aucun texte avant ou après le HTML
- Tout le CSS est inline dans <style>
- Tous les graphiques sont en SVG inline
- Aucune lib externe (pas de Chart.js, pas de D3)

STRUCTURE OBLIGATOIRE :
1. Header dark (#1a1510) : titre projet + 4 métadonnées (agents, durée, territoire, date)
2. Citation intro en italique avec bordure gauche ocre (#b5813a)
3. 4 KPIs en cards : les 4 chiffres les plus frappants de la simulation, courts, en grand
4. Réactions : 2 donuts SVG côte à côte (population 1 / population 2) avec légende
5. Intérêt par segment : barres horizontales SVG triées par score décroissant
6. Forces (fond vert clair) / Faiblesses (fond rouge clair) : 2 colonnes, bullet points courts, emoji
7. Viabilité : 3 colonnes court / moyen / long terme avec score X.X/10 en grand
8. Score global cerclé SVG + synthèse en prose (150 mots max)
9. Footer dark avec ID simulation

PALETTE :
- Fond : #f5f0e8
- Titres : Georgia serif
- Ocre : #b5813a, Vert : #5a7a4a, Rouge : #c0614a
- Header/Footer : #1a1510 texte blanc`

function extractHtml(raw: string): string {
  return raw
    .replace(/^```(?:html)?\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim()
}

// POST /api/html-report/:simulationId
router.post('/:simulationId', auth, llmLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { simulationId } = simulationParamsSchema.parse(req.params)
    const authReq = req as AuthenticatedRequest
    const { providerId, userInstructions } = postBodySchema.parse(req.body)

    const simulation = await prisma.simulation.findFirst({
      where: { id: simulationId, userId: authReq.user.id },
    })

    if (!simulation) {
      res.status(404).json({ error: 'Simulation non trouvée' })
      return
    }

    if (!simulation.rawData || simulation.rawData === '{}') {
      res
        .status(400)
        .json({ error: 'Données de simulation non disponibles pour la génération du rapport.' })
      return
    }

    const { active, providers } = await readProvidersFile()
    const targetId = providerId ?? active
    const provider = providers.find((p) => p.id === targetId)

    if (!provider) {
      res
        .status(400)
        .json({ error: 'Aucun provider configuré. Ajoutez un provider dans Paramètres.' })
      return
    }

    if (!provider.baseUrl.startsWith('https://')) {
      throw new AppError('La baseUrl du provider doit utiliser HTTPS', 400)
    }

    const userContent = userInstructions
      ? `${simulation.rawData}\n\n---\nConsignes supplémentaires :\n${userInstructions}`
      : simulation.rawData

    try {
      const apiRes = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: 8192,
          temperature: 0,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
        }),
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      })

      const rawBody = await apiRes.text()

      if (process.env.NODE_ENV !== 'production') {
        console.log('[html-report] status HTTP :', apiRes.status)
        console.log('[html-report] body brut (500 chars) :', rawBody.slice(0, 500))
      }

      if (!apiRes.ok) {
        throw new AppError(`Erreur provider ${apiRes.status}: ${rawBody.slice(0, 200)}`, 502)
      }

      const apiJson = JSON.parse(rawBody) as {
        choices: Array<{ message: { content: string } }>
      }
      const html = extractHtml(apiJson.choices[0].message.content)

      const trimmed = html.trimStart()
      if (!trimmed.startsWith('<!DOCTYPE') && !trimmed.toLowerCase().startsWith('<html')) {
        res.status(422).json({ error: 'Le LLM n\'a pas retourné de HTML valide.' })
        return
      }

      await prisma.simulation.update({
        where: { id: simulationId },
        data: { htmlReport: html },
      })

      res.json({ success: true, html })
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[html-report] erreur complète :', err)
      }
      throw err
    }
  } catch (err) {
    next(err)
  }
})

const editBodySchema = z.object({
  html: z.string().min(1),
  instruction: z.string().min(1).max(2000),
  providerId: z.string().optional(),
})

const EDIT_SYSTEM_PROMPT =
  `Tu reçois un rapport HTML. Applique l'instruction de l'utilisateur et retourne uniquement le HTML modifié, sans commentaire, sans balises markdown.`

// POST /api/html-report/:simulationId/edit
router.post('/:simulationId/edit', auth, llmLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { simulationId } = simulationParamsSchema.parse(req.params)
    const authReq = req as AuthenticatedRequest
    const { html, instruction, providerId } = editBodySchema.parse(req.body)

    const simulation = await prisma.simulation.findFirst({
      where: { id: simulationId, userId: authReq.user.id },
      select: { id: true },
    })
    if (!simulation) {
      res.status(404).json({ error: 'Simulation non trouvée' })
      return
    }

    const { active, providers } = await readProvidersFile()
    const targetId = providerId ?? active
    const provider = providers.find((p) => p.id === targetId)

    if (!provider) {
      res.status(400).json({ error: 'Aucun provider configuré. Ajoutez un provider dans Paramètres.' })
      return
    }

    if (!provider.baseUrl.startsWith('https://')) {
      throw new AppError('La baseUrl du provider doit utiliser HTTPS', 400)
    }

    const apiRes = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 8192,
        temperature: 0,
        messages: [
          { role: 'system', content: EDIT_SYSTEM_PROMPT },
          { role: 'user', content: `${html}\n\n---\nInstruction : ${instruction}` },
        ],
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    })

    const rawBody = await apiRes.text()

    if (!apiRes.ok) {
      throw new AppError(`Erreur provider ${apiRes.status}: ${rawBody.slice(0, 200)}`, 502)
    }

    const apiJson = JSON.parse(rawBody) as {
      choices: Array<{ message: { content: string } }>
    }
    const modified = extractHtml(apiJson.choices[0].message.content)

    const trimmed = modified.trimStart()
    if (!trimmed.startsWith('<!DOCTYPE') && !trimmed.toLowerCase().startsWith('<html')) {
      res.status(422).json({ error: 'Le LLM n\'a pas retourné de HTML valide.' })
      return
    }

    res.json({ success: true, html: modified })
  } catch (err) {
    next(err)
  }
})

export default router
