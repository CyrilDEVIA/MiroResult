import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import DOMPurify from 'dompurify'
import api from '@/services/api'
import { VerdictCard } from '@/components/ui/ScoreGlobal'
import { FavorablesSection, BlockagesSection } from '@/components/ui/ScoreDetail'
import { CompositionCharts } from '@/components/ui/AdvancedMetrics'
import type { VerdictData } from '@/components/ui/ScoreGlobal'
import type { FavorableItem, BlockageItem } from '@/components/ui/ScoreDetail'
import type { CompositionData } from '@/components/ui/AdvancedMetrics'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface HistoryEntry {
  id: string
  simulationId: string
  provider: string
  model: string
  rawText: string
  createdAt: string
}

interface HistoryResponse {
  success: boolean
  data: HistoryEntry[]
}

interface AnalysisResponse {
  analysis: string
  provider: string | null
  cached: boolean
}

export interface Props {
  simulationId: string
  simulationName?: string
  preloaded?: { analysis: string; provider: string } | null
  onAnalyzed?: () => void
}

// ─── Statuts ──────────────────────────────────────────────────────────────────

type Status = 'loading-existing' | 'idle' | 'loaded' | 'loading' | 'error'

// ─── Type JSON structuré retourné par le LLM (nouveau schéma décisionnel) ─────

interface AnalysisJson {
  verdict: VerdictData
  favorables: FavorableItem[]
  blocages: BlockageItem[]
  composition: CompositionData
  conditions_succes: string[]
  narrative: {
    synthese: string
    dynamiques: string
  }
}

const analysisJsonSchema = z.object({
  verdict: z.object({
    decision: z.enum(['lancer', 'pivoter', 'abandonner']),
    score_viabilite: z.number().int().min(0).max(100),
    resume: z.string(),
  }),
  favorables: z.array(z.object({
    titre: z.string(),
    detail: z.string(),
    force: z.number().int().min(0).max(100),
  })),
  blocages: z.array(z.object({
    titre: z.string(),
    detail: z.string(),
    severite: z.number().int().min(0).max(100),
  })),
  composition: z.object({
    hommes_pct: z.number().int().min(0).max(100),
    femmes_pct: z.number().int().min(0).max(100),
    tranches_age: z.array(z.object({ label: z.string(), pct: z.number() })),
    profils: z.array(z.object({ label: z.string(), pct: z.number() })),
    territoire: z.string(),
  }),
  conditions_succes: z.array(z.string()),
  narrative: z.object({
    synthese: z.string(),
    dynamiques: z.string(),
  }),
})

function parseAnalysisJson(text: string): AnalysisJson | null {
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  try {
    const result = analysisJsonSchema.safeParse(JSON.parse(cleaned))
    if (!result.success) return null
    return result.data as AnalysisJson
  } catch {
    return null
  }
}

// ─── Rendu structuré depuis JSON (nouveau schéma décisionnel) ─────────────────

