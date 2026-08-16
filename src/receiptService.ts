import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import {
  get,
  limitToFirst,
  onValue,
  orderByKey,
  push,
  query,
  ref,
  runTransaction,
  serverTimestamp,
  startAfter,
  update,
} from 'firebase/database'
import { auth, database } from './firebase'

export type PaymentType = 'cash' | 'upi' | 'bank' | 'cheque'

export type ReceiptRecord = {
  id: string
  receiptNumber: string
  sequence: number
  financialYear: string
  name: string
  mobile: string
  paymentType: PaymentType
  paymentDate: string
  amount: number
  amountInWords: string
  reference: string
  createdAt: number
  createdBy: string
  createdByName: string
}

export function observeDatabaseConnection(callback: (connected: boolean) => void) {
  return onValue(ref(database, '.info/connected'), (snapshot) => callback(snapshot.val() === true))
}

export type NewReceiptRecord = Omit<ReceiptRecord, 'id' | 'createdAt'>

export type ReceiptPage = {
  receipts: ReceiptRecord[]
  hasNextPage: boolean
  nextCursor: string | null
}

const OPERATOR_ID = 'Mangesh'
const OPERATOR_EMAIL = 'mangesh@thesamplebee.app'
const ROOT_PATH = 'receiptSystem'
const RECEIPT_PREFIX = 'OSSM'

export function observeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export async function loginOperator(operatorId: string, password: string) {
  if (operatorId.trim().toLowerCase() !== OPERATOR_ID.toLowerCase()) {
    throw new Error('INVALID_OPERATOR')
  }

  await setPersistence(auth, browserLocalPersistence)
  return signInWithEmailAndPassword(auth, OPERATOR_EMAIL, password)
}

export function logoutOperator() {
  return signOut(auth)
}

export function getFinancialYear(date = new Date()) {
  const calendarYear = date.getFullYear()
  const startYear = date.getMonth() >= 3 ? calendarYear : calendarYear - 1
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`
}

export function formatReceiptNumber(financialYear: string, sequence: number) {
  return `${RECEIPT_PREFIX}/${financialYear}/${String(sequence).padStart(6, '0')}`
}

function counterReference(financialYear: string) {
  return ref(database, `${ROOT_PATH}/counters/${financialYear}`)
}

export async function getNextReceiptNumber(financialYear: string) {
  const snapshot = await get(counterReference(financialYear))
  const currentSequence = Number(snapshot.val()) || 0
  return formatReceiptNumber(financialYear, currentSequence + 1)
}

export async function reserveReceiptNumber(financialYear: string) {
  const result = await runTransaction(counterReference(financialYear), (current) => {
    return (Number(current) || 0) + 1
  })

  if (!result.committed) throw new Error('RECEIPT_NUMBER_NOT_RESERVED')

  const sequence = Number(result.snapshot.val())
  return {
    sequence,
    receiptNumber: formatReceiptNumber(financialYear, sequence),
  }
}

export async function saveReceipt(record: NewReceiptRecord) {
  const receiptReference = push(ref(database, `${ROOT_PATH}/receipts`))
  const receiptId = receiptReference.key
  if (!receiptId) throw new Error('RECEIPT_KEY_NOT_CREATED')

  const sequenceKey = String(record.sequence).padStart(6, '0')
  await update(ref(database), {
    [`${ROOT_PATH}/receipts/${receiptId}`]: { ...record, createdAt: serverTimestamp() },
    [`${ROOT_PATH}/receiptIndex/${record.financialYear}/${sequenceKey}`]: receiptId,
  })
  return receiptReference.key
}

export async function getReceiptPage(
  financialYear: string,
  afterSequenceKey?: string,
  pageSize = 5,
): Promise<ReceiptPage> {
  const indexReference = ref(database, `${ROOT_PATH}/receiptIndex/${financialYear}`)
  const constraints = afterSequenceKey
    ? [orderByKey(), startAfter(afterSequenceKey), limitToFirst(pageSize + 1)]
    : [orderByKey(), limitToFirst(pageSize + 1)]
  const indexSnapshot = await get(query(indexReference, ...constraints))
  const indexEntries: Array<{ sequenceKey: string; receiptId: string }> = []

  indexSnapshot.forEach((child) => {
    indexEntries.push({ sequenceKey: child.key ?? '', receiptId: String(child.val()) })
  })

  const hasNextPage = indexEntries.length > pageSize
  const pageEntries = indexEntries.slice(0, pageSize)
  const pageReceipts = (await Promise.all(pageEntries.map(async ({ receiptId }) => {
    const snapshot = await get(ref(database, `${ROOT_PATH}/receipts/${receiptId}`))
    return snapshot.exists() ? { id: receiptId, ...snapshot.val() } as ReceiptRecord : null
  }))).filter((receipt): receipt is ReceiptRecord => receipt !== null)
  const nextCursor = pageEntries.at(-1)?.sequenceKey ?? null

  return {
    receipts: pageReceipts,
    hasNextPage,
    nextCursor,
  }
}

export async function getAllReceipts() {
  const snapshot = await get(ref(database, `${ROOT_PATH}/receipts`))
  const receipts: ReceiptRecord[] = []
  snapshot.forEach((child) => {
    receipts.push({ id: child.key ?? '', ...child.val() } as ReceiptRecord)
  })
  return receipts.sort((a, b) => {
    const yearOrder = a.financialYear.localeCompare(b.financialYear)
    return yearOrder || a.sequence - b.sequence
  })
}
