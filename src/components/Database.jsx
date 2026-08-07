import { useMemo, useState } from 'react'
import SearchBar from './SearchBar.jsx'
import ClientDetail from './ClientDetail.jsx'
import ImportModal from './ImportModal.jsx'
import { exportToExcel } from '../export.js'
import { formatDate, groupPoliciesBySignature } from '../helpers.js'

const SEARCH_FIELDS_POLICY = ['companyName', 'planName', 'policyNumber']
const SEARCH_FIELDS_CLIENT = ['clientName', 'address', 'phone', 'email']

export default function Database({ rows, selectedClientId, onSelectClient, onAddClient, onEdit, onDeleted, onImported }) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('clientName')
  const [sortDir, setSortDir] = useState('asc')
  const [importOpen, setImportOpen] = useState(false)

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

  // Collapse policies that are identical in every field except policyNumber
  // (e.g. several family members bought the same plan in one batch) into a
  // single display entry listing all of their policy numbers.
  const mergedEntries = useMemo(() => {
    const byClient = new Map()
    for (const { client, policy } of filteredRows) {
      if (!byClient.has(client.id)) byClient.set(client.id, { client, policies: [] })
      byClient.get(client.id).policies.push(policy)
    }
    const entries = []
    for (const { client, policies } of byClient.values()) {
      for (const group of groupPoliciesBySignature(policies)) {
        entries.push({ client, policyGroup: group })
      }
    }
    return entries
  }, [filteredRows])

  const sortedRows = useMemo(() => {
    const copy = [...mergedEntries]
    copy.sort((a, b) => {
      let av, bv
      if (sortKey === 'clientName') {
        av = a.client.clientName?.toLowerCase() || ''
        bv = b.client.clientName?.toLowerCase() || ''
      } else if (sortKey === 'nextPremiumDueDate') {
        av = a.policyGroup.policies[0].nextPremiumDueDate || ''
        bv = b.policyGroup.policies[0].nextPremiumDueDate || ''
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [mergedEntries, sortKey, sortDir])

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

  const selectedClient = rows.find((r) => r.client.id === selectedClientId)?.client || null
  const selectedClientPolicies = rows.filter((r) => r.client.id === selectedClientId).map((r) => r.policy)

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-700 mb-2">No clients yet</h2>
        <p className="text-slate-500 mb-6">Add your first client, or upload a spreadsheet to bulk-import your existing records.</p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onAddClient}
            className="bg-blue-800 hover:bg-blue-900 text-white font-medium px-5 py-2.5 rounded-md"
          >
            Add Client
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-5 py-2.5 rounded-md"
          >
            Upload Spreadsheet
          </button>
        </div>
        {importOpen && (
          <ImportModal
            onCancel={() => setImportOpen(false)}
            onImported={async () => {
              await onImported()
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex-1">
          <SearchBar value={query} onChange={setQuery} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onAddClient}
            className="flex-1 sm:flex-none bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white font-medium px-4 py-2.5 rounded-md whitespace-nowrap"
          >
            + Add Client
          </button>
          <button
            onClick={() => setImportOpen(true)}
            className="flex-1 sm:flex-none bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white font-medium px-4 py-2.5 rounded-md whitespace-nowrap"
          >
            Upload Spreadsheet
          </button>
          <button
            onClick={() => exportToExcel(rows)}
            className="flex-1 sm:flex-none bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-medium px-4 py-2.5 rounded-md whitespace-nowrap"
          >
            Export
          </button>
        </div>
      </div>

      {importOpen && (
        <ImportModal
          onCancel={() => setImportOpen(false)}
          onImported={async () => {
            await onImported()
          }}
        />
      )}

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
        {sortedRows.map(({ client, policyGroup }) => {
          const policy = policyGroup.policies[0]
          const policyNumberLabel = policyGroup.policyNumbers.join(', ') || '-'
          return (
            <button
              key={`${client.id}-${policy.id}`}
              onClick={() => onSelectClient(client.id)}
              className="w-full text-left bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-3.5 active:bg-blue-50"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-800">{client.clientName}</span>
                <span className="text-xs text-slate-500 shrink-0">{formatDate(policy.nextPremiumDueDate)}</span>
              </div>
              <div className="text-sm text-slate-600 mt-1">
                {policy.companyName} &middot; {policy.planName}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                {policyNumberLabel} &middot; {client.phone}
              </div>
              {policyGroup.policyNumbers.length > 1 && (
                <div className="text-xs text-blue-700 mt-1">{policyGroup.policyNumbers.length} identical policies</div>
              )}
            </button>
          )
        })}
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
            {sortedRows.map(({ client, policyGroup }) => {
              const policy = policyGroup.policies[0]
              return (
                <tr
                  key={`${client.id}-${policy.id}`}
                  onClick={() => onSelectClient(client.id)}
                  className="border-b border-slate-100 last:border-0 hover:bg-blue-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{client.clientName}</td>
                  <td className="px-4 py-3 text-slate-600">{policy.companyName}</td>
                  <td className="px-4 py-3 text-slate-600">{policy.planName}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {policyGroup.policyNumbers.join(', ') || '-'}
                    {policyGroup.policyNumbers.length > 1 && (
                      <span className="ml-1.5 text-xs text-blue-700">({policyGroup.policyNumbers.length})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(policy.nextPremiumDueDate)}</td>
                  <td className="px-4 py-3 text-slate-600">{client.phone}</td>
                </tr>
              )
            })}
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

      {selectedClient && (
        <ClientDetail
          client={selectedClient}
          policies={selectedClientPolicies}
          onClose={() => onSelectClient(null)}
          onEditPolicy={(policy) => onEdit({ client: selectedClient, policy })}
          onDeleted={onDeleted}
          onPolicyDeleted={onImported}
        />
      )}
    </div>
  )
}
