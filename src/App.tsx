import { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import type { User } from 'firebase/auth'
import { useTranslation } from 'react-i18next'
import receiptTemplate from './assets/receipt-template-optimized.jpeg'
import LanguageSwitcher from './LanguageSwitcher'
import ThemeSwitcher from './ThemeSwitcher'
import DatePicker from './DatePicker'
import CollectionsPage from './CollectionsPage'
import MemberLedgerPage from './MemberLedgerPage'
import { getCollectionData } from './collectionService'
import type { AppLanguage } from './i18n'
import { downloadReceiptWorkbook } from './excelExport'
import { DesktopSidebar, MobileBottomNavigation } from './Navigation'
import { ROUTE_PATHS, type AppRoute } from './appRoutes'
import { getAllExpenses, saveExpense, type ExpenseCategory, type ExpenseRecord } from './expenseService'
import { getSavedTheme, resolveTheme, THEME_STORAGE_KEY, type ThemePreference } from './theme'
import { getSavedPreferences, savePreferences, type AppPreferences } from './preferences'
import { cacheManagementData, getCachedManagementData } from './dataCache'
import {
  formatReceiptNumber,
  getAllReceipts,
  getFinancialYear,
  getNextReceiptNumber,
  getReceiptPage,
  loginOperator,
  logoutOperator,
  observeAuth,
  observeDatabaseConnection,
  reserveReceiptNumber,
  saveReceipt,
  type PaymentType,
  type ReceiptRecord,
} from './receiptService'

type ReceiptForm = {
  receiptNumber: string
  name: string
  mobile: string
  paymentType: PaymentType
  paymentDate: string
  amount: string
  reference: string
}

type FormErrors = Partial<Record<keyof ReceiptForm, string>>

type ExpenseForm = {
  expenseDate: string
  category: ExpenseCategory
  description: string
  amount: string
  paymentType: PaymentType
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const EXPORT_RANGE_START = 0
const EXPORT_RANGE_END = Number.MAX_SAFE_INTEGER
const NOOP = () => undefined

function routeFromPath(pathname: string, fallback: AppRoute = 'dashboard'): AppRoute {
  const match = (Object.entries(ROUTE_PATHS) as Array<[AppRoute, string]>).find(([, path]) => path === pathname)
  return match?.[0] ?? fallback
}

function downloadTextFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function csvCell(value: string | number) {
  let safeValue = String(value ?? '')
  if (/^[=+\-@]/.test(safeValue)) safeValue = `'${safeValue}`
  return `"${safeValue.replace(/"/g, '""')}"`
}

function ExcelReportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path className="report-icon-sheet" d="M9 4.5h10v15H9z" />
      <path className="report-icon-grid" d="M13 8h6M13 12h6M13 16h6M16 4.5v15" />
      <path className="report-icon-panel" d="M4 7h10v10H4z" />
      <path className="report-icon-mark" d="m7 10 4 4m0-4-4 4" />
    </svg>
  )
}

function CsvReportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path className="report-icon-file" d="M6 3.5h8l4 4V20.5H6z" />
      <path className="report-icon-fold" d="M14 3.5v4h4" />
      <path className="report-icon-lines" d="M9 11h6M9 14h6M9 17h4" />
    </svg>
  )
}

function ListLoadingSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="list-loading-skeleton" role="status" aria-label={t('app.loadingRecords')}>
      {Array.from({ length: 4 }, (_, index) => <span key={index}><i /><b /></span>)}
    </div>
  )
}

const marathiNumbers = [
  'शून्य',
  'एक',
  'दोन',
  'तीन',
  'चार',
  'पाच',
  'सहा',
  'सात',
  'आठ',
  'नऊ',
  'दहा',
  'अकरा',
  'बारा',
  'तेरा',
  'चौदा',
  'पंधरा',
  'सोळा',
  'सतरा',
  'अठरा',
  'एकोणीस',
  'वीस',
  'एकवीस',
  'बावीस',
  'तेवीस',
  'चोवीस',
  'पंचवीस',
  'सव्वीस',
  'सत्तावीस',
  'अठ्ठावीस',
  'एकोणतीस',
  'तीस',
  'एकतीस',
  'बत्तीस',
  'तेहतीस',
  'चौतीस',
  'पस्तीस',
  'छत्तीस',
  'सदतीस',
  'अडतीस',
  'एकोणचाळीस',
  'चाळीस',
  'एकेचाळीस',
  'बेचाळीस',
  'त्रेचाळीस',
  'चव्वेचाळीस',
  'पंचेचाळीस',
  'सेहेचाळीस',
  'सत्तेचाळीस',
  'अठ्ठेचाळीस',
  'एकोणपन्नास',
  'पन्नास',
  'एकावन्न',
  'बावन्न',
  'त्रेपन्न',
  'चौपन्न',
  'पंचावन्न',
  'छप्पन्न',
  'सत्तावन्न',
  'अठ्ठावन्न',
  'एकोणसाठ',
  'साठ',
  'एकसष्ट',
  'बासष्ट',
  'त्रेसष्ट',
  'चौसष्ट',
  'पासष्ट',
  'सहासष्ट',
  'सदुसष्ट',
  'अडुसष्ट',
  'एकोणसत्तर',
  'सत्तर',
  'एकाहत्तर',
  'बहात्तर',
  'त्र्याहत्तर',
  'चौऱ्याहत्तर',
  'पंच्याहत्तर',
  'शहात्तर',
  'सत्याहत्तर',
  'अठ्ठ्याहत्तर',
  'एकोणऐंशी',
  'ऐंशी',
  'एक्याऐंशी',
  'ब्याऐंशी',
  'त्र्याऐंशी',
  'चौऱ्याऐंशी',
  'पंच्याऐंशी',
  'शहाऐंशी',
  'सत्याऐंशी',
  'अठ्ठ्याऐंशी',
  'एकोणनव्वद',
  'नव्वद',
  'एक्याण्णव',
  'ब्याण्णव',
  'त्र्याण्णव',
  'चौऱ्याण्णव',
  'पंच्याण्णव',
  'शहाण्णव',
  'सत्त्याण्णव',
  'अठ्ठ्याण्णव',
  'नव्याण्णव',
]

const hundredWords = [
  '',
  'एकशे',
  'दोनशे',
  'तीनशे',
  'चारशे',
  'पाचशे',
  'सहाशे',
  'सातशे',
  'आठशे',
  'नऊशे',
]

