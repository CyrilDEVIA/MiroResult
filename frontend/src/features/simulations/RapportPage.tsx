import { useLocation, useNavigate, useParams } from 'react-router-dom'

interface LocationState {
  html: string
  filename: string
}

function downloadHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/\.[^.]+$/, '') + '.html'
  a.click()
  URL.revokeObjectURL(url)
}

export default function RapportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const state = location.state as LocationState | null

  if (!state?.html) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-slate-500 text-sm mb-4">
          Rapport non disponible — la page a été rechargée ou le rapport n'a pas encore été généré.
        </p>
        <button
          type="button"
          onClick={() => navigate('/simulations')}
          className="btn-accent"
        >
          Retour aux simulations
        </button>
      </div>
    )
  }

  const { html, filename } = state

  return (
    <div className="-mx-8 -my-8">

      {/* Barre de navigation fixe */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/simulations')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Simulations
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-mono text-slate-600 truncate">{filename}</span>
          <span className="badge badge-info shrink-0">HTML</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 hidden sm:block font-mono">{id?.slice(0, 8)}</span>
          <button
            type="button"
            onClick={() => downloadHtml(html, filename)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg px-3 py-1.5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Télécharger
          </button>
        </div>
      </div>

      {/* Rapport HTML pleine page */}
      <iframe
        srcDoc={html}
        title={`Rapport MiroFish — ${filename}`}
        className="w-full border-0 block"
        style={{ height: 'calc(100vh - 49px)' }}
        sandbox="allow-same-origin"
      />

    </div>
  )
}
