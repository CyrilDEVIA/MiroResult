import { useTranslation } from 'react-i18next'
import type { AnalysisEntry } from './AnalysisHistory'

interface Section {
  title: string
  content: string
}

interface Props {
  entries: [AnalysisEntry, AnalysisEntry]
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AnalysisCompare({ entries, onClose }: Props) {
  const { t } = useTranslation()
  const [a, b] = entries

  const sectionsA = parseSections(a.rawText)
  const sectionsB = parseSections(b.rawText)

  const mapA = new Map(sectionsA.map((s) => [s.title, s.content]))
  const mapB = new Map(sectionsB.map((s) => [s.title, s.content]))

  // Union des titres dans l'ordre d'apparition (A en premier, puis ceux de B absents de A)
  const seen = new Set<string>()
  const orderedTitles: string[] = []
  for (const s of sectionsA) {
    if (!seen.has(s.title)) {
      seen.add(s.title)
      orderedTitles.push(s.title)
    }
  }
  for (const s of sectionsB) {
    if (!seen.has(s.title)) {
      seen.add(s.title)
      orderedTitles.push(s.title)
    }
  }

  const hasSections = orderedTitles.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-slate-900">{t('analysis.compareTitle')}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('analysis.compareSubtitle')}
          </p>
        </div>
        <button onClick={onClose} className="btn-secondary text-sm shrink-0">
          {t('analysis.closeCompare')}
        </button>
      </div>

      {/* En-têtes colonnes */}
      <div className="grid grid-cols-2 gap-4">
        {([a, b] as AnalysisEntry[]).map((entry, i) => (
          <div
            key={entry.id}
            className={`card space-y-0.5 border-t-2 ${i === 0 ? 'border-t-blue-400' : 'border-t-slate-400'}`}
          >
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              {i === 0 ? t('analysis.entryA') : t('analysis.entryB')}
            </p>
            <p className="text-sm font-medium text-slate-800">{entry.provider}</p>
            <p className="text-xs font-mono text-slate-400 truncate">{entry.model}</p>
            <p className="text-xs text-slate-400">{formatDate(entry.createdAt)}</p>
          </div>
        ))}
      </div>

      {/* Sections comparées */}
      {hasSections ? (
        orderedTitles.map((title) => {
          const contentA = mapA.get(title) ?? null
          const contentB = mapB.get(title) ?? null
          const differ = contentA?.trim() !== contentB?.trim()

          const cellBase = 'rounded-xl border p-4 min-h-[4rem]'
          const cellClass = differ
            ? `${cellBase} border-yellow-300 bg-yellow-50`
            : `${cellBase} border-slate-100 bg-white`

          return (
            <div key={title}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                  {title}
                </p>
                {differ && (
                  <span className="badge badge-warning text-xs normal-case tracking-normal">
                    {t('analysis.different')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={cellClass}>
                  {contentA !== null ? (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {contentA.trim()}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{t('analysis.sectionAbsent')}</p>
                  )}
                </div>
                <div className={cellClass}>
                  {contentB !== null ? (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {contentB.trim()}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{t('analysis.sectionAbsent')}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })
      ) : (
        // Fallback texte brut si aucune section `##` détectée
        <div className="grid grid-cols-2 gap-4">
          {([a, b] as AnalysisEntry[]).map((entry) => (
            <div key={entry.id} className="card">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {entry.rawText}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Bouton fermer bas de page */}
      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="btn-secondary text-sm">
          {t('analysis.closeCompare')}
        </button>
      </div>
    </div>
  )
}
