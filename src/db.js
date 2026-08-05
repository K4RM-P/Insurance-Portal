import { openDB } from 'idb'

const DB_NAME = 'lic-client-manager'
const DB_VERSION = 1

let dbPromise = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('clients')) {
          const clientStore = db.createObjectStore('clients', {
            keyPath: 'id',
            autoIncrement: true,
          })
          clientStore.createIndex('clientName', 'clientName')
        }
        if (!db.objectStoreNames.contains('policies')) {
          const policyStore = db.createObjectStore('policies', {
            keyPath: 'id',
            autoIncrement: true,
          })
          policyStore.createIndex('clientId', 'clientId')
          policyStore.createIndex('policyNumber', 'policyNumber', { unique: false })
        }
      },
    })
  }
  return dbPromise
}

// ---------- Clients ----------

export async function getAllClients() {
  const db = await getDB()
  return db.getAll('clients')
}

export async function getClientById(id) {
  const db = await getDB()
  return db.get('clients', id)
}

export async function findClientByName(name) {
  if (!name) return null
  const clients = await getAllClients()
  const normalized = name.trim().toLowerCase()
  return clients.find((c) => c.clientName.trim().toLowerCase() === normalized) || null
}

export async function addClient(client) {
  const db = await getDB()
  const id = await db.add('clients', client)
  return { ...client, id }
}

export async function updateClient(client) {
  const db = await getDB()
  await db.put('clients', client)
  return client
}

export async function deleteClient(clientId) {
  const db = await getDB()
  const tx = db.transaction(['clients', 'policies'], 'readwrite')
  const policies = await tx.objectStore('policies').index('clientId').getAll(clientId)
  await Promise.all(policies.map((p) => tx.objectStore('policies').delete(p.id)))
  await tx.objectStore('clients').delete(clientId)
  await tx.done
}

// ---------- Policies ----------

export async function getAllPolicies() {
  const db = await getDB()
  return db.getAll('policies')
}

export async function getPoliciesByClientId(clientId) {
  const db = await getDB()
  return db.getAllFromIndex('policies', 'clientId', clientId)
}

export async function addPolicy(policy) {
  const db = await getDB()
  const id = await db.add('policies', policy)
  return { ...policy, id }
}

export async function updatePolicy(policy) {
  const db = await getDB()
  await db.put('policies', policy)
  return policy
}

export async function deletePolicy(policyId) {
  const db = await getDB()
  await db.delete('policies', policyId)
}

// ---------- Combined ----------

/**
 * Returns one flattened row per policy, joined with its client's info.
 */
export async function getJoinedRows() {
  const [clients, policies] = await Promise.all([getAllClients(), getAllPolicies()])
  const clientsById = new Map(clients.map((c) => [c.id, c]))
  return policies
    .map((policy) => {
      const client = clientsById.get(policy.clientId)
      if (!client) return null
      return { client, policy }
    })
    .filter(Boolean)
}

/**
 * Saves a combined client+policy form submission.
 * If existingClientId is provided, links the policy to that client and updates client info.
 * Otherwise creates a new client.
 */
export async function saveClientAndPolicy({ clientData, policyData, clientId, policyId }) {
  let client
  if (clientId) {
    client = await updateClient({ ...clientData, id: clientId })
  } else {
    client = await addClient(clientData)
  }

  let policy
  if (policyId) {
    policy = await updatePolicy({ ...policyData, id: policyId, clientId: client.id })
  } else {
    policy = await addPolicy({ ...policyData, clientId: client.id })
  }

  return { client, policy }
}

// ---------- Seed sample data ----------

export async function seedIfEmpty() {
  const clients = await getAllClients()
  if (clients.length > 0) return

  const sampleClients = [
    {
      clientName: 'Rajesh Kumar (Sample)',
      dob: '1985-03-15',
      address: '12 MG Road, Pune, Maharashtra',
      phone: '9876543210',
      email: 'rajesh.kumar@example.com',
      isSample: true,
    },
    {
      clientName: 'Sunita Sharma (Sample)',
      dob: '1990-08-10',
      address: '45 Park Street, Kolkata, West Bengal',
      phone: '9123456780',
      email: 'sunita.sharma@example.com',
      isSample: true,
    },
    {
      clientName: 'Amit Patel (Sample)',
      dob: '1978-12-01',
      address: '7 Ring Road, Ahmedabad, Gujarat',
      phone: '9988776655',
      email: 'amit.patel@example.com',
      isSample: true,
    },
  ]

  const today = new Date()
  const inDays = (n) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }

  const samplePoliciesTemplates = [
    {
      companyName: 'LIC of India',
      planName: 'Jeevan Anand',
      policyNumber: 'LIC-SAMPLE-001',
      assuredAmount: 500000,
      premiumFrequency: 'Yearly',
      premiumAmount: 25000,
      nextPremiumDueDate: inDays(12),
      term: 20,
      commencementDate: '2020-04-01',
      maturityDate: '2040-04-01',
      isSample: true,
    },
    {
      companyName: 'LIC of India',
      planName: 'Jeevan Labh',
      policyNumber: 'LIC-SAMPLE-002',
      assuredAmount: 800000,
      premiumFrequency: 'Half-Yearly',
      premiumAmount: 18000,
      nextPremiumDueDate: inDays(-5),
      term: 16,
      commencementDate: '2018-06-15',
      maturityDate: '2034-06-15',
      isSample: true,
    },
    {
      companyName: 'LIC of India',
      planName: 'Tech Term',
      policyNumber: 'LIC-SAMPLE-003',
      assuredAmount: 2000000,
      premiumFrequency: 'Monthly',
      premiumAmount: 1500,
      nextPremiumDueDate: inDays(25),
      term: 30,
      commencementDate: '2022-01-10',
      maturityDate: '2052-01-10',
      isSample: true,
    },
  ]

  for (let i = 0; i < sampleClients.length; i++) {
    const client = await addClient(sampleClients[i])
    await addPolicy({ ...samplePoliciesTemplates[i], clientId: client.id })
  }
}

export async function deleteAllSampleData() {
  const clients = await getAllClients()
  const sampleClients = clients.filter((c) => c.isSample)
  for (const c of sampleClients) {
    await deleteClient(c.id)
  }
}
