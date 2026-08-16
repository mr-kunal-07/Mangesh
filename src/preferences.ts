import type { AppRoute } from './appRoutes'
import type { PaymentType } from './receiptService'

export const PREFERENCES_STORAGE_KEY = 'banti.preferences'

export type AppPreferences = {
  defaultRoute: AppRoute
  receiptPaymentType: PaymentType
  expensePaymentType: PaymentType
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  defaultRoute: 'dashboard',
  receiptPaymentType: 'upi',
  expensePaymentType: 'cash',
}

const validRoutes: AppRoute[] = ['dashboard', 'collections', 'members', 'receipts', 'expenses', 'reports', 'settings']
const validPaymentTypes: PaymentType[] = ['cash', 'upi', 'bank', 'cheque']

export function getSavedPreferences(): AppPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? '{}') as Partial<AppPreferences>
    return {
      defaultRoute: saved.defaultRoute && validRoutes.includes(saved.defaultRoute) ? saved.defaultRoute : DEFAULT_PREFERENCES.defaultRoute,
      receiptPaymentType: saved.receiptPaymentType && validPaymentTypes.includes(saved.receiptPaymentType) ? saved.receiptPaymentType : DEFAULT_PREFERENCES.receiptPaymentType,
      expensePaymentType: saved.expensePaymentType && validPaymentTypes.includes(saved.expensePaymentType) ? saved.expensePaymentType : DEFAULT_PREFERENCES.expensePaymentType,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(preferences: AppPreferences) {
  window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
}
