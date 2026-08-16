import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cacheCollectionData, getCachedCollectionData } from './collectionCache'
import {
  getCollectionData,
  type CollectionPaymentRecord,
  type ContributionRecord,
  type MemberRecord,
} from './collectionService'
import type { PaymentType, ReceiptRecord } from './receiptService'

type MemberFilter = 'all' | 'active' | 'inactive' | 'pending'
type LedgerStatus = 'paid' | 'partial' | 'pending' | 'overdue' | 'exempted'

type ContributionLedgerEntry = {
  contribution: ContributionRecord
  expected: number
  paid: number
  pending: number
  status: LedgerStatus
}

type MemberLedgerSummary = {
  member: MemberRecord
  entries: ContributionLedgerEntry[]
  expected: number
  paid: number
  pending: number
  receiptCount: number
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

function contributionIncludesMember(contribution: ContributionRecord, member: MemberRecord, hasPayments: boolean) {
  if (contribution.scope === 'selected') return contribution.memberIds?.includes(member.id) || hasPayments
  return member.active || hasPayments
}

function buildMemberEntries(
  member: MemberRecord,
  contributions: ContributionRecord[],
  payments: CollectionPaymentRecord[],
) {
  const today = todayForInput()
  return contributions.flatMap<ContributionLedgerEntry>((contribution) => {
    const contributionPayments = payments.filter((payment) => payment.contributionId === contribution.id && payment.memberId === member.id)
    if (!contributionIncludesMember(contribution, member, contributionPayments.length > 0)) return []
    const exempt = Boolean(contribution.exemptMemberIds?.[member.id])
    const expected = exempt ? 0 : Number(contribution.memberAmounts?.[member.id] ?? contribution.defaultAmount ?? 0)
    const paid = contributionPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const pending = Math.max(expected - paid, 0)
    let status: LedgerStatus = 'pending'
    if (exempt) status = 'exempted'
    else if ((expected > 0 && paid >= expected) || (expected === 0 && paid > 0)) status = 'paid'
    else if (contribution.dueDate && contribution.dueDate < today) status = 'overdue'
    else if (paid > 0) status = 'partial'
    return [{ contribution, expected, paid, pending, status }]
  })
}

function LedgerSkeleton() {
  return <div className="member-ledger-skeleton" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i key={index} />)}</div>
}

