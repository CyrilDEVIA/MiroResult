import { useTranslation } from 'react-i18next'
import { progressColor, semanticBg } from '@/utils/score'

function scorePill(s: number): string {
  return s >= 70
    ? 'bg-emerald-500 text-white rounded-full px-3 py-1 text-xs font-bold'
    : s >= 40
      ? 'bg-amber-500 text-white rounded-full px-3 py-1 text-xs font-bold'
      : 'bg-red-500 text-white rounded-full px-3 py-1 text-xs font-bold'
}

export interface ScoreDetailItem {
  label: string
  unit: string
  value: number
  score: number
}

// ─── MetricTable — tableau compact avec barres inline (exporté) ───────────────

interface MetricTableEntry {
  key: string
  label: string
  valueLabel: string
  score: number
}

export interface MetricTableProps {
  entries: MetricTableEntry[]
}

export function MetricTable({ entries }: MetricTableProps) {
  return (
    <div className="space-y-3">
      {entries.map((row) => (
        <div key={row.key}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-slate-600">{row.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">{row.valueLabel}</span>
              <span className={scorePill(row.score)}>{row.score}</span>
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progressColor(row.score)}`}
              style={{ width: `${row.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Groupe thématique (positif / attention / critique) ───────────────────────

interface GroupConfig {
  label: string
  icon: string
  items: [string, ScoreDetailItem][]
  bgClass: string
}

interface ThemeGroupProps {
  config: GroupConfig
}

function ThemeGroup({ config }: ThemeGroupProps) {
  if (config.items.length === 0) return null

  const entries: MetricTableEntry[] = config.items.map(([key, dim]) => ({
    key,
    label: dim.label,
    valueLabel: `${dim.value} ${dim.unit}`,
    score: dim.score,
  }))

  return (
    <div className={`${config.bgClass} rounded-xl p-4 space-y-3`}>
      <h4 className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
        <span aria-hidden="true">{config.icon}</span>
        {config.label}
      </h4>
      <MetricTable entries={entries} />
    </div>
  )
}

// ─── ScoreDetail ──────────────────────────────────────────────────────────────

interface ScoreDetailProps {
  scores: Record<string, ScoreDetailItem>
}

export function ScoreDetail({ scores }: ScoreDetailProps) {
  const { t } = useTranslation()
  const allEntries = Object.entries(scores).sort(([, a], [, b]) => b.score - a.score)

  const positive = allEntries.filter(([, d]) => d.score >= 70)
  const attention = allEntries.filter(([, d]) => d.score >= 40 && d.score < 70)
  const critical = allEntries.filter(([, d]) => d.score < 40)

  const GROUPS: GroupConfig[] = [
    {
      label: t('score.positive'),
      icon: '✅',
      items: positive,
      bgClass: semanticBg(75),
    },
    {
      label: t('score.attention'),
      icon: '⚠️',
      items: attention,
      bgClass: semanticBg(50),
    },
    {
      label: t('score.critical'),
      icon: '🔴',
      items: critical,
      bgClass: semanticBg(20),
    },
  ]

  const hasGroups = positive.length > 0 || attention.length > 0 || critical.length > 0

  return (
    <div className="card space-y-4">
      <h3>{t('score.dimensionTitle')}</h3>

      {hasGroups ? (
        <div className="space-y-3">
          {GROUPS.map((g) => (
            <ThemeGroup key={g.label} config={g} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{t('score.noDimension')}</p>
      )}
    </div>
  )
}

// ─── FavorablesSection — depuis nouveau schéma IA ────────────────────────────

export interface FavorableItem {
  titre: string
  detail: string
  force: number
}

export function FavorablesSection({ items }: { items: FavorableItem[] }) {
  const { t } = useTranslation()
  if (items.length === 0) return null
  return (
    <div className="border-l-4 border-emerald-500 bg-emerald-50 rounded-r-xl p-5 space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
        <span aria-hidden="true">✅</span> {t('score.favorable')}
      </h4>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.titre} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-700 font-medium">{item.titre}</span>
              <span className="bg-emerald-500 text-white rounded-full px-3 py-1 text-xs font-bold shrink-0">
                {item.force}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{item.detail}</p>
            <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-emerald-500"
                style={{ width: `${item.force}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── BlockagesSection — depuis nouveau schéma IA ──────────────────────────────

export interface BlockageItem {
  titre: string
  detail: string
  severite: number
}

export function BlockagesSection({ items }: { items: BlockageItem[] }) {
  const { t } = useTranslation()
  if (items.length === 0) return null
  return (
    <div className="border-l-4 border-red-500 bg-red-50 rounded-r-xl p-5 space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-widest text-red-700 flex items-center gap-1.5">
        <span aria-hidden="true">🚧</span> {t('score.blocages')}
      </h4>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.titre} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-700 font-medium">{item.titre}</span>
              <span className="bg-red-500 text-white rounded-full px-3 py-1 text-xs font-bold shrink-0">
                {item.severite}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">{item.detail}</p>
            <div className="h-3 bg-red-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 bg-red-500"
                style={{ width: `${item.severite}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PositifsAttentions — depuis analyse IA structurée ────────────────────────

export interface PositifItem {
  titre: string
  description: string
  score: number
}

export interface AttentionItem {
  titre: string
  description: string
  niveau: number
}

interface PositifsAttentionsProps {
  positifs: PositifItem[]
  attentions: AttentionItem[]
}

export function PositifsAttentions({ positifs, attentions }: PositifsAttentionsProps) {
  const { t } = useTranslation()
  if (positifs.length === 0 && attentions.length === 0) return null

  return (
    <div className="space-y-3">
      {positifs.length > 0 && (
        <div className="border-l-4 border-emerald-500 bg-emerald-50 rounded-r-xl p-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
            <span aria-hidden="true">✅</span> {t('score.positive')}
          </h4>
          <div className="space-y-4">
            {positifs.map((item) => (
              <div key={item.titre} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700 font-medium">{item.titre}</span>
                  <span className="bg-emerald-500 text-white rounded-full px-3 py-1 text-xs font-bold shrink-0">
                    {item.score}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 bg-emerald-500"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {attentions.length > 0 && (
        <div className="border-l-4 border-amber-500 bg-amber-50 rounded-r-xl p-5 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-amber-700 flex items-center gap-1.5">
            <span aria-hidden="true">⚠️</span> {t('score.attention')}
          </h4>
          <div className="space-y-4">
            {attentions.map((item) => (
              <div key={item.titre} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-700 font-medium">{item.titre}</span>
                  <span className="bg-amber-500 text-white rounded-full px-3 py-1 text-xs font-bold shrink-0">
                    {item.niveau}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                <div className="h-3 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 bg-amber-500"
                    style={{ width: `${item.niveau}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
