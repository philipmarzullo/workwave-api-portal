import { useState, useMemo } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Filter,
  FileText,
} from 'lucide-react'
import type { HistoricalApplication } from '@/data/types'
import { COMPETITIVE_VENDORS } from '@/data/types'
import rawApplications from '@/data/extracted-applications.json'

const applications = rawApplications as HistoricalApplication[]

const PAGE_SIZE = 50

type SortField =
  | 'customerName'
  | 'developerName'
  | 'wwProduct'
  | 'useCase'
  | 'signatureDate'
  | 'sfCaseNumber'
  | 'resellIntent'
type SortDir = 'asc' | 'desc'

function isCompetitiveVendor(name: string | null): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  return COMPETITIVE_VENDORS.some(v => lower.includes(v.toLowerCase()))
}

function matchesCompetitiveVendor(name: string | null): string | null {
  if (!name) return null
  const lower = name.toLowerCase()
  return COMPETITIVE_VENDORS.find(v => lower.includes(v.toLowerCase())) ?? null
}

// Extract unique non-null values for a field
function uniqueValues(field: keyof HistoricalApplication): string[] {
  const set = new Set<string>()
  for (const app of applications) {
    const val = app[field]
    if (typeof val === 'string' && val.trim()) {
      set.add(val.trim())
    }
  }
  return Array.from(set).sort()
}

