import { useEffect, useState, useCallback } from 'react'
import Dashboard from './components/Dashboard.jsx'
import Database from './components/Database.jsx'
import ClientForm from './components/ClientForm.jsx'
import Auth from './components/Auth.jsx'
import { supabase } from './supabaseClient.js'
import { getJoinedRows, initSync, stopSync, onRemoteChange } from './sync.js'

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = checking, null = signed out
  const [activeTab, setActiveTab] = useState('dashboard')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedClientId, setSelectedClientId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingRow, setEditingRow] = useState(null) // { client, policy } or null for new

  const refresh = useCallback(async () => {
    const data = await getJoinedRows()
    setRows(data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    onRemoteChange(refresh)
    ;(async () => {
      await initSync(session.user.id)
      await refresh()
      setLoading(false)
    })()
    return () => stopSync()
  }, [session, refresh])

  if (session === undefined) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">Loading...</div>
  }

  if (!session) {
    return <Auth />
  }

  function goToClient(clientId) {
    setSelectedClientId(clientId)
    setActiveTab('database')
  }

  function openAddForm() {
    setEditingRow(null)
    setFormOpen(true)
  }

  function openEditForm(row) {
    setEditingRow(row)
    setFormOpen(true)
  }

  async function handleSaved() {
    setFormOpen(false)
    await refresh()
  }

  async function handleDeleted() {
    setSelectedClientId(null)
    await refresh()
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-blue-900 text-white shadow-md sticky top-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4 flex items-center justify-between gap-2">
          <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight truncate">Insurance Portal</h1>
          <nav className="flex gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-2.5 sm:px-4 py-2 rounded-md text-sm sm:text-base font-medium transition ${
                activeTab === 'dashboard'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-100 hover:bg-blue-800 active:bg-blue-950'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`px-2.5 sm:px-4 py-2 rounded-md text-sm sm:text-base font-medium transition ${
                activeTab === 'database'
                  ? 'bg-white text-blue-900'
                  : 'text-blue-100 hover:bg-blue-800 active:bg-blue-950'
              }`}
            >
              Database
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              aria-label="Sign Out"
              className="px-2.5 sm:px-4 py-2 rounded-md text-sm sm:text-base font-medium text-blue-100 hover:bg-blue-800 active:bg-blue-950 transition"
            >
              <span className="hidden sm:inline">Sign Out</span>
              <span className="sm:hidden" aria-hidden="true">⏻</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-8">
        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading...</div>
        ) : activeTab === 'dashboard' ? (
          <Dashboard rows={rows} onSelectClient={goToClient} onAddClient={openAddForm} />
        ) : (
          <Database
            rows={rows}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            onAddClient={openAddForm}
            onEdit={openEditForm}
            onDeleted={handleDeleted}
            onImported={refresh}
          />
        )}
      </main>

      {formOpen && (
        <ClientForm
          existing={editingRow}
          onCancel={() => setFormOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
