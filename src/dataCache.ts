import type { ExpenseRecord } from './expenseService'
import type { ReceiptRecord } from './receiptService'

const MANAGEMENT_CACHE_KEY = 'banti.management-data.v1'
const CACHE_VERSION = 1

export type ManagementDataCache = {
  receipts: ReceiptRecord[]
  expenses: ExpenseRecord[]
  savedAt: number
}

const EMPTY_CACHE: ManagementDataCache = { receipts: [], expenses: [], savedAt: 0 }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getCachedManagementData(): ManagementDataCache {
  if (typeof window === 'undefined') return EMPTY_CACHE

  try {
    const raw = window.localStorage.getItem(MANAGEMENT_CACHE_KEY)
    if (!raw) return EMPTY_CACHE
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== CACHE_VERSION) return EMPTY_CACHE

    return {
      receipts: Array.isArray(parsed.receipts) ? parsed.receipts.filter(isRecord) as ReceiptRecord[] : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses.filter(isRecord) as ExpenseRecord[] : [],
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    }
  } catch {
    return EMPTY_CACHE
  }
}

let cancelPendingCacheWrite: (() => void) | null = null

export function cacheManagementData(receipts: ReceiptRecord[], expenses: ExpenseRecord[]) {
  if (typeof window === 'undefined') return

  const writeCache = () => {
    cancelPendingCacheWrite = null
    try {
      window.localStorage.setItem(MANAGEMENT_CACHE_KEY, JSON.stringify({
        version: CACHE_VERSION,
        receipts,
        expenses,
        savedAt: Date.now(),
      }))
    } catch {
      // Firebase remains the source of truth if browser storage is unavailable or full.
    }
  }

  cancelPendingCacheWrite?.()

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(writeCache, { timeout: 1_500 })
    cancelPendingCacheWrite = () => window.cancelIdleCallback(idleId)
    return
  }

  const timeoutId = setTimeout(writeCache, 60)
  cancelPendingCacheWrite = () => clearTimeout(timeoutId)
}
