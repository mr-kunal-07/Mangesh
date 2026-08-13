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
  limitToLast,
  onValue,
  orderByKey,
  push,
  query,
  ref,
  runTransaction,
  serverTimestamp,
  set,
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

export type NewReceiptRecord = Omit<ReceiptRecord, 'id' | 'createdAt'>

const OPERATOR_ID = 'Mangesh'
const OPERATOR_EMAIL = 'mangesh@thesamplebee.app'
const ROOT_PATH = 'receiptSystem'

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
  return `OSM/${financialYear}/${String(sequence).padStart(6, '0')}`
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
  await set(receiptReference, {
    ...record,
    createdAt: serverTimestamp(),
  })
  return receiptReference.key
}

export function observeRecentReceipts(
  callback: (receipts: ReceiptRecord[]) => void,
  onError: (error: Error) => void,
) {
  const recentQuery = query(
    ref(database, `${ROOT_PATH}/receipts`),
    orderByKey(),
    limitToLast(8),
  )

  return onValue(
    recentQuery,
    (snapshot) => {
      const receipts: ReceiptRecord[] = []
      snapshot.forEach((child) => {
        receipts.push({ id: child.key ?? '', ...child.val() } as ReceiptRecord)
      })
      callback(receipts.reverse())
    },
    onError,
  )
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