export default function MemberLedgerPage({
  financialYear,
  receipts,
  paymentLabels,
  toAmountWords,
  onViewReceipt,
  onShareReceipt,
  onOpenCollections,
}: {
  financialYear: string
  receipts: ReceiptRecord[]
  paymentLabels: Record<PaymentType, string>
  toAmountWords: (amount: number) => string
  onViewReceipt: (receipt: ReceiptRecord) => void
  onShareReceipt: (receipt: ReceiptRecord, message: string) => Promise<'shared' | 'text-only'>
  onOpenCollections: () => void
}) {
  const { t, i18n } = useTranslation()
  const language = (i18n.resolvedLanguage ?? i18n.language).split('-')[0]
  const [initialCache] = useState(getCachedCollectionData)
  const [members, setMembers] = useState(initialCache.members)
  const [contributions, setContributions] = useState(initialCache.contributions)
  const [payments, setPayments] = useState(initialCache.payments)
  const [isLoading, setIsLoading] = useState(initialCache.savedAt === 0)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase(language === 'mr' ? 'mr-IN' : 'en-IN'))
  const [filter, setFilter] = useState<MemberFilter>('all')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [isSharingReceiptId, setIsSharingReceiptId] = useState<string | null>(null)
  const [shareFeedback, setShareFeedback] = useState('')
  const detailRef = useRef<HTMLElement>(null)

  const loadData = useCallback(async () => {
    if (!initialCache.savedAt) setIsLoading(true)
    setError('')
    try {
      const data = await getCollectionData()
      setMembers(data.members)
      setContributions(data.contributions)
      setPayments(data.payments)
      cacheCollectionData(data)
    } catch (loadError) {
      console.error(loadError)
      setError(t('memberLedger.errors.load'))
    } finally {
      setIsLoading(false)
    }
  }, [initialCache.savedAt, t])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadData(), 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadData])

  const yearContributions = useMemo(
    () => contributions.filter((contribution) => contribution.financialYear === financialYear),
    [contributions, financialYear],
  )

  const yearContributionIds = useMemo(() => new Set(yearContributions.map((contribution) => contribution.id)), [yearContributions])
  const yearPayments = useMemo(
    () => payments.filter((payment) => yearContributionIds.has(payment.contributionId)),
    [payments, yearContributionIds],
  )

  const memberSummaries = useMemo<MemberLedgerSummary[]>(() => members.map((member) => {
    const entries = buildMemberEntries(member, yearContributions, yearPayments)
    const memberPayments = yearPayments.filter((payment) => payment.memberId === member.id)
    return {
      member,
      entries,
      expected: entries.reduce((sum, entry) => sum + entry.expected, 0),
      paid: memberPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      pending: entries.reduce((sum, entry) => sum + entry.pending, 0),
      receiptCount: memberPayments.length,
    }
  }).sort((a, b) => b.pending - a.pending || a.member.name.localeCompare(b.member.name, language === 'mr' ? 'mr' : 'en')), [language, members, yearContributions, yearPayments])

  const filteredMembers = useMemo(() => memberSummaries.filter((summary) => {
    if (filter === 'active' && !summary.member.active) return false
    if (filter === 'inactive' && summary.member.active) return false
    if (filter === 'pending' && summary.pending <= 0) return false
    if (!deferredSearch) return true
    const haystack = `${summary.member.name} ${summary.member.memberCode} ${summary.member.mobile} ${summary.member.roomNumber ?? ''}`.toLocaleLowerCase(language === 'mr' ? 'mr-IN' : 'en-IN')
    return haystack.includes(deferredSearch)
  }), [deferredSearch, filter, language, memberSummaries])

  const effectiveSelectedMemberId = filteredMembers.some((summary) => summary.member.id === selectedMemberId)
    ? selectedMemberId
    : filteredMembers[0]?.member.id ?? ''

  const selectedSummary = useMemo(
    () => memberSummaries.find((summary) => summary.member.id === effectiveSelectedMemberId),
    [effectiveSelectedMemberId, memberSummaries],
  )

  const contributionMap = useMemo(() => new Map(yearContributions.map((contribution) => [contribution.id, contribution])), [yearContributions])
  const receiptMap = useMemo(() => new Map(receipts.map((receipt) => [receipt.id, receipt])), [receipts])
  const selectedPayments = useMemo(
    () => selectedSummary ? yearPayments.filter((payment) => payment.memberId === selectedSummary.member.id).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)) : [],
    [selectedSummary, yearPayments],
  )

  const totals = useMemo(() => ({
    members: memberSummaries.length,
    active: memberSummaries.filter((summary) => summary.member.active).length,
    paid: yearPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    pending: memberSummaries.reduce((sum, summary) => sum + summary.pending, 0),
  }), [memberSummaries, yearPayments])

  const selectMember = (memberId: string) => {
    setSelectedMemberId(memberId)
    setShareFeedback('')
    if (window.matchMedia('(max-width: 900px)').matches) {
      window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  const resolveReceipt = (payment: CollectionPaymentRecord) => {
    const storedReceipt = receiptMap.get(payment.receiptId)
    if (storedReceipt) return storedReceipt
    const member = selectedSummary?.member
    const contribution = contributionMap.get(payment.contributionId)
    if (!member) return null
    return {
      id: payment.receiptId,
      receiptNumber: payment.receiptNumber,
      sequence: Number(payment.receiptNumber.split('/').at(-1)) || 0,
      financialYear,
      name: member.name,
      mobile: member.mobile,
      paymentType: payment.paymentType,
      paymentDate: payment.paymentDate,
      amount: Number(payment.amount),
      amountInWords: toAmountWords(Number(payment.amount)),
      reference: payment.reference || contribution?.name || '',
      createdAt: payment.createdAt,
      createdBy: payment.createdBy,
      createdByName: payment.createdByName,
    } satisfies ReceiptRecord
  }

  const downloadStatement = () => {
    if (!selectedSummary) return
    const rows: Array<Array<string | number>> = [
      [t('memberLedger.csv.memberStatement')],
      [t('memberLedger.memberId'), selectedSummary.member.memberCode],
      [t('memberLedger.name'), selectedSummary.member.name],
      [t('memberLedger.whatsapp'), selectedSummary.member.mobile],
      [t('memberLedger.room'), selectedSummary.member.roomNumber || '—'],
      [t('memberLedger.financialYear'), financialYear],
      [t('memberLedger.expected'), selectedSummary.expected],
      [t('memberLedger.received'), selectedSummary.paid],
      [t('memberLedger.pending'), selectedSummary.pending],
      [],
      [t('memberLedger.vargani'), t('memberLedger.expected'), t('memberLedger.received'), t('memberLedger.pending'), t('memberLedger.dueDate'), t('memberLedger.status')],
      ...selectedSummary.entries.map((entry) => [entry.contribution.name, entry.expected, entry.paid, entry.pending, entry.contribution.dueDate, t(`memberLedger.statuses.${entry.status}`)]),
      [],
      [t('memberLedger.date'), t('memberLedger.receipt'), t('memberLedger.vargani'), t('memberLedger.paymentMethod'), t('memberLedger.amount'), t('memberLedger.reference')],
      ...selectedPayments.map((payment) => [payment.paymentDate, payment.receiptNumber, contributionMap.get(payment.contributionId)?.name ?? '—', paymentLabels[payment.paymentType], Number(payment.amount), payment.reference || '—']),
    ]
    downloadCsv(`member-statement-${selectedSummary.member.memberCode}-${financialYear}.csv`, rows)
  }

  const shareStatement = () => {
    if (!selectedSummary?.member.mobile) return
    const pendingLines = selectedSummary.entries
      .filter((entry) => entry.pending > 0)
      .map((entry) => t('memberLedger.pendingLine', { name: entry.contribution.name, amount: entry.pending.toLocaleString('en-IN') }))
      .join('\n') || t('memberLedger.noPendingLine')
    const message = t('memberLedger.statementMessage', {
      name: selectedSummary.member.name,
      year: financialYear,
      expected: selectedSummary.expected.toLocaleString('en-IN'),
      received: selectedSummary.paid.toLocaleString('en-IN'),
      pending: selectedSummary.pending.toLocaleString('en-IN'),
      receipts: selectedSummary.receiptCount,
      dues: pendingLines,
    })
    window.open(`https://wa.me/91${selectedSummary.member.mobile}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  const sharePaymentReceipt = async (payment: CollectionPaymentRecord) => {
    const receipt = resolveReceipt(payment)
    if (!receipt || !selectedSummary) return
    const contribution = contributionMap.get(payment.contributionId)
    const message = t('memberLedger.receiptMessage', {
      name: selectedSummary.member.name,
      amount: Number(payment.amount).toLocaleString('en-IN'),
      vargani: contribution?.name ?? '—',
      number: payment.receiptNumber,
      date: formatDate(payment.paymentDate, language),
    })
    setIsSharingReceiptId(payment.id)
    setShareFeedback('')
    try {
      const result = await onShareReceipt(receipt, message)
      if (result === 'text-only') {
        window.open(`https://wa.me/91${selectedSummary.member.mobile}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
        setShareFeedback(t('memberLedger.shareFallback'))
      } else {
        setShareFeedback(t('memberLedger.shareComplete'))
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === 'AbortError') return
      console.error(shareError)
      setShareFeedback(t('memberLedger.errors.share'))
    } finally {
      setIsSharingReceiptId(null)
    }
  }

  return (
    <main className="route-page member-ledger-page">
      <div className="route-heading member-ledger-heading">
        <div><p>{t('memberLedger.kicker')}</p><h2>{t('memberLedger.title')}</h2><span>{t('memberLedger.subtitle', { year: financialYear })}</span></div>
        <button type="button" onClick={onOpenCollections}>{t('memberLedger.manageMembers')}</button>
      </div>

      {error && <p className="collection-alert error" role="alert">{error}</p>}

      <section className="member-ledger-stat-grid" aria-label={t('memberLedger.summary')} aria-busy={isLoading}>
        {isLoading ? Array.from({ length: 4 }, (_, index) => <article className="data-box-loading" key={index}><i /><b /><span /></article>) : <>
          <article><span>{t('memberLedger.totalMembers')}</span><strong>{totals.members}</strong><small>{totals.active} {t('memberLedger.activeMembers')}</small></article>
          <article><span>{t('memberLedger.received')}</span><strong>₹ {totals.paid.toLocaleString('en-IN')}</strong><small>{yearPayments.length} {t('memberLedger.receipts')}</small></article>
          <article className="member-ledger-pending-stat"><span>{t('memberLedger.pending')}</span><strong>₹ {totals.pending.toLocaleString('en-IN')}</strong><small>{memberSummaries.filter((summary) => summary.pending > 0).length} {t('memberLedger.pendingMembers')}</small></article>
          <article><span>{t('memberLedger.collectionRate')}</span><strong>{totals.paid + totals.pending ? Math.round((totals.paid / (totals.paid + totals.pending)) * 100) : 0}%</strong><small>{t('memberLedger.financialYear')} {financialYear}</small></article>
        </>}
      </section>

      <div className="member-ledger-workspace">
        <aside className="route-card member-ledger-directory">
          <div className="member-ledger-section-heading"><div><h3>{t('memberLedger.directory')}</h3><p>{t('memberLedger.directoryCopy')}</p></div><span>{filteredMembers.length}</span></div>
          <label className="member-ledger-search"><span>{t('memberLedger.search')}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('memberLedger.searchPlaceholder')} /></label>
          <div className="member-ledger-filters" aria-label={t('memberLedger.filtersLabel')}>{(['all', 'active', 'inactive', 'pending'] as MemberFilter[]).map((item) => <button className={filter === item ? 'active' : ''} type="button" key={item} onClick={() => setFilter(item)}>{t(`memberLedger.filters.${item}`)}</button>)}</div>
          {isLoading ? <LedgerSkeleton /> : filteredMembers.length === 0 ? <p className="member-ledger-empty">{t('memberLedger.noMembers')}</p> : <div className="member-ledger-list">{filteredMembers.map((summary) => <button className={effectiveSelectedMemberId === summary.member.id ? 'active' : ''} type="button" key={summary.member.id} onClick={() => selectMember(summary.member.id)}><span className="member-ledger-avatar">{summary.member.name.trim().charAt(0)}</span><div><strong>{summary.member.name}</strong><small>{summary.member.memberCode} · {summary.member.roomNumber || t('memberLedger.noRoom')}</small></div><span className={`member-ledger-balance ${summary.pending > 0 ? 'pending' : 'clear'}`}><small>{t('memberLedger.pending')}</small><b>₹ {summary.pending.toLocaleString('en-IN')}</b></span></button>)}</div>}
        </aside>

        <section className="route-card member-ledger-detail" ref={detailRef}>
          {!selectedSummary ? <div className="member-ledger-select-empty"><span aria-hidden="true">₹</span><h3>{t('memberLedger.selectMember')}</h3><p>{t('memberLedger.selectMemberCopy')}</p></div> : <>
            <div className="member-ledger-profile">
              <div className="member-ledger-profile-main"><span className="member-ledger-profile-avatar">{selectedSummary.member.name.trim().charAt(0)}</span><div><h3>{selectedSummary.member.name}</h3><p>{selectedSummary.member.memberCode} · {selectedSummary.member.roomNumber || t('memberLedger.noRoom')}</p><small>{selectedSummary.member.mobile}</small></div></div>
              <i className={`member-ledger-member-state ${selectedSummary.member.active ? 'active' : 'inactive'}`}>{t(`memberLedger.filters.${selectedSummary.member.active ? 'active' : 'inactive'}`)}</i>
              <div className="member-ledger-profile-actions"><button type="button" onClick={shareStatement}>{t('memberLedger.shareStatement')}</button><button className="secondary" type="button" onClick={downloadStatement}>{t('memberLedger.downloadStatement')}</button></div>
            </div>

            {shareFeedback && <p className="member-ledger-feedback" role="status">{shareFeedback}</p>}

            <div className="member-ledger-member-summary">
              <div><span>{t('memberLedger.expected')}</span><strong>₹ {selectedSummary.expected.toLocaleString('en-IN')}</strong></div>
              <div><span>{t('memberLedger.received')}</span><strong>₹ {selectedSummary.paid.toLocaleString('en-IN')}</strong></div>
              <div className={selectedSummary.pending > 0 ? 'pending' : ''}><span>{t('memberLedger.pending')}</span><strong>₹ {selectedSummary.pending.toLocaleString('en-IN')}</strong></div>
              <div><span>{t('memberLedger.receipts')}</span><strong>{selectedSummary.receiptCount}</strong></div>
            </div>

            <section className="member-ledger-block">
              <div className="member-ledger-block-heading"><div><h4>{t('memberLedger.varganiBalances')}</h4><p>{t('memberLedger.varganiBalancesCopy')}</p></div><span>{selectedSummary.entries.length}</span></div>
              {selectedSummary.entries.length === 0 ? <p className="member-ledger-empty">{t('memberLedger.noVarganis')}</p> : <div className="member-ledger-dues">{selectedSummary.entries.map((entry) => <article key={entry.contribution.id}><div><strong>{entry.contribution.name}</strong><small>{entry.contribution.contributionCode} · {t('memberLedger.due')} {formatDate(entry.contribution.dueDate, language)}</small></div><dl><div><dt>{t('memberLedger.expected')}</dt><dd>₹ {entry.expected.toLocaleString('en-IN')}</dd></div><div><dt>{t('memberLedger.received')}</dt><dd>₹ {entry.paid.toLocaleString('en-IN')}</dd></div><div><dt>{t('memberLedger.pending')}</dt><dd>₹ {entry.pending.toLocaleString('en-IN')}</dd></div></dl><i className={`due-status ${entry.status}`}>{t(`memberLedger.statuses.${entry.status}`)}</i></article>)}</div>}
            </section>

            <section className="member-ledger-block">
              <div className="member-ledger-block-heading"><div><h4>{t('memberLedger.paymentHistory')}</h4><p>{t('memberLedger.paymentHistoryCopy')}</p></div><span>{selectedPayments.length}</span></div>
              {selectedPayments.length === 0 ? <p className="member-ledger-empty">{t('memberLedger.noPayments')}</p> : <div className="member-ledger-payments">{selectedPayments.map((payment) => { const contribution = contributionMap.get(payment.contributionId); const receipt = resolveReceipt(payment); return <article key={payment.id}><div className="member-ledger-payment-icon" aria-hidden="true">₹</div><div><strong>{contribution?.name ?? '—'}</strong><small>{payment.receiptNumber} · {formatDate(payment.paymentDate, language)}</small><p>{paymentLabels[payment.paymentType]}{payment.reference ? ` · ${payment.reference}` : ''}</p></div><b>₹ {Number(payment.amount).toLocaleString('en-IN')}</b><div className="member-ledger-payment-actions"><button className="secondary" type="button" disabled={!receipt} onClick={() => receipt && onViewReceipt(receipt)}>{t('memberLedger.view')}</button><button type="button" disabled={!receipt || isSharingReceiptId === payment.id} onClick={() => void sharePaymentReceipt(payment)}>{isSharingReceiptId === payment.id ? t('memberLedger.preparing') : t('memberLedger.share')}</button></div></article> })}</div>}
            </section>
          </>}
        </section>
      </div>
    </main>
  )
}
