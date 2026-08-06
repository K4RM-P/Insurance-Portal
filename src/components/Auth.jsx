import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Auth() {
  const [mode, setMode] = useState('sign-in') // 'sign-in' | 'sign-up'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)

    const { error: authError } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setSubmitting(false)

    if (authError) {
      setError(authError.message)
      return
    }
    if (mode === 'sign-up') {
      setInfo('Account created. Check your email to confirm, then sign in.')
      setMode('sign-in')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-md w-full max-w-sm p-6 space-y-4"
      >
        <h1 className="text-xl font-bold text-blue-900 text-center">Insurance Portal</h1>
        <p className="text-sm text-slate-500 text-center">
          {mode === 'sign-in' ? 'Sign in to sync your data' : 'Create an account to sync your data'}
        </p>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2"
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {info && <p className="text-emerald-600 text-sm">{info}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2 rounded-md bg-blue-800 hover:bg-blue-900 text-white font-medium disabled:opacity-50"
        >
          {submitting ? 'Please wait...' : mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
            setError(null)
            setInfo(null)
          }}
          className="w-full text-sm text-blue-800 hover:underline"
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
