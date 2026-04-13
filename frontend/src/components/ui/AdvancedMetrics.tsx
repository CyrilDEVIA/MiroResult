import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
  PieChart,
  Pie,
} from 'recharts'
import { scoreColor, scoreBadge, semanticFill } from '@/utils/score'

// ─── Types internes ───────────────────────────────────────────────────────────

export interface V2Metrics {
  agentDiversity: number | null
  convergenceScore: number | null
  temporalStability: number | null
  globalScoreV2: number | null
}

export interface ChartDatum {
  shortLabel: string
  fullLabel: string
  value: number
  description: string
  fill: string
}

interface MetricConfig {
  key: keyof Omit<V2Metrics, 'globalScoreV2'>
  shortLabel: string
  fullLabel: string
  description: string
}

const METRICS: MetricConfig[] = [
  {
    key: 'agentDiversity',
    shortLabel: 'Diversité',
    fullLabel: 'Diversité des agents',
    description:
      'Ratio de profils distincts / total agents. 100 = tous uniques, 0 = tous identiques.',
  },
  {
    key: 'convergenceScore',
    shortLabel: 'Convergence',
    fullLabel: 'Convergence',
    description:
      'Tendance vers un consensus au fil du temps. 100 = consensus total, 0 = divergence.',
  },
  {
    key: 'temporalStability',
    shortLabel: 'Stabilité',
    fullLabel: 'Stabilité temporelle',
    description:
      'Variance step-by-step. 100 = dynamique stable, 0 = forte instabilité.',
  },
]

// ─── MetricChart — BarChart recharts (exporté) ────────────────────────────────

interface MetricChartProps {
  data: ChartDatum[]
  height?: number
}

