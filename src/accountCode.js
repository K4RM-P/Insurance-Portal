// Account codes stand in for email/password. Each code deterministically maps
// to a Supabase auth identity so the app can keep using Supabase auth (and its
// row-level-security policies keyed on auth.uid()) under the hood.
const EMAIL_DOMAIN = 'account.insuranceportal.local'
const PASSWORD_PEPPER = 'insuranceportal-code-v1-'

export function normalizeCode(code) {
  return String(code || '').trim()
}

export function codeToEmail(code) {
  return `${normalizeCode(code)}@${EMAIL_DOMAIN}`
}

export function codeToPassword(code) {
  return `${PASSWORD_PEPPER}${normalizeCode(code)}`
}
