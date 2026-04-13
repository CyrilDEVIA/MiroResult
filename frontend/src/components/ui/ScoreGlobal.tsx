import type { ReactNode } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { scoreColor, scoreLabel, semanticFill } from '@/utils/score'

// ─── KpiCard ──────────────────────────────────────────────────────────────────

export interface KpiTrend {
  direction: 'up' | 'down' | 'neutral'
  label: string
}

export interface KpiCardProps {
  value: number | string
  label: string
  subtitle?: string
  colorClass?: string
  trend?: KpiTrend
  chart?: ReactNode
}

const TREND_ICON = { up: '▲', down: '▼', neutral: '—' } as const
const TREND_COLOR = {
  up: 'text-green-600',
  down: 'text-red-600',
  neutral: 'text-slate-400',
} as const

export function KpiCard({
  value,
  label,
  subtitle,
  colorClass = 'text-slate-900',
  trend,
  chart,
}: KpiCardProps) {
  return (
    <div className="bg-white border border-slate-100 shadow-sm rounded-xl p-6 flex flex-col gap-2 min-h-[100px]">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      {chart && <div className="my-1">{chart}</div>}
      <p className={`font-bold leading-none ${typeof value === 'string' && value.length > 8 ? 'text-xl' : 'text-4xl'} ${colorClass}`}>{value}</p>
      {(subtitle || trend) && (
        <p className={`text-xs mt-0.5 ${trend ? TREND_COLOR[trend.direction] : 'text-slate-400'}`}>
          {trend && <span>{TREND_ICON[trend.direction]} </span>}
          {trend ? trend.label : subtitle}
        </p>
      )}
    </div>
  )
}

// ─── ScoreGauge — demi-cercle recharts ────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const fill = semanticFill(score)
  const W = 200
  const H = 110
  const CX = 100
  const CY = 100

  return (
    <div className="relative" style={{ width: W, height: H, margin: '0 auto' }}>
      <PieChart width={W} height={H}>
        <Pie
          data={[{ value: score }, { value: 100 - score }]}
          cx={CX}
          cy={CY}
          startAngle={180}
          endAngle={0}
          innerRadius={54}
          outerRadius={78}
          dataKey="value"
          strokeWidth={0}
          paddingAngle={score > 0 && score < 100 ? 1 : 0}
          isAnimationActive
          animationDuration={700}
        >
          <Cell fill={fill} />
          <Cell fill="#e2e8f0" />
        </Pie>
      </PieChart>

      {/* Valeur centrée sur le demi-cercle */}
      <div
        className="absolute inset-x-0 flex justify-center"
        style={{ bottom: 6 }}
      >
        <span className={`text-5xl font-black leading-none ${scoreColor(score)}`}>
          {score}
        </span>
      </div>
    </div>
  )
}

// ─── KpiRow — ligne de KPI depuis analyse IA ──────────────────────────────────

export interface KpiRowItem {
  label: string
  value: string
  trend: 'hausse' | 'baisse' | 'stable'
  positive: boolean
}

const TREND_MAP = { hausse: 'up', baisse: 'down', stable: 'neutral' } as const

export function KpiRow({ items }: { items: KpiRowItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <KpiCard
          key={item.label}
          label={item.label}
          value={item.value}
          colorClass={item.positive ? 'text-green-700' : 'text-red-700'}
          trend={{ direction: TREND_MAP[item.trend], label: item.trend }}
        />
      ))}
    </div>
  )
}

// ─── ScoreGlobal ──────────────────────────────────────────────────────────────

interface ScoreGlobalProps {
  score: number
}

export function ScoreGlobal({ score }: ScoreGlobalProps) {
  return (
    <div className="card flex flex-col items-center py-6 gap-3">
      <p className="text-xs text-slate-500 uppercase tracking-wide">Score global</p>
      <ScoreGauge score={score} />
      <p className="text-sm text-slate-400">/ 100 — {scoreLabel(score)}</p>
    </div>
  )
}

// ─── VerdictCard — verdict décisionnel depuis analyse IA ──────────────────────

type Decision = 'lancer' | 'pivoter' | 'abandonner'

export interface VerdictData {
  decision: Decision
  score_viabilite: number
  resume: string
}

const DECISION_CONFIG: Record<Decision, { label: string; borderClass: string; bgClass: string; textClass: string; pillClass: string }> = {
  lancer: {
    label: 'LANCER',
    borderClass: 'border-emerald-500',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    pillClass: 'bg-emerald-600 text-white',
  },
  pivoter: {
    label: 'PIVOTER',
    borderClass: 'border-amber-500',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    pillClass: 'bg-amber-500 text-white',
  },
  abandonner: {
    label: 'ABANDONNER',
    borderClass: 'border-red-500',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    pillClass: 'bg-red-600 text-white',
  },
}

export function VerdictCard({ verdict }: { verdict: VerdictData }) {
  const cfg = DECISION_CONFIG[verdict.decision]
  return (
    <div className={`border-l-4 ${cfg.borderClass} ${cfg.bgClass} rounded-r-xl p-6 space-y-4`}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Décision</p>
          <p className={`text-5xl font-black leading-none ${cfg.textClass}`}>{cfg.label}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Viabilité</p>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-5xl font-black leading-none ${cfg.textClass}`}>{verdict.score_viabilite}</span>
            <span className="text-slate-400 text-sm">/100</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed border-t border-current border-opacity-20 pt-4">
        {verdict.resume}
      </p>
    </div>
  )
}
