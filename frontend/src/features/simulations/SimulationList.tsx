import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import Swal from 'sweetalert2'
import api from '@/services/api'

interface Simulation {
  id: string
  filename: string
  status: 'pending' | 'processed' | 'error'
  createdAt: string
  report: { id: string } | null
}

/** @prop simulations - liste des simulations à afficher */
/** @prop onDelete - callback appelé après suppression réussie */
/** @prop onGenerateHtml - callback pour lancer la génération du rapport HTML */
/** @prop generatingId - id de la simulation en cours de génération HTML */
interface Props {
  simulations: Simulation[]
  onDelete: (id: string) => void
  onGenerateHtml: (id: string) => void
  generatingId: string | null
}

const STATUS_BADGE: Record<Simulation['status'], string> = {
  pending: 'badge badge-warning',
  processed: 'badge badge-success',
  error: 'badge badge-danger',
}

function TrashIcon() {
  return (
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
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
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
  )
}

export function SimulationList({ simulations, onDelete, onGenerateHtml, generatingId }: Props) {
  const { t } = useTranslation()

  async function handleDelete(sim: Simulation) {
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
      await api.delete(`/api/simulations/${sim.id}`)
      toast.success(t('simulations.deleteSuccess'))
      onDelete(sim.id)
    } catch {
      toast.error(t('simulations.deleteError'))
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide font-medium">{t('common.file')}</th>
            <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide font-medium">{t('common.status')}</th>
            <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide font-medium">{t('common.date')}</th>
            <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide font-medium">{t('simulations.thReport')}</th>
            <th className="px-5 py-3 text-left text-xs text-slate-500 uppercase tracking-wide font-medium">{t('simulations.thHtmlReport')}</th>
            <th className="px-5 py-3 text-right text-xs text-slate-500 uppercase tracking-wide font-medium">{t('simulations.thAction')}</th>
          </tr>
        </thead>
        <tbody>
          {simulations.map((sim) => {
            const isGenerating = generatingId === sim.id
            const canGenerate = sim.status === 'processed' || sim.report !== null

            return (
              <tr key={sim.id} className="border-t border-slate-100">
                <td className="px-5 py-3 font-mono text-sm text-slate-800">{sim.filename}</td>
                <td className="px-5 py-3">
                  <span className={STATUS_BADGE[sim.status]}>{t(`status.${sim.status}`)}</span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-400">
                  {new Date(sim.createdAt).toLocaleDateString('fr-FR')}
                </td>
                <td className="px-5 py-3">
                  {canGenerate ? (
                    <Link
                      to={`/simulations/${sim.id}/report`}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      {sim.report ? t('simulations.viewReport') : t('simulations.generateReport')}
                    </Link>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  {canGenerate ? (
                    <button
                      onClick={() => onGenerateHtml(sim.id)}
                      disabled={isGenerating}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-800 border border-blue-200 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-1 transition-colors"
                    >
                      {isGenerating ? (
                        <>
                          <SpinnerIcon />
                          {t('simulations.generatingShort')}
                        </>
                      ) : (
                        t('simulations.htmlReportBtn')
                      )}
                    </button>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleDelete(sim)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                    title={t('simulations.deleteTitle')}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
