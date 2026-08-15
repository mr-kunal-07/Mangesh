import type { AppLanguage } from './i18n'
import type { PaymentType, ReceiptRecord } from './receiptService'

const exportPaymentLabels: Record<PaymentType, string> = {
  upi: 'UPI / यूपीआय',
  cash: 'Cash / रोख',
  bank: 'Bank transfer / बँक ट्रान्सफर',
  cheque: 'Cheque / धनादेश',
}

let excelModulePromise: ReturnType<typeof importExcelModule> | null = null
let templateBufferPromise: Promise<ArrayBuffer> | null = null

function importExcelModule() {
  return import('exceljs')
}

function loadExcelModule() {
  excelModulePromise ??= importExcelModule()
  return excelModulePromise
}

function loadTemplateBuffer() {
  templateBufferPromise ??= fetch('/receipt-export-template.xlsx').then((response) => {
    if (!response.ok) throw new Error('EXCEL_TEMPLATE_NOT_FOUND')
    return response.arrayBuffer()
  }).catch((error) => {
    templateBufferPromise = null
    throw error
  })
  return templateBufferPromise
}

function dateValue(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export async function buildReceiptWorkbook(receipts: ReceiptRecord[], language: AppLanguage) {
  if (receipts.length === 0) throw new Error('NO_RECEIPTS_TO_EXPORT')

  const [ExcelJS, templateBuffer] = await Promise.all([loadExcelModule(), loadTemplateBuffer()])

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(templateBuffer.slice(0))
  const worksheet = workbook.getWorksheet('Receipt Register')
  if (!worksheet) throw new Error('EXCEL_TEMPLATE_SHEET_NOT_FOUND')

  const dataStartRow = 8
  const templateCapacity = 100
  const templateTotalRow = 108

  if (receipts.length < templateCapacity) {
    worksheet.spliceRows(dataStartRow + receipts.length, templateCapacity - receipts.length)
  } else if (receipts.length > templateCapacity) {
    const extraRows = Array.from({ length: receipts.length - templateCapacity }, () =>
      Array.from({ length: 9 }, () => null),
    )
    worksheet.insertRows(templateTotalRow, extraRows, 'i')
  }

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
  const totalAmount = receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0)
  const totalRow = worksheet.getRow(totalRowNumber)
  totalRow.getCell(1).value = 'TOTAL / एकूण'
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

  worksheet.getCell('A5').value = { formula: `COUNTA(B${dataStartRow}:B${lastDataRow})`, result: receipts.length }
  worksheet.getCell('D5').value = { formula: `SUM(G${dataStartRow}:G${lastDataRow})`, result: totalAmount }
  worksheet.getCell('D5').numFmt = '₹#,##0'
  worksheet.autoFilter = { from: 'A7', to: `I${lastDataRow}` }
  worksheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
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
