import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Languages } from 'lucide-react'

type Locale = 'vi' | 'en'
const languageKey = 'diva-language'
const I18n = createContext({ locale: 'vi' as Locale, setLocale: (_: Locale) => {} })

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => localStorage.getItem(languageKey) === 'en' ? 'en' : 'vi')
  useEffect(() => {
    document.documentElement.lang = locale
    document.title = locale === 'en' ? 'DiVA Vision Explorer — Explore MMV Vision 2035' : 'DiVA Vision Explorer — Khám phá MMV Vision 2035'
    localStorage.setItem(languageKey, locale)
  }, [locale])
  return <I18n.Provider value={{ locale, setLocale }}>{children}</I18n.Provider>
}

export function useI18n() {
  const { locale, setLocale } = useContext(I18n)
  return { locale, setLocale, t: (vi: string, en: string) => locale === 'en' ? en : vi }
}

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()
  return (
    <label className={className ?? 'inline-flex h-9 items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 text-sm font-bold text-diva-ink shadow-sm'}>
      <Languages className="h-4 w-4" aria-hidden />
      <select className="bg-transparent" aria-label={t('Ngôn ngữ', 'Language')} value={locale} onChange={(event) => setLocale(event.target.value === 'en' ? 'en' : 'vi')}>
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
      </select>
    </label>
  )
}
