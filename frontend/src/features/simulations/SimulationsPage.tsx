import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import api from '@/services/api'

interface Provider {
  id: string
  name: string
  model: string
  hasKey: boolean
}

interface ProvidersResponse {
  active: string | null
  providers: Provider[]
}

interface UploadResponse {
  success: boolean
  data: { simulation: { id: string } }
}

interface HtmlReportResponse {
  success: boolean
  html: string
}

type Status = 'idle' | 'uploading' | 'generating' | 'error'

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Générer le rapport',
  uploading: 'Import du fichier…',
  generating: 'Génération en cours…',
  error: 'Réessayer',
}

export default function SimulationsPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [providers, setProviders] = useState<Provider[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [instructions, setInstructions] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    api.get<ProvidersResponse>('/api/settings/providers')
      .then(({ data }) => {
        setProviders(data.providers)
        if (data.active) {
          setSelectedProviderId(data.active)
        } else if (data.providers.length > 0) {
          setSelectedProviderId(data.providers[0].id)
        }
      })
      .catch(() => {})
  }, [])

  function acceptFile(f: File) {
    if (!f.name.endsWith('.zip')) {
      toast.error('Format invalide — déposez un fichier .zip MiroFish')
      return
    }
    setFile(f)
    setErrorMsg('')
    setStatus('idle')
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) acceptFile(dropped)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked) acceptFile(picked)
    // Reset input pour permettre re-sélection du même fichier
    e.target.value = ''
  }

  async function handleGenerate() {
    if (!file || status === 'uploading' || status === 'generating') return
    if (!selectedProviderId) {
      toast.error('Sélectionnez un provider IA')
      return
    }

    setErrorMsg('')
    setStatus('uploading')

    let simulationId: string
    try {
      const form = new FormData()
      form.append('file', file)
      const { data: uploadData } = await api.post<UploadResponse>('/api/simulations', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      simulationId = uploadData.data.simulation.id
    } catch {
      setStatus('error')
      setErrorMsg("Erreur lors de l'import du fichier ZIP. Vérifiez que le fichier est valide.")
      return
    }

    setStatus('generating')
    try {
      const body: Record<string, string> = { providerId: selectedProviderId }
      if (instructions.trim()) body.userInstructions = instructions.trim()

      const { data } = await api.post<HtmlReportResponse>(`/api/html-report/${simulationId}`, body)
      navigate(`/simulations/${simulationId}/rapport`, {
        state: { html: data.html, filename: file.name },
      })
    } catch {
      setStatus('error')
      setErrorMsg('Erreur lors de la génération du rapport HTML. Vérifiez votre provider IA.')
    }
  }

  const activeProvider = providers.find((p) => p.id === selectedProviderId)
  const canGenerate = file !== null && selectedProviderId !== '' && status !== 'uploading' && status !== 'generating'

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1>Générer un rapport MiroFish</h1>
        <p className="text-sm text-slate-500 mt-1">
          Déposez un ZIP de simulation et obtenez un rapport HTML autonome prêt à télécharger.
        </p>
      </div>

      {/* 1. Zone Drag & Drop */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        className={[
          'card border-2 border-dashed rounded-xl cursor-pointer transition-colors mb-5 select-none',
          dragging
            ? 'border-blue-400 bg-blue-50'
            : file
            ? 'border-blue-300 bg-blue-50'
            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50',
        ].join(' ')}
        style={{ padding: '2.5rem 2rem', outline: 'none' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="flex flex-col items-center gap-3 text-center pointer-events-none">
          {file ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800">{file.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(file.size / 1024 / 1024).toFixed(2)} Mo — cliquez pour changer
                </p>
              </div>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
              <div>
                <p className="text-sm font-medium text-slate-600">Déposez votre ZIP MiroFish ici</p>
                <p className="text-xs text-slate-400 mt-0.5">ou cliquez pour sélectionner — .zip uniquement, max 100 Mo</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Sélecteur de provider */}
      <div className="card mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Provider IA</p>
        {providers.length === 0 ? (
          <p className="text-sm text-slate-500">
            Aucun provider configuré —{' '}
            <Link to="/settings" className="text-blue-700 hover:underline">Paramètres</Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProviderId(p.id)}
                className={[
                  'px-4 py-2 rounded-lg text-sm transition-colors border',
                  selectedProviderId === p.id
                    ? 'bg-slate-900 text-white border-slate-900 font-medium'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
                ].join(' ')}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        {activeProvider && (
          <p className="text-xs text-slate-400 mt-2 font-mono">{activeProvider.model}</p>
        )}
      </div>

      {/* 3. Format de sortie */}
      <div className="card mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Format de sortie</p>
        <span className="badge badge-info">HTML</span>
      </div>

      {/* 4. Zone prompt libre */}
      <div className="card mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
          Consignes particulières
          <span className="normal-case font-normal text-slate-400 tracking-normal ml-2">(optionnel)</span>
        </p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Ex : mets en avant les métriques de diversité, inclus une section risques…"
          rows={4}
          maxLength={2000}
          className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:border-blue-300 placeholder:text-slate-400"
        />
        {instructions.length > 0 && (
          <p className="text-xs text-slate-400 text-right mt-1">{instructions.length}/2000</p>
        )}
      </div>

      {/* Message d'erreur */}
      {errorMsg && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
          {errorMsg}
        </div>
      )}

      {/* 5. Bouton Générer */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {status === 'uploading' && 'Import du fichier ZIP en cours…'}
          {status === 'generating' && 'Appel au modèle claude-sonnet-4-6, patientez…'}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="btn-accent disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {(status === 'uploading' || status === 'generating') && (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          {STATUS_LABEL[status]}
        </button>
      </div>

    </div>
  )
}
