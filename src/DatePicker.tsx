import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? null : date
}

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export default function DatePicker({ value, onChange, label, invalid = false }: {
  value: string
  onChange: (value: string) => void
  label: string
  invalid?: boolean
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage?.startsWith('en') ? 'en-IN' : 'mr-IN'
  const selectedDate = parseDate(value)
  const today = new Date()
  const [isOpen, setIsOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDate ?? today))
  const pickerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogId = useId()

  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const weekday = new Date(2024, 0, 7 + index)
    return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(weekday)
  }), [locale])

  const calendarDays = useMemo(() => {
    const leadingDays = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay()
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
    return [
      ...Array.from({ length: leadingDays }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), index + 1)),
    ]
  }, [viewMonth])

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  const openCalendar = () => {
    setViewMonth(startOfMonth(selectedDate ?? today))
    setIsOpen((current) => !current)
  }

  const selectDate = (date: Date) => {
    onChange(toDateValue(date))
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const displayDate = selectedDate
    ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(selectedDate)
    : t('datePicker.selectDate')

  return (
    <div className="date-picker" ref={pickerRef}>
      <button ref={triggerRef} className="date-picker-trigger" type="button" onClick={openCalendar} aria-label={label} aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={dialogId} aria-invalid={invalid || undefined}>
        <span>{displayDate}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4m8-4v4M3 10h18" /></svg>
      </button>
      {isOpen && (
        <div className="date-picker-popover" id={dialogId} role="dialog" aria-modal="false" aria-label={label}>
          <div className="date-picker-heading">
            <button type="button" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label={t('datePicker.previousMonth')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
            <strong>{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(viewMonth)}</strong>
            <button type="button" onClick={() => setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label={t('datePicker.nextMonth')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
          </div>
          <div className="date-picker-weekdays" aria-hidden="true">{weekdays.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}</div>
          <div className="date-picker-days">
            {calendarDays.map((date, index) => date ? (
              <button
                key={toDateValue(date)}
                type="button"
                className={`${value === toDateValue(date) ? 'selected' : ''} ${toDateValue(today) === toDateValue(date) ? 'today' : ''}`.trim()}
                onClick={() => selectDate(date)}
                aria-label={new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)}
                aria-pressed={value === toDateValue(date)}
              >{new Intl.NumberFormat(locale, { useGrouping: false }).format(date.getDate())}</button>
            ) : <span key={`empty-${index}`} />)}
          </div>
          <button className="date-picker-today" type="button" onClick={() => selectDate(today)}>{t('datePicker.today')}</button>
        </div>
      )}
    </div>
  )
}