function StructuredAnalysis({ data: aData }: { data: AnalysisJson }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <VerdictCard verdict={aData.verdict} />

      <div className="space-y-3">
        <FavorablesSection items={aData.favorables} />
        <BlockagesSection items={aData.blocages} />
      </div>

      <CompositionCharts composition={aData.composition} />

      {aData.conditions_succes.length > 0 && (
        <div className="card space-y-3">
          <h3>{t('analysis.successConditions')}</h3>
          <ul className="space-y-2">
            {aData.conditions_succes.map((cond, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="text-emerald-500 font-bold mt-0.5 shrink-0">✓</span>
                {cond}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card space-y-3">
        <h3>{t('analysis.narrativeTitle')}</h3>
        {aData.narrative.synthese && (
          <div className="ai-analysis-section print:break-inside-avoid border-l-4 border-blue-500 bg-blue-50 rounded-r-xl p-5">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-blue-700 flex items-center gap-1.5 mb-3">
              <span aria-hidden="true">📊</span> {t('analysis.synthese')}
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aData.narrative.synthese) }} />
          </div>
        )}
        {aData.narrative.dynamiques && (
          <div className="ai-analysis-section print:break-inside-avoid border-l-4 border-violet-500 bg-violet-50 rounded-r-xl p-5">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-violet-700 flex items-center gap-1.5 mb-3">
              <span aria-hidden="true">🔄</span> {t('analysis.dynamiques')}
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aData.narrative.dynamiques) }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Rendu markdown legacy ────────────────────────────────────────────────────

interface Section {
  title: string
  content: string
}

interface Scenarios {
  optimiste: string
  neutre: string
  pessimiste: string
}

type SectionKind = 'positive' | 'negative' | 'neutral' | 'scenarios' | 'recommendations'
type Priority = 'urgent' | 'important' | 'normal'

function classifySection(title: string): SectionKind {
  const t = title.toLowerCase()
  if (t.includes('trajectoire')) return 'scenarios'
  if (t.includes('recommandation')) return 'recommendations'
  if (['point fort', 'atout', 'opportunité', 'synthèse'].some((k) => t.includes(k))) return 'positive'
  if (['risque', 'faiblesse', 'alerte', 'bascule'].some((k) => t.includes(k))) return 'negative'
  return 'neutral'
}

const SECTION_ICONS: Record<SectionKind, string> = {
  positive: '✅',
  negative: '⚠️',
  neutral: '📊',
  scenarios: '📈',
  recommendations: '✅',
}

function sectionClass(kind: SectionKind): string {
  const base = 'ai-analysis-section print:break-inside-avoid rounded-r-xl p-5'
  if (kind === 'positive' || kind === 'recommendations') {
    return `border-l-4 border-emerald-500 bg-emerald-50 ${base}`
  }
  if (kind === 'negative') return `border-l-4 border-red-500 bg-red-50 ${base}`
  if (kind === 'scenarios') return `border-l-4 border-blue-500 bg-blue-50 ${base}`
  return `border-l-4 border-slate-300 bg-slate-50 ${base}`
}

function getPriority(line: string): Priority {
  const t = line.toLowerCase()
  if (t.includes('urgent') || t.includes('priorité haute')) return 'urgent'
  if (t.includes('important') || t.includes('priorité moyenne')) return 'important'
  return 'normal'
}

function parseSections(text: string): Section[] {
  const sections: Section[] = []
  const lines = text.split('\n')
  let current: Section | null = null

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current)
      current = { title: line.replace(/^## /, ''), content: '' }
    } else if (current) {
      current.content += line + '\n'
    }
  }

  if (current) sections.push(current)
  return sections
}

function parseScenarios(content: string): Scenarios | null {
  const result: Partial<Scenarios> = {}

  for (const line of content.split('\n')) {
    const orig = line.trim()
    const lower = orig.toLowerCase()
    const colonIdx = orig.indexOf(':')
    if (colonIdx === -1) continue
    const afterColon = orig.slice(colonIdx + 1).trim()
    if (!afterColon) continue

    if (lower.includes('pessimiste')) result.pessimiste = afterColon
    else if (lower.includes('optimiste')) result.optimiste = afterColon
    else if (lower.includes('neutre')) result.neutre = afterColon
  }

  if (!result.optimiste && !result.neutre && !result.pessimiste) return null
  return {
    optimiste: result.optimiste ?? '',
    neutre: result.neutre ?? '',
    pessimiste: result.pessimiste ?? '',
  }
}

function renderLine(line: string, key: number): JSX.Element {
  const parts = line.split(/(\*\*[^*]+\*\*)/)
  return (
    <span key={key}>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i} className="font-medium text-slate-800">{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}

function renderContent(content: string): JSX.Element[] {
  const lines = content.trim().split('\n')
  const elements: JSX.Element[] = []
  let bulletBuffer: string[] = []

  function flushBullets() {
    if (bulletBuffer.length === 0) return
    elements.push(
      <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 text-sm text-gray-700 leading-relaxed mb-3">
        {bulletBuffer.map((b, i) => (
          <li key={i}>{renderLine(b.replace(/^[-•]\s*/, ''), i)}</li>
        ))}
      </ul>
    )
    bulletBuffer = []
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) {
      flushBullets()
      return
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      bulletBuffer.push(trimmed)
    } else {
      flushBullets()
      elements.push(
        <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2">
          {renderLine(trimmed, i)}
        </p>
      )
    }
  })

  flushBullets()
  return elements
}

function renderRecommendations(content: string, t: (k: string) => string): JSX.Element[] {
  const lines = content.trim().split('\n')
  const elements: JSX.Element[] = []
  let itemIndex = 0

  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return

    if (!trimmed.startsWith('- ') && !trimmed.startsWith('• ')) {
      elements.push(
        <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2">
          {renderLine(trimmed, i)}
        </p>
      )
      return
    }

    const text = trimmed.replace(/^[-•]\s*/, '')
    const priority = getPriority(text)
    const badgeClass =
      priority === 'urgent' ? 'badge badge-danger' :
      priority === 'important' ? 'badge badge-warning' :
      'badge'
    const badgeLabel =
      priority === 'urgent' ? t('analysis.urgent') :
      priority === 'important' ? t('analysis.important') :
      t('analysis.toConsider')

    const isFirst = itemIndex === 0
    itemIndex++

    elements.push(
      <div key={i} className={`flex items-start gap-3 py-2 ${isFirst ? '' : 'border-t border-green-100'}`}>
        <span className={`${badgeClass} shrink-0 mt-0.5 text-xs`}>{badgeLabel}</span>
        <p className="text-sm text-gray-700 leading-relaxed">{renderLine(text, i)}</p>
      </div>
    )
  })

  return elements
}

