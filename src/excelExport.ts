import type { AppLanguage } from './i18n'
import type { PaymentType, ReceiptRecord } from './receiptService'

const exportPaymentLabels: Record<PaymentType, string> = {
  upi: 'UPI / यूपीआय',
  cash: 'Cash / रोख',
  bank: 'Bank transfer / बँक ट्रान्सफर',
  cheque: 'Cheque / धनादेश',
}

let excelModulePromise: ReturnType<typeof importExcelModule> | null = null

function importExcelModule() {
  return import('exceljs')
}

function loadExcelModule() {
  excelModulePromise ??= importExcelModule()
  return excelModulePromise
}

function dateValue(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export async function buildReceiptWorkbook(receipts: ReceiptRecord[], language: AppLanguage) {
  if (receipts.length === 0) throw new Error('NO_RECEIPTS_TO_EXPORT')

  const ExcelJS = await loadExcelModule()
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Receipt Register', {
    views: [{ state: 'frozen', ySplit: 7 }],
    properties: { defaultRowHeight: 21 },
  })

  worksheet.columns = [
    { key: 'sequence', width: 8 },
    { key: 'receiptNumber', width: 24 },
    { key: 'paymentDate', width: 14 },
    { key: 'name', width: 28 },
    { key: 'mobile', width: 17 },
    { key: 'paymentType', width: 25 },
    { key: 'amount', width: 15 },
    { key: 'reference', width: 24 },
    { key: 'createdBy', width: 16 },
  ]

  worksheet.mergeCells('A1:I1')
  worksheet.getCell('A1').value = 'ॐ साईनाथ सेवा मंडळ, रजि. / Om Sainath Seva Mandal, Regd.'
  worksheet.getCell('A1').font = { name: 'Aptos Display', size: 17, bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF742C13' } }
  worksheet.getRow(1).height = 31

  worksheet.mergeCells('A2:I2')
  worksheet.getCell('A2').value = language === 'mr' ? 'पावती नोंदवही / Receipt Register' : 'Receipt Register / पावती नोंदवही'
  worksheet.getCell('A2').font = { name: 'Aptos Display', size: 14, bold: true, color: { argb: 'FF742C13' } }
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(2).height = 27

  worksheet.mergeCells('A3:I3')
  worksheet.getCell('A3').value = `${language === 'mr' ? 'आर्थिक वर्ष' : 'Financial year'}: ${receipts[0].financialYear}`
  worksheet.getCell('A3').font = { name: 'Aptos', size: 10, color: { argb: 'FF705A4F' } }
  worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' }

  const totalAmount = receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0)
  worksheet.getCell('A5').value = language === 'mr' ? 'एकूण पावत्या' : 'Total receipts'
  worksheet.getCell('B5').value = receipts.length
  worksheet.getCell('D5').value = language === 'mr' ? 'एकूण रक्कम' : 'Total amount'
  worksheet.getCell('E5').value = totalAmount
  worksheet.getCell('E5').numFmt = '₹#,##0'
  ;['A5', 'B5', 'D5', 'E5'].forEach((address) => {
    const cell = worksheet.getCell(address)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4E5D8' } }
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FF5E2A16' } }
    cell.alignment = { vertical: 'middle', horizontal: address === 'B5' || address === 'E5' ? 'right' : 'left' }
  })

  const headerRow = worksheet.getRow(7)
  headerRow.values = [
    'Sr. / अ.क्र.',
    'Receipt No. / पावती क्र.',
    'Date / दिनांक',
    'Name / नाव',
    'WhatsApp Number',
    'Payment type / पेमेंट प्रकार',
    'Amount / रक्कम',
    'Reference / व्यवहार क्र.',
    'Created by / नोंद करणारे',
  ]
  headerRow.height = 27
  headerRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8A3215' } }
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF742C13' } },
      bottom: { style: 'thin', color: { argb: 'FF742C13' } },
    }
  })

  const dataStartRow = 8

  receipts.forEach((receipt, index) => {
    const row = worksheet.getRow(dataStartRow + index)
    row.values = [
      index + 1,
      receipt.receiptNumber,
      dateValue(receipt.paymentDate),
      receipt.name,
      receipt.mobile,
      exportPaymentLabels[receipt.paymentType],
      Number(receipt.amount),
      receipt.reference || '',
      receipt.createdByName || 'Mangesh',
    ]
    row.height = 22
    row.eachCell((cell, columnNumber) => {
      cell.font = { name: 'Aptos', size: 10, color: { argb: 'FF2F211B' } }
      cell.alignment = {
        vertical: 'middle',
        horizontal: columnNumber === 1 ? 'center' : columnNumber === 7 ? 'right' : 'left',
      }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE8DDD5' } } }
    })
    row.getCell(3).numFmt = 'dd-mm-yyyy'
    row.getCell(7).numFmt = '₹#,##0'
  })

  const lastDataRow = dataStartRow + receipts.length - 1
  const totalRowNumber = lastDataRow + 1
  const totalRow = worksheet.getRow(totalRowNumber)
  worksheet.mergeCells(totalRowNumber, 1, totalRowNumber, 6)
  totalRow.getCell(1).value = language === 'mr' ? 'एकूण / TOTAL' : 'TOTAL / एकूण'
  totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' }
  totalRow.getCell(7).value = { formula: `SUM(G${dataStartRow}:G${lastDataRow})`, result: totalAmount }
  totalRow.height = 24
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4E5D8' } }
    cell.font = { name: 'Aptos', size: 11, bold: true, color: { argb: 'FF742C13' } }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF742C13' } },
      bottom: { style: 'medium', color: { argb: 'FF742C13' } },
    }
  })
  totalRow.getCell(7).numFmt = '₹#,##0'
  totalRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' }

  worksheet.autoFilter = { from: 'A7', to: `I${lastDataRow}` }
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    printArea: `A1:I${totalRowNumber}`,
  }
  worksheet.headerFooter = {
    oddFooter: language === 'mr'
      ? '&Lॐ साईनाथ सेवा मंडळ&Cपावती नोंदवही&RPage &P of &N'
      : '&LOm Sainath Seva Mandal&CReceipt Register&RPage &P of &N',
  }
  workbook.creator = 'Om Sainath Digital Receipt System'
  workbook.created = new Date()
  workbook.calcProperties.fullCalcOnLoad = true

  return workbook.xlsx.writeBuffer()
}

export async function downloadReceiptWorkbook(
  receipts: ReceiptRecord[],
  financialYear: string,
  language: AppLanguage,
) {
  const buffer = await buildReceiptWorkbook(receipts, language)
  const bytes = new Uint8Array(buffer)
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `receipt-register-${financialYear}-${String(receipts[0].sequence).padStart(6, '0')}-to-${String(receipts.at(-1)?.sequence ?? 0).padStart(6, '0')}.xlsx`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
