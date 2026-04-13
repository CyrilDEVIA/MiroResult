import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import api from '@/services/api'
import { scoreColor, semanticFill } from '@/utils/score'
import { KpiCard } from '@/components/ui/ScoreGlobal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActiveProvider {
  name: string
  model: string
  baseUrl: string
}

interface RecentSimulation {
  id: string
  filename: string
  status: 'pending' | 'processed' | 'error'
  createdAt: string
  report: {
    id: string
    scoreGlobal: number | null
    scoresV2: string | null
  } | null
}

interface Stats {
  totalSimulations: number
  processedSimulations: number
  totalReports: number
  totalAnalyses: number
  avgScore: number | null
  avgScoreV2: number | null
  activeProvider: ActiveProvider | null
  recentSimulations: RecentSimulation[]
}

interface ScoreBarDatum {
  name: string
  filename: string
  score: number
  fill: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<RecentSimulation['status'], string> = {
  pending: 'badge badge-warning',
  processed: 'badge badge-success',
  error: 'badge badge-danger',
}

function parseScoreV2(scoresV2: string | null): number | null {
  if (!scoresV2) return null
  try {
    const parsed = JSON.parse(scoresV2) as { globalScoreV2?: number | null }
    return typeof parsed.globalScoreV2 === 'number' ? parsed.globalScoreV2 : null
  } catch {
    return null
  }
}

function truncateName(name: string, max = 14): string {
  return name.length > max ? name.slice(0, max) + '…' : name
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<{ success: boolean; data: Stats }>('/api/stats')
      .then(({ data }) => setStats(data.data))
      .catch(() => setError(t('dashboard.loadError')))
  }, [t])

  return (
    <div>
      <div className="mb-6">
        <h1>{t('dashboard.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-6">
          {error}
        </p>
      )}

      {stats && (
        <>
          {/* ── KPI cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard
              label={t('dashboard.totalSimulations')}
              value={stats.totalSimulations}
              subtitle={
                stats.totalSimulations > 0
                  ? t('dashboard.processedCount', { count: stats.processedSimulations })
                  : t('dashboard.noSimulations')
              }
            />

            <KpiCard
              label={t('dashboard.aiAnalyses')}
              value={stats.totalAnalyses}
              subtitle={stats.totalAnalyses > 0 ? t('dashboard.analysesGenerated') : t('dashboard.noAnalysis')}
            />

            <KpiCard
              label={t('dashboard.activeProvider')}
              value={stats.activeProvider ? stats.activeProvider.name : '—'}
              subtitle={
                stats.activeProvider
                  ? stats.activeProvider.model
                  : t('dashboard.noProvider')
              }
              colorClass={stats.activeProvider ? 'text-slate-900' : 'text-slate-400'}
            />

            <KpiCard
              label={t('dashboard.avgScoreV2')}
              value={stats.avgScoreV2 !== null ? stats.avgScoreV2 : '—'}
              subtitle={stats.avgScoreV2 !== null ? '/ 100' : t('common.noData')}
              colorClass={
                stats.avgScoreV2 !== null ? scoreColor(stats.avgScoreV2) : 'text-slate-400'
              }
            />
          </div>

          {/* ── Mini chart scores ──────────────────────────────────────────── */}
          {(() => {
            const scoreData: ScoreBarDatum[] = stats.recentSimulations
              .filter((s) => s.status === 'processed' && s.report?.scoreGlobal != null)
              .slice(0, 6)
              .map((s) => ({
                name: truncateName(s.filename),
                filename: s.filename,
                score: s.report!.scoreGlobal as number,
                fill: semanticFill(s.report!.scoreGlobal as number),
              }))

            if (scoreData.length === 0) return null

            return (
              <div className="card mb-6 space-y-3">
                <div>
                  <h3>{t('dashboard.recentScores')}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.recentScoresSubtitle')}</p>
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart
                    data={scoreData}
                    margin={{ top: 4, right: 8, bottom: 4, left: -20 }}
                    barCategoryGap="30%"
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
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
                      strokeOpacity={0.4}
                    />
                    <ReferenceLine
                      y={40}
                      stroke="#eab308"
                      strokeDasharray="3 3"
                      strokeOpacity={0.4}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(248,250,252,0.8)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const item = payload[0]
                        const d = item.payload as ScoreBarDatum
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs shadow-sm">
                            <p className="text-slate-500 font-mono truncate max-w-[180px]">
                              {d.filename}
                            </p>
                            <p className={`text-base font-medium ${scoreColor(Number(item.value))}`}>
                              {item.value}/100
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Bar
                      dataKey="score"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive
                      animationDuration={500}
                    >
                      {scoreData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          })()}

          {/* ── Simulations récentes ───────────────────────────────────────── */}
          <div className="card p-0 overflow-hidden mb-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3>{t('dashboard.recentSimulations')}</h3>
              <Link to="/simulations" className="text-sm text-blue-700 hover:text-blue-900">
                {t('dashboard.viewAll')}
              </Link>
            </div>

            {stats.recentSimulations.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500">
                {t('dashboard.noSimulations')} —{' '}
                <Link to="/simulations" className="text-blue-700 hover:underline">
                  {t('dashboard.importFile')}
                </Link>
              </p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {[
                      t('common.file'),
                      t('common.status'),
                      t('dashboard.thScoreV1'),
                      t('dashboard.thScoreV2'),
                      t('common.date'),
                      '',
                    ].map((th, i) => (
                      <th
                        key={i}
                        className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide font-medium"
                      >
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSimulations.map((sim) => {
                    const scoreV2 = parseScoreV2(sim.report?.scoresV2 ?? null)
                    return (
                      <tr
                        key={sim.id}
                        className="border-t border-slate-100 text-sm text-slate-800 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-sm text-slate-700 max-w-[200px] truncate">
                          {sim.filename}
                        </td>
                        <td className="px-5 py-3">
                          <span className={STATUS_BADGE[sim.status]}>
                            {t(`status.${sim.status}`)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {sim.report?.scoreGlobal != null ? (
                            <span
                              className={`text-sm font-medium ${scoreColor(sim.report.scoreGlobal)}`}
                            >
                              {sim.report.scoreGlobal}/100
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {scoreV2 !== null ? (
                            <span className={`text-sm font-medium ${scoreColor(scoreV2)}`}>
                              {scoreV2}/100
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-400">
                          {new Date(sim.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {(sim.status === 'processed' || sim.report !== null) && (
                            <Link
                              to={`/simulations/${sim.id}/report`}
                              className="text-sm text-blue-700 hover:text-blue-900 hover:underline"
                            >
                              {t('dashboard.reportLink')}
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Statut système ─────────────────────────────────────────────── */}
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="mb-3">{t('dashboard.systemStatus')}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">{t('dashboard.providerLabel')}</p>
                {stats.activeProvider ? (
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-slate-900">
                      {stats.activeProvider.name}
                    </p>
                    <p className="text-xs font-mono text-slate-500">{stats.activeProvider.model}</p>
                    <p className="text-xs text-slate-400">{stats.activeProvider.baseUrl}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-slate-400">{t('dashboard.noProvider')}</p>
                    <Link to="/settings" className="text-xs text-blue-700 hover:underline">
                      {t('dashboard.configureProvider')}
                    </Link>
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                {stats.activeProvider ? (
                  <span className="badge badge-success">{t('dashboard.operational')}</span>
                ) : (
                  <span className="badge badge-danger">{t('dashboard.noActiveProvider')}</span>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
