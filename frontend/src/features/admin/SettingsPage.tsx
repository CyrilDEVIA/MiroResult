import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Swal from 'sweetalert2'
import api from '@/services/api'

const KEY_MASK = '••••••••'

interface ProviderDisplay {
  id: string
  name: string
  baseUrl: string
  model: string
  hasKey: boolean
}

interface ProvidersResponse {
  active: string | null
  providers: ProviderDisplay[]
}

interface FormState {
  name: string
  baseUrl: string
  apiKey: string
  model: string
}

const emptyForm: FormState = { name: '', baseUrl: '', apiKey: '', model: '' }

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-800 font-mono placeholder:font-sans placeholder:text-slate-400'

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

type Mode = 'list' | 'create' | 'edit'

export default function SettingsPage() {
  const [providers, setProviders] = useState<ProviderDisplay[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingHadKey, setEditingHadKey] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadProviders = useCallback(() => {
    setLoading(true)
    api
      .get<ProvidersResponse>('/api/settings/providers')
      .then(({ data }) => {
        setProviders(data.providers)
        setActive(data.active)
      })
      .catch(() => toast.error('Impossible de charger les providers'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadProviders() }, [loadProviders])

  // ─── Formulaire ───────────────────────────────────────────────────────────

  function openCreate() {
    setForm(emptyForm)
    setEditingId(null)
    setEditingHadKey(false)
    setShowKey(false)
    setMode('create')
  }

  function openEdit(p: ProviderDisplay) {
    setForm({
      name: p.name,
      baseUrl: p.baseUrl,
      apiKey: p.hasKey ? KEY_MASK : '',
      model: p.model,
    })
    setEditingId(p.id)
    setEditingHadKey(p.hasKey)
    setShowKey(false)
    setMode('edit')
  }

  function cancelForm() {
    setMode('list')
    setEditingId(null)
  }

  function handleKeyFocus() {
    if (form.apiKey === KEY_MASK) {
      setForm((f) => ({ ...f, apiKey: '' }))
    }
  }

  function handleKeyBlur() {
    if (form.apiKey === '' && editingHadKey) {
      setForm((f) => ({ ...f, apiKey: KEY_MASK }))
    }
  }

  async function handleSubmit() {
    if (!form.name || !form.baseUrl || !form.model) {
      toast.error('Nom, URL et modèle sont obligatoires')
      return
    }
    if (mode === 'create' && !form.apiKey) {
      toast.error('La clé API est obligatoire à la création')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name,
        baseUrl: form.baseUrl,
        model: form.model,
        apiKey: form.apiKey === KEY_MASK ? '' : form.apiKey,
      }

      if (mode === 'create') {
        await api.post('/api/settings/providers', payload)
        toast.success('Provider ajouté')
      } else {
        await api.patch(`/api/settings/providers/${editingId}`, payload)
        toast.success('Provider mis à jour')
      }

      cancelForm()
      loadProviders()
    } catch {
      toast.error(mode === 'create' ? 'Échec de l\'ajout du provider' : 'Échec de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async function handleDelete(p: ProviderDisplay) {
    const result = await Swal.fire({
      title: 'Supprimer ce provider ?',
      html: `<span style="font-family:monospace">${p.name}</span> sera supprimé définitivement.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc2626',
      focusCancel: true,
    })

    if (!result.isConfirmed) return

    try {
      await api.delete(`/api/settings/providers/${p.id}`)
      toast.success('Provider supprimé')
      if (active === p.id) setActive(null)
      loadProviders()
    } catch {
      toast.error('Échec de la suppression')
    }
  }

  // ─── Rendu formulaire ─────────────────────────────────────────────────────

  function renderForm() {
    const isCreate = mode === 'create'
    return (
      <div className="card space-y-5">
        <h3>{isCreate ? 'Ajouter un provider' : 'Modifier le provider'}</h3>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Nom du provider <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="ex: OpenRouter"
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            URL de base <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.baseUrl}
            onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
            placeholder="ex: https://openrouter.ai/api/v1"
            className={inputClass}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Clé API {isCreate && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
              onFocus={handleKeyFocus}
              onBlur={handleKeyBlur}
              placeholder={isCreate ? 'sk-...' : '(inchangée si vide)'}
              autoComplete="new-password"
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              <EyeIcon open={showKey} />
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            Modèle <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            placeholder="ex: anthropic/claude-3.5-sonnet"
            className={inputClass}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={handleSubmit} disabled={saving} className={`btn-accent ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {saving ? 'Enregistrement...' : isCreate ? 'Ajouter' : 'Enregistrer'}
          </button>
          <button onClick={cancelForm} disabled={saving} className="btn-secondary">
            Annuler
          </button>
        </div>
      </div>
    )
  }

  // ─── Rendu liste ──────────────────────────────────────────────────────────

  function renderList() {
    if (loading) {
      return <p className="text-sm text-slate-400">Chargement...</p>
    }

    if (providers.length === 0) {
      return (
        <div className="card text-center py-10">
          <p className="text-sm text-slate-400">Aucun provider configuré.</p>
          <p className="text-xs text-slate-300 mt-1">Ajoutez un provider OpenAI-compatible pour activer l'analyse IA.</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {providers.map((p) => {
          const isActive = p.id === active
          return (
            <div key={p.id} className={`card flex items-start gap-4 ${isActive ? 'border-blue-800' : ''}`}>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-800 text-sm">{p.name}</span>
                  {isActive && (
                    <span className="badge badge-success text-xs">Actif</span>
                  )}
                  {!p.hasKey && (
                    <span className="badge badge-warning text-xs">Clé manquante</span>
                  )}
                </div>
                <p className="text-xs font-mono text-slate-500 truncate">{p.baseUrl}</p>
                <p className="text-xs text-slate-400 font-mono">{p.model}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(p)}
                  className="btn-secondary text-xs px-2 py-1.5"
                  title="Modifier"
                >
                  <PencilIcon />
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="btn-secondary text-xs px-2 py-1.5 text-red-500 hover:text-red-700"
                  title="Supprimer"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Paramètres</h1>
        <p className="text-sm text-slate-500 mt-1">Configuration de l'application</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-slate-800">Providers IA</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Endpoints OpenAI-compatibles — le provider se choisit au moment de chaque analyse
            </p>
          </div>
          {mode === 'list' && (
            <button onClick={openCreate} className="btn-accent text-sm px-4 py-2">
              + Ajouter
            </button>
          )}
        </div>

        {mode !== 'list' ? renderForm() : renderList()}
      </div>
    </div>
  )
}
