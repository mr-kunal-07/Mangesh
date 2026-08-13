import { useMemo, useRef, useState } from 'react'
import receiptTemplate from './assets/receipt-template.jpeg'

type PaymentType = 'cash' | 'upi' | 'bank' | 'cheque'

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

const paymentLabels: Record<PaymentType, string> = {
  cash: 'रोख',
  upi: 'यूपीआय',
  bank: 'बँक ट्रान्सफर',
  cheque: 'धनादेश',
}

function todayForInput() {
  const today = new Date()
  const offset = today.getTimezoneOffset()
  return new Date(today.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function createReceiptNumber() {
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)
  const nextYear = String(now.getFullYear() + 1).slice(-2)
  const serial = String(now.getTime()).slice(-6)
  return `OSM/${year}-${nextYear}/${serial}`
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

function App() {
  const receiptRef = useRef<HTMLElement>(null)
  const [form, setForm] = useState<ReceiptForm>(() => ({
    receiptNumber: createReceiptNumber(),
    name: '',
    mobile: '',
    paymentType: 'upi',
    paymentDate: todayForInput(),
    amount: '',
    reference: '',
  }))
  const [errors, setErrors] = useState<FormErrors>({})
  const [isDownloading, setIsDownloading] = useState(false)
  const [status, setStatus] = useState('')

  const amountInWords = useMemo(
    () => numberToMarathiWords(Number(form.amount || 0)),
    [form.amount],
  )

  const updateField = (field: keyof ReceiptForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }))
    }
    setStatus('')
  }

  const validate = () => {
    const nextErrors: FormErrors = {}
    if (!form.receiptNumber.trim()) nextErrors.receiptNumber = 'पावती क्रमांक आवश्यक आहे.'
    if (!form.name.trim()) nextErrors.name = 'नाव आवश्यक आहे.'
    if (!/^\d{10}$/.test(form.mobile)) nextErrors.mobile = '१० अंकी मोबाईल नंबर टाका.'
    if (!form.paymentDate) nextErrors.paymentDate = 'दिनांक आवश्यक आहे.'
    if (!form.amount || Number(form.amount) <= 0) nextErrors.amount = 'योग्य रक्कम टाका.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const downloadPdf = async () => {
    if (!validate() || !receiptRef.current) {
      setStatus('कृपया आवश्यक माहिती पूर्ण करा.')
      return
    }

    setIsDownloading(true)
    setStatus('PDF तयार होत आहे…')

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      await document.fonts.ready
      const images = Array.from(receiptRef.current.querySelectorAll('img'))
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

      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#fffdf7',
        logging: false,
        imageTimeout: 20_000,
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, 210, 297)
      const safeNumber = form.receiptNumber.replace(/[^a-zA-Z0-9-]/g, '-')
      pdf.save(`receipt-${safeNumber}.pdf`)
      setStatus('PDF यशस्वीरित्या डाउनलोड झाला.')
    } catch (error) {
      console.error(error)
      setStatus('PDF तयार करता आला नाही. कृपया पुन्हा प्रयत्न करा.')
    } finally {
      setIsDownloading(false)
    }
  }

  const resetForm = () => {
    setForm({
      receiptNumber: createReceiptNumber(),
      name: '',
      mobile: '',
      paymentType: 'upi',
      paymentDate: todayForInput(),
      amount: '',
      reference: '',
    })
    setErrors({})
    setStatus('नवीन पावती तयार आहे.')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          ॐ
        </div>
        <div>
          <p className="eyebrow">ॐ साईनाथ सेवा मंडळ, रजि.</p>
          <h1>डिजिटल वर्गणी पावती</h1>
          <p className="header-subtitle">माहिती भरा, पावती तपासा आणि PDF डाउनलोड करा.</p>
        </div>
      </header>

      <main className="workspace">
        <aside className="form-panel" aria-label="Receipt information form">
          <div className="panel-heading">
            <div>
              <span className="step-badge">01</span>
              <h2>पावतीची माहिती</h2>
            </div>
            <button className="text-button" type="button" onClick={resetForm}>
              नवीन पावती
            </button>
          </div>

          <div className="form-grid">
            <label className="field field-wide">
              <span>पावती क्रमांक <small>Receipt number</small></span>
              <input
                value={form.receiptNumber}
                onChange={(event) => updateField('receiptNumber', event.target.value)}
                aria-invalid={Boolean(errors.receiptNumber)}
              />
              {errors.receiptNumber && <em>{errors.receiptNumber}</em>}
            </label>

            <label className="field field-wide">
              <span>नाव <small>Full name</small></span>
              <input
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="उदा. कुणाल जाधव"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <em>{errors.name}</em>}
            </label>

            <label className="field field-wide">
              <span>मोबाईल नं. <small>Mobile number</small></span>
              <input
                value={form.mobile}
                onChange={(event) =>
                  updateField('mobile', event.target.value.replace(/\D/g, '').slice(0, 10))
                }
                inputMode="numeric"
                placeholder="10 अंकी नंबर"
                aria-invalid={Boolean(errors.mobile)}
              />
              {errors.mobile && <em>{errors.mobile}</em>}
            </label>

            <label className="field">
              <span>पेमेंट प्रकार <small>Payment type</small></span>
              <select
                value={form.paymentType}
                onChange={(event) => updateField('paymentType', event.target.value)}
              >
                <option value="upi">UPI</option>
                <option value="cash">Cash / रोख</option>
                <option value="bank">Bank transfer</option>
                <option value="cheque">Cheque / धनादेश</option>
              </select>
            </label>

            <label className="field">
              <span>पेमेंट दिनांक <small>Payment date</small></span>
              <input
                type="date"
                value={form.paymentDate}
                onChange={(event) => updateField('paymentDate', event.target.value)}
                aria-invalid={Boolean(errors.paymentDate)}
              />
              {errors.paymentDate && <em>{errors.paymentDate}</em>}
            </label>

            <label className="field field-wide">
              <span>एकूण रक्कम <small>Amount in rupees</small></span>
              <div className="amount-input">
                <b>₹</b>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.amount}
                  onChange={(event) => updateField('amount', event.target.value)}
                  placeholder="1000"
                  aria-invalid={Boolean(errors.amount)}
                />
              </div>
              {errors.amount && <em>{errors.amount}</em>}
            </label>

            <label className="field field-wide">
              <span>व्यवहार क्रमांक <small>Reference — optional</small></span>
              <input
                value={form.reference}
                onChange={(event) => updateField('reference', event.target.value)}
                placeholder="UPI / cheque / bank reference"
              />
            </label>
          </div>

          <div className="words-preview">
            <span>अक्षरी रक्कम</span>
            <strong>{amountInWords}</strong>
          </div>

          <button
            className="download-button"
            type="button"
            onClick={downloadPdf}
            disabled={isDownloading}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14" />
            </svg>
            {isDownloading ? 'PDF तयार होत आहे…' : 'पावती PDF डाउनलोड करा'}
          </button>
          <p className="status-message" role="status">{status}</p>
        </aside>

        <section className="preview-panel" aria-label="Receipt preview">
          <div className="preview-heading">
            <div>
              <span className="step-badge">02</span>
              <h2>पावती पूर्वदृश्य</h2>
            </div>
            <span className="a4-badge">A4 • PDF</span>
          </div>

          <div className="receipt-frame">
            <article className="receipt-page" ref={receiptRef}>
              <img
                className="receipt-background"
                src={receiptTemplate}
                alt="Om Sainath Seva Mandal receipt template"
              />

              <div className="receipt-content">
                <div className="receipt-title-row">
                  <div className="receipt-meta">
                    <span>पावती क्र.</span>
                    <strong>{form.receiptNumber || '—'}</strong>
                  </div>
                  <h3>पावती</h3>
                  <div className="receipt-meta receipt-meta-right">
                    <span>दिनांक</span>
                    <strong>{formatReceiptDate(form.paymentDate)}</strong>
                  </div>
                </div>

                <div className="receipt-table">
                  <div className="receipt-row receipt-row-full">
                    <span>नाव :</span>
                    <strong>{form.name || '—'}</strong>
                  </div>
                  <div className="receipt-row receipt-row-full">
                    <span>मोबाईल नं. :</span>
                    <strong>{form.mobile || '—'}</strong>
                  </div>
                  <div className="receipt-row receipt-row-split">
                    <div>
                      <span>पेमेंट प्रकार :</span>
                      <strong>{paymentLabels[form.paymentType]}</strong>
                    </div>
                    <div className="receipt-amount">
                      <span>एकूण रक्कम</span>
                      <strong>{formatAmount(form.amount)}</strong>
                    </div>
                  </div>
                  <div className="receipt-row receipt-row-split">
                    <div>
                      <span>पेमेंट दिनांक :</span>
                      <strong>{formatReceiptDate(form.paymentDate)}</strong>
                    </div>
                    <div className="receipt-reference">
                      <span>व्यवहार क्र. :</span>
                      <strong>{form.reference || '—'}</strong>
                    </div>
                  </div>
                  <div className="receipt-row receipt-row-full receipt-words">
                    <span>अक्षरी रक्कम :</span>
                    <strong>{amountInWords}</strong>
                  </div>
                </div>

                <p className="computer-note">ही संगणकीकृत पावती आहे. स्वाक्षरीची आवश्यकता नाही.</p>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
