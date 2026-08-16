import { get, push, ref, runTransaction, serverTimestamp, set, update } from 'firebase/database'
import { database } from './firebase'
import type { NewReceiptRecord, PaymentType, ReceiptRecord } from './receiptService'

export type MemberRecord = {
  id: string
  memberCode: string
  name: string
  mobile: string
  roomNumber: string
  address?: string
  active: boolean
  createdAt: number
  createdBy: string
  createdByName: string
}

export type ContributionAmountType = 'fixed' | 'custom'
export type ContributionScope = 'all' | 'selected'
export type ContributionStatus = 'active' | 'closed'

export type ContributionRecord = {
  id: string
  contributionCode: string
  name: string
  financialYear: string
  amountType: ContributionAmountType
  defaultAmount: number
  startDate: string
  dueDate: string
  scope: ContributionScope
  memberIds: string[]
  memberAmounts: Record<string, number>
  exemptMemberIds: Record<string, boolean>
  status: ContributionStatus
  createdAt: number
  createdBy: string
  createdByName: string
}

export type CollectionPaymentRecord = {
  id: string
  contributionId: string
  memberId: string
  amount: number
  paymentType: PaymentType
  paymentDate: string
  reference: string
  receiptId: string
  receiptNumber: string
  createdAt: number
  createdBy: string
  createdByName: string
}

export type NewMemberRecord = Omit<MemberRecord, 'id' | 'memberCode' | 'createdAt'>
export type NewContributionRecord = Omit<ContributionRecord, 'id' | 'contributionCode' | 'createdAt'>
export type NewCollectionPaymentRecord = Omit<CollectionPaymentRecord, 'id' | 'receiptId' | 'receiptNumber' | 'createdAt'>

const ROOT_PATH = 'receiptSystem'
const MEMBERS_PATH = `${ROOT_PATH}/members`
const CONTRIBUTIONS_PATH = `${ROOT_PATH}/collections`
const PAYMENTS_PATH = `${ROOT_PATH}/collectionPayments`

function snapshotList<T extends { id: string }>(snapshot: Awaited<ReturnType<typeof get>>) {
  const records: T[] = []
  snapshot.forEach((child) => {
    records.push({ id: child.key ?? '', ...child.val() } as T)
  })
  return records
}

export async function getCollectionData() {
  const [memberSnapshot, contributionSnapshot, paymentSnapshot] = await Promise.all([
    get(ref(database, MEMBERS_PATH)),
    get(ref(database, CONTRIBUTIONS_PATH)),
    get(ref(database, PAYMENTS_PATH)),
  ])

  const members = snapshotList<MemberRecord>(memberSnapshot)
    .sort((a, b) => a.name.localeCompare(b.name, 'mr'))
  const contributions = snapshotList<ContributionRecord>(contributionSnapshot)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
  const payments = snapshotList<CollectionPaymentRecord>(paymentSnapshot)
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))

  return { members, contributions, payments }
}

async function reserveCounter(path: string) {
  const result = await runTransaction(ref(database, path), (current) => (Number(current) || 0) + 1)
  if (!result.committed) throw new Error('COUNTER_NOT_RESERVED')
  return Number(result.snapshot.val())
}

export async function saveMember(record: NewMemberRecord) {
  const sequence = await reserveCounter(`${ROOT_PATH}/memberCounter`)
  const memberReference = push(ref(database, MEMBERS_PATH))
  const memberId = memberReference.key
  if (!memberId) throw new Error('MEMBER_KEY_NOT_CREATED')

  const memberCode = `OSSM-M-${String(sequence).padStart(4, '0')}`
  await set(memberReference, { ...record, memberCode, createdAt: serverTimestamp() })
  return { id: memberId, memberCode }
}

export async function setMemberActive(memberId: string, active: boolean) {
  await set(ref(database, `${MEMBERS_PATH}/${memberId}/active`), active)
}

export async function saveContribution(record: NewContributionRecord) {
  const sequence = await reserveCounter(`${ROOT_PATH}/collectionCounters/${record.financialYear}`)
  const contributionReference = push(ref(database, CONTRIBUTIONS_PATH))
  const contributionId = contributionReference.key
  if (!contributionId) throw new Error('COLLECTION_KEY_NOT_CREATED')

  const contributionCode = `OSSM-COL/${record.financialYear}/${String(sequence).padStart(3, '0')}`
  await set(contributionReference, { ...record, contributionCode, createdAt: serverTimestamp() })
  return { id: contributionId, contributionCode }
}

export async function setContributionStatus(contributionId: string, status: ContributionStatus) {
  await set(ref(database, `${CONTRIBUTIONS_PATH}/${contributionId}/status`), status)
}

export async function setContributionMemberExempt(contributionId: string, memberId: string, exempt: boolean) {
  await set(ref(database, `${CONTRIBUTIONS_PATH}/${contributionId}/exemptMemberIds/${memberId}`), exempt || null)
}

export async function recordCollectionPayment({
  payment,
  receipt,
  memberTarget,
}: {
  payment: NewCollectionPaymentRecord
  receipt: NewReceiptRecord
  memberTarget?: number
}) {
  const receiptReference = push(ref(database, `${ROOT_PATH}/receipts`))
  const paymentReference = push(ref(database, PAYMENTS_PATH))
  const receiptId = receiptReference.key
  const paymentId = paymentReference.key
  if (!receiptId || !paymentId) throw new Error('COLLECTION_PAYMENT_KEY_NOT_CREATED')

  const sequenceKey = String(receipt.sequence).padStart(6, '0')
  const updates: Record<string, unknown> = {
    [`${ROOT_PATH}/receipts/${receiptId}`]: { ...receipt, createdAt: serverTimestamp() },
    [`${ROOT_PATH}/receiptIndex/${receipt.financialYear}/${sequenceKey}`]: receiptId,
    [`${PAYMENTS_PATH}/${paymentId}`]: {
      ...payment,
      receiptId,
      receiptNumber: receipt.receiptNumber,
      createdAt: serverTimestamp(),
    },
  }

  if (memberTarget !== undefined && Number.isFinite(memberTarget) && memberTarget >= 0) {
    updates[`${CONTRIBUTIONS_PATH}/${payment.contributionId}/memberAmounts/${payment.memberId}`] = memberTarget
  }
  updates[`${CONTRIBUTIONS_PATH}/${payment.contributionId}/exemptMemberIds/${payment.memberId}`] = null

  await update(ref(database), updates)
  return {
    paymentId,
    receipt: { id: receiptId, ...receipt, createdAt: Date.now() } as ReceiptRecord,
  }
}
