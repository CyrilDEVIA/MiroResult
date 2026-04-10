import path from 'path'
import { readFile, writeFile } from 'fs/promises'
import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware'

const router = Router()

const auth = authMiddleware as unknown as (req: Request, res: Response, next: NextFunction) => void

const PROVIDERS_PATH = path.resolve(__dirname, '../../providers.json')

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readProviders(): Promise<ProvidersFile> {
  try {
    const content = await readFile(PROVIDERS_PATH, 'utf8')
    return JSON.parse(content) as ProvidersFile
  } catch {
    return { active: null, providers: [] }
  }
}

async function writeProviders(data: ProvidersFile): Promise<void> {
  await writeFile(PROVIDERS_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function sanitize(p: Provider): Omit<Provider, 'apiKey'> & { hasKey: boolean } {
  const { apiKey, ...rest } = p
  return { ...rest, hasKey: Boolean(apiKey) }
}

// ─── GET /api/settings/providers ─────────────────────────────────────────────

router.get('/providers', auth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await readProviders()
    res.json({
      active: data.active,
      providers: data.providers.map(sanitize),
    })
  } catch (err) {
    next(err)
  }
})

// ─── POST /api/settings/providers ────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().min(1),
})

router.post('/providers', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, baseUrl, apiKey, model } = createSchema.parse(req.body)
    const data = await readProviders()

    const provider: Provider = {
      id: crypto.randomUUID(),
      name,
      baseUrl,
      apiKey,
      model,
    }

    data.providers.push(provider)
    await writeProviders(data)

    res.status(201).json(sanitize(provider))
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/settings/providers/:id ───────────────────────────────────────

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  model: z.string().min(1).optional(),
})

router.patch('/providers/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const updates = updateSchema.parse(req.body)
    const data = await readProviders()

    const idx = data.providers.findIndex((p) => p.id === id)
    if (idx === -1) {
      res.status(404).json({ error: 'Provider introuvable' })
      return
    }

    const current = data.providers[idx]

    if (updates.name !== undefined) current.name = updates.name
    if (updates.baseUrl !== undefined) current.baseUrl = updates.baseUrl
    if (updates.model !== undefined) current.model = updates.model
    // Clé API : mise à jour uniquement si une valeur non vide est fournie
    if (updates.apiKey) current.apiKey = updates.apiKey

    await writeProviders(data)
    res.json(sanitize(current))
  } catch (err) {
    next(err)
  }
})

// ─── DELETE /api/settings/providers/:id ──────────────────────────────────────

router.delete('/providers/:id', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const data = await readProviders()

    const idx = data.providers.findIndex((p) => p.id === id)
    if (idx === -1) {
      res.status(404).json({ error: 'Provider introuvable' })
      return
    }

    data.providers.splice(idx, 1)

    if (data.active === id) {
      data.active = null
    }

    await writeProviders(data)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// ─── PATCH /api/settings/providers/:id/activate ──────────────────────────────

router.patch('/providers/:id/activate', auth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const data = await readProviders()

    const provider = data.providers.find((p) => p.id === id)
    if (!provider) {
      res.status(404).json({ error: 'Provider introuvable' })
      return
    }

    data.active = id
    await writeProviders(data)
    res.json({ success: true, provider: { name: provider.name, model: provider.model } })
  } catch (err) {
    next(err)
  }
})

export default router
