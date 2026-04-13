import { useTranslation } from 'react-i18next'
import { LANG_KEY } from '@/i18n'

export function LangToggle() {
  const { t, i18n } = useTranslation()
  const current = i18n.language === 'en' ? 'en' : 'fr'

  function toggle() {
    const next = current === 'fr' ? 'en' : 'fr'
    i18n.changeLanguage(next)
    localStorage.setItem(LANG_KEY, next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('lang.switchTo')}
      title={t('lang.switchTo')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors w-full"
    >
      <span className="text-slate-500">{t('lang.current')}</span>
      <span className="text-slate-700 select-none">·</span>
      <span className="text-slate-300">{t('lang.other')}</span>
    </button>
  )
}
