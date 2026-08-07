const COLUMN_MAP = [
  ['companyName', 'Company Name'],
  ['planName', 'Plan Name'],
  ['clientName', 'Client Name'],
  ['age', 'Age'],
  ['dob', 'Date of Birth'],
  ['address', 'Address'],
  ['phone', 'Phone Number'],
  ['email', 'Email'],
  ['policyNumber', 'Policy Number'],
  ['assuredAmount', 'Assured Amount (Sum Assured)'],
  ['premiumFrequency', 'Premium Frequency'],
  ['premiumAmount', 'Premium Amount'],
  ['nextPremiumDueDate', 'Next Premium Due Date'],
  ['term', 'Term (Years)'],
  ['commencementDate', 'Commencement Date'],
  ['maturityDate', 'Maturity Date'],
]

function calcAge(dob) {
  if (!dob) return ''
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

/**
 * rows: array of { client, policy }
 */
export async function exportToExcel(rows) {
  const XLSX = await import('xlsx')
  const data = rows.map(({ client, policy }) => {
    const record = {
      companyName: policy.companyName || '',
      planName: policy.planName || '',
      clientName: client.clientName || '',
      age: calcAge(client.dob),
      dob: client.dob || '',
      address: client.address || '',
      phone: client.phone || '',
      email: client.email || '',
      policyNumber: policy.policyNumber || '',
      assuredAmount: policy.assuredAmount ?? '',
      premiumFrequency: policy.premiumFrequency || '',
      premiumAmount: policy.premiumAmount ?? '',
      nextPremiumDueDate: policy.nextPremiumDueDate || '',
      term: policy.term ?? '',
      commencementDate: policy.commencementDate || '',
      maturityDate: policy.maturityDate || '',
    }
    const row = {}
    COLUMN_MAP.forEach(([key, header]) => {
      row[header] = record[key]
    })
    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: COLUMN_MAP.map(([, header]) => header),
  })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients')

  const dateStr = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(workbook, `LIC_Clients_Export_${dateStr}.xlsx`)
}
