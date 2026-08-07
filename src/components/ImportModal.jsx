import { useState } from 'react'
import { parseClientPolicyWorkbook } from '../import.js'
import { findClientByName, saveClientAndPolicy } from '../sync.js'

export default function ImportModal({ onCancel, onImported }) {
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState(null) // { records, skippedCount }
  const [parseError, setParseError] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null) // { clientCount, policyCount }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParsed(null)
    setParseError('')
    setResult(null)
    try {
      const data = await parseClientPolicyWorkbook(file)
      if (data.records.length === 0) {
        setParseError('No usable rows found. Make sure this is the Client & Policy Detail spreadsheet.')
        return
      }
      setParsed(data)
    } catch (err) {
      setParseError('Could not read this file. Please upload the .xlsx export in its original format.')
    }
  }

  const uniqueClientCount = parsed
    ? new Set(parsed.records.map((r) => r.clientData.clientName.trim().toLowerCase())).size
    : 0

  async function handleImport() {
    if (!parsed) return
    setImporting(true)
    setProgress(0)
    const clientIdByName = new Map()
    let policyCount = 0

    for (const record of parsed.records) {
      const key = record.clientData.clientName.trim().toLowerCase()
      let clientId = clientIdByName.get(key)
      if (!clientId) {
        const existing = await findClientByName(record.clientData.clientName)
        clientId = existing?.id || null
      }
      const { client } = await saveClientAndPolicy({
        clientData: record.clientData,
        policyData: record.policyData,
        clientId,
        policyId: null,
      })
      clientIdByName.set(key, client.id)
      policyCount++
      setProgress(policyCount)
    }

    setImporting(false)
    setResult({ clientCount: clientIdByName.size, policyCount })
    await onImported()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center sm:p-4 z-40">
      <div className="bg-white sm:rounded-lg shadow-xl max-w-lg w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto flex flex-col">
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
        >
          <h2 className="text-lg font-semibold text-slate-800">Upload Spreadsheet</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-2xl leading-none px-2 -mr-2">
            &times;
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-4 flex-1">
          {result ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-4 text-emerald-800">
              <p className="font-semibold mb-1">Import complete.</p>
              <p className="text-sm">
                Added/updated {result.clientCount} client{result.clientCount === 1 ? '' : 's'} and {result.policyCount}{' '}
                polic{result.policyCount === 1 ? 'y' : 'ies'}.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Upload the Client &amp; Policy Detail spreadsheet in its original format. Each row becomes a client
                and policy — rows that continue an existing client's family policies (blank name) are linked
                automatically.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Spreadsheet file (.xlsx)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFile}
                  disabled={importing}
                  className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-blue-800 file:text-white file:text-sm"
                />
                {fileName && <p className="text-xs text-slate-400 mt-1">{fileName}</p>}
              </div>

              {parseError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-3 py-2">
                  {parseError}
                </div>
              )}

              {parsed && !importing && (
                <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-3 text-sm text-blue-900">
                  <p>
                    Found <strong>{uniqueClientCount}</strong> client{uniqueClientCount === 1 ? '' : 's'} and{' '}
                    <strong>{parsed.records.length}</strong> polic{parsed.records.length === 1 ? 'y' : 'ies'} ready to
                    import.
                  </p>
                  {parsed.skippedCount > 0 && (
                    <p className="mt-1 text-blue-700">
                      Skipped {parsed.skippedCount} incomplete row{parsed.skippedCount === 1 ? '' : 's'} (missing date
                      or policy details).
                    </p>
                  )}
                </div>
              )}

              {importing && (
                <div className="text-sm text-slate-600">
                  Importing... {progress} / {parsed.records.length}
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className="bg-blue-800 h-2 rounded-full transition-all"
                      style={{ width: `${(progress / parsed.records.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="flex justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 sticky bottom-0 bg-white"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {result ? (
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-md bg-blue-800 hover:bg-blue-900 text-white font-medium"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onCancel}
                disabled={importing}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!parsed || importing}
                className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-md bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white font-medium disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
