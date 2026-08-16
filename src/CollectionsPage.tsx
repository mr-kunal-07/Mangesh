import { useCallback, useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { User } from 'firebase/auth'
import { useTranslation } from 'react-i18next'
import DatePicker from './DatePicker'
import { cacheCollectionData, getCachedCollectionData } from './collectionCache'
import {
  getCollectionData,
  recordCollectionPayment,
  saveContribution,
  saveMember,
  setContributionMemberExempt,
  setContributionStatus,
  setMemberActive,
  type CollectionPaymentRecord,
  type ContributionAmountType,
  type ContributionRecord,
  type ContributionScope,
  type MemberRecord,
} from './collectionService'
import { reserveReceiptNumber, type PaymentType, type ReceiptRecord } from './receiptService'

type CollectionTab = 'overview' | 'varganis' | 'members' | 'status'
type DueStatus = 'paid' | 'partial' | 'pending' | 'overdue' | 'exempted'

type MemberForm = { name: string; mobile: string; roomNumber: string }
type ContributionForm = {
  name: string
  financialYear: string
  amountType: ContributionAmountType
  defaultAmount: string
  startDate: string
  dueDate: string
  scope: ContributionScope
  memberIds: string[]
}
type PaymentForm = {
  amount: string
  targetAmount: string
  paymentType: PaymentType
  paymentDate: string
  reference: string
}

type ShareableCollectionReceipt = {
  receipt: ReceiptRecord
  contributionName: string
  memberName: string
  mobile: string
}

type StatusRow = {
  member: MemberRecord
  expected: number
  paid: number
  balance: number
  status: DueStatus
}

const todayForInput = () => new Date().toISOString().slice(0, 10)

function formatDate(value: string, language: string) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(language === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function csvCell(value: string | number) {
  let safeValue = String(value ?? '')
  if (/^[=+\-@]/.test(safeValue)) safeValue = `'${safeValue}`
  return `"${safeValue.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function contributionMembers(contribution: ContributionRecord, members: MemberRecord[]) {
  if (contribution.scope === 'all') return members.filter((member) => member.active)
  const selectedIds = new Set(contribution.memberIds ?? [])
  return members.filter((member) => selectedIds.has(member.id))
}

function statusRowsFor(
  contribution: ContributionRecord | undefined,
  members: MemberRecord[],
  payments: CollectionPaymentRecord[],
): StatusRow[] {
  if (!contribution) return []
  const today = todayForInput()
  return contributionMembers(contribution, members).map((member) => {
    const exempt = Boolean(contribution.exemptMemberIds?.[member.id])
    const expected = exempt ? 0 : Number(contribution.memberAmounts?.[member.id] ?? contribution.defaultAmount ?? 0)
    const paid = payments
      .filter((payment) => payment.contributionId === contribution.id && payment.memberId === member.id)
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const balance = Math.max(expected - paid, 0)
    let status: DueStatus = 'pending'
    if (exempt) status = 'exempted'
    else if (expected > 0 && paid >= expected) status = 'paid'
    else if (contribution.dueDate && contribution.dueDate < today) status = 'overdue'
    else if (paid > 0) status = 'partial'
    return { member, expected, paid, balance, status }
  })
}

function CollectionSkeleton() {
  const { t } = useTranslation()
  return <div className="collection-skeleton" role="status" aria-label={t('app.loadingRecords')}>{Array.from({ length: 4 }, (_, index) => <i key={index} />)}</div>
}

export default function CollectionsPage({
  financialYear,
  authUser,
  receipts,
  paymentLabels,
  toAmountWords,
  onReceiptCreated,
  onShareReceipt,
  onOpenReceipts,
}: {
  financialYear: string
  authUser: User
  receipts: ReceiptRecord[]
  paymentLabels: Record<PaymentType, string>
  toAmountWords: (amount: number) => string
  onReceiptCreated: () => Promise<void> | void
  onShareReceipt: (receipt: ReceiptRecord, message: string) => Promise<'shared' | 'text-only'>
  onOpenReceipts: () => void
}) {
  const { t, i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? i18n.language).split('-')[0]
  const [initialCache] = useState(getCachedCollectionData)
  const [members, setMembers] = useState(initialCache.members)
  const [contributions, setContributions] = useState(initialCache.contributions)
  const [payments, setPayments] = useState(initialCache.payments)
  const [isLoading, setIsLoading] = useState(initialCache.savedAt === 0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<CollectionTab>('overview')
  const [showMemberForm, setShowMemberForm] = useState(false)
  const [showContributionForm, setShowContributionForm] = useState(false)
  const [isSavingMember, setIsSavingMember] = useState(false)
  const [isSavingContribution, setIsSavingContribution] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const deferredMemberSearch = useDeferredValue(memberSearch.trim().toLocaleLowerCase(language === 'mr' ? 'mr-IN' : 'en-IN'))
  const [selectedContributionId, setSelectedContributionId] = useState('')
  const [statusSearch, setStatusSearch] = useState('')
  const deferredStatusSearch = useDeferredValue(statusSearch.trim().toLocaleLowerCase(language === 'mr' ? 'mr-IN' : 'en-IN'))
  const [statusFilter, setStatusFilter] = useState<'all' | DueStatus>('all')
  const [paymentRow, setPaymentRow] = useState<StatusRow | null>(null)
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [shareableReceipt, setShareableReceipt] = useState<ShareableCollectionReceipt | null>(null)
  const [isSharingReceipt, setIsSharingReceipt] = useState(false)
  const [shareFeedback, setShareFeedback] = useState('')
  const [memberForm, setMemberForm] = useState<MemberForm>({ name: '', mobile: '', roomNumber: '' })
  const [contributionForm, setContributionForm] = useState<ContributionForm>({
    name: '', financialYear, amountType: 'fixed', defaultAmount: '', startDate: todayForInput(), dueDate: todayForInput(), scope: 'all', memberIds: [],
  })
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: '', targetAmount: '', paymentType: 'upi', paymentDate: todayForInput(), reference: '',
  })

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true)
    setError('')
    try {
      const data = await getCollectionData()
      setMembers(data.members)
      setContributions(data.contributions)
      setPayments(data.payments)
      cacheCollectionData(data)
    } catch (loadError) {
      console.error(loadError)
      setError(t('collections.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadData(initialCache.savedAt === 0), 0)
    return () => window.clearTimeout(loadTimer)
  }, [initialCache.savedAt, loadData])

  const yearContributions = useMemo(
    () => contributions.filter((contribution) => contribution.financialYear === financialYear),
    [contributions, financialYear],
  )

  const effectiveContributionId = yearContributions.some((contribution) => contribution.id === selectedContributionId)
    ? selectedContributionId
    : (yearContributions[0]?.id ?? '')
  const selectedContribution = useMemo(
    () => contributions.find((contribution) => contribution.id === effectiveContributionId),
    [contributions, effectiveContributionId],
  )
  const selectedRows = useMemo(
    () => statusRowsFor(selectedContribution, members, payments),
    [members, payments, selectedContribution],
  )
  const filteredStatusRows = useMemo(() => selectedRows.filter((row) => {
    const searchable = `${row.member.memberCode} ${row.member.name} ${row.member.mobile}`.toLocaleLowerCase(language === 'mr' ? 'mr-IN' : 'en-IN')
    return (!deferredStatusSearch || searchable.includes(deferredStatusSearch)) && (statusFilter === 'all' || row.status === statusFilter)
  }), [deferredStatusSearch, language, selectedRows, statusFilter])

  const filteredMembers = useMemo(() => members.filter((member) => {
    const searchable = `${member.memberCode} ${member.name} ${member.mobile} ${member.roomNumber ?? member.address ?? ''}`.toLocaleLowerCase(language === 'mr' ? 'mr-IN' : 'en-IN')
    return (!deferredMemberSearch || searchable.includes(deferredMemberSearch)) && (memberFilter === 'all' || (memberFilter === 'active' ? member.active : !member.active))
  }), [deferredMemberSearch, language, memberFilter, members])

  const contributionSummaries = useMemo(() => yearContributions.map((contribution) => {
    const rows = statusRowsFor(contribution, members, payments)
    const expected = rows.reduce((sum, row) => sum + row.expected, 0)
    const paid = rows.reduce((sum, row) => sum + row.paid, 0)
    return { contribution, rows, expected, paid, balance: Math.max(expected - paid, 0) }
  }), [members, payments, yearContributions])

  const overviewTotals = useMemo(() => contributionSummaries.reduce((summary, item) => ({
    expected: summary.expected + item.expected,
    paid: summary.paid + item.paid,
    pending: summary.pending + item.balance,
    paidMembers: summary.paidMembers + item.rows.filter((row) => row.status === 'paid').length,
    pendingMembers: summary.pendingMembers + item.rows.filter((row) => row.status !== 'paid' && row.status !== 'exempted').length,
  }), { expected: 0, paid: 0, pending: 0, paidMembers: 0, pendingMembers: 0 }), [contributionSummaries])

  const recentPayments = useMemo(() => payments
    .filter((payment) => yearContributions.some((contribution) => contribution.id === payment.contributionId))
    .slice(0, 6), [payments, yearContributions])

  const resetMemberForm = () => setMemberForm({ name: '', mobile: '', roomNumber: '' })
  const resetContributionForm = () => setContributionForm({
    name: '', financialYear, amountType: 'fixed', defaultAmount: '', startDate: todayForInput(), dueDate: todayForInput(), scope: 'all', memberIds: [],
  })

  const submitMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!memberForm.name.trim() || !/^\d{10}$/.test(memberForm.mobile)) {
      setError(t('collections.errors.memberValidation'))
      return
    }
    setIsSavingMember(true)
    try {
      const result = await saveMember({
        name: memberForm.name.trim(), mobile: memberForm.mobile, roomNumber: memberForm.roomNumber.trim(), active: true,
        createdBy: authUser.uid, createdByName: 'Mangesh',
      })
      resetMemberForm()
      setShowMemberForm(false)
      setMessage(t('collections.messages.memberSaved', { code: result.memberCode }))
      await loadData()
    } catch (saveError) {
      console.error(saveError)
      setError(t('collections.errors.save'))
    } finally {
      setIsSavingMember(false)
    }
  }

  const toggleSelectedMember = (memberId: string) => setContributionForm((current) => ({
    ...current,
    memberIds: current.memberIds.includes(memberId) ? current.memberIds.filter((id) => id !== memberId) : [...current.memberIds, memberId],
  }))

  const submitContribution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    const amount = Number(contributionForm.defaultAmount)
    if (!contributionForm.name.trim() || amount <= 0 || !contributionForm.startDate || !contributionForm.dueDate || contributionForm.dueDate < contributionForm.startDate || (contributionForm.scope === 'selected' && contributionForm.memberIds.length === 0)) {
      setError(t('collections.errors.varganiValidation'))
      return
    }
    setIsSavingContribution(true)
    try {
      const result = await saveContribution({
        name: contributionForm.name.trim(), financialYear: contributionForm.financialYear,
        amountType: contributionForm.amountType, defaultAmount: amount,
        startDate: contributionForm.startDate, dueDate: contributionForm.dueDate,
        scope: contributionForm.scope, memberIds: contributionForm.scope === 'all' ? [] : contributionForm.memberIds,
        memberAmounts: {}, exemptMemberIds: {}, status: 'active',
        createdBy: authUser.uid, createdByName: 'Mangesh',
      })
      resetContributionForm()
      setShowContributionForm(false)
      setSelectedContributionId(result.id)
      setMessage(t('collections.messages.varganiSaved', { code: result.contributionCode }))
      await loadData()
    } catch (saveError) {
      console.error(saveError)
      setError(t('collections.errors.save'))
    } finally {
      setIsSavingContribution(false)
    }
  }

  const openPayment = (row: StatusRow) => {
    setPaymentRow(row)
    setError('')
    setMessage('')
    const suggestedAmount = row.balance > 0 ? row.balance : row.expected
    setPaymentForm({
      amount: suggestedAmount ? String(suggestedAmount) : '', targetAmount: row.expected ? String(row.expected) : '',
      paymentType: 'upi', paymentDate: todayForInput(), reference: '',
    })
  }

  const submitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!paymentRow || !selectedContribution) return
    const amount = Number(paymentForm.amount)
    const targetAmount = Number(paymentForm.targetAmount)
    if (amount <= 0 || !paymentForm.paymentDate || (selectedContribution.amountType === 'custom' && targetAmount <= 0)) {
      setError(t('collections.errors.paymentValidation'))
      return
    }
    setIsSavingPayment(true)
    setError('')
    setMessage('')
    try {
      const reserved = await reserveReceiptNumber(financialYear)
      const finalTarget = selectedContribution.amountType === 'custom' ? Math.max(targetAmount, paymentRow.paid + amount) : undefined
      const result = await recordCollectionPayment({
        payment: {
          contributionId: selectedContribution.id, memberId: paymentRow.member.id, amount,
          paymentType: paymentForm.paymentType, paymentDate: paymentForm.paymentDate, reference: paymentForm.reference.trim(),
          createdBy: authUser.uid, createdByName: 'Mangesh',
        },
        receipt: {
          receiptNumber: reserved.receiptNumber, sequence: reserved.sequence, financialYear,
          name: paymentRow.member.name, mobile: paymentRow.member.mobile,
          paymentType: paymentForm.paymentType, paymentDate: paymentForm.paymentDate, amount,
          amountInWords: toAmountWords(amount), reference: paymentForm.reference.trim() || selectedContribution.name,
          createdBy: authUser.uid, createdByName: 'Mangesh',
        },
        memberTarget: finalTarget,
      })
      setPaymentRow(null)
      setShareableReceipt({
        receipt: result.receipt,
        contributionName: selectedContribution.name,
        memberName: paymentRow.member.name,
        mobile: paymentRow.member.mobile,
      })
      setShareFeedback('')
      setMessage(t('collections.messages.paymentSaved', { number: reserved.receiptNumber }))
      await Promise.all([loadData(), Promise.resolve(onReceiptCreated())])
    } catch (saveError) {
      console.error(saveError)
      setError(t('collections.errors.paymentSave'))
    } finally {
      setIsSavingPayment(false)
    }
  }

  const toggleMemberStatus = async (member: MemberRecord) => {
    try {
      await setMemberActive(member.id, !member.active)
      await loadData()
    } catch (statusError) {
      console.error(statusError)
      setError(t('collections.errors.save'))
    }
  }

  const toggleContributionStatus = async (contribution: ContributionRecord) => {
    try {
      await setContributionStatus(contribution.id, contribution.status === 'active' ? 'closed' : 'active')
      await loadData()
    } catch (statusError) {
      console.error(statusError)
      setError(t('collections.errors.save'))
    }
  }

  const toggleExempt = async (row: StatusRow) => {
    if (!selectedContribution) return
    try {
      await setContributionMemberExempt(selectedContribution.id, row.member.id, row.status !== 'exempted')
      await loadData()
    } catch (statusError) {
      console.error(statusError)
      setError(t('collections.errors.save'))
    }
  }

  const shareReceiptTarget = async (target: ShareableCollectionReceipt) => {
    const shareMessage = t('collections.paymentReceiptMessage', {
      name: target.memberName,
      amount: Number(target.receipt.amount).toLocaleString('en-IN'),
      vargani: target.contributionName,
      number: target.receipt.receiptNumber,
      date: formatDate(target.receipt.paymentDate, language),
    })
    setIsSharingReceipt(true)
    setShareFeedback('')
    try {
      const result = await onShareReceipt(target.receipt, shareMessage)
      if (result === 'text-only') {
        window.open(`https://wa.me/91${target.mobile}?text=${encodeURIComponent(shareMessage)}`, '_blank', 'noopener,noreferrer')
        setShareFeedback(t('collections.shareFallback'))
      } else {
        setShareFeedback(t('collections.shareComplete'))
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === 'AbortError') return
      console.error(shareError)
      setShareFeedback(t('collections.errors.shareReceipt'))
    } finally {
      setIsSharingReceipt(false)
    }
  }

  const shareCollectionReceipt = async () => {
    if (!shareableReceipt) return
    await shareReceiptTarget(shareableReceipt)
  }

  const sharePaidReceipt = async (row: StatusRow) => {
    if (!selectedContribution) return
    const payment = payments.find((item) => item.contributionId === selectedContribution.id && item.memberId === row.member.id)
    if (!payment) {
      setError(t('collections.errors.shareReceipt'))
      return
    }
    const storedReceipt = receipts.find((receipt) => receipt.id === payment.receiptId)
    const receipt: ReceiptRecord = storedReceipt ?? {
      id: payment.receiptId,
      receiptNumber: payment.receiptNumber,
      sequence: Number(payment.receiptNumber.split('/').at(-1)) || 0,
      financialYear,
      name: row.member.name,
      mobile: row.member.mobile,
      paymentType: payment.paymentType,
      paymentDate: payment.paymentDate,
      amount: Number(payment.amount),
      amountInWords: toAmountWords(Number(payment.amount)),
      reference: payment.reference || selectedContribution.name,
      createdAt: payment.createdAt,
      createdBy: payment.createdBy,
      createdByName: payment.createdByName,
    }
    const target = {
      receipt,
      contributionName: selectedContribution.name,
      memberName: row.member.name,
      mobile: row.member.mobile,
    }
    setShareableReceipt(target)
    await shareReceiptTarget(target)
  }

  const downloadStatusReport = () => {
    if (!selectedContribution) return
    const rows: Array<Array<string | number>> = [
      [t('collections.csv.memberCode'), t('collections.csv.name'), t('collections.csv.mobile'), t('collections.csv.expected'), t('collections.csv.paid'), t('collections.csv.balance'), t('collections.csv.status')],
      ...selectedRows.map((row) => [row.member.memberCode, row.member.name, row.member.mobile, row.expected, row.paid, row.balance, t(`collections.statuses.${row.status}`)]),
      ['', t('collections.csv.total'), '', selectedRows.reduce((sum, row) => sum + row.expected, 0), selectedRows.reduce((sum, row) => sum + row.paid, 0), selectedRows.reduce((sum, row) => sum + row.balance, 0), ''],
    ]
    downloadCsv(`collection-${selectedContribution.contributionCode.replace(/\//g, '-')}.csv`, rows)
  }

  const tabs: CollectionTab[] = ['overview', 'varganis', 'members', 'status']

  return (
    <main className="route-page collections-page">
      <div className="route-heading collection-route-heading">
        <div><p>{t('collections.kicker')}</p><h2>{t('collections.title')}</h2><span>{t('collections.subtitle', { year: financialYear })}</span></div>
        <button type="button" onClick={() => { setActiveTab('status'); setPaymentRow(null) }}>{t('collections.collect')}</button>
      </div>

      <nav className="collection-tabs" aria-label={t('collections.tabsLabel')}>
        {tabs.map((tab) => <button className={activeTab === tab ? 'active' : ''} type="button" key={tab} onClick={() => setActiveTab(tab)}>{t(`collections.tabs.${tab}`)}</button>)}
      </nav>

      {error && <p className="collection-alert error" role="alert">{error}</p>}
      {message && <p className="collection-alert success" role="status">{message}</p>}
      {shareableReceipt && <section className="collection-receipt-share route-card" aria-label={t('collections.shareReceiptTitle')}>
        <div className="collection-share-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h10v18l-2.5-1.7L12 21l-2.5-1.7L7 21V3Z" /><path d="M10 8h4m-4 4h4" /></svg></div>
        <div><h3>{t('collections.shareReceiptTitle')}</h3><p>{t('collections.shareReceiptCopy', { number: shareableReceipt.receipt.receiptNumber, name: shareableReceipt.memberName })}</p>{shareFeedback && <small role="status">{shareFeedback}</small>}</div>
        <div className="collection-share-actions"><button type="button" onClick={() => void shareCollectionReceipt()} disabled={isSharingReceipt}>{isSharingReceipt ? t('collections.sharePreparing') : t('collections.shareWhatsApp')}</button><button type="button" className="secondary" onClick={() => { setShareableReceipt(null); setShareFeedback('') }}>{t('collections.dismiss')}</button></div>
      </section>}

      {activeTab === 'overview' && <>
        <section className="collection-stat-grid" aria-busy={isLoading}>
          {isLoading ? Array.from({ length: 4 }, (_, index) => <article className="data-box-loading" key={index}><i /><b /><span /></article>) : <>
            <article><span>{t('collections.expected')}</span><strong>₹ {overviewTotals.expected.toLocaleString('en-IN')}</strong><small>{yearContributions.length} {t('collections.varganis')}</small></article>
            <article><span>{t('collections.received')}</span><strong>₹ {overviewTotals.paid.toLocaleString('en-IN')}</strong><small>{overviewTotals.paidMembers} {t('collections.paidMembers')}</small></article>
            <article className="collection-pending-stat"><span>{t('collections.pending')}</span><strong>₹ {overviewTotals.pending.toLocaleString('en-IN')}</strong><small>{overviewTotals.pendingMembers} {t('collections.pendingMembers')}</small></article>
            <article><span>{t('collections.activeVarganis')}</span><strong>{yearContributions.filter((item) => item.status === 'active').length}</strong><small>{members.filter((member) => member.active).length} {t('collections.activeMembers')}</small></article>
          </>}
        </section>

        <div className="collection-overview-grid">
          <section className="route-card collection-panel">
            <div className="collection-panel-heading"><div><h3>{t('collections.activeCollections')}</h3><p>{t('collections.activeCollectionsCopy')}</p></div><button type="button" onClick={() => setActiveTab('varganis')}>{t('collections.viewAll')}</button></div>
            {isLoading ? <CollectionSkeleton /> : contributionSummaries.length === 0 ? <p className="collection-empty">{t('collections.emptyVarganis')}</p> : <div className="vargani-mini-list">{contributionSummaries.slice(0, 5).map(({ contribution, expected, paid }) => { const percent = expected ? Math.min((paid / expected) * 100, 100) : 0; return <button type="button" key={contribution.id} onClick={() => { setSelectedContributionId(contribution.id); setActiveTab('status') }}><div><strong>{contribution.name}</strong><span>{contribution.contributionCode} · {formatDate(contribution.dueDate, language)}</span></div><b>₹ {paid.toLocaleString('en-IN')} / ₹ {expected.toLocaleString('en-IN')}</b><i><span style={{ width: `${percent}%` }} /></i></button> })}</div>}
          </section>
          <section className="route-card collection-panel">
            <div className="collection-panel-heading"><div><h3>{t('collections.recentPayments')}</h3><p>{t('collections.recentPaymentsCopy')}</p></div><button type="button" onClick={onOpenReceipts}>{t('collections.receipts')}</button></div>
            {isLoading ? <CollectionSkeleton /> : recentPayments.length === 0 ? <p className="collection-empty">{t('collections.emptyPayments')}</p> : <div className="collection-payment-list">{recentPayments.map((payment) => { const member = members.find((item) => item.id === payment.memberId); const contribution = contributions.find((item) => item.id === payment.contributionId); return <article key={payment.id}><span>₹</span><div><strong>{member?.name ?? '—'}</strong><small>{contribution?.name ?? '—'} · {payment.receiptNumber}</small></div><b>₹ {Number(payment.amount).toLocaleString('en-IN')}</b></article> })}</div>}
          </section>
        </div>
      </>}

      {activeTab === 'varganis' && <section className="collection-section-stack">
        <div className="collection-section-toolbar"><div><h3>{t('collections.varganiList')}</h3><p>{t('collections.varganiListCopy')}</p></div><button type="button" onClick={() => { setShowContributionForm((current) => !current); setError('') }}>{showContributionForm ? t('collections.cancel') : t('collections.newVargani')}</button></div>
        {showContributionForm && <form className="route-card collection-form" onSubmit={submitContribution}>
          <div className="collection-form-grid">
            <label className="field field-wide"><span>{t('collections.fields.varganiName')}</span><input value={contributionForm.name} onChange={(event) => setContributionForm((current) => ({ ...current, name: event.target.value }))} placeholder={t('collections.fields.varganiPlaceholder')} /></label>
            <label className="field"><span>{t('collections.fields.year')}</span><input value={contributionForm.financialYear} readOnly /></label>
            <label className="field"><span>{t('collections.fields.amountType')}</span><select value={contributionForm.amountType} onChange={(event) => setContributionForm((current) => ({ ...current, amountType: event.target.value as ContributionAmountType }))}><option value="fixed">{t('collections.amountTypes.fixed')}</option><option value="custom">{t('collections.amountTypes.custom')}</option></select></label>
            <label className="field"><span>{contributionForm.amountType === 'fixed' ? t('collections.fields.amount') : t('collections.fields.suggestedAmount')}</span><div className="amount-input"><b>₹</b><input type="number" min="1" value={contributionForm.defaultAmount} onChange={(event) => setContributionForm((current) => ({ ...current, defaultAmount: event.target.value }))} /></div></label>
            <div className="field"><span>{t('collections.fields.startDate')}</span><DatePicker value={contributionForm.startDate} onChange={(value) => setContributionForm((current) => ({ ...current, startDate: value }))} label={t('collections.fields.startDate')} /></div>
            <div className="field"><span>{t('collections.fields.dueDate')}</span><DatePicker value={contributionForm.dueDate} onChange={(value) => setContributionForm((current) => ({ ...current, dueDate: value }))} label={t('collections.fields.dueDate')} /></div>
            <label className="field"><span>{t('collections.fields.scope')}</span><select value={contributionForm.scope} onChange={(event) => setContributionForm((current) => ({ ...current, scope: event.target.value as ContributionScope }))}><option value="all">{t('collections.scopes.all')}</option><option value="selected">{t('collections.scopes.selected')}</option></select></label>
          </div>
          {contributionForm.scope === 'selected' && <div className="collection-member-picker"><div><strong>{t('collections.selectMembers')}</strong><span>{t('collections.selectedCount', { count: contributionForm.memberIds.length })}</span></div><div>{members.filter((member) => member.active).map((member) => <label key={member.id}><input type="checkbox" checked={contributionForm.memberIds.includes(member.id)} onChange={() => toggleSelectedMember(member.id)} /><span>{member.name}</span><small>{member.memberCode}</small></label>)}</div></div>}
          <button className="collection-primary-button" type="submit" disabled={isSavingContribution}>{isSavingContribution ? t('collections.saving') : t('collections.saveVargani')}</button>
        </form>}
        {isLoading ? <CollectionSkeleton /> : contributionSummaries.length === 0 ? <p className="route-card collection-empty">{t('collections.emptyVarganis')}</p> : <div className="vargani-card-grid">{contributionSummaries.map(({ contribution, rows, expected, paid, balance }) => <article className="route-card vargani-card" key={contribution.id}><div className="vargani-card-top"><div><span>{contribution.contributionCode}</span><h3>{contribution.name}</h3></div><i className={`collection-status-dot ${contribution.status}`}>{t(`collections.campaignStatuses.${contribution.status}`)}</i></div><dl><div><dt>{t('collections.members')}</dt><dd>{rows.length}</dd></div><div><dt>{t('collections.expected')}</dt><dd>₹ {expected.toLocaleString('en-IN')}</dd></div><div><dt>{t('collections.received')}</dt><dd>₹ {paid.toLocaleString('en-IN')}</dd></div><div><dt>{t('collections.pending')}</dt><dd>₹ {balance.toLocaleString('en-IN')}</dd></div></dl><div className="vargani-progress"><i><span style={{ width: `${expected ? Math.min((paid / expected) * 100, 100) : 0}%` }} /></i><small>{t('collections.dueOn', { date: formatDate(contribution.dueDate, language) })}</small></div><div className="vargani-card-actions"><button type="button" onClick={() => { setSelectedContributionId(contribution.id); setActiveTab('status') }}>{t('collections.openStatus')}</button><button type="button" className="secondary" onClick={() => void toggleContributionStatus(contribution)}>{contribution.status === 'active' ? t('collections.closeVargani') : t('collections.reopenVargani')}</button></div></article>)}</div>}
      </section>}

      {activeTab === 'members' && <section className="collection-section-stack">
        <div className="collection-section-toolbar"><div><h3>{t('collections.memberDirectory')}</h3><p>{t('collections.memberDirectoryCopy')}</p></div><button type="button" onClick={() => { setShowMemberForm((current) => !current); setError('') }}>{showMemberForm ? t('collections.cancel') : t('collections.addMember')}</button></div>
        {showMemberForm && <form className="route-card collection-form member-create-form" onSubmit={submitMember}><div className="collection-form-grid"><label className="field"><span>{t('collections.fields.memberName')}</span><input value={memberForm.name} onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))} /></label><label className="field"><span>{t('collections.fields.whatsapp')}</span><input inputMode="numeric" value={memberForm.mobile} onChange={(event) => setMemberForm((current) => ({ ...current, mobile: event.target.value.replace(/\D/g, '').slice(0, 10) }))} /></label><label className="field field-wide"><span>{t('collections.fields.roomNumber')}</span><input value={memberForm.roomNumber} onChange={(event) => setMemberForm((current) => ({ ...current, roomNumber: event.target.value }))} placeholder={t('collections.fields.roomNumberPlaceholder')} /></label></div><button className="collection-primary-button" type="submit" disabled={isSavingMember}>{isSavingMember ? t('collections.saving') : t('collections.saveMember')}</button></form>}
        <div className="collection-filter-bar route-card"><label><span>{t('collections.search')}</span><input type="search" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder={t('collections.searchMembers')} /></label><div className="collection-filter-pills">{(['all', 'active', 'inactive'] as const).map((filter) => <button className={memberFilter === filter ? 'active' : ''} type="button" key={filter} onClick={() => setMemberFilter(filter)}>{t(`collections.memberFilters.${filter}`)}</button>)}</div></div>
        {isLoading ? <CollectionSkeleton /> : filteredMembers.length === 0 ? <p className="route-card collection-empty">{t('collections.emptyMembers')}</p> : <div className="member-directory-list">{filteredMembers.map((member) => { const memberPayments = payments.filter((payment) => payment.memberId === member.id); const paid = memberPayments.reduce((sum, payment) => sum + Number(payment.amount), 0); return <article className="route-card member-directory-row" key={member.id}><span className="member-avatar">{member.name.trim().charAt(0)}</span><div><strong>{member.name}</strong><small>{member.memberCode} · {member.mobile}</small><p>{member.roomNumber || member.address || t('collections.noRoomNumber')}</p></div><dl><div><dt>{t('collections.totalPaid')}</dt><dd>₹ {paid.toLocaleString('en-IN')}</dd></div><div><dt>{t('collections.receipts')}</dt><dd>{memberPayments.length}</dd></div></dl><button className={`member-state-button ${member.active ? 'active' : 'inactive'}`} type="button" onClick={() => void toggleMemberStatus(member)}>{member.active ? t('collections.memberFilters.active') : t('collections.memberFilters.inactive')}</button></article> })}</div>}
      </section>}

      {activeTab === 'status' && <section className="collection-section-stack">
        <div className="collection-section-toolbar status-toolbar"><div><h3>{t('collections.collectionStatus')}</h3><p>{t('collections.collectionStatusCopy')}</p></div>{selectedContribution && <button type="button" onClick={downloadStatusReport}>{t('collections.downloadReport')}</button>}</div>
        <div className="collection-status-controls route-card"><label><span>{t('collections.selectVargani')}</span><select value={effectiveContributionId} onChange={(event) => setSelectedContributionId(event.target.value)}><option value="">{t('collections.chooseVargani')}</option>{yearContributions.map((contribution) => <option value={contribution.id} key={contribution.id}>{contribution.name} · {contribution.contributionCode}</option>)}</select></label><label><span>{t('collections.search')}</span><input type="search" value={statusSearch} onChange={(event) => setStatusSearch(event.target.value)} placeholder={t('collections.searchMembers')} /></label></div>
        {selectedContribution && <div className="collection-selected-summary route-card"><div><span>{t('collections.expected')}</span><strong>₹ {selectedRows.reduce((sum, row) => sum + row.expected, 0).toLocaleString('en-IN')}</strong></div><div><span>{t('collections.received')}</span><strong>₹ {selectedRows.reduce((sum, row) => sum + row.paid, 0).toLocaleString('en-IN')}</strong></div><div><span>{t('collections.pending')}</span><strong>₹ {selectedRows.reduce((sum, row) => sum + row.balance, 0).toLocaleString('en-IN')}</strong></div><div><span>{t('collections.dueDate')}</span><strong>{formatDate(selectedContribution.dueDate, language)}</strong></div></div>}
        <div className="collection-filter-pills status-filter-pills">{(['all', 'paid', 'partial', 'pending', 'overdue', 'exempted'] as const).map((filter) => <button className={statusFilter === filter ? 'active' : ''} type="button" key={filter} onClick={() => setStatusFilter(filter)}>{filter === 'all' ? t('collections.memberFilters.all') : t(`collections.statuses.${filter}`)}</button>)}</div>
        {!selectedContribution ? <p className="route-card collection-empty">{t('collections.chooseVarganiHelp')}</p> : isLoading ? <CollectionSkeleton /> : filteredStatusRows.length === 0 ? <p className="route-card collection-empty">{t('collections.noStatusRows')}</p> : <div className="collection-status-table route-card"><div className="collection-status-header"><span>{t('collections.member')}</span><span>{t('collections.expected')}</span><span>{t('collections.received')}</span><span>{t('collections.pending')}</span><span>{t('collections.status')}</span><span>{t('collections.actions')}</span></div>{filteredStatusRows.map((row) => <article key={row.member.id}><div className="collection-member-cell"><strong>{row.member.name}</strong><small>{row.member.memberCode} · {row.member.mobile}</small></div><span data-label={t('collections.expected')}>₹ {row.expected.toLocaleString('en-IN')}</span><span data-label={t('collections.received')}>₹ {row.paid.toLocaleString('en-IN')}</span><span data-label={t('collections.pending')}>₹ {row.balance.toLocaleString('en-IN')}</span><i className={`due-status ${row.status}`}>{t(`collections.statuses.${row.status}`)}</i><div className="collection-row-actions">{row.status === 'paid' ? <button type="button" className="share-receipt-button" disabled={isSharingReceipt} onClick={() => void sharePaidReceipt(row)}>{isSharingReceipt ? t('collections.sharePreparing') : t('collections.shareWhatsApp')}</button> : <button type="button" disabled={selectedContribution.status === 'closed' || row.status === 'exempted'} onClick={() => openPayment(row)}>{t('collections.collect')}</button>}<button type="button" className="secondary" onClick={() => void toggleExempt(row)}>{row.status === 'exempted' ? t('collections.restore') : t('collections.exempt')}</button></div></article>)}</div>}
      </section>}

      {paymentRow && selectedContribution && <div className="modal-backdrop" role="presentation" onMouseDown={() => setPaymentRow(null)}><form className="collection-payment-modal" role="dialog" aria-modal="true" aria-labelledby="collection-payment-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submitPayment}><div className="collection-payment-heading"><div><span>₹</span><div><h3 id="collection-payment-title">{t('collections.collectPayment')}</h3><p>{paymentRow.member.name} · {selectedContribution.name}</p></div></div><button type="button" onClick={() => setPaymentRow(null)} aria-label={t('collections.cancel')}>×</button></div><div className="collection-payment-summary"><div><span>{t('collections.received')}</span><strong>₹ {paymentRow.paid.toLocaleString('en-IN')}</strong></div><div><span>{t('collections.pending')}</span><strong>₹ {paymentRow.balance.toLocaleString('en-IN')}</strong></div></div><div className="collection-form-grid">{selectedContribution.amountType === 'custom' && <label className="field field-wide"><span>{t('collections.fields.memberTarget')}</span><div className="amount-input"><b>₹</b><input type="number" min="1" value={paymentForm.targetAmount} onChange={(event) => setPaymentForm((current) => ({ ...current, targetAmount: event.target.value }))} /></div></label>}<label className="field"><span>{t('collections.fields.paymentAmount')}</span><div className="amount-input"><b>₹</b><input type="number" min="1" value={paymentForm.amount} onChange={(event) => setPaymentForm((current) => ({ ...current, amount: event.target.value }))} /></div></label><label className="field"><span>{t('collections.fields.paymentType')}</span><select value={paymentForm.paymentType} onChange={(event) => setPaymentForm((current) => ({ ...current, paymentType: event.target.value as PaymentType }))}>{(Object.keys(paymentLabels) as PaymentType[]).map((type) => <option value={type} key={type}>{paymentLabels[type]}</option>)}</select></label><div className="field"><span>{t('collections.fields.paymentDate')}</span><DatePicker value={paymentForm.paymentDate} onChange={(value) => setPaymentForm((current) => ({ ...current, paymentDate: value }))} label={t('collections.fields.paymentDate')} /></div><label className="field"><span>{t('collections.fields.reference')}</span><input value={paymentForm.reference} onChange={(event) => setPaymentForm((current) => ({ ...current, reference: event.target.value }))} placeholder={t('collections.fields.referencePlaceholder')} /></label></div><p className="collection-payment-note">{t('collections.receiptNote')}</p><div className="collection-payment-actions"><button className="secondary" type="button" onClick={() => setPaymentRow(null)}>{t('collections.cancel')}</button><button type="submit" disabled={isSavingPayment}>{isSavingPayment ? t('collections.saving') : t('collections.collectAndReceipt')}</button></div></form></div>}
    </main>
  )
}
