import { useState } from 'react'
import { deleteClient } from '../sync.js'
import { calcAge, formatDate, formatCurrency } from '../helpers.js'

function Field({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="text-slate-800 mt-0.5 whitespace-pre-line">{value || '-'}</div>
    </div>
  )
}

export default function ClientDetail({ row, onClose, onEdit, onDeleted }) {
  const { client, policy } = row
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deleteClient(client.id)
    setDeleting(false)
    setConfirmOpen(false)
    onClose()
    onDeleted()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center sm:p-4 z-40">
      <div className="bg-white sm:rounded-lg shadow-xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-slate-800 truncate pr-2">{client.clientName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none px-2 -mr-2 shrink-0">
            &times;
          </button>
        </div>

        <div className="px-4 sm:px-6 py-5 space-y-6 flex-1">
          {client.isSample && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-md px-3 py-2">
              This is sample data — feel free to edit or delete it.
            </div>
          )}

          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Client Info</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Client Name" value={client.clientName} />
              <Field label="Date of Birth" value={`${formatDate(client.dob)} (Age ${calcAge(client.dob) ?? '-'})`} />
              <Field label="Phone" value={client.phone} />
              <Field label="Email" value={client.email} />
              <div className="sm:col-span-2">
                <Field label="Address" value={client.address} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Policy Info</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Company Name" value={policy.companyName} />
              <Field label="Plan Name" value={policy.planName} />
              <Field label="Policy Number" value={policy.policyNumber} />
              <Field label="Assured Amount" value={formatCurrency(policy.assuredAmount)} />
              <Field label="Premium Frequency" value={policy.premiumFrequency} />
              <Field label="Premium Amount" value={formatCurrency(policy.premiumAmount)} />
              <Field label="Next Premium Due Date" value={formatDate(policy.nextPremiumDueDate)} />
              <Field label="Term" value={policy.term ? `${policy.term} years` : '-'} />
              <Field label="Commencement Date" value={formatDate(policy.commencementDate)} />
              <Field label="Maturity Date" value={formatDate(policy.maturityDate)} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button
            onClick={() => setConfirmOpen(true)}
            className="text-red-600 hover:text-red-700 font-medium px-3 sm:px-4 py-2 rounded-md hover:bg-red-50 active:bg-red-100"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 active:bg-slate-100"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="px-3 sm:px-4 py-2 rounded-md bg-blue-800 hover:bg-blue-900 active:bg-blue-950 text-white font-medium"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete this client?</h3>
            <p className="text-slate-600 text-sm mb-5">
              This will permanently delete {client.clientName} and all their policies. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
