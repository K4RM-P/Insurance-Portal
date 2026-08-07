import { useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { codeToEmail, codeToPassword, normalizeCode } from '../accountCode.js'

export default function Auth() {
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const normalized = normalizeCode(code)
    if (!normalized) return

    setError(null)
    setSubmitting(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: codeToEmail(normalized),
      password: codeToPassword(normalized),
    })

    setSubmitting(false)

    if (authError) {
      setError('Invalid account code.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md w-full max-w-sm p-6 space-y-4"
      >
        <h1 className="text-xl font-bold text-blue-900 text-center">Insurance Portal</h1>
        <p className="text-sm text-slate-500 text-center">Enter your account code to continue</p>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Account Code</label>
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-lg tracking-wide text-center"
            placeholder="Account code"
          />
        </div>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !code.trim()}
          className="w-full px-4 py-2.5 rounded-md bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white font-medium disabled:opacity-50"
        >
          {submitting ? 'Please wait...' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
