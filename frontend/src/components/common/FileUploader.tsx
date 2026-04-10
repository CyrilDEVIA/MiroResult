import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import api from '@/services/api'

interface FileUploaderProps {
  onSuccess: () => void
}

export function FileUploader({ onSuccess }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function upload(file: File) {
    const allowed = ['.zip', '.json']
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowed.includes(ext)) {
      setError('Format non supporté. Formats acceptés : .zip, .json')
      return
    }

    setError('')
    setLoading(true)

    try {
      const form = new FormData()
      form.append('file', file)
      await api.post('/api/simulations', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onSuccess()
    } catch {
      setError("Erreur lors de l'import — vérifiez le format du fichier")
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <p className="text-sm text-slate-500 mb-2">
          {loading
            ? 'Import en cours...'
            : 'Glisser le dossier zippé MiroFish ou un fichier JSON'}
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="badge badge-info">ZIP</span>
          <span className="badge badge-info">JSON</span>
          <span className="text-xs text-slate-400">— max 100 Mo</span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".zip,.json"
        onChange={handleChange}
        className="hidden"
      />

      {error && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
