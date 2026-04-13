import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import api from '@/services/api'

export interface AnalysisEntry {
  id: string
  provider: string
  model: string
  rawText: string
  createdAt: string
}

interface AnalysisListResponse {
  success: boolean
  data: AnalysisEntry[]
}

interface AnalysisRunResponse {
  analysis: string
  provider: string | null
  cached: boolean
}

interface ProviderOption {
  id: string
  name: string
  model: string
  hasKey: boolean
}

interface ProvidersResponse {
  active: string | null
  providers: ProviderOption[]
}

interface Props {
  simulationId: string
  onView: (entry: { analysis: string; provider: string }) => void
  onCompare?: (entries: [AnalysisEntry, AnalysisEntry]) => void
  refreshTrigger?: number
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AnalysisHistory({ simulationId, onView, onCompare, refreshTrigger }: Props) {
  const { t } = useTranslation()
  const [entries, setEntries] = useState<AnalysisEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [relaunching, setRelaunching] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')

  // Chargement providers
  useEffect(() => {
    api
      .get<ProvidersResponse>('/api/settings/providers')
      .then(({ data }) => {
        setProviders(data.providers)
        const defaultId = data.active ?? data.providers[0]?.id ?? ''
        setSelectedProviderId(defaultId)
      })
  }, [])

  const loadHistory = useCallback(() => {
    setLoading(true)
    setSelected([])
    api
      .get<AnalysisListResponse>(`/api/analysis/${simulationId}`)
      .then(({ data }) => setEntries(data.data))
      .catch(() => toast.error(t('analysis.historyLoadError')))
      .finally(() => setLoading(false))
  }, [simulationId, t])

  useEffect(() => { loadHistory() }, [loadHistory, refreshTrigger])

  async function handleRelance(providerId: string) {
    if (!providerId) {
      toast.error(t('analysis.selectProviderFirst'))
      return
    }
    setRelaunching(true)
    try {
      const { data } = await api.post<AnalysisRunResponse>(
        `/api/analysis/${simulationId}?force=true`,
        { providerId }
      )
      onView({ analysis: data.analysis, provider: data.provider ?? '' })
      loadHistory()
      toast.success(t('analysis.newGenerated'))
    } catch (err) {
      const apiErr = err as { response?: { data?: { error?: string } } }
      toast.error(apiErr?.response?.data?.error ?? t('analysis.relaunchError'))
    } finally {
      setRelaunching(false)
    }
  }

  const canLaunch = Boolean(selectedProviderId && providers.find((p) => p.id === selectedProviderId)?.hasKey)

  // Sélecteur partagé pour tous les boutons de relance
  function renderProviderSelect() {
    if (providers.length === 0) return null
    return (
      <select
        value={selectedProviderId}
        onChange={(e) => setSelectedProviderId(e.target.value)}
        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
      >
        {providers.map((p) => (
          <option key={p.id} value={p.id} disabled={!p.hasKey}>
            {p.name}{!p.hasKey ? ` (${t('analysis.keyMissing')})` : ''}
          </option>
        ))}
      </select>
    )
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= 2) return prev
      return [...prev, id]
    })
  }

  function handleCompare() {
    if (!onCompare) return
    const pair = entries.filter((e) => selected.includes(e.id))
    if (pair.length === 2) {
      onCompare([pair[0], pair[1]])
    }
  }

  if (loading) {
    return (
      <div className="card mt-4">
        <p className="text-sm text-slate-400">{t('analysis.historyLoading')}</p>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="card mt-4 space-y-3">
        <h3 className="text-base font-medium text-slate-700">{t('analysis.historyTitle')}</h3>
        <p className="text-sm text-slate-400">{t('analysis.historyEmpty')}</p>
        {providers.length === 0 ? (
          <p className="text-xs text-slate-400">
            {t('analysis.noProvider')}{' '}
            <a href="/settings" className="text-blue-700 hover:underline">{t('nav.settings')}</a>
          </p>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            {renderProviderSelect()}
            <button
              onClick={() => handleRelance(selectedProviderId)}
              disabled={relaunching || !canLaunch}
              className={`btn-accent text-sm ${(relaunching || !canLaunch) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {relaunching ? t('analysis.analyzing') : t('analysis.launchNew')}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card mt-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-medium text-slate-700">{t('analysis.historyTitle')}</h3>
          <span className="badge badge-info">
            {t(entries.length > 1 ? 'analysis.historyCountAnalyses' : 'analysis.historyCountAnalysis', { count: entries.length })}
          </span>
        </div>
        {providers.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {renderProviderSelect()}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {entries.map((entry) => {
          const isSelected = selected.includes(entry.id)
          const isDisabled = !isSelected && selected.length >= 2

          return (
            <div
              key={entry.id}
              className={`flex items-center gap-3 border rounded-lg px-4 py-3 transition-colors ${
                isSelected
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-slate-100'
              }`}
            >
              {onCompare && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggleSelect(entry.id)}
                  className={`w-4 h-4 accent-blue-800 shrink-0 ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  title={isDisabled ? t('analysis.deselectHint') : t('analysis.selectToCompare')}
                />
              )}

              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-700">{entry.provider}</p>
                <p className="text-xs text-slate-400 font-mono truncate">{entry.model}</p>
                <p className="text-xs text-slate-400">{formatDate(entry.createdAt)}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onView({ analysis: entry.rawText, provider: entry.provider })}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  {t('analysis.viewEntry')}
                </button>
                <button
                  onClick={() => handleRelance(selectedProviderId)}
                  disabled={relaunching || !canLaunch}
                  className={`btn-accent text-xs px-3 py-1.5 ${(relaunching || !canLaunch) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {relaunching ? '…' : t('analysis.relaunch')}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {onCompare && selected.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            {selected.length === 2
              ? t('analysis.twoSelected')
              : t('analysis.oneSelected')}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected([])}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              {t('analysis.clearSelection')}
            </button>
            {selected.length === 2 && (
              <button onClick={handleCompare} className="btn-accent text-xs px-3 py-1.5">
                {t('analysis.compareBtn')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
