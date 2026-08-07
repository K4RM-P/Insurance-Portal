import { addMonths } from 'date-fns'
import { calcMaturityDate } from './helpers.js'

const FREQUENCY_MAP = {
  YEARLY: 'Yearly',
  'HALF-YEARLY': 'Half-Yearly',
  HALFYEARLY: 'Half-Yearly',
  QUARTERLY: 'Quarterly',
  MONTHLY: 'Monthly',
  'ONE TIME': 'Yearly',
  ONETIME: 'Yearly',
  NACH: 'Yearly',
}

const FREQUENCY_MONTHS = {
  Yearly: 12,
  'Half-Yearly': 6,
  Quarterly: 3,
  Monthly: 1,
}

function toIsoDate(value) {
  if (!value) return ''
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return ''
    return value.toISOString().slice(0, 10)
  }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function digitsOnly(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[^\d]/g, '')
}

/** Sheet exports numbers like '2.30,000' meaning 2,30,000 — stripping punctuation gives the right value. */
function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value
  const digits = digitsOnly(value)
  return digits ? Number(digits) : 0
}

function parseTerm(value) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') return value
  const match = String(value).match(/\d+/)
  return match ? Number(match[0]) : ''
}

function parsePhone(value) {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  const match = str.match(/\d{7,}/)
  return match ? match[0] : digitsOnly(str)
}

function parseFrequency(value) {
  if (!value) return null
  const key = String(value).trim().toUpperCase()
  return FREQUENCY_MAP[key] || null
}

function computeNextDueDate(commencementDate, frequency, isOneTime) {
  if (isOneTime || !commencementDate) return ''
  const months = FREQUENCY_MONTHS[frequency] || 12
  let due = new Date(commencementDate)
  if (Number.isNaN(due.getTime())) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let guard = 0
  while (due <= today && guard < 1000) {
    due = addMonths(due, months)
    guard++
  }
  return due.toISOString().slice(0, 10)
}

/**
 * Parses a workbook matching the "Client__Policy_Detail.xlsx" layout:
 * a title row, a header row, then one row per policy. Client name/phone/
 * location are often blank on rows that are additional policies for the
 * same client as the row above — those are forward-filled.
 *
 * Returns { records, skippedCount } where records are ready to hand to
 * saveClientAndPolicy (split into clientData/policyData).
 */
export async function parseClientPolicyWorkbook(file) {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

  // Locate the header row (contains "Policy holder Name") rather than assuming row index.
  const headerIdx = rows.findIndex((r) => r.some((cell) => String(cell || '').trim() === 'Policy holder Name'))
  const dataRows = headerIdx >= 0 ? rows.slice(headerIdx + 1) : rows.slice(2)

  const records = []
  let skippedCount = 0

  let carryName = null
  let carryPhone = null
  let carryAddress = null
  let carryPlan = null
  let carryMode = null

  for (const row of dataRows) {
    const [, name, phone, location, plan, policyNumber, issueDate, sumAssured, term, annualPremium, firstYearPremium, mode, secondYearPremium] = row

    if (name) carryName = String(name).trim()
    if (phone) carryPhone = parsePhone(phone)
    if (location) carryAddress = String(location).trim()
    if (plan) carryPlan = String(plan).trim()
    if (mode) carryMode = String(mode).trim()

    const isoIssueDate = toIsoDate(issueDate)

    // Rows with no issue date are either blank spacer rows or incomplete
    // placeholders with no usable policy data — skip them.
    if (!isoIssueDate || !carryName) {
      if (policyNumber || plan || sumAssured) skippedCount++
      continue
    }

    const frequency = parseFrequency(carryMode) || 'Yearly'
    const isOneTime = String(carryMode || '').trim().toUpperCase().includes('ONE TIME')
    const parsedTerm = parseTerm(term)
    const commencementDate = isoIssueDate
    const maturityDate = parsedTerm ? calcMaturityDate(commencementDate, parsedTerm) : ''

    const periodicPremium =
      parseAmount(secondYearPremium) || parseAmount(firstYearPremium) || (isOneTime ? parseAmount(annualPremium) : 0)

    records.push({
      clientData: {
        clientName: carryName,
        dob: '',
        address: carryAddress || '',
        phone: carryPhone || '',
        email: '',
      },
      policyData: {
        companyName: 'LIC of India',
        planName: carryPlan || '',
        policyNumber: policyNumber !== null && policyNumber !== undefined ? String(policyNumber).trim() : '',
        assuredAmount: parseAmount(sumAssured),
        premiumFrequency: frequency,
        premiumAmount: periodicPremium,
        nextPremiumDueDate: computeNextDueDate(commencementDate, frequency, isOneTime),
        term: parsedTerm,
        commencementDate,
        maturityDate,
      },
    })
  }

  return { records, skippedCount }
}