export function HistoricalApplications() {
  const [searchQuery, setSearchQuery] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [developerFilter, setDeveloperFilter] = useState('')
  const [competitiveOnly, setCompetitiveOnly] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortField, setSortField] = useState<SortField>('signatureDate')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const products = useMemo(() => uniqueValues('wwProduct'), [])
  const developers = useMemo(() => uniqueValues('developerName'), [])

  // Stats
  const stats = useMemo(() => {
    const customerSet = new Set<string>()
    const developerSet = new Set<string>()
    let competitive = 0
    let resellYes = 0
    let resellAnswered = 0

    for (const app of applications) {
      if (app.customerName) customerSet.add(app.customerName)
      if (app.developerName) developerSet.add(app.developerName)
      if (isCompetitiveVendor(app.developerName)) competitive++
      if (app.customerIntendToResell !== null || app.developerIntendToResell !== null) {
        resellAnswered++
        if (app.customerIntendToResell === true || app.developerIntendToResell === true) {
          resellYes++
        }
      }
    }

    return {
      total: applications.length,
      customers: customerSet.size,
      developers: developerSet.size,
      competitive,
      resellPct: resellAnswered > 0 ? Math.round((resellYes / resellAnswered) * 100) : 0,
    }
  }, [])

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = [...applications]

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        a =>
          (a.customerName ?? '').toLowerCase().includes(q) ||
          (a.developerName ?? '').toLowerCase().includes(q) ||
          (a.useCase ?? '').toLowerCase().includes(q) ||
          (a.externalProduct ?? '').toLowerCase().includes(q) ||
          (a.sfCaseNumber ?? '').toLowerCase().includes(q)
      )
    }

    // Product filter
    if (productFilter) {
      result = result.filter(a => a.wwProduct === productFilter)
    }

    // Developer filter
    if (developerFilter) {
      result = result.filter(a => a.developerName === developerFilter)
    }

    // Competitive only
    if (competitiveOnly) {
      result = result.filter(a => isCompetitiveVendor(a.developerName))
    }

    // Date range
    if (dateFrom) {
      result = result.filter(a => a.signatureDate && a.signatureDate >= dateFrom)
    }
    if (dateTo) {
      result = result.filter(a => a.signatureDate && a.signatureDate <= dateTo)
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | boolean | null
      let bVal: string | boolean | null

      if (sortField === 'resellIntent') {
        aVal = a.customerIntendToResell ?? a.developerIntendToResell ?? null
        bVal = b.customerIntendToResell ?? b.developerIntendToResell ?? null
      } else {
        aVal = a[sortField]
        bVal = b[sortField]
      }

      const aStr = aVal === null ? '' : String(aVal)
      const bStr = bVal === null ? '' : String(bVal)
      const cmp = aStr.localeCompare(bStr)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [searchQuery, productFilter, developerFilter, competitiveOnly, dateFrom, dateTo, sortField, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-ww-gray-300" />
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-ww-primary" />
    ) : (
      <ChevronDown size={12} className="text-ww-primary" />
    )
  }

  const confidenceColor = (c: string) => {
    if (c === 'high') return 'bg-emerald-500'
    if (c === 'medium') return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText size={20} className="text-ww-primary" />
          <h1 className="text-xl font-display font-bold text-ww-navy">Historical Applications</h1>
        </div>
        <p className="text-sm text-ww-gray-500">
          {applications.length} API Developer Applications extracted from Salesforce
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Applications', value: stats.total },
          { label: 'Unique Customers', value: stats.customers },
          { label: 'Unique Partners', value: stats.developers },
          { label: 'Competitive Vendors', value: stats.competitive, highlight: true },
          { label: 'Resell Intent', value: `${stats.resellPct}%` },
        ].map(s => (
          <div
            key={s.label}
            className={`rounded-lg border px-4 py-3 ${
              s.highlight ? 'border-ww-red/30 bg-red-50' : 'border-ww-gray-200 bg-white'
            }`}
          >
            <p className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">
              {s.label}
            </p>
            <p
              className={`text-xl font-display font-bold mt-0.5 ${
                s.highlight ? 'text-ww-red' : 'text-ww-navy'
              }`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-ww-gray-50 border border-ww-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-1.5 text-ww-gray-400">
          <Filter size={14} />
          <span className="text-[11px] font-mono uppercase tracking-wider">Filters</span>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ww-gray-400" />
          <input
            type="text"
            placeholder="Search customer, developer, use case..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-ww-gray-200 rounded focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
          />
        </div>

        {/* Product */}
        <select
          value={productFilter}
          onChange={e => {
            setProductFilter(e.target.value)
            setPage(1)
          }}
          className="text-sm border border-ww-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-ww-primary/30 outline-none"
        >
          <option value="">All Products</option>
          {products.map(p => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Developer */}
        <select
          value={developerFilter}
          onChange={e => {
            setDeveloperFilter(e.target.value)
            setPage(1)
          }}
          className="text-sm border border-ww-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-ww-primary/30 outline-none max-w-[200px]"
        >
          <option value="">All Partners</option>
          {developers.map(d => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Competitive only toggle */}
        <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={competitiveOnly}
            onChange={e => {
              setCompetitiveOnly(e.target.checked)
              setPage(1)
            }}
            className="rounded border-ww-gray-300"
          />
          <AlertTriangle size={13} className="text-ww-red" />
          <span className="text-ww-gray-700">Competitive only</span>
        </label>

        {/* Date range */}
        <div className="flex items-center gap-1.5 text-sm">
          <input
            type="date"
            value={dateFrom}
            onChange={e => {
              setDateFrom(e.target.value)
              setPage(1)
            }}
            className="border border-ww-gray-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-ww-primary/30 outline-none"
          />
          <span className="text-ww-gray-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => {
              setDateTo(e.target.value)
              setPage(1)
            }}
            className="border border-ww-gray-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-ww-primary/30 outline-none"
          />
        </div>
      </div>

      {/* Results count */}
      <p className="text-[12px] font-mono text-ww-gray-400">
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== applications.length ? ` of ${applications.length}` : ''}
      </p>

      {/* Table */}
      <div className="border border-ww-gray-200 rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ww-gray-50 border-b border-ww-gray-200">
              {(
                [
                  ['customerName', 'Customer'],
                  ['developerName', 'Developer / Partner'],
                  ['wwProduct', 'Product'],
                  ['useCase', 'Use Case'],
                  ['resellIntent', 'Resell'],
                  ['signatureDate', 'Signed'],
                  ['sfCaseNumber', 'SF Case'],
                ] as [SortField, string][]
              ).map(([field, label]) => (
                <th
                  key={field}
                  className="px-3 py-2 text-left text-[11px] font-mono text-ww-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-ww-navy"
                  onClick={() => toggleSort(field)}
                >
                  <span className="flex items-center gap-1">
                    {label}
                    <SortIcon field={field} />
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-ww-gray-400">
                  No applications match the current filters.
                </td>
              </tr>
            ) : (
              pageItems.map(app => {
                const isCompetitive = isCompetitiveVendor(app.developerName)
                const competitiveMatch = matchesCompetitiveVendor(app.developerName)
                const isExpanded = expandedId === app.id
                const resell =
                  app.customerIntendToResell ?? app.developerIntendToResell

                return (
                  <tr key={app.id} className="group">
                    {/* Row */}
                    <td
                      colSpan={8}
                      className="p-0"
                    >
                      <div
                        className={`flex cursor-pointer ${
                          isCompetitive ? 'bg-amber-50 hover:bg-amber-100/60' : 'hover:bg-ww-gray-50'
                        } ${isExpanded ? 'border-b border-ww-gray-100' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      >
                        {/* Customer */}
                        <div className="flex-[2] px-3 py-2.5 min-w-0">
                          <p className="font-medium text-ww-navy truncate">
                            {app.customerName || '—'}
                          </p>
                        </div>
                        {/* Developer */}
                        <div className="flex-[2] px-3 py-2.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{app.developerName || '—'}</span>
                            {isCompetitive && (
                              <span className="shrink-0 text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                {competitiveMatch}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Product */}
                        <div className="flex-[1] px-3 py-2.5 min-w-0">
                          <span className="text-ww-gray-600 truncate">{app.wwProduct || '—'}</span>
                        </div>
                        {/* Use Case */}
                        <div className="flex-[2] px-3 py-2.5 min-w-0">
                          <span className="text-ww-gray-600 truncate block max-w-[200px]">
                            {app.useCase ? (app.useCase.length > 60 ? app.useCase.slice(0, 60) + '...' : app.useCase) : '—'}
                          </span>
                        </div>
                        {/* Resell */}
                        <div className="flex-[0.7] px-3 py-2.5">
                          {resell === true && (
                            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                              Yes
                            </span>
                          )}
                          {resell === false && (
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                              No
                            </span>
                          )}
                          {resell === null && (
                            <span className="text-ww-gray-300">—</span>
                          )}
                        </div>
                        {/* Signed */}
                        <div className="flex-[1] px-3 py-2.5">
                          <span className="text-ww-gray-500 font-mono text-[12px]">
                            {app.signatureDate || '—'}
                          </span>
                        </div>
                        {/* SF Case */}
                        <div className="flex-[1] px-3 py-2.5">
                          <span className="text-ww-gray-500 font-mono text-[12px]">
                            {app.sfCaseNumber || '—'}
                          </span>
                        </div>
                        {/* Confidence dot + expand */}
                        <div className="w-12 px-3 py-2.5 flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${confidenceColor(app.extractionConfidence)}`}
                            title={`Extraction confidence: ${app.extractionConfidence}`}
                          />
                          {isExpanded ? (
                            <ChevronUp size={14} className="text-ww-gray-400" />
                          ) : (
                            <ChevronDown size={14} className="text-ww-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-4 py-4 bg-ww-gray-50 border-b border-ww-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            {/* Customer details */}
                            <div className="space-y-2">
                              <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">
                                Customer Details
                              </h4>
                              <DetailRow label="Company" value={app.customerName} />
                              <DetailRow label="Contact" value={app.customerContactName} />
                              <DetailRow label="Email" value={app.customerContactEmail} />
                              <DetailRow label="Phone" value={app.customerContactPhone} />
                              <DetailRow label="Address" value={app.customerAddress} />
                              <DetailRow label="Company Key" value={app.customerCompanyKey} />
                              <DetailRow label="Subsidiaries" value={app.subsidiaries} />
                              <DetailRow
                                label="Resell Intent"
                                value={
                                  app.customerIntendToResell === true
                                    ? 'Yes'
                                    : app.customerIntendToResell === false
                                      ? 'No'
                                      : null
                                }
                              />
                            </div>

                            {/* Developer details */}
                            <div className="space-y-2">
                              <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">
                                Developer / Partner
                              </h4>
                              <DetailRow label="Company" value={app.developerName} />
                              <DetailRow label="Contact" value={app.developerContactName} />
                              <DetailRow label="Email" value={app.developerContactEmail} />
                              <DetailRow label="Phone" value={app.developerContactPhone} />
                              <DetailRow label="Product" value={app.externalProduct} />
                              <DetailRow
                                label="Resell Intent"
                                value={
                                  app.developerIntendToResell === true
                                    ? 'Yes'
                                    : app.developerIntendToResell === false
                                      ? 'No'
                                      : null
                                }
                              />
                            </div>

                            {/* Application details */}
                            <div className="space-y-2">
                              <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">
                                Application Details
                              </h4>
                              <DetailRow label="WW Product" value={app.wwProduct} />
                              <DetailRow
                                label="WW Customer"
                                value={
                                  app.isWwCustomer === true
                                    ? 'Yes'
                                    : app.isWwCustomer === false
                                      ? 'No'
                                      : null
                                }
                              />
                              <DetailRow label="Target Launch" value={app.targetLaunchDate} />
                              <DetailRow label="Signed" value={app.signatureDate} />
                              <DetailRow label="SF Case" value={app.sfCaseNumber} />
                              <DetailRow label="SF Object" value={app.sfObjectId} />
                              <DetailRow label="Form Version" value={app.formVersion} />
                              <DetailRow label="Source File" value={app.sourceFile} />
                            </div>
                          </div>

                          {/* Use case — full text */}
                          {app.useCase && (
                            <div className="mt-4">
                              <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider mb-1">
                                Use Case
                              </h4>
                              <p className="text-sm text-ww-gray-700 whitespace-pre-wrap bg-white border border-ww-gray-200 rounded p-3">
                                {app.useCase}
                              </p>
                            </div>
                          )}

                          {/* Extraction notes */}
                          {app.extractionNotes && (
                            <div className="mt-3">
                              <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider mb-1">
                                Extraction Notes
                              </h4>
                              <p className="text-sm text-ww-gray-500 italic">{app.extractionNotes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-mono text-ww-gray-400">
            Page {safePage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 rounded border border-ww-gray-200 hover:bg-ww-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            {/* Page numbers — show up to 7 */}
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (safePage <= 4) {
                pageNum = i + 1
              } else if (safePage >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = safePage - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded text-sm font-medium ${
                    pageNum === safePage
                      ? 'bg-ww-primary text-white'
                      : 'hover:bg-ww-gray-50 text-ww-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded border border-ww-gray-200 hover:bg-ww-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Detail row helper ───────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <span className="text-ww-gray-400 w-24 shrink-0 text-[12px]">{label}</span>
      <span className="text-ww-gray-700 text-[13px]">{value || '—'}</span>
    </div>
  )
}
