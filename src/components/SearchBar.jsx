export default function SearchBar({ value, onChange }) {
  return (
    <input
      type="search"
      inputMode="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search by client name, company, policy number, plan, phone, email, address..."
      className="w-full border border-slate-300 rounded-md px-4 py-3 sm:py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  )
}
