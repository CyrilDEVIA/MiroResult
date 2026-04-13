export function scoreColor(score: number): string {
  if (score >= 70) return 'text-green-700'
  if (score >= 40) return 'text-yellow-700'
  return 'text-red-700'
}

export function scoreBadge(score: number): string {
  if (score >= 70) return 'badge badge-success'
  if (score >= 40) return 'badge badge-warning'
  return 'badge badge-danger'
}

export function progressColor(score: number): string {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-400'
  return 'bg-red-500'
}

export function scoreLabel(score: number, t?: (key: string) => string): string {
  if (t) {
    if (score >= 70) return t('score.good')
    if (score >= 40) return t('score.average')
    return t('score.insufficient')
  }
  if (score >= 70) return 'Bon'
  if (score >= 40) return 'Moyen'
  return 'Insuffisant'
}

// Couleurs hex sémantiques pour recharts (fills)
export function semanticFill(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#eab308'
  return '#ef4444'
}

// Classe Tailwind de fond sémantique
export function semanticBg(score: number): string {
  if (score >= 70) return 'bg-green-50 border border-green-100'
  if (score >= 40) return 'bg-yellow-50 border border-yellow-100'
  return 'bg-red-50 border border-red-100'
}
