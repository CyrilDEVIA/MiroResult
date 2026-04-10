import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Swal from 'sweetalert2'
import { ScoreGlobal } from '@/components/ui/ScoreGlobal'
import { ScoreDetail, ScoreDetailItem } from '@/components/ui/ScoreDetail'
import { SummaryCard } from '@/components/ui/SummaryCard'
import { AIAnalysis } from '@/components/ui/AIAnalysis'
import { AnalysisHistory } from '@/components/ui/AnalysisHistory'
import type { AnalysisEntry } from '@/components/ui/AnalysisHistory'
import { AnalysisCompare } from '@/components/ui/AnalysisCompare'
import { AdvancedMetrics, V2Metrics } from '@/components/ui/AdvancedMetrics'
import api from '@/services/api'

interface Recommendation {
  id: string
  content: string
  priority: 'high' | 'medium' | 'low'
}

interface ReportData {
  id: string
  scoreGlobal: number
  scoresDetail: Record<string, ScoreDetailItem>
  scoresV2: V2Metrics | null
  summary: string
  createdAt: string
  simulation: { filename: string }
  recommendations: Recommendation[]
}

const PRIORITY_BADGE: Record<Recommendation['priority'], string> = {
  high: 'badge badge-danger',
  medium: 'badge badge-warning',
  low: 'badge badge-info',
}

const PRIORITY_LABEL: Record<Recommendation['priority'], string> = {
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Faible',
}

export default function ReportPage() {
  const { id: simulationId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [preloadedAnalysis, setPreloadedAnalysis] = useState<{ analysis: string; provider: string } | null>(null)
  const [compareEntries, setCompareEntries] = useState<[AnalysisEntry, AnalysisEntry] | null>(null)
  const [analysisRefreshTrigger, setAnalysisRefreshTrigger] = useState(0)

  useEffect(() => {
    if (!simulationId) return

    async function loadReport() {
      try {
        // 1. Récupérer la simulation pour vérifier si un rapport existe déjà
        const { data: simPayload } = await api.get<{
          success: boolean
          data: { id: string; status: string; report: { id: string } | null }
        }>(`/api/simulations/${simulationId}`)

        const sim = simPayload.data

        if (sim.report) {
          // 2a. Rapport existant → GET direct
          const { data: reportPayload } = await api.get<{ success: boolean; data: ReportData }>(
            `/api/reports/${sim.report.id}`
          )
          setReport(reportPayload.data)
        } else if (sim.status === 'processed') {
          // 2b. Simulation traitée sans rapport → générer
          const { data: reportPayload } = await api.post<{ success: boolean; data: ReportData }>(
            '/api/reports',
            { simulationId }
          )
          setReport(reportPayload.data)
        } else {
          setError('La simulation n\'est pas encore traitée.')
        }
      } catch {
        setError('Impossible de charger le rapport — vérifiez que la simulation est valide.')
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [simulationId])

  async function handleDelete() {
    const result = await Swal.fire({
      title: 'Supprimer cette simulation ?',
      text: 'Cette action est irréversible. Le rapport et l\'analyse IA associés seront supprimés.',
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Annuler',
      confirmButtonText: 'Supprimer',
      confirmButtonColor: '#dc2626',
      focusCancel: true,
    })

    if (!result.isConfirmed) return

    try {
      await api.delete(`/api/simulations/${simulationId}`)
      toast.success('Simulation supprimée')
      navigate('/simulations')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  if (loading) {
    return (
      <div>
        <p className="text-sm text-slate-500">Chargement du rapport...</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div>
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error || 'Rapport introuvable'}
        </p>
        <Link to="/simulations" className="text-sm text-blue-700 hover:underline">
          ← Retour aux simulations
        </Link>
      </div>
    )
  }

  const orderedPriorities: Recommendation['priority'][] = ['high', 'medium', 'low']
  const sortedRecommendations = [...report.recommendations].sort(
    (a, b) => orderedPriorities.indexOf(a.priority) - orderedPriorities.indexOf(b.priority)
  )

  function handleExportJson() {
    api
      .get(`/api/reports/${report!.id}/export/json`, { responseType: 'blob' })
      .then(({ data }) => {
        const url = URL.createObjectURL(data as Blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `rapport-${report!.simulation.filename}`
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <Link to="/simulations" className="text-sm text-slate-400 hover:text-slate-600">
            ← Simulations
          </Link>
          <h1 className="mt-1">Rapport de simulation</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            {report.simulation.filename} — {new Date(report.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportJson} className="btn-secondary">
            Exporter JSON
          </button>
          <button onClick={() => window.print()} className="btn-secondary">
            Imprimer PDF
          </button>
          <button onClick={handleDelete} className="btn-secondary text-red-600 border-red-200 hover:border-red-400">
            Supprimer
          </button>
        </div>
      </div>

      {/* Contenu rapport */}
      <div className="grid grid-cols-1 gap-4">
        <ScoreGlobal score={report.scoreGlobal} />
        <SummaryCard summary={report.summary} />
        <AdvancedMetrics metrics={report.scoresV2} />

        {/* Analyse narrative IA / Comparaison */}
        {compareEntries ? (
          <AnalysisCompare
            entries={compareEntries}
            onClose={() => setCompareEntries(null)}
          />
        ) : (
          <AIAnalysis
            simulationId={simulationId!}
            simulationName={report.simulation.filename}
            preloaded={preloadedAnalysis}
            onAnalyzed={() => setAnalysisRefreshTrigger((t) => t + 1)}
          />
        )}
        <AnalysisHistory
          simulationId={simulationId!}
          refreshTrigger={analysisRefreshTrigger}
          onView={(entry) => {
            setCompareEntries(null)
            setPreloadedAnalysis(entry)
          }}
          onCompare={setCompareEntries}
        />

        {/* Métriques techniques */}
        <div className="space-y-2">
          <div>
            <h2 className="text-slate-900">Métriques techniques</h2>
            <p className="text-xs text-slate-500 mt-0.5">Indicateurs de qualité des données de simulation</p>
          </div>
          <ScoreDetail scores={report.scoresDetail} />
        </div>

        {sortedRecommendations.length > 0 && (
          <div className="card">
            <h3 className="mb-5">Recommandations</h3>
            <div className="space-y-4">
              {sortedRecommendations.map((rec) => (
                <div key={rec.id} className="flex gap-3 items-start">
                  <span className={`${PRIORITY_BADGE[rec.priority]} shrink-0 mt-0.5`}>
                    {PRIORITY_LABEL[rec.priority]}
                  </span>
                  <p className="text-sm text-slate-700 leading-relaxed">{rec.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
