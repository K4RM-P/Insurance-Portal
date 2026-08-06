// Sync layer: Supabase is the source of truth, IndexedDB (via db.js) is a local
// write-through cache so the app keeps working offline. Mirrors db.js's function
// signatures so components barely change.
import { supabase } from './supabaseClient.js'
import {
  getDB,
  getAllClients,
  getAllPolicies,
  getJoinedRows as getJoinedRowsLocal,
  findClientByName as findClientByNameLocal,
  addClient as addClientLocal,
  updateClient as updateClientLocal,
  deleteClient as deleteClientLocal,
  addPolicy as addPolicyLocal,
  updatePolicy as updatePolicyLocal,
  deletePolicy as deletePolicyLocal,
} from './db.js'

const QUEUE_KEY = 'sync_pending_ops'

let currentUserId = null
let realtimeChannel = null
let onRemoteChangeCallback = null

// ---------- field mapping (camelCase JS <-> snake_case Postgres) ----------

function clientToRow(client, userId) {
  return {
    id: client.id,
    user_id: userId,
    client_name: client.clientName,
    dob: client.dob || null,
    address: client.address || null,
    phone: client.phone || null,
    email: client.email || null,
    is_sample: !!client.isSample,
  }
}

function rowToClient(row) {
  return {
    id: row.id,
    clientName: row.client_name,
    dob: row.dob || '',
    address: row.address || '',
    phone: row.phone || '',
    email: row.email || '',
    isSample: row.is_sample || false,
  }
}

function policyToRow(policy, userId) {
  return {
    id: policy.id,
    user_id: userId,
    client_id: policy.clientId,
    company_name: policy.companyName || null,
    plan_name: policy.planName || null,
    policy_number: policy.policyNumber || null,
    assured_amount: policy.assuredAmount === '' ? null : policy.assuredAmount,
    premium_frequency: policy.premiumFrequency || null,
    premium_amount: policy.premiumAmount === '' ? null : policy.premiumAmount,
    next_premium_due_date: policy.nextPremiumDueDate || null,
    term: policy.term === '' || policy.term === undefined ? null : policy.term,
    commencement_date: policy.commencementDate || null,
    maturity_date: policy.maturityDate || null,
    is_sample: !!policy.isSample,
  }
}

function rowToPolicy(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    companyName: row.company_name || '',
    planName: row.plan_name || '',
    policyNumber: row.policy_number || '',
    assuredAmount: row.assured_amount ?? 0,
    premiumFrequency: row.premium_frequency || 'Yearly',
    premiumAmount: row.premium_amount ?? 0,
    nextPremiumDueDate: row.next_premium_due_date || '',
    term: row.term ?? '',
    commencementDate: row.commencement_date || '',
    maturityDate: row.maturity_date || '',
    isSample: row.is_sample || false,
  }
}

// ---------- offline queue (persisted in localStorage) ----------

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function enqueue(op) {
  const queue = readQueue()
  queue.push(op)
  writeQueue(queue)
}

function isNetworkError(error) {
  return !navigator.onLine || (error && /fetch|network/i.test(error.message || ''))
}

async function runOp(op) {
  const table = op.table
  if (op.action === 'upsert') {
    const { error } = await supabase.from(table).upsert(op.row)
    if (error) throw error
  } else if (op.action === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', op.id)
    if (error) throw error
  }
}

export async function flushQueue() {
  if (!navigator.onLine) return
  let queue = readQueue()
  if (queue.length === 0) return
  const remaining = []
  for (const op of queue) {
    try {
      await runOp(op)
    } catch (err) {
      if (isNetworkError(err)) {
        remaining.push(op)
      }
      // non-network errors (e.g. already deleted) are dropped
    }
  }
  writeQueue(remaining)
}

window.addEventListener('online', () => {
  flushQueue()
})

// ---------- auth / session lifecycle ----------

export async function initSync(userId) {
  currentUserId = userId
  await flushQueue()
  await pullAll()
  subscribeRealtime()
}

