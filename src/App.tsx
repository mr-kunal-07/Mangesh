import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import type { User } from 'firebase/auth'
import { useTranslation } from 'react-i18next'
import receiptTemplate from './assets/receipt-template.jpeg'
import LanguageSwitcher from './LanguageSwitcher'
import type { AppLanguage } from './i18n'
import { downloadReceiptWorkbook } from './excelExport'
import {
  formatReceiptNumber,
  getAllReceipts,
  getFinancialYear,
  getNextReceiptNumber,
  getReceiptPage,
  loginOperator,
  logoutOperator,
  observeAuth,
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

const EXPORT_RANGE_START = 0
const EXPORT_RANGE_END = Number.MAX_SAFE_INTEGER

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

function formatRecordTimestamp(value: number, language: AppLanguage) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(language === 'mr' ? 'mr-IN' : 'en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
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

const ReceiptDocument = forwardRef<HTMLElement, ReceiptDocumentProps>(function ReceiptDocument({
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
      <img className="receipt-background" src={receiptTemplate} alt="Om Sainath Seva Mandal receipt template" />
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
})

async function createReceiptPdf(element: HTMLElement) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])
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

  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    backgroundColor: '#fffdf7',
    logging: false,
    imageTimeout: 20_000,
  })
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 210, 297)
  return pdf
}

function AppHeader({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  const { t } = useTranslation()
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-mark" aria-hidden="true">ॐ</div>
        <div>
          <p className="eyebrow">{t('header.organization')}</p>
          <h1>{t('header.title')}</h1>
          <p className="header-subtitle">{t('header.subtitle')}</p>
        </div>
      </div>
      <div className="header-controls">
        <LanguageSwitcher />
        {user && (
          <div className="operator-actions">
            <span><i aria-hidden="true" /> Mangesh</span>
            <button type="button" onClick={onLogout}>{t('header.logout')}</button>
          </div>
        )}
      </div>
    </header>
  )
}

