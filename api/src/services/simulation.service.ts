import { readFile } from 'fs/promises'
import path from 'path'
import AdmZip from 'adm-zip'
import { z } from 'zod'
import { prisma } from '../db/prisma'
import { AppError } from '../types'

const DEV = process.env.NODE_ENV !== 'production'

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
    } catch (err) {
      if (DEV) console.warn('[simulation] fichier ignoré :', name, (err as Error).message)
    }
  }

  return result
}

// ─── Scoring adaptatif ZIP ───────────────────────────────────────────────────

// Une configuration valide est un objet non vide. Un objet vide, un tableau,
// une valeur scalaire ou une absence ne comptent pas comme configuration.
function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length > 0
  )
}

// La complétion ne s'appuie plus sur la présence de state.json mais sur un
// statut d'exécution explicitement « completed » (comparaison insensible à la casse).
function isCompletedRunState(runState: unknown): boolean {
  if (typeof runState !== 'object' || runState === null || Array.isArray(runState)) return false
  const status = (runState as Record<string, unknown>).runner_status
  return typeof status === 'string' && status.toLowerCase() === 'completed'
}

export function computeScore(parsed: ParsedZip): ZipScores {
  // Les quatre dimensions participent toujours au calcul : une donnée absente
  // ou vide reçoit 0 au lieu d'être exclue du dénominateur.
  const flatProfiles = (parsed.profiles as unknown[]).flat()

  const activity =
    parsed.actions.length > 0
      ? Math.min(100, Math.round((parsed.actions.length / 50) * 100))
      : 0

  const reach =
    flatProfiles.length > 0
      ? Math.min(100, Math.round((flatProfiles.length / 20) * 100))
      : 0

  const configuration = isNonEmptyObject(parsed.simulation_config) ? 100 : 0

  const completion = isCompletedRunState(parsed.run_state) ? 100 : 0

  const scores: Record<string, number> = { activity, reach, configuration, completion }
  const global = Math.round((activity + reach + configuration + completion) / 4)

  return { global, dimensions: scores }
}

// Conditions nécessaires pour considérer une simulation comme complète :
// configuration valide, exécution explicitement terminée, actions et profils présents.
function hasRequiredEvidence(scores: ZipScores): boolean {
  const { activity = 0, reach = 0, configuration = 0, completion = 0 } = scores.dimensions
  return configuration > 0 && completion > 0 && activity > 0 && reach > 0
}

function isCompleteSimulation(scores: ZipScores): boolean {
  return hasRequiredEvidence(scores) && scores.global >= 70
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

export function summarizeZip(scores: ZipScores): string {
  const { activity = 0, reach = 0, configuration = 0, completion = 0 } = scores.dimensions

  const hasConfiguration = configuration > 0
  const hasCompletion = completion > 0
  const hasActions = activity > 0
  const hasProfiles = reach > 0

  // « Complète » n'est autorisé que sur preuves réunies ET seuil global atteint.
  if (hasConfiguration && hasCompletion && hasActions && hasProfiles) {
    if (scores.global >= 70) {
      return 'Simulation complète et bien structurée. Les données sont exploitables pour analyse.'
    }
    return 'Simulation partiellement complète. Certaines données sont manquantes ou incomplètes.'
  }

  // Toute preuve essentielle absente : archive vide ou incomplète.
  return "Simulation incomplète. Des fichiers essentiels ou des preuves d'exécution sont absents — vérifiez l'export MiroFish."
}

// ─── Recommandations ZIP ─────────────────────────────────────────────────────

export function generateZipRecommendations(
  scores: ZipScores
): Array<{ content: string; priority: 'high' | 'medium' | 'low' }> {
  const recs: Array<{ content: string; priority: 'high' | 'medium' | 'low' }> = []
  const { activity = 0, reach = 0, configuration = 0, completion = 0 } = scores.dimensions

  // Aucune action → preuve d'exécution manquante (et non un volume à augmenter).
  if (activity === 0) {
    recs.push({
      content:
        "Aucune action détectée. L'archive est incomplète ou les preuves d'exécution sont absentes — vérifiez l'export MiroFish.",
      priority: 'high',
    })
  } else if (activity < 50) {
    recs.push({
      content: "Volume d'actions simulées faible. Augmenter le nombre d'agents ou la durée de simulation.",
      priority: 'high',
    })
  }

  // Aucun profil → données de profils absentes (et non une base à enrichir).
  if (reach === 0) {
    recs.push({
      content:
        "Aucun profil détecté. Les données de profils sont absentes de l'archive — vérifiez l'export MiroFish.",
      priority: 'high',
    })
  } else if (reach < 50) {
    recs.push({
      content: 'Peu de profils simulés détectés. Enrichir la base de profils pour une simulation plus représentative.',
      priority: 'high',
    })
  }

  if (configuration === 0) {
    recs.push({
      content:
        "Configuration absente ou vide (simulation_config.json manquant, non valide ou vide). Vérifier l'export MiroFish.",
      priority: 'high',
    })
  }

  if (completion === 0) {
    recs.push({
      content:
        "run_state.json absent, invalide ou sans statut « completed ». Aucune preuve que la simulation s'est terminée.",
      priority: 'medium',
    })
  }

  // Recommandation positive réservée aux simulations réellement complètes.
  if (isCompleteSimulation(scores)) {
    recs.push({
      content: 'Simulation complète et bien structurée. Les données sont exploitables pour analyse.',
      priority: 'low',
    })
  }

  return recs
}
