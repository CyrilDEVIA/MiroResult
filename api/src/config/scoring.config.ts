export interface DimensionConfig {
  label: string
  unit: string
  higherIsBetter: boolean
  maxGood?: number   // utilisé si higherIsBetter = true
  maxBad?: number    // utilisé si higherIsBetter = false
}

export const SCORING_CONFIG: Record<string, DimensionConfig> = {
  biomass: {
    label: 'Biomasse',
    unit: 'kg',
    higherIsBetter: true,
    maxGood: 10000,
  },
  mortality: {
    label: 'Mortalité',
    unit: '%',
    higherIsBetter: false,
    maxBad: 10,
  },
  growth: {
    label: 'Croissance',
    unit: 'g/jour',
    higherIsBetter: true,
    maxGood: 5,
  },
  feedConversion: {
    label: 'Indice de conversion',
    unit: 'FCR',
    higherIsBetter: false,
    maxBad: 2,
  },
}

export function scoreForDimension(dimension: string, value: number): number {
  const config = SCORING_CONFIG[dimension]
  if (!config) return 0

  let score: number

  if (config.higherIsBetter && config.maxGood) {
    score = (value / config.maxGood) * 100
  } else if (!config.higherIsBetter && config.maxBad) {
    score = ((config.maxBad - value) / config.maxBad) * 100
  } else {
    return 0
  }

  return Math.round(Math.max(0, Math.min(100, score)))
}

export function summarize(globalScore: number): string {
  if (globalScore >= 80) {
    return 'Excellente performance — les indicateurs sont dans la norme supérieure.'
  }
  if (globalScore >= 60) {
    return 'Bonne performance — quelques axes d\'amélioration ont été identifiés.'
  }
  if (globalScore >= 40) {
    return 'Performance moyenne — plusieurs indicateurs nécessitent une attention particulière.'
  }
  return 'Performance insuffisante — des actions correctives sont recommandées en priorité.'
}