function todayForInput() {
  const today = new Date()
  const offset = today.getTimezoneOffset()
  return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function numberBelowThousand(value: number) {
  if (value < 100) return marathiNumbers[value]
  const hundreds = Math.floor(value / 100)
  const remainder = value % 100
  return `${hundredWords[hundreds]}${remainder ? ` ${marathiNumbers[remainder]}` : ''}`
}

function numberToMarathiWords(value: number) {
  const amount = Math.floor(value)
  if (!Number.isFinite(amount) || amount < 0) return ''
  if (amount === 0) return 'शून्य रुपये फक्त'
  if (amount > 999_999_999) return 'रक्कम मर्यादेपेक्षा मोठी आहे'

  const segments = [
    { value: Math.floor(amount / 10_000_000), label: 'कोटी' },
    { value: Math.floor((amount % 10_000_000) / 100_000), label: 'लाख' },
    { value: Math.floor((amount % 100_000) / 1_000), label: 'हजार' },
    { value: amount % 1_000, label: '' },
  ]

  const words = segments
    .filter((segment) => segment.value > 0)
    .map((segment) =>
      `${numberBelowThousand(segment.value)}${segment.label ? ` ${segment.label}` : ''}`,
    )

  return `${words.join(' ')} रुपये फक्त`
}

const englishOnes = [
  '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]
const englishTens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

function englishBelowThousand(value: number) {
  const words: string[] = []
  if (value >= 100) {
    words.push(`${englishOnes[Math.floor(value / 100)]} hundred`)
    value %= 100
  }
  if (value >= 20) {
    words.push(`${englishTens[Math.floor(value / 10)]}${value % 10 ? `-${englishOnes[value % 10]}` : ''}`)
  } else if (value > 0) {
    words.push(englishOnes[value])
  }
  return words.join(' ')
}

function numberToEnglishWords(value: number) {
  const amount = Math.floor(value)
  if (!Number.isFinite(amount) || amount < 0) return ''
  if (amount === 0) return 'Zero Rupees Only'
  if (amount > 999_999_999) return 'Amount exceeds supported limit'

  const segments = [
    { value: Math.floor(amount / 10_000_000), label: 'crore' },
    { value: Math.floor((amount % 10_000_000) / 100_000), label: 'lakh' },
    { value: Math.floor((amount % 100_000) / 1_000), label: 'thousand' },
    { value: amount % 1_000, label: '' },
  ]
  const words = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => `${englishBelowThousand(segment.value)}${segment.label ? ` ${segment.label}` : ''}`)
    .join(' ')

  return `${words.charAt(0).toUpperCase()}${words.slice(1)} Rupees Only`
}

function formatReceiptDate(value: string) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function formatAmount(value: string) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '₹ 0'
  return `₹ ${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function firebaseErrorMessage(error: unknown, translate: (key: string) => string) {
  const code =
    typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message : ''
  const details = `${code} ${message}`.toLowerCase()

  if (details.includes('invalid-credential') || details.includes('wrong-password')) {
    return translate('errors.invalidLogin')
  }
  if (details.includes('too-many-requests')) {
    return translate('errors.tooMany')
  }
  if (details.includes('network-request-failed')) {
    return translate('errors.network')
  }
  if (details.includes('permission_denied') || details.includes('permission-denied')) {
    return translate('errors.permission')
  }
  return translate('errors.generic')
}

type ReceiptDocumentProps = {
  receiptNumber: string
  name: string
  mobile: string
  paymentTypeLabel: string
  paymentDate: string
  amount: string | number
  reference: string
  amountInWords: string
}

const ReceiptDocument = memo(forwardRef<HTMLElement, ReceiptDocumentProps>(function ReceiptDocument({
  receiptNumber,
  name,
  mobile,
  paymentTypeLabel,
  paymentDate,
  amount,
  reference,
  amountInWords,
}, ref) {
  const { t } = useTranslation()
  return (
    <article className="receipt-page" ref={ref}>
      <img className="receipt-background" src={receiptTemplate} alt={t('receipt.templateAlt')} decoding="async" />
      <div className="receipt-content">
        <div className="receipt-title-row">
          <div className="receipt-meta"><span>{t('receipt.number')}</span><strong>{receiptNumber || '—'}</strong></div>
          <h3>{t('receipt.title')}</h3>
          <div className="receipt-meta receipt-meta-right"><span>{t('receipt.date')}</span><strong>{formatReceiptDate(paymentDate)}</strong></div>
        </div>
        <div className="receipt-table">
          <div className="receipt-row receipt-row-full"><span>{t('receipt.name')}</span><strong>{name || '—'}</strong></div>
          <div className="receipt-row receipt-row-full"><span>{t('receipt.mobile')}</span><strong>{mobile || '—'}</strong></div>
          <div className="receipt-row receipt-row-split">
            <div><span>{t('receipt.paymentType')}</span><strong>{paymentTypeLabel}</strong></div>
            <div className="receipt-amount"><span>{t('receipt.totalAmount')}</span><strong>{formatAmount(String(amount))}</strong></div>
          </div>
          <div className="receipt-row receipt-row-split">
            <div><span>{t('receipt.paymentDate')}</span><strong>{formatReceiptDate(paymentDate)}</strong></div>
            <div className="receipt-reference"><span>{t('receipt.reference')}</span><strong>{reference || '—'}</strong></div>
          </div>
          <div className="receipt-row receipt-row-full receipt-words"><span>{t('receipt.amountWords')}</span><strong>{amountInWords}</strong></div>
        </div>
        <p className="computer-note">{t('receipt.computerNote')}</p>
      </div>
    </article>
  )
}))

type ExpenseVoucherDocumentProps = {
  voucherNumber: string
  description: string
  categoryLabel: string
  paymentTypeLabel: string
  expenseDate: string
  amount: string | number
  amountInWords: string
}

const ExpenseVoucherDocument = memo(forwardRef<HTMLElement, ExpenseVoucherDocumentProps>(function ExpenseVoucherDocument({
  voucherNumber,
  description,
  categoryLabel,
  paymentTypeLabel,
  expenseDate,
  amount,
  amountInWords,
}, ref) {
  const { t } = useTranslation()
  return (
    <article className="receipt-page" ref={ref}>
      <img className="receipt-background" src={receiptTemplate} alt={t('expense.templateAlt')} decoding="async" />
      <div className="receipt-content">
        <div className="receipt-title-row">
          <div className="receipt-meta"><span>{t('expense.voucherNumber')}</span><strong>{voucherNumber}</strong></div>
          <h3>{t('expense.voucherTitle')}</h3>
          <div className="receipt-meta receipt-meta-right"><span>{t('receipt.date')}</span><strong>{formatReceiptDate(expenseDate)}</strong></div>
        </div>
        <div className="receipt-table">
          <div className="receipt-row receipt-row-full"><span>{t('expense.description')}:</span><strong>{description || '—'}</strong></div>
          <div className="receipt-row receipt-row-full"><span>{t('expense.category')}:</span><strong>{categoryLabel}</strong></div>
          <div className="receipt-row receipt-row-split">
            <div><span>{t('expense.paymentType')}:</span><strong>{paymentTypeLabel}</strong></div>
            <div className="receipt-amount"><span>{t('expense.amount')}:</span><strong>{formatAmount(String(amount))}</strong></div>
          </div>
          <div className="receipt-row receipt-row-full"><span>{t('expense.date')}:</span><strong>{formatReceiptDate(expenseDate)}</strong></div>
          <div className="receipt-row receipt-row-full receipt-words"><span>{t('form.amountWords')}:</span><strong>{amountInWords}</strong></div>
        </div>
        <p className="computer-note">{t('receipt.computerNote')}</p>
      </div>
    </article>
  )
}))

let html2CanvasPromise: Promise<typeof import('html2canvas')> | null = null
let jsPdfPromise: Promise<typeof import('jspdf')> | null = null

function loadHtml2Canvas() {
  html2CanvasPromise ??= import('html2canvas')
  return html2CanvasPromise
}

function loadJsPdf() {
  jsPdfPromise ??= import('jspdf')
  return jsPdfPromise
}

async function createReceiptCanvas(element: HTMLElement) {
  const { default: html2canvas } = await loadHtml2Canvas()
  await document.fonts.ready
  const images = Array.from(element.querySelectorAll('img'))
  await Promise.all(
    images.map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = () => reject(new Error('Template image failed to load.'))
          }),
    ),
  )

  return html2canvas(element, {
    scale: window.devicePixelRatio > 1 ? 2.2 : 2,
    useCORS: true,
    backgroundColor: '#fffdf7',
    logging: false,
    imageTimeout: 20_000,
  })
}

async function createReceiptPdf(element: HTMLElement) {
  const [{ jsPDF }, canvas] = await Promise.all([loadJsPdf(), createReceiptCanvas(element)])
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, 210, 297)
  return pdf
}

async function createReceiptImage(element: HTMLElement) {
  const canvas = await createReceiptCanvas(element)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('SHARE_RECEIPT_IMAGE_FAILED'))
    }, 'image/jpeg', 0.93)
  })
}

const AppHeader = memo(function AppHeader({ user, activeRoute, onLogout, onOpenSettings }: { user: User | null; activeRoute?: AppRoute; onLogout: () => void; onOpenSettings?: () => void }) {
  const { t } = useTranslation()
  const showLogout = activeRoute === 'settings'
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-mark" aria-hidden="true"><img src="/pwa-icon-192.png" alt="" /></div>
        <div>
          <p className="eyebrow">{t('header.organization')}</p>
          <h1>
            <span className="header-desktop-title">{t('header.title')}</span>
            <span className="header-mobile-title">{t('header.organization')}</span>
          </h1>
          <p className="header-subtitle">{t('header.subtitle')}</p>
        </div>
      </div>
      <div className="header-controls">
        <LanguageSwitcher />
        {user && (
          <div className="operator-actions">
            <button className="mobile-header-action-button" type="button" onClick={showLogout ? onLogout : (onOpenSettings ?? NOOP)} aria-label={showLogout ? t('header.logout') : t('nav.settings')} title={showLogout ? t('header.logout') : t('nav.settings')}>
              {showLogout
                ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M14 8l4 4-4 4m4-4H9" /></svg>
                : <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.38.35.72.64 1 .29.28.67.42 1.07.4H21v4h-.1A1.7 1.7 0 0 0 19.4 15Z" /></svg>}
            </button>
          </div>
        )}
      </div>
    </header>
  )
})

function App() {
  const { t, i18n } = useTranslation()
  const receiptRef = useRef<HTMLElement>(null)
  const expenseVoucherRef = useRef<HTMLElement>(null)
  const savedReceiptRef = useRef<HTMLElement>(null)
  const financialYear = useMemo(() => getFinancialYear(), [])
  const [initialManagementCache] = useState(getCachedManagementData)
  const initialYearReceipts = useMemo(
    () => initialManagementCache.receipts
      .filter((receipt) => receipt.financialYear === financialYear)
      .sort((a, b) => a.sequence - b.sequence),
    [financialYear, initialManagementCache.receipts],
  )
  const hasManagementDataRef = useRef(initialManagementCache.savedAt > 0)
  const managementLoadPromiseRef = useRef<Promise<void> | null>(null)
  const language = ((i18n.resolvedLanguage ?? i18n.language).split('-')[0] === 'en' ? 'en' : 'mr') as AppLanguage
  const [preferences, setPreferences] = useState<AppPreferences>(getSavedPreferences)
  const [activeRoute, setActiveRoute] = useState<AppRoute>(() => routeFromPath(window.location.pathname, preferences.defaultRoute))
  const [themePreference, setThemePreference] = useState<ThemePreference>(getSavedTheme)
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches)
  const [form, setForm] = useState<ReceiptForm>(() => ({
    receiptNumber: formatReceiptNumber(getFinancialYear(), 1),
    name: '',
    mobile: '',
    paymentType: preferences.receiptPaymentType,
    paymentDate: todayForInput(),
    amount: '',
    reference: '',
  }))
  const [errors, setErrors] = useState<FormErrors>({})
  const [isDownloading, setIsDownloading] = useState(false)
  const [isNumberLoading, setIsNumberLoading] = useState(true)
  const [databaseReady, setDatabaseReady] = useState(false)
  const [status, setStatus] = useState('')
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loginId, setLoginId] = useState('Mangesh')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [recentReceipts, setRecentReceipts] = useState<ReceiptRecord[]>(() => initialYearReceipts.slice(0, 5))
  const [historyError, setHistoryError] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyCursors, setHistoryCursors] = useState<Array<string | undefined>>([undefined])
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(() => initialYearReceipts.slice(0, 5).at(-1) ? String(initialYearReceipts.slice(0, 5).at(-1)?.sequence).padStart(6, '0') : null)
  const [historyHasNextPage, setHistoryHasNextPage] = useState(() => initialYearReceipts.length > 5)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [viewReceipt, setViewReceipt] = useState<ReceiptRecord | null>(null)
  const [receiptForDownload, setReceiptForDownload] = useState<ReceiptRecord | null>(null)
  const [recordDownloadId, setRecordDownloadId] = useState<string | null>(null)
  const [recordDownloadError, setRecordDownloadError] = useState('')
  const [receiptSaved, setReceiptSaved] = useState(false)
  const [showExcelExport, setShowExcelExport] = useState(false)
  const [allReceipts, setAllReceipts] = useState<ReceiptRecord[]>(initialManagementCache.receipts)
  const [exportYear, setExportYear] = useState(financialYear)
  const [fromSequence, setFromSequence] = useState(EXPORT_RANGE_START)
  const [toSequence, setToSequence] = useState(EXPORT_RANGE_END)
  const [isExcelLoading, setIsExcelLoading] = useState(false)
  const [isExcelDownloading, setIsExcelDownloading] = useState(false)
  const [excelMessage, setExcelMessage] = useState('')
  const [managementReceipts, setManagementReceipts] = useState<ReceiptRecord[]>(initialManagementCache.receipts)
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialManagementCache.expenses)
  const [isManagementLoading, setIsManagementLoading] = useState(initialManagementCache.savedAt === 0)
  const [managementError, setManagementError] = useState('')
  const [isDatabaseConnected, setIsDatabaseConnected] = useState<boolean | null>(null)
  const [isOfflineConfirmed, setIsOfflineConfirmed] = useState(false)
  const [reportYear, setReportYear] = useState(financialYear)
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>({
    expenseDate: todayForInput(), category: 'festival', description: '', amount: '', paymentType: preferences.expensePaymentType,
  })
  const [expenseMessage, setExpenseMessage] = useState('')
  const [expenseError, setExpenseError] = useState('')
  const [isExpenseSaving, setIsExpenseSaving] = useState(false)
  const [isExpensePdfDownloading, setIsExpensePdfDownloading] = useState(false)

  const amountInWords = useMemo(
    () => language === 'en'
      ? numberToEnglishWords(Number(form.amount || 0))
      : numberToMarathiWords(Number(form.amount || 0)),
    [form.amount, language],
  )
  const expenseAmountInWords = useMemo(
    () => language === 'en'
      ? numberToEnglishWords(Number(expenseForm.amount || 0))
      : numberToMarathiWords(Number(expenseForm.amount || 0)),
    [expenseForm.amount, language],
  )
  const collectionAmountToWords = useCallback((amount: number) => (
    language === 'en' ? numberToEnglishWords(amount) : numberToMarathiWords(amount)
  ), [language])
  const paymentLabels = useMemo<Record<PaymentType, string>>(() => ({
    cash: t('payment.cash'), upi: t('payment.upi'), bank: t('payment.bank'), cheque: t('payment.cheque'),
  }), [t])
  const exportYears = useMemo(
    () => Array.from(new Set(allReceipts.map((receipt) => receipt.financialYear))).sort().reverse(),
    [allReceipts],
  )
  const exportYearReceipts = useMemo(
    () => allReceipts.filter((receipt) => receipt.financialYear === exportYear).sort((a, b) => a.sequence - b.sequence),
    [allReceipts, exportYear],
  )
  const selectedExportReceipts = useMemo(
    () => exportYearReceipts.filter((receipt) => receipt.sequence >= fromSequence && receipt.sequence <= toSequence),
    [exportYearReceipts, fromSequence, toSequence],
  )
  const selectedExportTotal = useMemo(
    () => selectedExportReceipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0),
    [selectedExportReceipts],
  )
  const resolvedTheme = useMemo(() => resolveTheme(themePreference, systemPrefersDark), [systemPrefersDark, themePreference])
  const currentYearReceipts = useMemo(
    () => managementReceipts.filter((receipt) => receipt.financialYear === financialYear),
    [financialYear, managementReceipts],
  )
  const currentYearExpenses = useMemo(
    () => expenses.filter((expense) => expense.financialYear === financialYear),
    [expenses, financialYear],
  )
  const totalCollections = useMemo(
    () => currentYearReceipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0),
    [currentYearReceipts],
  )
  const totalExpenses = useMemo(
    () => currentYearExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [currentYearExpenses],
  )
  const recentDashboardReceipts = useMemo(
    () => [...currentYearReceipts].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)).slice(0, 5),
    [currentYearReceipts],
  )
  const categoryLabels = useMemo<Record<ExpenseCategory, string>>(() => ({
    festival: t('expense.categories.festival'), decoration: t('expense.categories.decoration'),
    utilities: t('expense.categories.utilities'), food: t('expense.categories.food'),
    transport: t('expense.categories.transport'), other: t('expense.categories.other'),
  }), [t])
  const reportYears = useMemo(
    () => Array.from(new Set([financialYear, ...managementReceipts.map((receipt) => receipt.financialYear), ...expenses.map((expense) => expense.financialYear)])).sort().reverse(),
    [expenses, financialYear, managementReceipts],
  )
  const reportReceipts = useMemo(
    () => managementReceipts.filter((receipt) => receipt.financialYear === reportYear),
    [managementReceipts, reportYear],
  )
  const reportExpenses = useMemo(
    () => expenses.filter((expense) => expense.financialYear === reportYear),
    [expenses, reportYear],
  )
  const reportCollectionsTotal = useMemo(
    () => reportReceipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0),
    [reportReceipts],
  )
  const reportExpensesTotal = useMemo(
    () => reportExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [reportExpenses],
  )
  const paymentBreakdown = useMemo(
    () => (Object.keys(paymentLabels) as PaymentType[]).map((paymentType) => {
      const records = reportReceipts.filter((receipt) => receipt.paymentType === paymentType)
      return { key: paymentType, label: paymentLabels[paymentType], count: records.length, amount: records.reduce((sum, receipt) => sum + Number(receipt.amount), 0) }
    }).filter((item) => item.count > 0),
    [paymentLabels, reportReceipts],
  )
  const expenseBreakdown = useMemo(
    () => (Object.keys(categoryLabels) as ExpenseCategory[]).map((category) => {
      const records = reportExpenses.filter((expense) => expense.category === category)
      return { key: category, label: categoryLabels[category], count: records.length, amount: records.reduce((sum, expense) => sum + Number(expense.amount), 0) }
    }).filter((item) => item.count > 0).sort((a, b) => b.amount - a.amount),
    [categoryLabels, reportExpenses],
  )
  const monthlyBreakdown = useMemo(() => {
    const monthly = new Map<string, { collections: number; expenses: number }>()
    reportReceipts.forEach((receipt) => {
      const key = receipt.paymentDate.slice(0, 7)
      const item = monthly.get(key) ?? { collections: 0, expenses: 0 }
      item.collections += Number(receipt.amount)
      monthly.set(key, item)
    })
    reportExpenses.forEach((expense) => {
      const key = expense.expenseDate.slice(0, 7)
      const item = monthly.get(key) ?? { collections: 0, expenses: 0 }
      item.expenses += Number(expense.amount)
      monthly.set(key, item)
    })
    return Array.from(monthly, ([month, values]) => ({ month, ...values })).sort((a, b) => a.month.localeCompare(b.month))
  }, [reportExpenses, reportReceipts])

  useEffect(() => {
    document.title = `${t(`nav.${activeRoute}`)} | ${t('header.organization')}`
    document.documentElement.lang = language
    document.documentElement.dir = 'ltr'
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', t('app.description'))
  }, [activeRoute, language, t])

  const navigateTo = useCallback((route: AppRoute) => {
    if (route !== activeRoute) {
      window.history.pushState({}, '', ROUTE_PATHS[route])
      setActiveRoute(route)
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }))
  }, [activeRoute])

  const changeTheme = useCallback((theme: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    setThemePreference(theme)
  }, [])

  const installApplication = useCallback(async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }, [installPrompt])

  const updatePreference = <K extends keyof AppPreferences,>(key: K, value: AppPreferences[K]) => {
    const next = { ...preferences, [key]: value }
    savePreferences(next)
    setPreferences(next)
  }

  const downloadBackup = async () => {
    try {
      const collectionData = await getCollectionData()
      const backup = {
        application: 'Om Sainath Seva Mandal Management',
        version: 2,
        generatedAt: new Date().toISOString(),
        receipts: managementReceipts,
        expenses,
        members: collectionData.members,
        collections: collectionData.contributions,
        collectionPayments: collectionData.payments,
      }
      downloadTextFile(`sainath-backup-${todayForInput()}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8')
    } catch (error) {
      console.error(error)
      setManagementError(firebaseErrorMessage(error, (key) => t(key)))
    }
  }

  const downloadTransactionsCsv = () => {
    const rows: Array<Array<string | number>> = [
      [t('reports.csv.type'), t('reports.csv.date'), t('reports.csv.number'), t('reports.csv.details'), t('reports.csv.method'), t('reports.csv.amount')],
      ...reportReceipts.map((receipt) => [t('reports.csv.receipt'), receipt.paymentDate, receipt.receiptNumber, receipt.name, paymentLabels[receipt.paymentType], Number(receipt.amount)]),
      ...reportExpenses.map((expense) => [t('reports.csv.expense'), expense.expenseDate, '', expense.description, categoryLabels[expense.category], -Number(expense.amount)]),
    ]
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
    downloadTextFile(`sainath-transactions-${reportYear}.csv`, csv, 'text/csv;charset=utf-8')
  }

  useEffect(() => {
    const onPopState = () => setActiveRoute(routeFromPath(window.location.pathname, preferences.defaultRoute))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [preferences.defaultRoute])

  useEffect(() => {
    const themeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches)
    themeQuery.addEventListener('change', handleSystemThemeChange)
    return () => themeQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'dark' ? '#170e0a' : '#742c13')
  }, [resolvedTheme])

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setIsStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const loadManagementData = useCallback(() => {
    if (managementLoadPromiseRef.current) return managementLoadPromiseRef.current

    const loadPromise = (async () => {
      if (!hasManagementDataRef.current) setIsManagementLoading(true)
      setManagementError('')
      try {
        const [receiptRecords, expenseRecords] = await Promise.all([getAllReceipts(), getAllExpenses()])
        setManagementReceipts(receiptRecords)
        setExpenses(expenseRecords)
        setAllReceipts(receiptRecords)
        hasManagementDataRef.current = true
        cacheManagementData(receiptRecords, expenseRecords)
      } catch (error) {
        console.error(error)
        setManagementError(firebaseErrorMessage(error, (key) => t(key)))
      } finally {
        setIsManagementLoading(false)
      }
    })()

    managementLoadPromiseRef.current = loadPromise
    void loadPromise.finally(() => {
      if (managementLoadPromiseRef.current === loadPromise) managementLoadPromiseRef.current = null
    })
    return loadPromise
  }, [t])

  const refreshNextReceiptNumber = useCallback(async () => {
    setIsNumberLoading(true)
    try {
      const nextReceiptNumber = await getNextReceiptNumber(financialYear)
      setForm((current) => ({ ...current, receiptNumber: nextReceiptNumber }))
      setDatabaseReady(true)
    } catch (error) {
      console.error(error)
      setDatabaseReady(false)
      setForm((current) => ({ ...current, receiptNumber: '' }))
      setStatus(firebaseErrorMessage(error, (key) => t(key)))
    } finally {
      setIsNumberLoading(false)
    }
  }, [financialYear, t])

  useEffect(() => observeAuth((user) => {
    setAuthUser(user)
    if (!user) {
      setRecentReceipts([])
      setHistoryPage(1)
      setHistoryCursors([undefined])
      setHistoryNextCursor(null)
      setHistoryHasNextPage(false)
    }
    setAuthReady(true)
  }), [])

  useEffect(() => {
    let connected: boolean | null = null
    let offlineTimer: number | null = null

    const clearOfflineTimer = () => {
      if (offlineTimer !== null) window.clearTimeout(offlineTimer)
      offlineTimer = null
    }

    const confirmOfflineAfterDelay = () => {
      clearOfflineTimer()
      setIsOfflineConfirmed(false)
      offlineTimer = window.setTimeout(() => setIsOfflineConfirmed(true), 2_000)
    }

    const handleDatabaseConnection = (nextConnected: boolean) => {
      connected = nextConnected
      setIsDatabaseConnected(nextConnected)
      clearOfflineTimer()
      if (nextConnected) setIsOfflineConfirmed(false)
      else if (!navigator.onLine) setIsOfflineConfirmed(true)
      else confirmOfflineAfterDelay()
    }

    const handleBrowserOffline = () => {
      if (connected !== true) {
        clearOfflineTimer()
        setIsOfflineConfirmed(true)
      }
    }

    const handleBrowserOnline = () => {
      if (connected !== true) confirmOfflineAfterDelay()
    }

    const stopObservingConnection = observeDatabaseConnection(handleDatabaseConnection)
    window.addEventListener('online', handleBrowserOnline)
    window.addEventListener('offline', handleBrowserOffline)
    return () => {
      clearOfflineTimer()
      stopObservingConnection()
      window.removeEventListener('online', handleBrowserOnline)
      window.removeEventListener('offline', handleBrowserOffline)
    }
  }, [])

  useEffect(() => {
    if (!authUser) return
    const managementTimer = window.setTimeout(() => void loadManagementData(), 0)
    return () => window.clearTimeout(managementTimer)
  }, [authUser, loadManagementData])

  const loadHistoryPage = useCallback(async (page: number, cursor?: string) => {
    setIsHistoryLoading(true)
    setHistoryError('')
    try {
      const result = await getReceiptPage(financialYear, cursor, 5)
      setRecentReceipts(result.receipts)
      setHistoryPage(page)
      setHistoryNextCursor(result.nextCursor)
      setHistoryHasNextPage(result.hasNextPage)
    } catch (error) {
      console.error(error)
      setHistoryError(firebaseErrorMessage(error, (key) => t(key)))
    } finally {
      setIsHistoryLoading(false)
    }
  }, [financialYear, t])

  useEffect(() => {
    if (!authUser) return

    const refreshTimer = window.setTimeout(() => void refreshNextReceiptNumber(), 0)
    const historyTimer = window.setTimeout(() => void loadHistoryPage(1), 0)
    return () => {
      window.clearTimeout(refreshTimer)
      window.clearTimeout(historyTimer)
    }
  }, [authUser, loadHistoryPage, refreshNextReceiptNumber])

  const showPreviousHistoryPage = () => {
    if (historyPage <= 1 || isHistoryLoading) return
    const previousPage = historyPage - 1
    void loadHistoryPage(previousPage, historyCursors[previousPage - 1])
  }

  const showNextHistoryPage = () => {
    if (!historyHasNextPage || !historyNextCursor || isHistoryLoading) return
    const nextPage = historyPage + 1
    setHistoryCursors((current) => {
      const updated = current.slice(0, historyPage)
      updated[historyPage] = historyNextCursor
      return updated
    })
    void loadHistoryPage(nextPage, historyNextCursor)
  }

  const handleCollectionReceiptCreated = useCallback(async () => {
    setHistoryCursors([undefined])
    await Promise.all([loadHistoryPage(1), loadManagementData()])
  }, [loadHistoryPage, loadManagementData])

  const downloadSavedReceipt = async (receipt: ReceiptRecord) => {
    setRecordDownloadId(receipt.id)
    setRecordDownloadError('')
    try {
      flushSync(() => setReceiptForDownload(receipt))
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      if (!savedReceiptRef.current) throw new Error('SAVED_RECEIPT_RENDER_FAILED')
      const pdf = await createReceiptPdf(savedReceiptRef.current)
      const safeNumber = receipt.receiptNumber.replace(/[^a-zA-Z0-9-]/g, '-')
      pdf.save(`receipt-${safeNumber}.pdf`)
    } catch (error) {
      console.error(error)
      setRecordDownloadError(t('record.downloadError'))
    } finally {
      setReceiptForDownload(null)
      setRecordDownloadId(null)
    }
  }

  const shareReceiptImage = useCallback(async (receipt: ReceiptRecord, message: string): Promise<'shared' | 'downloaded'> => {
    flushSync(() => setReceiptForDownload(receipt))
    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      if (!savedReceiptRef.current) throw new Error('SHARE_RECEIPT_RENDER_FAILED')
      const image = await createReceiptImage(savedReceiptRef.current)
      const safeNumber = receipt.receiptNumber.replace(/[^a-zA-Z0-9-]/g, '-')
      const filename = `receipt-${safeNumber}.jpg`
      const file = new File([image], filename, { type: 'image/jpeg' })

      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: receipt.receiptNumber, text: message, files: [file] })
          return 'shared'
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') throw error
          console.error(error)
        }
      }

      const imageUrl = URL.createObjectURL(image)
      const downloadLink = document.createElement('a')
      downloadLink.href = imageUrl
      downloadLink.download = filename
      downloadLink.click()
      window.setTimeout(() => URL.revokeObjectURL(imageUrl), 0)
      return 'downloaded'
    } finally {
      setReceiptForDownload(null)
    }
  }, [])

  const updateField = <K extends keyof ReceiptForm>(field: K, value: ReceiptForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
    setReceiptSaved(false)
    setStatus('')
  }

  const validate = () => {
    const nextErrors: FormErrors = {}
    if (!form.receiptNumber.trim()) nextErrors.receiptNumber = t('errors.receiptNumber')
    if (!form.name.trim()) nextErrors.name = t('errors.name')
    if (!/^\d{10}$/.test(form.mobile)) nextErrors.mobile = t('errors.mobile')
    if (!form.paymentDate) nextErrors.paymentDate = t('errors.date')
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = t('errors.amount')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError('')
    setIsLoggingIn(true)
    try {
      await loginOperator(loginId, loginPassword)
      setLoginPassword('')
    } catch (error) {
      console.error(error)
      setLoginError(
        error instanceof Error && error.message === 'INVALID_OPERATOR'
          ? t('errors.invalidLogin')
          : firebaseErrorMessage(error, (key) => t(key)),
      )
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = useCallback(async () => {
    try {
      await logoutOperator()
      setStatus('')
      setHistoryError('')
    } catch (error) {
      console.error(error)
    }
  }, [])

  const downloadPdf = async () => {
    if (!authUser) {
      setStatus(t('status.session'))
      return
    }
    if (!validate() || !receiptRef.current) {
      setStatus(t('status.required'))
      return
    }

    setIsDownloading(true)
    setStatus(t('status.reserving'))

    try {
      const reserved = await reserveReceiptNumber(financialYear)
      flushSync(() => {
        setForm((current) => ({ ...current, receiptNumber: reserved.receiptNumber }))
      })

      setStatus(t('status.pdf'))
      const pdf = await createReceiptPdf(receiptRef.current)

      setStatus(t('status.database'))
      await saveReceipt({
        receiptNumber: reserved.receiptNumber,
        sequence: reserved.sequence,
        financialYear,
        name: form.name.trim(),
        mobile: form.mobile,
        paymentType: form.paymentType,
        paymentDate: form.paymentDate,
        amount: Number(form.amount),
        amountInWords,
        reference: form.reference.trim(),
        createdBy: authUser.uid,
        createdByName: 'Mangesh',
      })

      setHistoryCursors([undefined])
      void loadHistoryPage(1)
      void loadManagementData()

      const safeNumber = reserved.receiptNumber.replace(/[^a-zA-Z0-9-]/g, '-')
      pdf.save(`receipt-${safeNumber}.pdf`)
      setReceiptSaved(true)
      setStatus(t('status.receiptSaved', { number: reserved.receiptNumber }))
    } catch (error) {
      console.error(error)
      setStatus(firebaseErrorMessage(error, (key) => t(key)))
      void refreshNextReceiptNumber()
    } finally {
      setIsDownloading(false)
    }
  }

  const resetForm = () => {
    setForm((current) => ({
      receiptNumber: current.receiptNumber,
      name: '',
      mobile: '',
      paymentType: preferences.receiptPaymentType,
      paymentDate: todayForInput(),
      amount: '',
      reference: '',
    }))
    setErrors({})
    setReceiptSaved(false)
    setStatus(t('status.newReceipt'))
    void refreshNextReceiptNumber()
  }

  const updateExpenseField = <K extends keyof ExpenseForm>(field: K, value: ExpenseForm[K]) => {
    setExpenseForm((current) => ({ ...current, [field]: value }))
    setExpenseError('')
    setExpenseMessage('')
  }

  const resetExpenseForm = () => {
    setExpenseForm({
      expenseDate: todayForInput(),
      category: 'festival',
      description: '',
      amount: '',
      paymentType: preferences.expensePaymentType,
    })
    setExpenseError('')
    setExpenseMessage('')
  }

  const submitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!authUser) return
    if (!expenseForm.expenseDate || !expenseForm.description.trim() || Number(expenseForm.amount) <= 0) {
      setExpenseError(t('expense.validation'))
      return
    }

    setIsExpenseSaving(true)
    setExpenseError('')
    setExpenseMessage('')
    try {
      await saveExpense({
        financialYear,
        expenseDate: expenseForm.expenseDate,
        category: expenseForm.category,
        description: expenseForm.description.trim(),
        amount: Number(expenseForm.amount),
        paymentType: expenseForm.paymentType,
        reference: '',
        createdBy: authUser.uid,
        createdByName: 'Mangesh',
      })
      setExpenseForm({ expenseDate: todayForInput(), category: 'festival', description: '', amount: '', paymentType: preferences.expensePaymentType })
      setExpenseMessage(t('expense.saved'))
      await loadManagementData()
    } catch (error) {
      console.error(error)
      setExpenseError(firebaseErrorMessage(error, (key) => t(key)))
    } finally {
      setIsExpenseSaving(false)
    }
  }

  const downloadExpensePdf = async () => {
    if (!expenseForm.expenseDate || !expenseForm.description.trim() || Number(expenseForm.amount) <= 0) {
      setExpenseError(t('expense.validation'))
      return
    }
    if (!expenseVoucherRef.current) return

    setIsExpensePdfDownloading(true)
    setExpenseError('')
    try {
      const pdf = await createReceiptPdf(expenseVoucherRef.current)
      const safeDate = expenseForm.expenseDate.replace(/[^0-9-]/g, '')
      pdf.save(`expense-voucher-${safeDate}.pdf`)
    } catch (error) {
      console.error(error)
      setExpenseError(t('errors.generic'))
    } finally {
      setIsExpensePdfDownloading(false)
    }
  }

  const setExportYearAndRange = (year: string) => {
    setExportYear(year)
    setFromSequence(EXPORT_RANGE_START)
    setToSequence(EXPORT_RANGE_END)
    setExcelMessage('')
  }

  const openExcelExport = async () => {
    setShowExcelExport(true)
    setIsExcelLoading(true)
    setExcelMessage('')
    try {
      const receipts = await getAllReceipts()
      setAllReceipts(receipts)
      const years = Array.from(new Set(receipts.map((receipt) => receipt.financialYear))).sort().reverse()
      const defaultYear = years.includes(financialYear) ? financialYear : (years[0] ?? financialYear)
      setExportYearAndRange(defaultYear)
    } catch (error) {
      console.error(error)
      setExcelMessage(firebaseErrorMessage(error, (key) => t(key)))
    } finally {
      setIsExcelLoading(false)
    }
  }

  const downloadExcel = async () => {
    if (selectedExportReceipts.length === 0 || fromSequence > toSequence) {
      setExcelMessage(t('export.invalidRange'))
      return
    }
    setIsExcelDownloading(true)
    setExcelMessage('')
    try {
      await downloadReceiptWorkbook(selectedExportReceipts, exportYear, language)
      setExcelMessage(t('export.downloadSuccess'))
    } catch (error) {
      console.error(error)
      setExcelMessage(t('errors.generic'))
    } finally {
      setIsExcelDownloading(false)
    }
  }

  if (!authReady) {
    return (
      <div className="app-shell">
        <AppHeader user={null} onLogout={NOOP} />
      </div>
    )
  }

  if (!authUser) {
    return (
      <div className="app-shell">
        <AppHeader user={null} onLogout={NOOP} />
        <main className="auth-page">
          <form className="login-card" onSubmit={handleLogin}>
            <div className="login-icon" aria-hidden="true">ॐ</div>
            <p className="login-kicker">{t('auth.secure')}</p>
            <h2>{t('auth.title')}</h2>
            <p className="login-copy">{t('auth.copy')}</p>
            <label className="field">
              <span>{t('auth.operatorId')}</span>
              <input
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                autoComplete="username"
                autoFocus
              />
            </label>
            <label className="field">
              <span>{t('auth.password')}</span>
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            {loginError && <p className="login-error" role="alert">{loginError}</p>}
            <button className="login-button" type="submit" disabled={isLoggingIn}>
              {isLoggingIn ? t('auth.loggingIn') : t('auth.login')}
            </button>
            <p className="firebase-note"><i aria-hidden="true" /> {t('auth.firebase')}</p>
          </form>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell management-shell">
      <AppHeader user={authUser} activeRoute={activeRoute} onLogout={handleLogout} onOpenSettings={() => navigateTo('settings')} />
      <div className="management-body">
        <DesktopSidebar activeRoute={activeRoute} onNavigate={navigateTo} onLogout={handleLogout} />
        <div className="management-main">
        <div className="management-content">
          {isDatabaseConnected !== true && isOfflineConfirmed && <div className="offline-banner" role="status"><span>!</span><div><strong>{t('connection.offline')}</strong><p>{t('connection.offlineCopy')}</p></div></div>}
          {activeRoute === 'dashboard' && (
            <main className="route-page dashboard-page">
              <div className="route-heading"><div><p>{t('dashboard.kicker')}</p><h2>{t('dashboard.title')}</h2><span>{t('dashboard.subtitle', { year: financialYear })}</span></div><button type="button" onClick={() => navigateTo('receipts')}>{t('dashboard.newReceipt')}</button></div>
              {managementError && <p className="route-error">{managementError}</p>}
              <section className="stat-grid" aria-label={t('dashboard.summary')} aria-busy={isManagementLoading}>
                {isManagementLoading ? Array.from({ length: 4 }, (_, index) => <article className="data-box-loading" key={index} aria-hidden="true"><i /><b /><span /></article>) : <>
                  <article><span>{t('dashboard.collections')}</span><strong>₹ {totalCollections.toLocaleString('en-IN')}</strong><small>{currentYearReceipts.length} {t('dashboard.receiptsCount')}</small></article>
                  <article><span>{t('dashboard.expenses')}</span><strong>₹ {totalExpenses.toLocaleString('en-IN')}</strong><small>{currentYearExpenses.length} {t('dashboard.entries')}</small></article>
                  <article className="stat-balance"><span>{t('dashboard.balance')}</span><strong>₹ {(totalCollections - totalExpenses).toLocaleString('en-IN')}</strong><small>{t('dashboard.available')}</small></article>
                  <article><span>{t('dashboard.latestReceipt')}</span><strong>{currentYearReceipts.at(-1)?.receiptNumber.split('/').at(-1) ?? '—'}</strong><small>{currentYearReceipts.at(-1)?.name ?? t('dashboard.noData')}</small></article>
                </>}
              </section>
              <div className="dashboard-grid">
                <section className="dashboard-card"><div className="dashboard-card-heading"><div><h3>{t('dashboard.recentReceipts')}</h3><p>{t('dashboard.recentReceiptsCopy')}</p></div><button type="button" onClick={() => navigateTo('receipts')}>{t('dashboard.viewAll')}</button></div>{isManagementLoading ? <ListLoadingSkeleton /> : recentDashboardReceipts.length === 0 ? <p className="dashboard-empty">{t('dashboard.noReceipts')}</p> : <div className="activity-list">{recentDashboardReceipts.map((receipt) => <article key={receipt.id}><span className="activity-icon income">₹</span><div><strong>{receipt.name}</strong><small>{receipt.receiptNumber} · {formatReceiptDate(receipt.paymentDate)}</small></div><b>+₹ {Number(receipt.amount).toLocaleString('en-IN')}</b></article>)}</div>}</section>
                <section className="dashboard-card"><div className="dashboard-card-heading"><div><h3>{t('dashboard.recentExpenses')}</h3><p>{t('dashboard.recentExpensesCopy')}</p></div><button type="button" onClick={() => navigateTo('expenses')}>{t('dashboard.manage')}</button></div>{isManagementLoading ? <ListLoadingSkeleton /> : currentYearExpenses.length === 0 ? <p className="dashboard-empty">{t('dashboard.noExpenses')}</p> : <div className="activity-list">{currentYearExpenses.slice(0, 5).map((expense) => <article key={expense.id}><span className="activity-icon expense">₹</span><div><strong>{expense.description}</strong><small>{categoryLabels[expense.category]} · {formatReceiptDate(expense.expenseDate)}</small></div><b className="expense-value">−₹ {Number(expense.amount).toLocaleString('en-IN')}</b></article>)}</div>}</section>
              </div>
            </main>
          )}

          {activeRoute === 'collections' && <CollectionsPage
            financialYear={financialYear}
            authUser={authUser}
            receipts={managementReceipts}
            paymentLabels={paymentLabels}
            toAmountWords={collectionAmountToWords}
            onReceiptCreated={handleCollectionReceiptCreated}
            onShareReceipt={shareReceiptImage}
            onOpenReceipts={() => navigateTo('receipts')}
          />}

          {activeRoute === 'members' && <MemberLedgerPage
            financialYear={financialYear}
            receipts={managementReceipts}
            paymentLabels={paymentLabels}
            toAmountWords={collectionAmountToWords}
            onViewReceipt={setViewReceipt}
            onShareReceipt={shareReceiptImage}
            onOpenCollections={() => navigateTo('collections')}
          />}

          {activeRoute === 'receipts' && <main className="workspace">
        <div className="left-column">
          <aside className="form-panel" aria-label="Receipt information form">
            <div className="panel-heading">
              <div><span className="step-badge">{t('form.step')}</span><h2>{t('form.title')}</h2></div>
              <button className="text-button" type="button" onClick={resetForm}>{t('form.newReceipt')}</button>
            </div>

            <div className="form-grid">
              <label className="field field-wide receipt-number-field">
                <span>{t('form.receiptNumber')}</span>
                <div className="locked-input">
                  <input value={isNumberLoading ? t('form.loadingNumber') : databaseReady ? form.receiptNumber : t('form.rulesRequired')} readOnly />
                  <span title="Firebase database generated">DB</span>
                </div>
                {errors.receiptNumber && <em>{errors.receiptNumber}</em>}
              </label>

              <label className="field field-wide">
                <span>{t('form.name')}</span>
                <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder={t('form.namePlaceholder')} aria-invalid={Boolean(errors.name)} />
                {errors.name && <em>{errors.name}</em>}
              </label>

              <label className="field field-wide">
                <span>{t('form.mobile')}</span>
                <input value={form.mobile} onChange={(event) => updateField('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder={t('form.mobilePlaceholder')} aria-invalid={Boolean(errors.mobile)} />
                {errors.mobile && <em>{errors.mobile}</em>}
              </label>

              <label className="field">
                <span>{t('form.paymentType')}</span>
                <select value={form.paymentType} onChange={(event) => updateField('paymentType', event.target.value as PaymentType)}>
                  <option value="upi">{paymentLabels.upi}</option><option value="cash">{paymentLabels.cash}</option><option value="bank">{paymentLabels.bank}</option><option value="cheque">{paymentLabels.cheque}</option>
                </select>
              </label>

              <div className="field">
                <span>{t('form.paymentDate')}</span>
                <DatePicker value={form.paymentDate} onChange={(value) => updateField('paymentDate', value)} label={t('form.paymentDate')} invalid={Boolean(errors.paymentDate)} />
                {errors.paymentDate && <em>{errors.paymentDate}</em>}
              </div>

              <label className="field field-wide">
                <span>{t('form.amount')}</span>
                <div className="amount-input"><b>₹</b><input type="number" min="1" step="1" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="1000" aria-invalid={Boolean(errors.amount)} /></div>
                {errors.amount && <em>{errors.amount}</em>}
              </label>

              <label className="field field-wide">
                <span>{t('form.reference')}</span>
                <input value={form.reference} onChange={(event) => updateField('reference', event.target.value)} placeholder={t('form.referencePlaceholder')} />
              </label>
            </div>

            <div className="words-preview"><span>{t('form.amountWords')}</span><strong>{amountInWords}</strong></div>
            <button className="download-button" type="button" onClick={downloadPdf} disabled={isDownloading || isNumberLoading || !databaseReady || receiptSaved}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" /></svg>
              {isDownloading ? t('form.saving') : receiptSaved ? t('form.saved') : t('form.saveDownload')}
            </button>
            <p className={`status-message ${receiptSaved ? 'status-success' : ''}`} role="status">{status}</p>
          </aside>

          <section className="history-panel" aria-label="Recent receipts">
            <div className="history-heading">
              <div><span className="step-badge">DB</span><h2>{t('history.title')}</h2></div>
              <div className="history-actions"><span>{t('history.records', { count: recentReceipts.length })}</span><button type="button" onClick={() => void openExcelExport()}>{t('history.excel')}</button></div>
            </div>
            {isHistoryLoading ? <ListLoadingSkeleton /> : historyError ? <p className="history-empty history-error">{historyError}</p> : recentReceipts.length === 0 ? (
              <p className="history-empty">{t('history.empty')}</p>
            ) : (
              <div className="history-results">
                <div className="history-list">
                  {recentReceipts.map((receipt) => (
                    <article className="history-item" key={receipt.id}>
                      <div className="history-item-person"><strong>{receipt.name}</strong><span>{receipt.receiptNumber}</span></div>
                      <div className="history-item-amount"><strong>₹ {Number(receipt.amount).toLocaleString('en-IN')}</strong><span>{formatReceiptDate(receipt.paymentDate)}</span></div>
                      <div className="history-row-actions">
                        <button type="button" onClick={() => setViewReceipt(receipt)} aria-label={t('record.viewReceipt', { number: receipt.receiptNumber })} title={t('record.view')}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.75" /></svg>
                        </button>
                        <button type="button" onClick={() => void downloadSavedReceipt(receipt)} disabled={recordDownloadId !== null} aria-label={t('record.downloadReceipt', { number: receipt.receiptNumber })} title={t('record.download')}>
                          {recordDownloadId === receipt.id ? <span className="button-spinner" /> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" /></svg>}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <nav className="history-pagination" aria-label={t('history.pagination')}>
                  <button type="button" onClick={showPreviousHistoryPage} disabled={historyPage === 1 || isHistoryLoading}>{t('history.previous')}</button>
                  <span>{t('history.page', { page: historyPage })}</span>
                  <button type="button" onClick={showNextHistoryPage} disabled={!historyHasNextPage || isHistoryLoading}>{t('history.next')}</button>
                </nav>
                {recordDownloadError && <p className="record-message record-message-error" role="alert">{recordDownloadError}</p>}
              </div>
            )}
          </section>
        </div>

        <section className="preview-panel" aria-label="Receipt preview">
          <div className="preview-heading">
            <div><span className="step-badge">{t('preview.step')}</span><h2>{t('preview.title')}</h2></div>
            <span className="a4-badge">A4 • PDF</span>
          </div>
          <div className="receipt-frame">
            <ReceiptDocument
              ref={receiptRef}
              receiptNumber={form.receiptNumber}
              name={form.name}
              mobile={form.mobile}
              paymentTypeLabel={paymentLabels[form.paymentType]}
              paymentDate={form.paymentDate}
              amount={form.amount}
              reference={form.reference}
              amountInWords={amountInWords}
            />
          </div>
        </section>
          </main>}

          {activeRoute === 'expenses' && (
            <main className="workspace expense-workspace">
              <div className="left-column">
                <form className="form-panel expense-form-card" onSubmit={submitExpense}>
                  <div className="panel-heading">
                    <div><span className="step-badge">01</span><h2>{t('expense.formTitle')}</h2></div>
                    <button className="text-button" type="button" onClick={resetExpenseForm}>{t('expense.add')}</button>
                  </div>
                  <div className="form-grid">
                    <div className="field"><span>{t('expense.date')}</span><DatePicker value={expenseForm.expenseDate} onChange={(value) => updateExpenseField('expenseDate', value)} label={t('expense.date')} /></div>
                    <label className="field"><span>{t('expense.category')}</span><select value={expenseForm.category} onChange={(event) => updateExpenseField('category', event.target.value as ExpenseCategory)}>{(Object.keys(categoryLabels) as ExpenseCategory[]).map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
                    <label className="field field-wide"><span>{t('expense.description')}</span><input value={expenseForm.description} onChange={(event) => updateExpenseField('description', event.target.value)} placeholder={t('expense.descriptionPlaceholder')} /></label>
                    <label className="field"><span>{t('expense.amount')}</span><div className="amount-input"><b>₹</b><input type="number" min="1" step="1" value={expenseForm.amount} onChange={(event) => updateExpenseField('amount', event.target.value)} placeholder="1000" /></div></label>
                    <label className="field"><span>{t('expense.paymentType')}</span><select value={expenseForm.paymentType} onChange={(event) => updateExpenseField('paymentType', event.target.value as PaymentType)}><option value="cash">{paymentLabels.cash}</option><option value="upi">{paymentLabels.upi}</option><option value="bank">{paymentLabels.bank}</option><option value="cheque">{paymentLabels.cheque}</option></select></label>
                  </div>
                  {expenseError && <p className="expense-message error" role="alert">{expenseError}</p>}
                  {expenseMessage && <p className="expense-message success" role="status">{expenseMessage}</p>}
                  <button className="expense-save-button" type="submit" disabled={isExpenseSaving}>{isExpenseSaving ? t('expense.saving') : t('expense.save')}</button>
                </form>

                <section className="history-panel expense-list-card">
                  <div className="history-heading">
                    <div><span className="step-badge">DB</span><h2>{t('expense.history')}</h2></div>
                    <div className="history-actions"><span>{t('expense.historyCopy', { year: financialYear })}</span><strong className="expense-history-total">₹ {totalExpenses.toLocaleString('en-IN')}</strong></div>
                  </div>
                  {isManagementLoading ? <ListLoadingSkeleton /> : currentYearExpenses.length === 0 ? <p className="dashboard-empty">{t('expense.empty')}</p> : <div className="expense-list">{currentYearExpenses.map((expense) => <article key={expense.id}><span>{categoryLabels[expense.category]}</span><div><strong>{expense.description}</strong><small>{formatReceiptDate(expense.expenseDate)} · {paymentLabels[expense.paymentType]}</small></div><b>₹ {Number(expense.amount).toLocaleString('en-IN')}</b></article>)}</div>}
                </section>
              </div>

              <section className="preview-panel expense-preview-card" aria-label={t('expense.previewTitle')}>
                <div className="preview-heading">
                  <div><span className="step-badge">02</span><h2>{t('expense.previewTitle')}</h2></div>
                  <span className="a4-badge">A4 • PDF</span>
                </div>
                <div className="receipt-frame">
                  <ExpenseVoucherDocument
                    ref={expenseVoucherRef}
                    voucherNumber={`EXP/${financialYear}/${t('expense.previewDraft')}`}
                    description={expenseForm.description}
                    categoryLabel={categoryLabels[expenseForm.category]}
                    paymentTypeLabel={paymentLabels[expenseForm.paymentType]}
                    expenseDate={expenseForm.expenseDate}
                    amount={expenseForm.amount}
                    amountInWords={expenseAmountInWords}
                  />
                </div>
                <button className="expense-pdf-button" type="button" onClick={() => void downloadExpensePdf()} disabled={isExpensePdfDownloading}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" /></svg>
                  {isExpensePdfDownloading ? t('expense.downloadingPdf') : t('expense.downloadPdf')}
                </button>
              </section>
            </main>
          )}

          {activeRoute === 'reports' && (
            <main className="route-page reports-page">
              <div className="route-heading"><div><p>{t('reports.kicker')}</p><h2>{t('reports.title')}</h2><span>{t('reports.subtitle')}</span></div><div className="route-heading-actions"><button type="button" onClick={downloadTransactionsCsv}>{t('reports.downloadCsv')}</button><button type="button" onClick={() => void openExcelExport()}>{t('reports.download')}</button></div></div>
              <section className="report-toolbar route-card"><label><span>{t('reports.year')}</span><select value={reportYear} onChange={(event) => setReportYear(event.target.value)}>{reportYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label><div aria-busy={isManagementLoading}>{isManagementLoading ? <span className="inline-data-loading" aria-label={t('app.loadingRecords')} /> : <><strong>{reportReceipts.length + reportExpenses.length}</strong><span>{t('reports.transactions')}</span></>}</div></section>
              <section className="report-summary route-card" aria-busy={isManagementLoading}>{isManagementLoading ? Array.from({ length: 4 }, (_, index) => <div className="report-summary-loading" key={index} aria-hidden="true"><i /><b /></div>) : <><div><span>{t('dashboard.collections')}</span><strong>₹ {reportCollectionsTotal.toLocaleString('en-IN')}</strong></div><div><span>{t('dashboard.expenses')}</span><strong>₹ {reportExpensesTotal.toLocaleString('en-IN')}</strong></div><div><span>{t('dashboard.balance')}</span><strong>₹ {(reportCollectionsTotal - reportExpensesTotal).toLocaleString('en-IN')}</strong></div><div><span>{t('reports.averageReceipt')}</span><strong>₹ {Math.round(reportReceipts.length ? reportCollectionsTotal / reportReceipts.length : 0).toLocaleString('en-IN')}</strong></div></>}</section>
              <div className="report-analysis-grid">
                <section className="route-card analysis-card"><div className="analysis-heading"><h3>{t('reports.paymentBreakdown')}</h3><p>{t('reports.paymentCopy')}</p></div>{isManagementLoading ? <ListLoadingSkeleton /> : paymentBreakdown.length === 0 ? <p className="dashboard-empty">{t('reports.noActivity')}</p> : <div className="breakdown-list">{paymentBreakdown.map((item) => <div className="breakdown-row" key={item.key}><div><span>{item.label}</span><small>{t('reports.records', { count: item.count })}</small></div><strong>₹ {item.amount.toLocaleString('en-IN')}</strong><i><b style={{ width: `${reportCollectionsTotal ? (item.amount / reportCollectionsTotal) * 100 : 0}%` }} /></i></div>)}</div>}</section>
                <section className="route-card analysis-card"><div className="analysis-heading"><h3>{t('reports.expenseBreakdown')}</h3><p>{t('reports.expenseCopy')}</p></div>{isManagementLoading ? <ListLoadingSkeleton /> : expenseBreakdown.length === 0 ? <p className="dashboard-empty">{t('reports.noExpenses')}</p> : <div className="breakdown-list expense-breakdown">{expenseBreakdown.map((item) => <div className="breakdown-row" key={item.key}><div><span>{item.label}</span><small>{t('reports.records', { count: item.count })}</small></div><strong>₹ {item.amount.toLocaleString('en-IN')}</strong><i><b style={{ width: `${reportExpensesTotal ? (item.amount / reportExpensesTotal) * 100 : 0}%` }} /></i></div>)}</div>}</section>
                <section className="route-card analysis-card monthly-analysis"><div className="analysis-heading"><h3>{t('reports.monthly')}</h3><p>{t('reports.monthlyCopy')}</p></div>{isManagementLoading ? <ListLoadingSkeleton /> : monthlyBreakdown.length === 0 ? <p className="dashboard-empty">{t('reports.noActivity')}</p> : <div className="monthly-list"><div className="monthly-header"><span>{t('reports.year')}</span><span>{t('reports.collectionsShort')}</span><span>{t('reports.expensesShort')}</span><span>{t('reports.net')}</span></div>{monthlyBreakdown.map((item) => <div className="monthly-row" key={item.month}><strong>{new Intl.DateTimeFormat(language === 'en' ? 'en-IN' : 'mr-IN', { month: 'short', year: 'numeric' }).format(new Date(`${item.month}-01T00:00:00`))}</strong><span className="income-value"><small>{t('reports.collectionsShort')}</small>₹ {item.collections.toLocaleString('en-IN')}</span><span className="expense-value"><small>{t('reports.expensesShort')}</small>₹ {item.expenses.toLocaleString('en-IN')}</span><b><small>{t('reports.net')}</small>₹ {(item.collections - item.expenses).toLocaleString('en-IN')}</b></div>)}</div>}</section>
              </div>
              <div className="report-export-grid"><section className="route-card report-card"><div className="report-icon"><ExcelReportIcon /></div><div><h3>{t('reports.receiptRegister')}</h3><p>{t('reports.receiptRegisterCopy')}</p></div><button type="button" onClick={() => void openExcelExport()}>{t('reports.chooseRange')}</button></section><section className="route-card report-card"><div className="report-icon csv-icon"><CsvReportIcon /></div><div><h3>{t('reports.csvTitle')}</h3><p>{t('reports.csvCopy')}</p><small>{t('reports.records', { count: reportReceipts.length + reportExpenses.length })}</small></div><button type="button" onClick={downloadTransactionsCsv}>{t('reports.downloadCsv')}</button></section></div>
            </main>
          )}

          {activeRoute === 'settings' && (
            <main className="route-page settings-page">
              <div className="route-heading"><div><p>{t('settings.kicker')}</p><h2>{t('settings.title')}</h2><span>{t('settings.subtitle')}</span></div></div>
              <div className="settings-grid">
                <section className="route-card settings-card appearance-card">
                  <h3>{t('settings.appearance')}</h3>
                  <p>{t('settings.appearanceCopy')}</p>
                  <ThemeSwitcher value={themePreference} onChange={changeTheme} />
                </section>
                <section className="route-card settings-card install-card">
                  <h3>{t('settings.install')}</h3>
                  <p>{t('settings.installCopy')}</p>
                  {isStandalone ? (
                    <span className="install-status">✓ {t('settings.installed')}</span>
                  ) : installPrompt ? (
                    <button className="pwa-install-button" type="button" onClick={() => void installApplication()}>{t('settings.installButton')}</button>
                  ) : (
                    <small className="install-help">{t('settings.installHelp')}</small>
                  )}
                  <small className="offline-save-note">{t('settings.offlineNote')}</small>
                </section>
                <section className="route-card settings-card preferences-card settings-wide">
                  <h3>{t('settings.preferences')}</h3>
                  <p>{t('settings.preferencesCopy')}</p>
                  <div className="settings-preferences-grid">
                    <label><span>{t('settings.defaultPage')}</span><select value={preferences.defaultRoute} onChange={(event) => updatePreference('defaultRoute', event.target.value as AppRoute)}>{(['dashboard', 'collections', 'members', 'receipts', 'expenses', 'reports'] as AppRoute[]).map((route) => <option key={route} value={route}>{t(`nav.${route}`)}</option>)}</select></label>
                    <label><span>{t('settings.defaultReceiptPayment')}</span><select value={preferences.receiptPaymentType} onChange={(event) => updatePreference('receiptPaymentType', event.target.value as PaymentType)}>{(Object.keys(paymentLabels) as PaymentType[]).map((paymentType) => <option key={paymentType} value={paymentType}>{paymentLabels[paymentType]}</option>)}</select></label>
                    <label><span>{t('settings.defaultExpensePayment')}</span><select value={preferences.expensePaymentType} onChange={(event) => updatePreference('expensePaymentType', event.target.value as PaymentType)}>{(Object.keys(paymentLabels) as PaymentType[]).map((paymentType) => <option key={paymentType} value={paymentType}>{paymentLabels[paymentType]}</option>)}</select></label>
                  </div>
                </section>
                <section className="route-card settings-card backup-card"><h3>{t('settings.backup')}</h3><p>{t('settings.backupCopy')}</p><div className="settings-action-row"><button type="button" onClick={() => void downloadBackup()}>{t('settings.downloadBackup')}</button><button type="button" className="secondary-setting-button" onClick={() => void loadManagementData()}>{t('settings.refresh')}</button><button type="button" className="secondary-setting-button" onClick={() => navigateTo('reports')}>{t('settings.openReports')}</button></div></section>
                <section className="route-card settings-card organization-card"><h3>{t('settings.organization')}</h3><p>{t('header.organization')}</p><small>{t('settings.organizationCopy')}</small></section>
              </div>
            </main>
          )}
        </div>
      </div>
      </div>
      <MobileBottomNavigation activeRoute={activeRoute} onNavigate={navigateTo} />

      {receiptForDownload && (
        <div className="saved-receipt-render" aria-hidden="true">
          <ReceiptDocument
            ref={savedReceiptRef}
            receiptNumber={receiptForDownload.receiptNumber}
            name={receiptForDownload.name}
            mobile={receiptForDownload.mobile}
            paymentTypeLabel={paymentLabels[receiptForDownload.paymentType]}
            paymentDate={receiptForDownload.paymentDate}
            amount={receiptForDownload.amount}
            reference={receiptForDownload.reference}
            amountInWords={receiptForDownload.amountInWords}
          />
        </div>
      )}

      {viewReceipt && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setViewReceipt(null)}>
          <section className="record-modal record-receipt-modal" role="dialog" aria-modal="true" aria-labelledby="view-receipt-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="record-modal-heading">
              <div className="record-modal-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.75" /></svg>
              </div>
              <div><h2 id="view-receipt-title">{t('record.details')}</h2><p>{viewReceipt.receiptNumber}</p></div>
              <button type="button" onClick={() => setViewReceipt(null)} aria-label={t('record.close')}>×</button>
            </div>
            <div className="record-receipt-frame">
              <ReceiptDocument
                receiptNumber={viewReceipt.receiptNumber}
                name={viewReceipt.name}
                mobile={viewReceipt.mobile}
                paymentTypeLabel={paymentLabels[viewReceipt.paymentType]}
                paymentDate={viewReceipt.paymentDate}
                amount={viewReceipt.amount}
                reference={viewReceipt.reference}
                amountInWords={viewReceipt.amountInWords}
              />
            </div>
            <div className="record-modal-actions">
              <button type="button" className="secondary-button" onClick={() => setViewReceipt(null)}>{t('record.close')}</button>
            </div>
          </section>
        </div>
      )}

      {showExcelExport && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowExcelExport(false)}>
          <section className="excel-modal" role="dialog" aria-modal="true" aria-labelledby="excel-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="excel-modal-heading">
              <div className="excel-icon" aria-hidden="true">X</div>
              <div><h2 id="excel-modal-title">{t('export.title')}</h2><p>{t('export.copy')}</p></div>
              <button type="button" onClick={() => setShowExcelExport(false)} aria-label={t('export.cancel')}>×</button>
            </div>
            {isExcelLoading ? <div className="excel-loading"><ListLoadingSkeleton /></div> : allReceipts.length === 0 ? (
              <p className="history-empty">{t('export.noRecords')}</p>
            ) : (
              <>
                <div className="excel-range-grid">
                  <label className="field field-wide"><span>{t('export.financialYear')}</span><select value={exportYear} onChange={(event) => setExportYearAndRange(event.target.value)}>{exportYears.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
                  <div className="excel-range-preset field-wide">
                    <div><strong>{t('export.range')}</strong><span>{t('export.rangeHelp')}</span></div>
                    <button type="button" className={fromSequence === EXPORT_RANGE_START && toSequence === EXPORT_RANGE_END ? 'active' : ''} onClick={() => { setFromSequence(EXPORT_RANGE_START); setToSequence(EXPORT_RANGE_END); setExcelMessage('') }}>{t('export.all')}</button>
                  </div>
                  <label className="field"><span>{t('export.from')}</span><select value={fromSequence} onChange={(event) => { setFromSequence(Number(event.target.value)); setExcelMessage('') }}><option value={EXPORT_RANGE_START}>{t('export.start')}</option>{exportYearReceipts.map((receipt) => <option key={receipt.id} value={receipt.sequence}>{receipt.receiptNumber}</option>)}</select></label>
                  <label className="field"><span>{t('export.to')}</span><select value={toSequence} onChange={(event) => { setToSequence(Number(event.target.value)); setExcelMessage('') }}><option value={EXPORT_RANGE_END}>{t('export.tillEnd')}</option>{exportYearReceipts.map((receipt) => <option key={receipt.id} value={receipt.sequence}>{receipt.receiptNumber}</option>)}</select></label>
                </div>
                <div className="excel-summary"><span>{t('export.selected', { count: selectedExportReceipts.length })}</span><strong>{t('export.total', { amount: selectedExportTotal.toLocaleString('en-IN') })}</strong></div>
                {excelMessage && <p className="excel-message" role="status">{excelMessage}</p>}
                <div className="excel-modal-actions"><button type="button" className="secondary-button" onClick={() => setShowExcelExport(false)}>{t('export.cancel')}</button><button type="button" className="excel-download-button" onClick={() => void downloadExcel()} disabled={isExcelDownloading || selectedExportReceipts.length === 0}>{isExcelDownloading ? t('export.downloading') : t('export.download')}</button></div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default App
