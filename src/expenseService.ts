import { get, push, ref, serverTimestamp, set } from 'firebase/database'
import { database } from './firebase'
import type { PaymentType } from './receiptService'

export type ExpenseCategory = 'festival' | 'decoration' | 'utilities' | 'food' | 'transport' | 'other'

export type ExpenseRecord = {
  id: string
  financialYear: string
  expenseDate: string
  category: ExpenseCategory
  description: string
  amount: number
  paymentType: PaymentType
  reference: string
  createdAt: number
  createdBy: string
  createdByName: string
}

export type NewExpenseRecord = Omit<ExpenseRecord, 'id' | 'createdAt'>

const EXPENSE_PATH = 'receiptSystem/expenses'

export async function saveExpense(record: NewExpenseRecord) {
  const expenseReference = push(ref(database, EXPENSE_PATH))
  await set(expenseReference, { ...record, createdAt: serverTimestamp() })
  return expenseReference.key
}

export async function getAllExpenses() {
  const snapshot = await get(ref(database, EXPENSE_PATH))
  const expenses: ExpenseRecord[] = []
  snapshot.forEach((child) => {
    expenses.push({ id: child.key ?? '', ...child.val() } as ExpenseRecord)
  })
  return expenses.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
}
