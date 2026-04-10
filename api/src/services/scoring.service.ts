// ─── Métriques de scoring v2 ─────────────────────────────────────────────────
// Calcul basé sur les données ZIP MiroFish : actions (JSONL) + profiles

export interface V2Metrics {
  agentDiversity: number | null
  convergenceScore: number | null
  temporalStability: number | null
  globalScoreV2: number | null
}

interface ScoringInput {
  actions: unknown[]
  profiles: unknown[]
  v1Global: number
}

// ─── Utilitaires statistiques ─────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function variance(arr: number[]): number {
  const m = mean(arr)
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length
}

function extractNumericValue(obj: Record<string, unknown>): number | null {
  const candidates = ['opinion', 'score', 'value', 'rating', 'sentiment', 'weight', 'decision']
  for (const key of candidates) {
    const v = obj[key]
    if (typeof v === 'number') return v
  }
  return null
}

// ─── Diversité des agents (0–100) ────────────────────────────────────────────
// Ratio profils distincts / total agents — si absent : 50 (neutre)

function computeAgentDiversity(profiles: unknown[]): number | null {
  const flat = (profiles as unknown[][]).flat()
  if (flat.length === 0) return 50

  const total = flat.length
  const distinct = new Set(
    flat.map((p) => {
      if (typeof p === 'object' && p !== null) {
        const obj = p as Record<string, unknown>
        return String(obj.personality ?? obj.type ?? obj.role ?? JSON.stringify(obj))
      }
      return String(p)
    })
  ).size

  return Math.round((distinct / total) * 100)
}

// ─── Convergence (0–100) ──────────────────────────────────────────────────────
// Comparaison variance opinions T0 vs T_final
// ratio = varFinal / varInit : 0 → 100, 1 → 50, 2+ → 0

function computeConvergenceScore(actions: unknown[]): number | null {
  if (actions.length < 4) return null

  const data: { step: number; val: number }[] = []

  for (const a of actions as Record<string, unknown>[]) {
    const step =
      typeof a.step === 'number' ? a.step :
      typeof a.t === 'number' ? a.t : null
    if (step === null) continue
    const val = extractNumericValue(a)
    if (val === null) continue
    data.push({ step, val })
  }

  if (data.length < 4) return null
  data.sort((a, b) => a.step - b.step)

  const n = data.length
  const earlyVals = data.slice(0, Math.floor(n * 0.2)).map((d) => d.val)
  const lateVals = data.slice(Math.floor(n * 0.8)).map((d) => d.val)

  if (earlyVals.length === 0 || lateVals.length === 0) return null

  const earlyVar = variance(earlyVals)
  const lateVar = variance(lateVals)

  if (earlyVar === 0) return lateVar === 0 ? 100 : 50

  const ratio = lateVar / earlyVar
  // (2 - ratio) * 50 : ratio=0→100, ratio=1→50, ratio=2→0
  return Math.round(Math.max(0, Math.min(100, (2 - ratio) * 50)))
}

// ─── Stabilité temporelle (0–100) ─────────────────────────────────────────────
// Variance des moyennes step-by-step — faible variance = haute stabilité

function computeTemporalStability(actions: unknown[]): number | null {
  if (actions.length < 4) return null

  const byStep = new Map<number, number[]>()

  for (const a of actions as Record<string, unknown>[]) {
    const step =
      typeof a.step === 'number' ? a.step :
      typeof a.t === 'number' ? a.t : null
    if (step === null) continue
    const val = extractNumericValue(a)
    if (val === null) continue

    const bucket = byStep.get(step) ?? []
    bucket.push(val)
    byStep.set(step, bucket)
  }

  if (byStep.size < 3) return null

  const stepMeans = Array.from(byStep.values()).map(mean)
  const v = variance(stepMeans)

  // Normalisation : variance max significative = 2500 (écart-type 50 sur échelle 0–100)
  const normalizedVariance = Math.min(1, v / 2500)
  return Math.round((1 - normalizedVariance) * 100)
}

// ─── Score composite v2 ───────────────────────────────────────────────────────
// convergence × 0.35 + stability × 0.30 + diversity × 0.20 + v1 × 0.15
// Si toutes les métriques v2 sont null → null
// Si certaines seulement : redistribution proportionnelle des poids

function computeGlobalScoreV2(
  diversity: number | null,
  convergence: number | null,
  stability: number | null,
  v1Global: number
): number | null {
  if (diversity === null && convergence === null && stability === null) return null

  const parts: Array<{ weight: number; value: number }> = []
  if (convergence !== null) parts.push({ weight: 0.35, value: convergence })
  if (stability !== null) parts.push({ weight: 0.30, value: stability })
  if (diversity !== null) parts.push({ weight: 0.20, value: diversity })
  parts.push({ weight: 0.15, value: v1Global })

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
  const weightedSum = parts.reduce((s, p) => s + p.weight * p.value, 0)

  return Math.round(weightedSum / totalWeight)
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function computeAdvancedMetrics(input: ScoringInput): V2Metrics {
  const agentDiversity = computeAgentDiversity(input.profiles)
  const convergenceScore = computeConvergenceScore(input.actions)
  const temporalStability = computeTemporalStability(input.actions)
  const globalScoreV2 = computeGlobalScoreV2(
    agentDiversity,
    convergenceScore,
    temporalStability,
    input.v1Global
  )

  return { agentDiversity, convergenceScore, temporalStability, globalScoreV2 }
}
