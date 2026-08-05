import { useMemo, useState } from 'react'
import SearchBar from './SearchBar.jsx'
import ClientDetail from './ClientDetail.jsx'
import { exportToExcel } from '../export.js'
import { formatDate } from '../helpers.js'

const SEARCH_FIELDS_POLICY = ['companyName', 'planName', 'policyNumber']
const SEARCH_FIELDS_CLIENT = ['clientName', 'address', 'phone', 'email']

export default function Database({ rows, selectedClientId, onSelectClient, onAddClient, onEdit, onDeleted }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('clientName')
  const [sortDir, setSortDir] = useState('asc')

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(({ client, policy }) => {
      const haystack = [
        ...SEARCH_FIELDS_CLIENT.map((f) => client[f]),
        ...SEARCH_FIELDS_POLICY.map((f) => policy[f]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, query])

  const sortedRows = useMemo(() => {
    const copy = [...filteredRows]
    copy.sort((a, b) => {
      let av, bv
      if (sortKey === 'clientName') {
        av = a.client.clientName?.toLowerCase() || ''
        bv = b.client.clientName?.toLowerCase() || ''
      } else if (sortKey === 'nextPremiumDueDate') {
        av = a.policy.nextPremiumDueDate || ''
        bv = b.policy.nextPremiumDueDate || ''
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [filteredRows, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function sortIndicator(key) {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  const selectedRow = rows.find((r) => r.client.id === selectedClientId) || null

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-700 mb-2">No clients yet</h2>
        <p className="text-slate-500 mb-6">Add your first client to build your database.</p>
        <button
          onClick={onAddClient}
          className="bg-blue-800 hover:bg-blue-900 text-white font-medium px-5 py-2.5 rounded-md"
        >
          Add Client
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex-1">
          <SearchBar value={query} onChange={setQuery} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAddClient}
            className="flex-1 sm:flex-none bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white font-medium px-4 py-2.5 rounded-md whitespace-nowrap"
          >
            + Add Client
          </button>
          <button
            onClick={() => exportToExcel(rows)}
            className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-medium px-4 py-2.5 rounded-md whitespace-nowrap"
          >
            Export
          </button>
        </div>
      </div>

      {/* Sort controls (shown above the card list on mobile, where column headers aren't clickable) */}
      <div className="flex sm:hidden items-center gap-2 text-sm">
        <span className="text-slate-500">Sort by:</span>
        <button
          onClick={() => toggleSort('clientName')}
          className={`px-3 py-1.5 rounded-md border ${
            sortKey === 'clientName' ? 'bg-blue-800 text-white border-blue-800' : 'border-slate-300 text-slate-600'
          }`}
        >
          Name{sortIndicator('clientName')}
        </button>
        <button
          onClick={() => toggleSort('nextPremiumDueDate')}
          className={`px-3 py-1.5 rounded-md border ${
            sortKey === 'nextPremiumDueDate' ? 'bg-blue-800 text-white border-blue-800' : 'border-slate-300 text-slate-600'
          }`}
        >
          Due Date{sortIndicator('nextPremiumDueDate')}
        </button>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden space-y-2">
        {sortedRows.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-8 text-center text-slate-400">
            No records match your search.
          </div>
        )}
        {sortedRows.map(({ client, policy }) => (
          <button
            key={policy.id}
            onClick={() => onSelectClient(client.id)}
            className="w-full text-left bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-3 active:bg-blue-50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-slate-800">{client.clientName}</span>
              <span className="text-xs text-slate-500 shrink-0">{formatDate(policy.nextPremiumDueDate)}</span>
            </div>
            <div className="text-sm text-slate-600 mt-1">
              {policy.companyName} &middot; {policy.planName}
            </div>
            <div className="text-sm text-slate-500 mt-0.5">
              {policy.policyNumber} &middot; {client.phone}
            </div>
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th
                onClick={() => toggleSort('clientName')}
                className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none"
              >
                Client Name{sortIndicator('clientName')}
              </th>
              <th className="px-4 py-3 font-semibold text-slate-600">Company</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Plan Name</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Policy Number</th>
              <th
                onClick={() => toggleSort('nextPremiumDueDate')}
                className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none"
              >
                Next Premium Due{sortIndicator('nextPremiumDueDate')}
              </th>
              <th className="px-4 py-3 font-semibold text-slate-600">Phone</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(({ client, policy }) => (
              <tr
                key={policy.id}
                onClick={() => onSelectClient(client.id)}
                className="border-b border-slate-100 last:border-0 hover:bg-blue-50 cursor-pointer"
              >
                <td className="px-4 py-3 font-medium text-slate-800">{client.clientName}</td>
                <td className="px-4 py-3 text-slate-600">{policy.companyName}</td>
                <td className="px-4 py-3 text-slate-600">{policy.planName}</td>
                <td className="px-4 py-3 text-slate-600">{policy.policyNumber}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(policy.nextPremiumDueDate)}</td>
                <td className="px-4 py-3 text-slate-600">{client.phone}</td>
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No records match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedRow && (
        <ClientDetail
          row={selectedRow}
          onClose={() => onSelectClient(null)}
          onEdit={() => onEdit(selectedRow)}
          onDeleted={onDeleted}
        />
      )}
    </div>
  )
}