export function MetricChart({ data, height = 170 }: MetricChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
        barCategoryGap="30%"
      >
        <XAxis
          dataKey="shortLabel"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#cbd5e1' }}
          axisLine={false}
          tickLine={false}
          tickCount={3}
        />
        <ReferenceLine
          y={70}
          stroke="#22c55e"
          strokeDasharray="3 3"
          strokeOpacity={0.45}
        />
        <ReferenceLine
          y={40}
          stroke="#eab308"
          strokeDasharray="3 3"
          strokeOpacity={0.45}
        />
        <Tooltip
          cursor={{ fill: 'rgba(248,250,252,0.5)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0]
            const d = item.payload as ChartDatum
            return (
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 shadow-xl text-xs max-w-[190px]">
                <p className="font-semibold text-white mb-1">{d.fullLabel}</p>
                <p className={`text-base font-bold mb-1.5 ${scoreColor(Number(item.value))}`}>
                  {item.value}
                  <span className="text-slate-400 text-xs font-normal">/100</span>
                </p>
                <p className="text-slate-400 leading-relaxed">{d.description}</p>
              </div>
            )
          }}
        />
        <Bar
          dataKey="value"
          radius={[5, 5, 0, 0]}
          isAnimationActive
          animationDuration={600}
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── AdvancedMetrics — composant principal ────────────────────────────────────

interface Props {
  metrics: V2Metrics | null
}

export function AdvancedMetrics({ metrics }: Props) {
  if (!metrics) return null

  const visibleMetrics = METRICS.filter((m) => metrics[m.key] !== null)
  const hasAnyMetric = visibleMetrics.length > 0 || metrics.globalScoreV2 !== null

  if (!hasAnyMetric) return null

  const chartData: ChartDatum[] = visibleMetrics.map((m) => {
    const val = metrics[m.key] as number
    return {
      shortLabel: m.shortLabel,
      fullLabel: m.fullLabel,
      value: val,
      description: m.description,
      fill: semanticFill(val),
    }
  })

  return (
    <div className="card space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3>Métriques avancées v2</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Indicateurs comportementaux calculés sur les données de simulation
          </p>
        </div>
        {metrics.globalScoreV2 !== null && (
          <div
            className="flex flex-col items-end gap-1"
            title="Score composite : convergence×0.35 + stabilité×0.30 + diversité×0.20 + score v1×0.15"
          >
            <span className="text-xs text-slate-400 uppercase tracking-wide">
              Score composite v2
            </span>
            <span
              className={`text-5xl font-black leading-none ${scoreColor(metrics.globalScoreV2)}`}
            >
              {metrics.globalScoreV2}
              <span className="text-base text-slate-400 font-normal ml-1">/100</span>
            </span>
            <span className={scoreBadge(metrics.globalScoreV2)}>
              {metrics.globalScoreV2 >= 70
                ? 'Bon'
                : metrics.globalScoreV2 >= 40
                  ? 'Moyen'
                  : 'Insuffisant'}
            </span>
          </div>
        )}
      </div>

      {/* BarChart + légende */}
      {chartData.length > 0 && (
        <div className="space-y-2">
          <MetricChart data={chartData} />
          <div className="flex justify-center gap-6">
            {chartData.map((d) => (
              <div
                key={d.shortLabel}
                className="flex items-center gap-1.5"
                title={d.description}
              >
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: d.fill }}
                />
                <span className="text-xs text-slate-500">{d.fullLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {visibleMetrics.length === 0 && metrics.globalScoreV2 !== null && (
        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          Métriques détaillées non disponibles — données actions/profils absentes du ZIP.
        </p>
      )}
    </div>
  )
}

// ─── CompositionCharts — depuis nouveau schéma IA ────────────────────────────

export interface TrancheAge {
  label: string
  pct: number
}

export interface ProfilItem {
  label: string
  pct: number
}

export interface CompositionData {
  hommes_pct: number
  femmes_pct: number
  tranches_age: TrancheAge[]
  profils: ProfilItem[]
  territoire: string
}

const GENRE_COLORS = ['#3B82F6', '#EC4899']

export function CompositionCharts({ composition }: { composition: CompositionData }) {
  const genreData = [
    { name: 'Hommes', value: composition.hommes_pct },
    { name: 'Femmes', value: composition.femmes_pct },
  ]

  const ageData: ChartDatum[] = composition.tranches_age.map((t) => ({
    shortLabel: t.label,
    fullLabel: t.label,
    value: t.pct,
    description: `${t.pct}% de la population simulée`,
    fill: '#6366F1',
  }))

  const profilData: ChartDatum[] = composition.profils.map((p) => ({
    shortLabel: p.label.length > 12 ? p.label.slice(0, 12) + '…' : p.label,
    fullLabel: p.label,
    value: p.pct,
    description: `${p.pct}% de la population simulée`,
    fill: '#0EA5E9',
  }))

  return (
    <div className="card space-y-6">
      <div>
        <h3>Composition de la population</h3>
        {composition.territoire && (
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{composition.territoire}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Donut H/F */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Genre</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={genreData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                strokeWidth={0}
                paddingAngle={2}
                isAnimationActive
                animationDuration={600}
              >
                {genreData.map((d, i) => (
                  <Cell key={d.name} fill={GENRE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as { name: string; value: number }
                  return (
                    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                      <p className="font-semibold text-white">{d.name}</p>
                      <p className="text-slate-400">{d.value}%</p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4">
            {genreData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENRE_COLORS[i] }} />
                <span>{d.name} ({d.value}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart tranches d'âge */}
        {ageData.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tranches d'âge</p>
            <MetricChart data={ageData} height={150} />
          </div>
        )}

        {/* Bar chart profils */}
        {profilData.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Profils</p>
            <MetricChart data={profilData} height={150} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SimulationCharts — depuis analyse IA structurée ─────────────────────────

export interface SegmentItem {
  nom: string
  score: number
}

export interface FreinItem {
  nom: string
  pct: number
}

export interface TrajectoireItem {
  scenario: string
  probabilite: string
  condition: string
  impact: 'positif' | 'neutre' | 'negatif'
}

interface SimulationChartsProps {
  segments: SegmentItem[]
  freins: FreinItem[]
  trajectoires: TrajectoireItem[]
}

const IMPACT_BADGE: Record<TrajectoireItem['impact'], string> = {
  positif: 'bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-xs font-bold',
  neutre: 'bg-slate-100 text-slate-600 rounded-full px-3 py-1 text-xs font-bold',
  negatif: 'bg-red-100 text-red-700 rounded-full px-3 py-1 text-xs font-bold',
}

const FREIN_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#6366F1', '#8B5CF6']

export function SimulationCharts({ segments, freins, trajectoires }: SimulationChartsProps) {
  const hasAny = segments.length > 0 || freins.length > 0 || trajectoires.length > 0
  if (!hasAny) return null

  const segmentData: ChartDatum[] = segments.map((s) => ({
    shortLabel: s.nom.length > 12 ? s.nom.slice(0, 12) + '…' : s.nom,
    fullLabel: s.nom,
    value: s.score,
    description: `Score de performance : ${s.score}/100`,
    fill: semanticFill(s.score),
  }))

  return (
    <div className="card space-y-5">
      <h3>Analyse des données</h3>

      {(segments.length > 0 || freins.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Segments → BarChart */}
          {segments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Scores par segment</p>
              <MetricChart data={segmentData} height={160} />
            </div>
          )}

          {/* Freins → PieChart donut */}
          {freins.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Freins identifiés</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={freins}
                    dataKey="pct"
                    nameKey="nom"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    strokeWidth={0}
                    paddingAngle={2}
                    isAnimationActive
                    animationDuration={600}
                  >
                    {freins.map((f, i) => (
                      <Cell key={f.nom} fill={FREIN_COLORS[i % FREIN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as FreinItem
                      return (
                        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-xl">
                          <p className="font-semibold text-white">{d.nom}</p>
                          <p className="text-slate-400">{d.pct}%</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
                {freins.map((f, i) => (
                  <div key={f.nom} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: FREIN_COLORS[i % FREIN_COLORS.length] }}
                    />
                    <span>{f.nom} ({f.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trajectoires → tableau */}
      {trajectoires.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Trajectoires prédictives</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  {['Scénario', 'Probabilité', 'Condition', 'Impact'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-xs font-semibold text-white uppercase tracking-widest"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trajectoires.map((t, i) => (
                  <tr key={i} className={`border-t border-slate-100 hover:bg-blue-50 transition-colors ${i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{t.scenario}</td>
                    <td className="px-3 py-2.5 text-slate-600 font-mono text-xs">{t.probabilite}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-xs text-xs leading-relaxed">{t.condition}</td>
                    <td className="px-3 py-2.5">
                      <span className={IMPACT_BADGE[t.impact]}>{t.impact}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
