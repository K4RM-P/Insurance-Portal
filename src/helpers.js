import { differenceInCalendarDays, addYears } from 'date-fns'

export function calcAge(dob) {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

/**
 * Returns { daysUntil, turningAge, nextBirthday } for a DOB.
 * daysUntil is 0 for today, negative never (always looks forward to next occurrence).
 */
export function nextBirthdayInfo(dob) {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate())
  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, birth.getMonth(), birth.getDate())
  }
  const daysUntil = differenceInCalendarDays(nextBirthday, today)
  const turningAge = nextBirthday.getFullYear() - birth.getFullYear()
  return { daysUntil, turningAge, nextBirthday }
}

/**
 * Returns days until a given ISO date (negative if overdue).
 */
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return differenceInCalendarDays(target, today)
}

export function calcMaturityDate(commencementDate, term) {
  if (!commencementDate || !term) return ''
  const start = new Date(commencementDate)
  if (Number.isNaN(start.getTime())) return ''
  const maturity = addYears(start, Number(term))
  return maturity.toISOString().slice(0, 10)
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '-'
  return Number(amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
}

export function isValidEmail(email) {
  if (!email) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPhone(phone) {
  if (!phone) return true
  return /^[\d\s()+-]{7,15}$/.test(phone)
}
