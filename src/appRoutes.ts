export type AppRoute = 'dashboard' | 'collections' | 'members' | 'receipts' | 'expenses' | 'reports' | 'settings'

export const ROUTE_PATHS: Record<AppRoute, string> = {
  dashboard: '/dashboard',
  collections: '/collections',
  members: '/members',
  receipts: '/receipts',
  expenses: '/expenses',
  reports: '/reports',
  settings: '/settings',
}

export const APP_ROUTES: AppRoute[] = ['dashboard', 'collections', 'members', 'receipts', 'expenses', 'reports', 'settings']
