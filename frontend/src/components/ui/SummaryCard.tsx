interface SummaryCardProps {
  summary: string
}

export function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <div className="card">
      <h3 className="mb-3">Synthèse</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{summary}</p>
    </div>
  )
}