export function stopSync() {
  currentUserId = null
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

export function onRemoteChange(callback) {
  onRemoteChangeCallback = callback
}

async function pullAll() {
  const [{ data: clientRows, error: clientErr }, { data: policyRows, error: policyErr }] = await Promise.all([
    supabase.from('clients').select('*').eq('user_id', currentUserId),
    supabase.from('policies').select('*').eq('user_id', currentUserId),
  ])
  if (clientErr || policyErr) {
    // offline or unreachable: fall back to whatever is already cached locally
    return
  }

  const db = await getDB()
  const tx = db.transaction(['clients', 'policies'], 'readwrite')
  await tx.objectStore('clients').clear()
  await tx.objectStore('policies').clear()
  for (const row of clientRows) {
    await tx.objectStore('clients').put(rowToClient(row))
  }
  for (const row of policyRows) {
    await tx.objectStore('policies').put(rowToPolicy(row))
  }
  await tx.done
}

function subscribeRealtime() {
  if (realtimeChannel) supabase.removeChannel(realtimeChannel)
  realtimeChannel = supabase
    .channel('multi-device-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'clients', filter: `user_id=eq.${currentUserId}` },
      handleRemoteChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'policies', filter: `user_id=eq.${currentUserId}` },
      handleRemoteChange
    )
    .subscribe()
}

async function handleRemoteChange(payload) {
  const table = payload.table
  if (payload.eventType === 'DELETE') {
    const db = await getDB()
    await db.delete(table, payload.old.id)
  } else {
    const row = payload.new
    const mapped = table === 'clients' ? rowToClient(row) : rowToPolicy(row)
    const db = await getDB()
    await db.put(table, mapped)
  }
  onRemoteChangeCallback?.()
}

// ---------- reads (served from local cache, kept fresh via pullAll + realtime) ----------

export async function getJoinedRows() {
  return getJoinedRowsLocal()
}

export async function findClientByName(name) {
  return findClientByNameLocal(name)
}

export { getAllClients, getAllPolicies }

// ---------- writes (write-through: Supabase first, then mirror to local cache) ----------

async function upsertClient(client) {
  const withId = { ...client, id: client.id || crypto.randomUUID() }
  const local = await (client.id ? updateClientLocal(withId) : addClientLocal(withId))
  const row = clientToRow(local, currentUserId)
  try {
    const { error } = await supabase.from('clients').upsert(row).select().single()
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      enqueue({ action: 'upsert', table: 'clients', row })
    } else {
      throw err
    }
  }
  return local
}

async function upsertPolicy(policy) {
  const withId = { ...policy, id: policy.id || crypto.randomUUID() }
  const local = await (policy.id ? updatePolicyLocal(withId) : addPolicyLocal(withId))
  const row = policyToRow(local, currentUserId)
  try {
    const { error } = await supabase.from('policies').upsert(row).select().single()
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      enqueue({ action: 'upsert', table: 'policies', row })
    } else {
      throw err
    }
  }
  return local
}

export async function saveClientAndPolicy({ clientData, policyData, clientId, policyId }) {
  const client = await upsertClient({ ...clientData, id: clientId || undefined })
  const policy = await upsertPolicy({ ...policyData, id: policyId || undefined, clientId: client.id })
  return { client, policy }
}

export async function deleteClient(clientId) {
  const policies = await getAllPolicies()
  const toDelete = policies.filter((p) => p.clientId === clientId)
  await deleteClientLocal(clientId)

  try {
    const { error } = await supabase.from('clients').delete().eq('id', clientId)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      enqueue({ action: 'delete', table: 'clients', id: clientId })
      for (const p of toDelete) {
        enqueue({ action: 'delete', table: 'policies', id: p.id })
      }
    } else {
      throw err
    }
  }
}

export async function deletePolicy(policyId) {
  await deletePolicyLocal(policyId)
  try {
    const { error } = await supabase.from('policies').delete().eq('id', policyId)
    if (error) throw error
  } catch (err) {
    if (isNetworkError(err)) {
      enqueue({ action: 'delete', table: 'policies', id: policyId })
    } else {
      throw err
    }
  }
}