function App() {
  const { t, i18n } = useTranslation()
  const receiptRef = useRef<HTMLElement>(null)
  const savedReceiptRef = useRef<HTMLElement>(null)
  const financialYear = useMemo(() => getFinancialYear(), [])
  const language = ((i18n.resolvedLanguage ?? i18n.language).split('-')[0] === 'en' ? 'en' : 'mr') as AppLanguage
  const [form, setForm] = useState<ReceiptForm>(() => ({
    receiptNumber: formatReceiptNumber(getFinancialYear(), 1),
    name: '',
    mobile: '',
    paymentType: 'upi',
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
  const [recentReceipts, setRecentReceipts] = useState<ReceiptRecord[]>([])
  const [historyError, setHistoryError] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [historyCursors, setHistoryCursors] = useState<Array<string | undefined>>([undefined])
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null)
  const [historyHasNextPage, setHistoryHasNextPage] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [viewReceipt, setViewReceipt] = useState<ReceiptRecord | null>(null)
  const [receiptForDownload, setReceiptForDownload] = useState<ReceiptRecord | null>(null)
  const [recordDownloadId, setRecordDownloadId] = useState<string | null>(null)
  const [recordDownloadError, setRecordDownloadError] = useState('')
  const [receiptSaved, setReceiptSaved] = useState(false)
  const [showExcelExport, setShowExcelExport] = useState(false)
  const [allReceipts, setAllReceipts] = useState<ReceiptRecord[]>([])
  const [exportYear, setExportYear] = useState(financialYear)
  const [fromSequence, setFromSequence] = useState(EXPORT_RANGE_START)
  const [toSequence, setToSequence] = useState(EXPORT_RANGE_END)
  const [isExcelLoading, setIsExcelLoading] = useState(false)
  const [isExcelDownloading, setIsExcelDownloading] = useState(false)
  const [excelMessage, setExcelMessage] = useState('')

  const amountInWords = useMemo(
    () => language === 'en'
      ? numberToEnglishWords(Number(form.amount || 0))
      : numberToMarathiWords(Number(form.amount || 0)),
    [form.amount, language],
  )
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

  useEffect(() => {
    document.title = `${t('header.title')} | ${t('header.organization')}`
  }, [language, t])

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

  const handleLogout = async () => {
    try {
      await logoutOperator()
      setStatus('')
      setHistoryError('')
    } catch (error) {
      console.error(error)
    }
  }

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
      paymentType: 'upi',
      paymentDate: todayForInput(),
      amount: '',
      reference: '',
    }))
    setErrors({})
    setReceiptSaved(false)
    setStatus(t('status.newReceipt'))
    void refreshNextReceiptNumber()
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
        <AppHeader user={null} onLogout={() => undefined} />
        <main className="auth-page"><div className="auth-loader" aria-label="Loading" /></main>
      </div>
    )
  }

  if (!authUser) {
    return (
      <div className="app-shell">
        <AppHeader user={null} onLogout={() => undefined} />
        <main className="auth-page">
          <form className="login-card" onSubmit={handleLogin}>
            <div className="login-icon" aria-hidden="true">ॐ</div>
            <p className="login-kicker">{t('auth.secure')}</p>
            <h2>{t('auth.title')}</h2>
            <p className="login-copy">{t('auth.copy')}</p>
            <label className="field">
              <span>{t('auth.operatorId')} <small>Operator ID</small></span>
              <input
                value={loginId}
                onChange={(event) => setLoginId(event.target.value)}
                autoComplete="username"
                autoFocus
              />
            </label>
            <label className="field">
              <span>{t('auth.password')} <small>Password</small></span>
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
    <div className="app-shell">
      <AppHeader user={authUser} onLogout={() => void handleLogout()} />

      <main className="workspace">
        <div className="left-column">
          <aside className="form-panel" aria-label="Receipt information form">
            <div className="panel-heading">
              <div><span className="step-badge">{t('form.step')}</span><h2>{t('form.title')}</h2></div>
              <button className="text-button" type="button" onClick={resetForm}>{t('form.newReceipt')}</button>
            </div>

            <div className="form-grid">
              <label className="field field-wide receipt-number-field">
                <span>{t('form.receiptNumber')} <small>{t('form.databaseSequence')}</small></span>
                <div className="locked-input">
                  <input value={isNumberLoading ? t('form.loadingNumber') : databaseReady ? form.receiptNumber : t('form.rulesRequired')} readOnly />
                  <span title="Firebase database generated">DB</span>
                </div>
                {errors.receiptNumber && <em>{errors.receiptNumber}</em>}
              </label>

              <label className="field field-wide">
                <span>{t('form.name')} <small>{t('form.fullName')}</small></span>
                <input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder={t('form.namePlaceholder')} aria-invalid={Boolean(errors.name)} />
                {errors.name && <em>{errors.name}</em>}
              </label>

              <label className="field field-wide">
                <span>{t('form.mobile')} <small>{t('form.mobileEnglish')}</small></span>
                <input value={form.mobile} onChange={(event) => updateField('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" placeholder={t('form.mobilePlaceholder')} aria-invalid={Boolean(errors.mobile)} />
                {errors.mobile && <em>{errors.mobile}</em>}
              </label>

              <label className="field">
                <span>{t('form.paymentType')} <small>{t('form.paymentTypeEnglish')}</small></span>
                <select value={form.paymentType} onChange={(event) => updateField('paymentType', event.target.value as PaymentType)}>
                  <option value="upi">{paymentLabels.upi}</option><option value="cash">{paymentLabels.cash}</option><option value="bank">{paymentLabels.bank}</option><option value="cheque">{paymentLabels.cheque}</option>
                </select>
              </label>

              <label className="field">
                <span>{t('form.paymentDate')} <small>{t('form.paymentDateEnglish')}</small></span>
                <input type="date" value={form.paymentDate} onChange={(event) => updateField('paymentDate', event.target.value)} aria-invalid={Boolean(errors.paymentDate)} />
                {errors.paymentDate && <em>{errors.paymentDate}</em>}
              </label>

              <label className="field field-wide">
                <span>{t('form.amount')} <small>{t('form.amountEnglish')}</small></span>
                <div className="amount-input"><b>₹</b><input type="number" min="1" step="1" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} placeholder="1000" aria-invalid={Boolean(errors.amount)} /></div>
                {errors.amount && <em>{errors.amount}</em>}
              </label>

              <label className="field field-wide">
                <span>{t('form.reference')} <small>{t('form.referenceEnglish')}</small></span>
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
            {isHistoryLoading ? <p className="history-empty">{t('history.loading')}</p> : historyError ? <p className="history-empty history-error">{historyError}</p> : recentReceipts.length === 0 ? (
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
      </main>

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
          <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="view-receipt-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="record-modal-heading">
              <div className="record-modal-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.75" /></svg>
              </div>
              <div><h2 id="view-receipt-title">{t('record.details')}</h2><p>{viewReceipt.receiptNumber}</p></div>
              <button type="button" onClick={() => setViewReceipt(null)} aria-label={t('record.close')}>×</button>
            </div>
            <dl className="record-details-grid">
              <div><dt>{t('record.name')}</dt><dd>{viewReceipt.name}</dd></div>
              <div><dt>{t('record.mobile')}</dt><dd>{viewReceipt.mobile}</dd></div>
              <div><dt>{t('record.paymentType')}</dt><dd>{paymentLabels[viewReceipt.paymentType]}</dd></div>
              <div><dt>{t('record.paymentDate')}</dt><dd>{formatReceiptDate(viewReceipt.paymentDate)}</dd></div>
              <div><dt>{t('record.amount')}</dt><dd>₹ {Number(viewReceipt.amount).toLocaleString('en-IN')}</dd></div>
              <div><dt>{t('record.reference')}</dt><dd>{viewReceipt.reference || '—'}</dd></div>
              <div className="record-detail-wide"><dt>{t('record.amountWords')}</dt><dd>{viewReceipt.amountInWords}</dd></div>
              <div><dt>{t('record.createdBy')}</dt><dd>{viewReceipt.createdByName}</dd></div>
              <div><dt>{t('record.createdAt')}</dt><dd>{formatRecordTimestamp(viewReceipt.createdAt, language)}</dd></div>
            </dl>
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
            {isExcelLoading ? <div className="excel-loading"><div className="auth-loader" />{t('export.loading')}</div> : allReceipts.length === 0 ? (
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