function ScenariosGrid({ content }: { content: string }) {
  const { t } = useTranslation()
  const scenarios = parseScenarios(content)

  if (!scenarios) {
    return <>{renderContent(content)}</>
  }

  return (
    <div className="scenarios-grid grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-3 mt-2">
      <div className="border border-green-400 rounded-xl p-4 bg-white space-y-2">
        <span className="badge badge-success text-xs">{t('analysis.optimiste')}</span>
        <p className="text-sm text-gray-700 leading-relaxed">{scenarios.optimiste || '—'}</p>
      </div>
      <div className="border border-blue-400 rounded-xl p-4 bg-white space-y-2">
        <span className="badge badge-info text-xs">{t('analysis.neutre')}</span>
        <p className="text-sm text-gray-700 leading-relaxed">{scenarios.neutre || '—'}</p>
      </div>
      <div className="border border-red-400 rounded-xl p-4 bg-white space-y-2">
        <span className="badge badge-danger text-xs">{t('analysis.pessimiste')}</span>
        <p className="text-sm text-gray-700 leading-relaxed">{scenarios.pessimiste || '—'}</p>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function AIAnalysis({ simulationId, simulationName, preloaded, onAnalyzed }: Props) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<Status>('loading-existing')
  const [data, setData] = useState<AnalysisResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)
  const [showRelaunchSelector, setShowRelaunchSelector] = useState(false)
  const [loadingStep, setLoadingStep] = useState<1 | 2>(1)

  const [providers, setProviders] = useState<ProviderOption[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [providersLoading, setProvidersLoading] = useState(true)

  const afterprintHandlerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => {
      if (afterprintHandlerRef.current) {
        window.removeEventListener('afterprint', afterprintHandlerRef.current)
      }
    }
  }, [])

  // Chargement providers + analyse existante en parallèle au montage
  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    Promise.all([
      api.get<ProvidersResponse>('/api/settings/providers', { signal: controller.signal }),
      api.get<HistoryResponse>(`/api/analysis/${simulationId}`, { signal: controller.signal }),
    ])
      .then(([providersRes, historyRes]) => {
        if (!isMounted) return
        const res = providersRes.data
        setProviders(res.providers)
        setSelectedProviderId(res.active ?? res.providers[0]?.id ?? '')

        const entries = historyRes.data.data
        if (entries.length > 0) {
          const latest = entries[0]
          setData({ analysis: latest.rawText, provider: latest.provider, cached: false })
          setGeneratedAt(new Date(latest.createdAt))
          setStatus('loaded')
        } else {
          setStatus('idle')
        }
      })
      .catch((err) => {
        if (!isMounted || err?.code === 'ERR_CANCELED') return
        setStatus('idle')
      })
      .finally(() => {
        if (isMounted) setProvidersLoading(false)
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [simulationId])

  // Mise à jour depuis l'historique (clic sur une entrée dans AnalysisHistory)
  useEffect(() => {
    if (preloaded) {
      setData({ analysis: preloaded.analysis, provider: preloaded.provider, cached: false })
      setGeneratedAt(new Date())
      setErrorMsg('')
      setShowRelaunchSelector(false)
      setStatus('loaded')
    }
  }, [preloaded])

  function run(providerId: string) {
    setErrorMsg('')
    setShowRelaunchSelector(false)
    setLoadingStep(1)
    setStatus('loading')
    setGeneratedAt(new Date())

    // Switch vers l'étape 2 (auto-critique) après 20s — durée approximative de la passe 1
    const timer = setTimeout(() => setLoadingStep(2), 20000)

    api
      .post<AnalysisResponse>(`/api/analysis/${simulationId}`, { providerId })
      .then(({ data: res }) => {
        clearTimeout(timer)
        setData(res)
        setStatus('loaded')
        onAnalyzed?.()
      })
      .catch((err) => {
        clearTimeout(timer)
        const msg = err?.response?.data?.error
        setErrorMsg(msg ?? t('analysis.failed'))
        setStatus('error')
      })
  }

  function handlePrint() {
    const original = document.title
    const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const name = simulationName ?? simulationId
    document.title = `MiroResult — Analyse — ${name} — ${date}`
    const handler = () => {
      document.title = original
      window.removeEventListener('afterprint', handler)
      afterprintHandlerRef.current = null
    }
    afterprintHandlerRef.current = handler
    window.addEventListener('afterprint', handler)
    window.print()
  }

  const selectedProvider = providers.find((p) => p.id === selectedProviderId)
  const canLaunch = Boolean(selectedProviderId && selectedProvider?.hasKey)

  function renderProviderSelector(label: string) {
    if (providersLoading) return null
    if (providers.length === 0) {
      return (
        <p className="text-xs text-slate-400">
          {t('analysis.noProvider')}{' '}
          <a href="/settings" className="text-blue-700 hover:underline">{t('nav.settings')}</a>
        </p>
      )
    }
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedProviderId}
          onChange={(e) => setSelectedProviderId(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-800"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.hasKey}>
              {p.name} — {p.model}{!p.hasKey ? ` (${t('analysis.keyMissing')})` : ''}
            </option>
          ))}
        </select>
        <button
          onClick={() => run(selectedProviderId)}
          disabled={!canLaunch}
          className={`btn-accent text-sm ${!canLaunch ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {label}
        </button>
      </div>
    )
  }

  // ── États ──────────────────────────────────────────────────────────────────

  if (status === 'loading-existing') {
    return (
      <div className="card flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-blue-800 border-t-transparent animate-spin shrink-0" />
        <p className="text-sm text-slate-500">{t('analysis.loading')}</p>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="card space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-blue-800 border-t-transparent animate-spin shrink-0" />
          <p className="text-sm text-slate-700 font-medium">
            {loadingStep === 1 ? t('analysis.analyzing') : t('analysis.autocritique')}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${loadingStep >= 1 ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {t('analysis.step1')}
          </span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${loadingStep >= 2 ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {t('analysis.step2')}
          </span>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="card space-y-3">
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
        {renderProviderSelector(t('common.retry'))}
      </div>
    )
  }

  if (status === 'idle') {
    return (
      <div className="card space-y-4">
        <div>
          <h2 className="text-slate-900">{t('analysis.title')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('analysis.noAnalysis')}
          </p>
        </div>
        {renderProviderSelector(t('analysis.launch'))}
      </div>
    )
  }

  // ── Loaded ─────────────────────────────────────────────────────────────────

  if (!data) return null

  const dateLabel = generatedAt
    ? generatedAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  const header = (
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-slate-900">{t('analysis.title')}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{dateLabel}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap no-print">
        {data.cached && <span className="badge badge-info">{t('analysis.cached')}</span>}
        {data.provider && <span className="badge badge-success">{data.provider}</span>}
        <button
          onClick={() => setShowRelaunchSelector((v) => !v)}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          {showRelaunchSelector ? t('common.cancel') : t('analysis.relaunch')}
        </button>
        <button onClick={handlePrint} className="btn-secondary text-xs px-3 py-1.5">
          {t('analysis.exportPdf')}
        </button>
      </div>
    </div>
  )

  const relaunchSelector = showRelaunchSelector ? (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 no-print">
      <p className="text-xs text-slate-500 mb-2">{t('analysis.relaunchTitle')}</p>
      {renderProviderSelector(t('analysis.relaunching'))}
    </div>
  ) : null

  // Rendu structuré JSON
  const analysisJson = parseAnalysisJson(data.analysis)
  if (analysisJson) {
    return (
      <div className="space-y-4">
        {header}
        {relaunchSelector}
        <StructuredAnalysis data={analysisJson} />
      </div>
    )
  }

  // Fallback markdown legacy
  const sections = parseSections(data.analysis)
  if (sections.length === 0) {
    return (
      <div className="space-y-4">
        {header}
        {relaunchSelector}
        <div className="card">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{data.analysis}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {header}
      {relaunchSelector}
      {sections.map((section) => {
        const kind = classifySection(section.title)
        return (
          <div key={section.title} className={sectionClass(kind)}>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-600 flex items-center gap-1.5 mb-3">
              <span aria-hidden="true">{SECTION_ICONS[kind]}</span>
              {section.title}
            </h4>
            {kind === 'scenarios' ? (
              <ScenariosGrid content={section.content} />
            ) : kind === 'recommendations' ? (
              <div>{renderRecommendations(section.content, t)}</div>
            ) : (
              <div>{renderContent(section.content)}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
