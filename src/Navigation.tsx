import { useTranslation } from 'react-i18next'
import { APP_ROUTES, type AppRoute } from './appRoutes'

function RouteIcon({ route }: { route: AppRoute }) {
  if (route === 'dashboard') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  if (route === 'receipts') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
  if (route === 'expenses') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v12H4z" /><path d="M4 10h16M16 15h2" /><path d="M7 7V5h10v2" /></svg>
  if (route === 'reports') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V10M12 21V3M19 21v-7" /><path d="M3 21h18" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.38.35.72.64 1 .29.28.67.42 1.07.4H21v4h-.1A1.7 1.7 0 0 0 19.4 15Z" /></svg>
}

function NavigationButton({ route, activeRoute, onNavigate, compact = false }: {
  route: AppRoute
  activeRoute: AppRoute
  onNavigate: (route: AppRoute) => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  return (
    <button className={activeRoute === route ? 'active' : ''} type="button" onClick={() => onNavigate(route)} aria-current={activeRoute === route ? 'page' : undefined}>
      <RouteIcon route={route} />
      <span>{t(`nav.${route}`)}</span>
      {!compact && <i aria-hidden="true" />}
    </button>
  )
}

export function DesktopSidebar({ activeRoute, onNavigate }: { activeRoute: AppRoute; onNavigate: (route: AppRoute) => void }) {
  const { t } = useTranslation()
  return (
    <aside className="management-sidebar">
      <nav aria-label={t('nav.primary')}>{APP_ROUTES.map((route) => <NavigationButton key={route} route={route} activeRoute={activeRoute} onNavigate={onNavigate} />)}</nav>
      <div className="sidebar-footer"><i aria-hidden="true" /><div><strong>Mangesh</strong><small>{t('nav.operator')}</small></div></div>
    </aside>
  )
}

export function MobileBottomNavigation({ activeRoute, onNavigate }: { activeRoute: AppRoute; onNavigate: (route: AppRoute) => void }) {
  const { t } = useTranslation()
  return <nav className="mobile-bottom-nav" aria-label={t('nav.primary')}>{APP_ROUTES.map((route) => <NavigationButton key={route} route={route} activeRoute={activeRoute} onNavigate={onNavigate} compact />)}</nav>
}
