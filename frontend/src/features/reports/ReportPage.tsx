import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import Swal from 'sweetalert2'
import { ScoreGlobal } from '@/components/ui/ScoreGlobal'
import api from '@/services/api'

interface Recommendation {
  id: string
  content: string
  priority: 'high' | 'medium' | 'low'
}

interface ReportData {
  id: string
  scoreGlobal: number
  createdAt: string
  simulation: { filename: string }
  recommendations: Recommendation[]
}

interface Provider {
  id: string
  name: string
  model: string
  hasKey: boolean
}

interface LocationState {
  html?: string
  filename?: string
  showHtml?: boolean
}

const PRIORITY_BADGE: Record<Recommendation['priority'], string> = {
  high: 'badge badge-danger',
  medium: 'badge badge-warning',
  low: 'badge badge-info',
}

export default function ReportPage() {
  const { t } = useTranslation()
  const { id: simulationId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const htmlSectionRef = useRef<HTMLDivElement>(null)

  const locationState = location.state as LocationState | null

  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // État bloc HTML interactif
  const [htmlContent, setHtmlContent] = useState<string | null>(locationState?.html ?? null)
  const [htmlInstruction, setHtmlInstruction] = useState('')
  const [htmlProviders, setHtmlProviders] = useState<Provider[]>([])
  const [htmlSelectedProviderId, setHtmlSelectedProviderId] = useState('')
  const [htmlStatus, setHtmlStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [htmlLoading, setHtmlLoading] = useState(!locationState?.html)

  useEffect(() => {
    if (!simulationId) return

    async function loadReport() {
      try {
        const { data: simPayload } = await api.get<{
          success: boolean
          data: { id: string; status: string; report: { id: string } | null }
        }>(`/api/simulations/${simulationId}`)

        const sim = simPayload.data

        if (sim.report) {
          const { data: reportPayload } = await api.get<{ success: boolean; data: ReportData }>(
            `/api/reports/${sim.report.id}`
          )
          setReport(reportPayload.data)
        } else if (sim.status === 'processed') {
          const { data: reportPayload } = await api.post<{ success: boolean; data: ReportData }>(
            '/api/reports',
            { simulationId }
          )
          setReport(reportPayload.data)
        } else {
          setError(t('report.notProcessed'))
        }
      } catch {
        setError(t('report.loadError'))
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [simulationId, t])

  // Scroll automatique vers le bloc HTML si showHtml
  useEffect(() => {
    if (locationState?.showHtml && htmlSectionRef.current) {
      setTimeout(() => {
        htmlSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 400)
    }
  }, [locationState])

  // Rechargement HTML persisté si absent du router state (ex: refresh de page)
  useEffect(() => {
    if (locationState?.html) {
      setHtmlLoading(false)
      return
    }
    if (!simulationId) {
      setHtmlLoading(false)
      return
    }
    api.get<{ success: boolean; html: string | null }>(`/api/html-report/${simulationId}`)
      .then(({ data }) => {
        if (data.html) setHtmlContent(data.html)
      })
      .catch((err) => toast.error(err?.message ?? t('common.error')))
      .finally(() => setHtmlLoading(false))
  }, [simulationId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Chargement providers pour le chat HTML
  useEffect(() => {
    api.get<{ active: string | null; providers: Provider[] }>('/api/settings/providers')
      .then(({ data }) => {
        setHtmlProviders(data.providers)
        if (data.active) {
          setHtmlSelectedProviderId(data.active)
        } else if (data.providers.length > 0) {
          setHtmlSelectedProviderId(data.providers[0].id)
        }
      })
      .catch((err) => toast.error(err?.message ?? t('common.error')))
  }, [])

  async function handleDelete() {
    const result = await Swal.fire({
      title: t('simulations.deleteConfirmTitle'),
      text: t('simulations.deleteConfirmText'),
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: t('simulations.deleteCancel'),
      confirmButtonText: t('simulations.deleteConfirm'),
      confirmButtonColor: '#dc2626',
      focusCancel: true,
    })

    if (!result.isConfirmed) return

    try {
      await api.delete(`/api/simulations/${simulationId}`)
      toast.success(t('simulations.deleteSuccess'))
      navigate('/simulations')
    } catch {
      toast.error(t('simulations.deleteError'))
    }
  }

  async function handleApplyInstruction() {
    if (!htmlContent || !htmlInstruction.trim() || !htmlSelectedProviderId || !simulationId) return
    setHtmlStatus('loading')
    try {
      const { data } = await api.post<{ success: boolean; html: string }>(
        `/api/html-report/${simulationId}/edit`,
        { html: htmlContent, instruction: htmlInstruction.trim(), providerId: htmlSelectedProviderId }
      )
      setHtmlContent(data.html)
      setHtmlInstruction('')
      setHtmlStatus('idle')
    } catch {
      setHtmlStatus('error')
    }
  }

  function downloadHtml(html: string) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = (report?.simulation.filename ?? 'rapport').replace(/\.[^.]+$/, '') + '.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div>
        <p className="text-sm text-slate-500">{t('report.loading')}</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div>
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          {error || t('report.notFound')}
        </p>
        <Link to="/simulations" className="text-sm text-blue-700 hover:underline">
          {t('report.backLink')}
        </Link>
      </div>
    )
  }

  const orderedPriorities: Recommendation['priority'][] = ['high', 'medium', 'low']
  const sortedRecommendations = [...report.recommendations].sort(
    (a, b) => orderedPriorities.indexOf(a.priority) - orderedPriorities.indexOf(b.priority)
  )

  return (
    <div className="w-full max-w-none px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div>
          <Link to="/simulations" className="text-sm text-slate-400 hover:text-slate-600">
            {t('report.backToSimulations')}
          </Link>
          <h1 className="mt-1">{t('report.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            {report.simulation.filename} — {new Date(report.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary">
            {t('common.print')}
          </button>
          {htmlContent && (
            <button
              type="button"
              onClick={() => downloadHtml(htmlContent)}
              className="btn-secondary inline-flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t('report.htmlDownload')}
            </button>
          )}
          <button onClick={handleDelete} className="btn-secondary text-red-600 border-red-200 hover:border-red-400">
            {t('common.delete')}
          </button>
        </div>
      </div>

      {/* Contenu rapport — layout deux colonnes */}
      <div className="flex gap-4 items-start w-full">

        {/* Colonne gauche */}
        <div className="w-1/3 space-y-4">
          <ScoreGlobal score={report.scoreGlobal} />

          {sortedRecommendations.length > 0 && (
            <div className="card">
              <h3 className="mb-5">{t('report.recommendations')}</h3>
              <div className="space-y-4">
                {sortedRecommendations.map((rec) => (
                  <div key={rec.id} className="flex gap-3 items-start">
                    <span className={`${PRIORITY_BADGE[rec.priority]} shrink-0 mt-0.5`}>
                      {t(`priority.${rec.priority}`)}
                    </span>
                    <p className="text-sm text-slate-700 leading-relaxed">{rec.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        {/* Card modification */}
          {htmlContent && (
            <div className="card space-y-4">
              <h3 className="text-sm font-medium text-slate-700 mb-0">{t('report.modifyReport')}</h3>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">{t('report.providerLabel')}</p>
                {htmlProviders.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {t('simulations.noProvider')}{' '}
                    <Link to="/settings" className="text-blue-700 hover:underline">{t('simulations.noProviderLink')}</Link>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {htmlProviders.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setHtmlSelectedProviderId(p.id)}
                        className={[
                          'px-3 py-1.5 rounded-lg text-sm transition-colors border',
                          htmlSelectedProviderId === p.id
                            ? 'bg-slate-900 text-white border-slate-900 font-medium'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
                        ].join(' ')}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-2">
                  {t('report.instructionLabel')}
                </label>
                <textarea
                  value={htmlInstruction}
                  onChange={(e) => setHtmlInstruction(e.target.value)}
                  placeholder={t('report.instructionPlaceholder')}
                  rows={3}
                  maxLength={2000}
                  className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-blue-300 placeholder:text-slate-400"
                />
                {htmlInstruction.length > 0 && (
                  <p className="text-xs text-slate-400 text-right mt-1">{htmlInstruction.length}/2000</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                {htmlStatus === 'error' && (
                  <p className="text-xs text-red-600">{t('report.applyError')}</p>
                )}
                <button
                  type="button"
                  onClick={handleApplyInstruction}
                  disabled={!htmlInstruction.trim() || !htmlSelectedProviderId || htmlStatus === 'loading'}
                  className="btn-accent disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 ml-auto"
                >
                  {htmlStatus === 'loading' && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="animate-spin"
                      aria-hidden="true"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                  {htmlStatus === 'loading' ? t('report.applying') : t('report.applyBtn')}
                </button>
              </div>
            </div>
          )}
        </div>
        

        {/* Colonne droite — sticky */}
        <div ref={htmlSectionRef} className="w-2/3 shrink-0 sticky top-4 space-y-3 print:hidden">
          <div>
            <h2 className="text-slate-900">{t('report.htmlReport')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('report.htmlReportSubtitle')}</p>
          </div>

          

          {/* Card iframe */}
          <div className="card p-0 overflow-hidden">
            {htmlLoading ? (
              <div className="px-5 py-10 flex items-center justify-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-spin text-slate-400"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span className="text-sm text-slate-400">{t('report.htmlLoading')}</span>
              </div>
            ) : htmlContent ? (
              <>
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="badge badge-info">HTML</span>
                </div>
                <iframe
                  srcDoc={htmlContent}
                  title={t('report.htmlReport')}
                  className="w-full border-0 block"
                  style={{ height: 'calc(100vh - 180px)' }}
                  sandbox="allow-scripts"
                />
              </>
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-slate-400 italic">{t('report.htmlNone')}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
