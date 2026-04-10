import { readFile } from 'fs/promises'
import path from 'path'
import AdmZip from 'adm-zip'
import { z } from 'zod'
import { prisma } from '../db/prisma'
import { AppError } from '../types'

// ─── Schéma JSON MiroFish legacy ────────────────────────────────────────────

const miroFishSchema = z.object({
  simulationId: z.string().optional(),
  date: z.string().optional(),
  species: z.string().optional(),
  period: z.string().optional(),
  metrics: z.object({
    biomass: z.number(),
    mortality: z.number().min(0).max(100),
    growth: z.number().min(0),
    feedConversion: z.number().min(0),
  }),
})

export type MiroFishData = z.infer<typeof miroFishSchema>

// ─── Fonctions CRUD de base ──────────────────────────────────────────────────

export async function createSimulation(
  userId: string,
  filePath: string,
  originalFilename: string
) {
  let status: string = 'error'
  let rawData: string = '{}'

  try {
    const content = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(content)
    miroFishSchema.parse(parsed)
    rawData = content
    status = 'processed'
  } catch {
    status = 'error'
  }

  const simulation = await prisma.simulation.create({
    data: {
      userId,
      filename: originalFilename,
      filePath,
      rawData,
      status,
    },
  })

  return simulation
}

export async function listSimulations(userId: string) {
  return prisma.simulation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      status: true,
      createdAt: true,
      report: { select: { id: true } },
    },
  })
}

export async function getSimulation(id: string, userId: string) {
  const simulation = await prisma.simulation.findFirst({
    where: { id, userId },
    include: { report: true },
  })

  if (!simulation) {
    throw new AppError('Simulation introuvable', 404)
  }

  return simulation
}

// ─── Types ZIP ───────────────────────────────────────────────────────────────

interface ParsedZip {
  simulation_config: unknown | null
  state: unknown | null
  run_state: unknown | null
  env_status: unknown | null
  actions: unknown[]
  profiles: unknown[]
  raw_files: Array<{ name: string; content: unknown }>
}

export interface ZipScores {
  global: number
  dimensions: Record<string, number>
}

// ─── Extraction ZIP ──────────────────────────────────────────────────────────

export function extractAndParseZip(filePath: string): ParsedZip {
  const zip = new AdmZip(filePath)
  const entries = zip.getEntries()

  const result: ParsedZip = {
    simulation_config: null,
    state: null,
    run_state: null,
    env_status: null,
    actions: [],
    profiles: [],
    raw_files: [],
  }

  for (const entry of entries) {
    if (entry.isDirectory) continue

    const name = path.basename(entry.entryName).toLowerCase()
    const ext = path.extname(name)

    try {
      if (ext === '.json') {
        const content = JSON.parse(entry.getData().toString('utf8'))

        if (name === 'simulation_config.json') result.simulation_config = content
        else if (name === 'state.json') result.state = content
        else if (name === 'run_state.json') result.run_state = content
        else if (name === 'env_status.json') result.env_status = content
        else if (name.includes('profiles')) result.profiles.push(content)
        else result.raw_files.push({ name, content })
      }

      if (ext === '.jsonl') {
        const lines = entry
          .getData()
          .toString('utf8')
          .split('\n')
          .filter(Boolean)
          .map((l) => JSON.parse(l))
        result.actions.push(...lines)
      }

      if (ext === '.csv') {
        result.raw_files.push({ name, content: entry.getData().toString('utf8') })
      }
    } catch {
      // fichier illisible ou JSON invalide — ignoré silencieusement
    }
  }

  return result
}

// ─── Scoring adaptatif ZIP ───────────────────────────────────────────────────

export function computeScore(parsed: ParsedZip): ZipScores {
  const scores: Record<string, number> = {}
  let total = 0
  let count = 0

  if (parsed.actions.length > 0) {
    const actionScore = Math.min(100, Math.round((parsed.actions.length / 50) * 100))
    scores.activity = actionScore
    total += actionScore
    count++
  }

  if (parsed.profiles.length > 0) {
    const flat = (parsed.profiles as unknown[]).flat()
    const profileScore = Math.min(100, Math.round((flat.length / 20) * 100))
    scores.reach = profileScore
    total += profileScore
    count++
  }

  if (parsed.simulation_config) {
    scores.configuration = 100
    total += 100
    count++
  }

  if (parsed.state) {
    scores.completion = 100
    total += 100
    count++
  }

  const global = count > 0 ? Math.round(total / count) : 0

  return { global, dimensions: scores }
}

// ─── Helpers pour le rapport ZIP ─────────────────────────────────────────────

const ZIP_DIMENSION_META: Record<string, { label: string; unit: string }> = {
  activity:      { label: 'Activité',      unit: 'actions' },
  reach:         { label: 'Portée',        unit: 'profils' },
  configuration: { label: 'Configuration', unit: ''        },
  completion:    { label: 'Complétion',    unit: ''        },
}

export function buildZipScoresDetail(
  scores: ZipScores
): Record<string, { label: string; unit: string; value: number; score: number }> {
  const detail: Record<string, { label: string; unit: string; value: number; score: number }> = {}
  for (const [key, score] of Object.entries(scores.dimensions)) {
    const meta = ZIP_DIMENSION_META[key] ?? { label: key, unit: '' }
    detail[key] = { label: meta.label, unit: meta.unit, value: score, score }
  }
  return detail
}

export function summarizeZip(globalScore: number): string {
  if (globalScore >= 70) return 'Simulation complète et bien structurée. Les données sont exploitables pour analyse.'
  if (globalScore >= 40) return 'Simulation partiellement complète. Certaines données sont manquantes ou incomplètes.'
  return 'Simulation incomplète. Des fichiers essentiels sont absents — vérifiez l\'export MiroFish.'
}

// ─── Recommandations ZIP ─────────────────────────────────────────────────────

export function generateZipRecommendations(
  scores: ZipScores
): Array<{ content: string; priority: 'high' | 'medium' | 'low' }> {
  const recs: Array<{ content: string; priority: 'high' | 'medium' | 'low' }> = []

  if (!scores.dimensions.activity || scores.dimensions.activity < 50) {
    recs.push({
      content: "Volume d'actions simulées faible. Augmenter le nombre d'agents ou la durée de simulation.",
      priority: 'high',
    })
  }

  if (!scores.dimensions.reach || scores.dimensions.reach < 50) {
    recs.push({
      content: 'Peu de profils simulés détectés. Enrichir la base de profils pour une simulation plus représentative.',
      priority: 'high',
    })
  }

  if (!scores.dimensions.configuration) {
    recs.push({
      content: "Fichier simulation_config.json absent du ZIP. Vérifier l'export MiroFish.",
      priority: 'high',
    })
  }

  if (!scores.dimensions.completion) {
    recs.push({
      content: "Fichier state.json absent. La simulation s'est peut-être interrompue avant la fin.",
      priority: 'medium',
    })
  }

  if (scores.global >= 70) {
    recs.push({
      content: 'Simulation complète et bien structurée. Les données sont exploitables pour analyse.',
      priority: 'low',
    })
  }

  return recs
}
