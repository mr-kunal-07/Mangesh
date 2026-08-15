export type AppRoute = 'dashboard' | 'receipts' | 'expenses' | 'reports' | 'settings'

export const ROUTE_PATHS: Record<AppRoute, string> = {
  dashboard: '/dashboard',
  receipts: '/receipts',
  expenses: '/expenses',
  reports: '/reports',
  settings: '/settings',
}

export const APP_ROUTES: AppRoute[] = ['dashboard', 'receipts', 'expenses', 'reports', 'settings']
