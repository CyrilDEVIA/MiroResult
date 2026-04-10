import { prisma } from '../db/prisma'
import { AppError } from '../types'
import { scoreForDimension, summarize, SCORING_CONFIG } from '../config/scoring.config'
import type { MiroFishData } from './simulation.service'
import { generateRecommendations } from './recommendation.service'
import type { V2Metrics } from './scoring.service'

export interface ScoreDetailItem {
  label: string
  unit: string
  value: number
  score: number
}

interface ScoresDetail {
  [dimension: string]: ScoreDetailItem
}

export async function generateReport(simulationId: string, userId: string) {
  const simulation = await prisma.simulation.findFirst({
    where: { id: simulationId, userId },
    include: { report: true },
  })

  if (!simulation) {
    throw new AppError('Simulation introuvable', 404)
  }

  if (simulation.status !== 'processed') {
    throw new AppError('La simulation doit être traitée avant de générer un rapport', 400)
  }

  if (simulation.report) {
    return simulation.report
  }

  const miroData = JSON.parse(simulation.rawData) as MiroFishData
  const metrics = miroData.metrics

  const scoresDetail: ScoresDetail = {}
  let totalScore = 0
  const dimensionCount = Object.keys(SCORING_CONFIG).length

  for (const [key, config] of Object.entries(SCORING_CONFIG)) {
    const value = metrics[key as keyof typeof metrics] ?? 0
    const score = scoreForDimension(key, value)
    scoresDetail[key] = { label: config.label, unit: config.unit, value, score }
    totalScore += score
  }

  const scoreGlobal = Math.round(totalScore / dimensionCount)
  const summary = summarize(scoreGlobal)

  const report = await prisma.report.create({
    data: {
      simulationId,
      scoreGlobal,
      scoresDetail: JSON.stringify(scoresDetail),
      summary,
    },
  })

  await generateRecommendations(report.id, scoresDetail, scoreGlobal)

  return report
}

export async function getReport(id: string, userId: string) {
  const report = await prisma.report.findFirst({
    where: { id },
    include: {
      simulation: { select: { userId: true, filename: true } },
      recommendations: { orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }] },
    },
  })

  if (!report || report.simulation.userId !== userId) {
    throw new AppError('Rapport introuvable', 404)
  }

  return {
    ...report,
    scoresDetail: JSON.parse(report.scoresDetail ?? '{}') as ScoresDetail,
    scoresV2: report.scoresV2 ? (JSON.parse(report.scoresV2) as V2Metrics) : null,
  }
}
