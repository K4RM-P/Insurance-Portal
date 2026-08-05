import { useMemo, useState } from 'react'
import { nextBirthdayInfo, daysUntil, formatDate, formatCurrency } from '../helpers.js'

function DaysLabel({ days, overdueAllowed }) {
  if (days === 0) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400 text-amber-950">
        Today!
      </span>
    )
  }
  if (overdueAllowed && days < 0) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-600 text-white">
        OVERDUE by {Math.abs(days)} day{Math.abs(days) === 1 ? '' : 's'}
      </span>
    )
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
      in {days} day{days === 1 ? '' : 's'}
    </span>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div className="text-2xl font-bold text-blue-900 mt-1">{value}</div>
    </div>
  )
}

export default function Dashboard({ rows, onSelectClient, onAddClient }) {
  const [birthdayWindow, setBirthdayWindow] = useState(30)
  const [dueWindow, setDueWindow] = useState(30)

  const uniqueClients = useMemo(() => {
    const map = new Map()
    rows.forEach(({ client }) => map.set(client.id, client))
    return Array.from(map.values())
  }, [rows])

  const totalAssured = useMemo(
    () => rows.reduce((sum, { policy }) => sum + (Number(policy.assuredAmount) || 0), 0),
    [rows]
  )

  const dueThisMonth = useMemo(() => {
    const now = new Date()
    return rows.filter(({ policy }) => {
      if (!policy.nextPremiumDueDate) return false
      const d = new Date(policy.nextPremiumDueDate)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
  }, [rows])

  const birthdayAlerts = useMemo(() => {
    return uniqueClients
      .map((client) => {
        const info = nextBirthdayInfo(client.dob)
        if (!info) return null
        return { client, ...info }
      })
      .filter((item) => item && item.daysUntil <= birthdayWindow)
      .sort((a, b) => a.daysUntil - b.daysUntil)
  }, [uniqueClients, birthdayWindow])

  const dueAlerts = useMemo(() => {
    return rows
      .map(({ client, policy }) => {
        const days = daysUntil(policy.nextPremiumDueDate)
        if (days === null) return null
        return { client, policy, days }
      })
      .filter((item) => item && item.days <= dueWindow)
      .sort((a, b) => a.days - b.days)
  }, [rows, dueWindow])

  if (rows.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-700 mb-2">No clients yet</h2>
        <p className="text-slate-500 mb-6">Add your first client to start tracking birthdays and premium due dates.</p>
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
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Clients" value={uniqueClients.length} />
        <StatCard label="Total Active Policies" value={rows.length} />
        <StatCard label="Total Assured Amount" value={formatCurrency(totalAssured)} />
        <StatCard label="Premiums Due This Month" value={dueThisMonth} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800">Birthday Alerts</h2>
          <select
            value={birthdayWindow}
            onChange={(e) => setBirthdayWindow(Number(e.target.value))}
            className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white"
          >
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
            <option value={60}>Next 60 days</option>
          </select>
        </div>
        {birthdayAlerts.length === 0 ? (
          <p className="text-slate-500 text-sm">No birthdays in this window.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {birthdayAlerts.map(({ client, daysUntil: days, turningAge }) => (
              <button
                key={client.id}
                onClick={() => onSelectClient(client.id)}
                className={`text-left rounded-lg border shadow-sm px-4 py-3 transition hover:shadow-md ${
                  days === 0
                    ? 'bg-amber-100 border-amber-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-800">{client.clientName}</span>
                  <DaysLabel days={days} />
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  DOB: {formatDate(client.dob)} &middot; Turning {turningAge}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-800">Upcoming Premium Due Dates</h2>
          <select
            value={dueWindow}
            onChange={(e) => setDueWindow(Number(e.target.value))}
            className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white"
          >
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
            <option value={60}>Next 60 days</option>
          </select>
        </div>
        {dueAlerts.length === 0 ? (
          <p className="text-slate-500 text-sm">No premiums due in this window.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dueAlerts.map(({ client, policy, days }) => (
              <button
                key={policy.id}
                onClick={() => onSelectClient(client.id)}
                className={`text-left rounded-lg border shadow-sm px-4 py-3 transition hover:shadow-md ${
                  days < 0
                    ? 'bg-red-50 border-red-300'
                    : days === 0
                    ? 'bg-amber-100 border-amber-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-800">{client.clientName}</span>
                  <DaysLabel days={days} overdueAllowed />
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {policy.planName} &middot; {policy.policyNumber}
                </div>
                <div className="text-sm text-slate-600 mt-0.5">
                  {formatCurrency(policy.premiumAmount)} due {formatDate(policy.nextPremiumDueDate)}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
