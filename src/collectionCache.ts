import type { CollectionPaymentRecord, ContributionRecord, MemberRecord } from './collectionService'

const COLLECTION_CACHE_KEY = 'banti.collections-data.v1'
const CACHE_VERSION = 1

export type CollectionDataCache = {
  members: MemberRecord[]
  contributions: ContributionRecord[]
  payments: CollectionPaymentRecord[]
  savedAt: number
}

const EMPTY_CACHE: CollectionDataCache = { members: [], contributions: [], payments: [], savedAt: 0 }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getCachedCollectionData(): CollectionDataCache {
  if (typeof window === 'undefined') return EMPTY_CACHE
  try {
    const raw = window.localStorage.getItem(COLLECTION_CACHE_KEY)
    if (!raw) return EMPTY_CACHE
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== CACHE_VERSION) return EMPTY_CACHE
    return {
      members: Array.isArray(parsed.members) ? parsed.members.filter(isRecord) as MemberRecord[] : [],
      contributions: Array.isArray(parsed.contributions) ? parsed.contributions.filter(isRecord) as ContributionRecord[] : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments.filter(isRecord) as CollectionPaymentRecord[] : [],
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    }
  } catch {
    return EMPTY_CACHE
  }
}

let cancelPendingWrite: (() => void) | null = null

export function cacheCollectionData(data: Omit<CollectionDataCache, 'savedAt'>) {
  if (typeof window === 'undefined') return
  const write = () => {
    cancelPendingWrite = null
    try {
      window.localStorage.setItem(COLLECTION_CACHE_KEY, JSON.stringify({
        version: CACHE_VERSION,
        ...data,
        savedAt: Date.now(),
      }))
    } catch {
      // Firebase remains the source of truth when browser storage is unavailable.
    }
  }

  cancelPendingWrite?.()
  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(write, { timeout: 1_500 })
    cancelPendingWrite = () => window.cancelIdleCallback(idleId)
  } else {
    const timeoutId = setTimeout(write, 60)
    cancelPendingWrite = () => clearTimeout(timeoutId)
  }
}
