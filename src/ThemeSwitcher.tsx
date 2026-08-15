import { useTranslation } from 'react-i18next'
import type { ThemePreference } from './theme'

const themeOptions: ThemePreference[] = ['system', 'light', 'dark']

function ThemeIcon({ theme }: { theme: ThemePreference }) {
  if (theme === 'light') return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
  if (theme === 'dark') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.4 15.2A8.6 8.6 0 0 1 8.8 3.6 8.6 8.6 0 1 0 20.4 15.2Z" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></svg>
}

export default function ThemeSwitcher({ value, onChange }: { value: ThemePreference; onChange: (theme: ThemePreference) => void }) {
  const { t } = useTranslation()
  return (
    <div className="theme-switcher" role="group" aria-label={t('theme.select')}>
      {themeOptions.map((theme) => (
        <button key={theme} type="button" className={value === theme ? 'active' : ''} onClick={() => onChange(theme)} aria-pressed={value === theme}>
          <ThemeIcon theme={theme} />
          <span>{t(`theme.${theme}`)}</span>
        </button>
      ))}
    </div>
  )
}
