import { useEffect, useMemo, useState } from 'react'
import { findClientByName, saveClientAndPolicy } from '../sync.js'
import { calcAge, calcMaturityDate, isValidEmail, isValidPhone } from '../helpers.js'

const FREQUENCIES = ['Yearly', 'Half-Yearly', 'Quarterly', 'Monthly']

const emptyForm = {
  clientName: '',
  dob: '',
  address: '',
  phone: '',
  email: '',
  companyName: 'LIC of India',
  planName: '',
  policyNumber: '',
  assuredAmount: '',
  premiumFrequency: 'Yearly',
  premiumAmount: '',
  nextPremiumDueDate: '',
  term: '',
  commencementDate: '',
  maturityDate: '',
}

export default function ClientForm({ existing, onCancel, onSaved }) {
  const isEdit = Boolean(existing)
  const [form, setForm] = useState(() => {
    if (!existing) return emptyForm
    const { client, policy } = existing
    return {
      clientName: client.clientName || '',
      dob: client.dob || '',
      address: client.address || '',
      phone: client.phone || '',
      email: client.email || '',
      companyName: policy.companyName || '',
      planName: policy.planName || '',
      policyNumber: policy.policyNumber || '',
      assuredAmount: policy.assuredAmount ?? '',
      premiumFrequency: policy.premiumFrequency || 'Yearly',
      premiumAmount: policy.premiumAmount ?? '',
      nextPremiumDueDate: policy.nextPremiumDueDate || '',
      term: policy.term ?? '',
      commencementDate: policy.commencementDate || '',
      maturityDate: policy.maturityDate || '',
    }
  })

  const [errors, setErrors] = useState({})
  const [maturityManual, setMaturityManual] = useState(isEdit)
  const [linkedClientId, setLinkedClientId] = useState(existing?.client.id || null)
  const [matchSuggestion, setMatchSuggestion] = useState(null)
  const [saving, setSaving] = useState(false)

  const age = useMemo(() => calcAge(form.dob), [form.dob])

  // Check for existing client by name (only in "add new" mode)
  useEffect(() => {
    if (isEdit) return
    if (linkedClientId) return
    const name = form.clientName.trim()
    if (!name) {
      setMatchSuggestion(null)
      return
    }
    let cancelled = false
    findClientByName(name).then((match) => {
      if (!cancelled) setMatchSuggestion(match)
    })
    return () => {
      cancelled = true
    }
  }, [form.clientName, isEdit, linkedClientId])

  // Auto-calc maturity date unless user manually overrode it
  useEffect(() => {
    if (maturityManual) return
    if (form.commencementDate && form.term) {
      const calculated = calcMaturityDate(form.commencementDate, form.term)
      setForm((f) => ({ ...f, maturityDate: calculated }))
    }
  }, [form.commencementDate, form.term, maturityManual])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleLinkExisting() {
    if (!matchSuggestion) return
    setLinkedClientId(matchSuggestion.id)
    setForm((f) => ({
      ...f,
      clientName: matchSuggestion.clientName,
      dob: matchSuggestion.dob || '',
      address: matchSuggestion.address || '',
      phone: matchSuggestion.phone || '',
      email: matchSuggestion.email || '',
    }))
    setMatchSuggestion(null)
  }

  function dismissSuggestion() {
    setMatchSuggestion(null)
  }

  function validate() {
    const errs = {}
    if (!form.clientName.trim()) errs.clientName = 'Client name is required.'
    if (!form.policyNumber.trim()) errs.policyNumber = 'Policy number is required.'
    if (form.premiumAmount === '' || form.premiumAmount === null || Number(form.premiumAmount) <= 0) {
      errs.premiumAmount = 'Premium amount is required.'
    }
    if (!form.nextPremiumDueDate) errs.nextPremiumDueDate = 'Next premium due date is required.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)

    const clientData = {
      clientName: form.clientName.trim(),
      dob: form.dob,
      address: form.address,
      phone: form.phone,
      email: form.email,
    }
    const policyData = {
      companyName: form.companyName,
      planName: form.planName,
      policyNumber: form.policyNumber.trim(),
      assuredAmount: form.assuredAmount === '' ? 0 : Number(form.assuredAmount),
      premiumFrequency: form.premiumFrequency,
      premiumAmount: Number(form.premiumAmount),
      nextPremiumDueDate: form.nextPremiumDueDate,
      term: form.term === '' ? '' : Number(form.term),
      commencementDate: form.commencementDate,
      maturityDate: form.maturityDate,
    }

    await saveClientAndPolicy({
      clientData,
      policyData,
      clientId: linkedClientId || existing?.client.id || null,
      policyId: existing?.policy.id || null,
    })

    setSaving(false)
    onSaved()
  }

  const phoneWarning = form.phone && !isValidPhone(form.phone)
  const emailWarning = form.email && !isValidEmail(form.email)
  const isLinked = Boolean(linkedClientId) && !isEdit

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center sm:p-4 z-40">
      <div className="bg-white sm:rounded-lg shadow-xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-800">
            {isEdit ? 'Edit Client & Policy' : 'Add Client & Policy'}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-2xl leading-none px-2 -mr-2">
            &times;
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-6 flex-1">
          {matchSuggestion && (
            <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-sm text-blue-900">
                A client named <strong>{matchSuggestion.clientName}</strong> already exists. Link this new policy to
                them instead of creating a duplicate?
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={dismissSuggestion}
                  className="px-3 py-1.5 rounded-md border border-blue-300 text-blue-800 text-sm hover:bg-blue-100"
                >
                  No
                </button>
                <button
                  onClick={handleLinkExisting}
                  className="px-3 py-1.5 rounded-md bg-blue-800 text-white text-sm hover:bg-blue-900"
                >
                  Link
                </button>
              </div>
            </div>
          )}

          {isLinked && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-2 text-sm text-emerald-800 flex items-center justify-between">
              <span>Linked to existing client — personal info fields are locked.</span>
              <button
                onClick={() => setLinkedClientId(null)}
                className="text-emerald-700 underline text-xs"
              >
                Unlink
              </button>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Client Info</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.clientName}
                  disabled={isLinked}
                  onChange={(e) => update('clientName', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 disabled:bg-slate-100"
                />
                {errors.clientName && <p className="text-red-600 text-xs mt-1">{errors.clientName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  disabled={isLinked}
                  onChange={(e) => update('dob', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Age</label>
                <input
                  type="text"
                  value={age ?? ''}
                  readOnly
                  className="w-full border border-slate-200 bg-slate-100 rounded-md px-3 py-2 text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  disabled={isLinked}
                  onChange={(e) => update('phone', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 disabled:bg-slate-100"
                />
                {phoneWarning && <p className="text-amber-600 text-xs mt-1">This doesn't look like a valid phone number.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="text"
                  value={form.email}
                  disabled={isLinked}
                  onChange={(e) => update('email', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 disabled:bg-slate-100"
                />
                {emailWarning && <p className="text-amber-600 text-xs mt-1">This doesn't look like a valid email address.</p>}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
                <textarea
                  value={form.address}
                  disabled={isLinked}
                  onChange={(e) => update('address', e.target.value)}
                  rows={2}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Policy Info</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Company Name</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Plan Name</label>
                <input
                  type="text"
                  value={form.planName}
                  onChange={(e) => update('planName', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Policy Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.policyNumber}
                  onChange={(e) => update('policyNumber', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
                {errors.policyNumber && <p className="text-red-600 text-xs mt-1">{errors.policyNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Assured Amount</label>
                <input
                  type="number"
                  value={form.assuredAmount}
                  onChange={(e) => update('assuredAmount', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Premium Frequency</label>
                <select
                  value={form.premiumFrequency}
                  onChange={(e) => update('premiumFrequency', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 bg-white"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Premium Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.premiumAmount}
                  onChange={(e) => update('premiumAmount', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
                {errors.premiumAmount && <p className="text-red-600 text-xs mt-1">{errors.premiumAmount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Next Premium Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.nextPremiumDueDate}
                  onChange={(e) => update('nextPremiumDueDate', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
                {errors.nextPremiumDueDate && (
                  <p className="text-red-600 text-xs mt-1">{errors.nextPremiumDueDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Term (years)</label>
                <input
                  type="number"
                  value={form.term}
                  onChange={(e) => update('term', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Commencement Date</label>
                <input
                  type="date"
                  value={form.commencementDate}
                  onChange={(e) => update('commencementDate', e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Maturity Date</label>
                <input
                  type="date"
                  value={form.maturityDate}
                  onChange={(e) => {
                    setMaturityManual(true)
                    update('maturityDate', e.target.value)
                  }}
                  className="w-full border border-slate-300 rounded-md px-3 py-2"
                />
                <p className="text-slate-400 text-xs mt-1">Auto-calculated from commencement date + term; edit to override.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-800 hover:bg-blue-900 text-white font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
