import { prisma } from '../db/prisma'
import type { ScoreDetailItem } from './report.service'

interface RecommendationInput {
  content: string
  priority: 'high' | 'medium' | 'low'
}

const DIMENSION_RECS: Record<string, Record<'high' | 'medium', string>> = {
  biomass: {
    high: 'Biomasse critique — revoir la densité de peuplement, la durée du cycle et les conditions d\'élevage.',
    medium: 'Biomasse en deçà des objectifs — optimiser l\'alimentation et le suivi de croissance.',
  },
  mortality: {
    high: 'Taux de mortalité critique — identifier les causes (maladie, stress, qualité eau) et intervenir immédiatement.',
    medium: 'Taux de mortalité élevé — renforcer la surveillance sanitaire et améliorer les conditions d\'élevage.',
  },
  growth: {
    high: 'Croissance insuffisante — revoir le régime alimentaire, la qualité de l\'eau et les paramètres thermiques.',
    medium: 'Croissance en deçà des objectifs — optimiser la ration journalière et la fréquence d\'alimentation.',
  },
  feedConversion: {
    high: 'Indice de conversion critique — revoir la qualité de l\'aliment, réduire les pertes et ajuster les rations.',
    medium: 'Indice de conversion élevé — optimiser les quantités distribuées et la fréquence d\'alimentation.',
  },
}

function buildRecommendations(
  scores: Record<string, ScoreDetailItem>,
  globalScore: number
): RecommendationInput[] {
  const recs: RecommendationInput[] = []

  if (globalScore < 40) {
    recs.push({
      content: 'Plan d\'action correctif urgent recommandé — consulter un spécialiste en aquaculture.',
      priority: 'high',
    })
  } else if (globalScore < 60) {
    recs.push({
      content: 'Révision globale du protocole d\'élevage recommandée pour améliorer les performances.',
      priority: 'medium',
    })
  }

  for (const [key, dim] of Object.entries(scores)) {
    const dimRecs = DIMENSION_RECS[key]
    if (!dimRecs) continue

    if (dim.score < 40) {
      recs.push({ content: dimRecs.high, priority: 'high' })
    } else if (dim.score < 60) {
      recs.push({ content: dimRecs.medium, priority: 'medium' })
    }
  }

  return recs
}

export async function generateRecommendations(
  reportId: string,
  scores: Record<string, ScoreDetailItem>,
  globalScore: number
) {
  const inputs = buildRecommendations(scores, globalScore)

  if (inputs.length === 0) return []

  await prisma.recommendation.createMany({
    data: inputs.map((r) => ({ ...r, reportId })),
  })

  return prisma.recommendation.findMany({ where: { reportId } })
}

export async function listRecommendations(reportId: string) {
  return prisma.recommendation.findMany({
    where: { reportId },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  })
}
