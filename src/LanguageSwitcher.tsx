import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_STORAGE_KEY, type AppLanguage } from './i18n'

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const language = (i18n.resolvedLanguage ?? i18n.language).split('-')[0] as AppLanguage

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const changeLanguage = (nextLanguage: AppLanguage) => {
    void i18n.changeLanguage(nextLanguage)
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
  }

  return (
    <div className="language-switcher" role="group" aria-label={t('language.select')}>
      <button type="button" className={language === 'mr' ? 'active' : ''} onClick={() => changeLanguage('mr')}>
        {t('language.marathi')}
      </button>
      <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => changeLanguage('en')}>
        {t('language.english')}
      </button>
    </div>
  )
}

