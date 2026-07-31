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
  | 'signatureDate'
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

  const filtered = useMemo(() => {
    let result = [...applications]

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

    if (productFilter) {
      result = result.filter(a => a.wwProduct === productFilter)
    }
    if (developerFilter) {
      result = result.filter(a => a.developerName === developerFilter)
    }
    if (competitiveOnly) {
      result = result.filter(a => isCompetitiveVendor(a.developerName))
    }
    if (dateFrom) {
      result = result.filter(a => a.signatureDate && a.signatureDate >= dateFrom)
    }
    if (dateTo) {
      result = result.filter(a => a.signatureDate && a.signatureDate <= dateTo)
    }

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

  // Column grid: Customer 28% | Developer 28% | Product 16% | Use Case 28%
  const gridCols = 'grid-cols-[28%_28%_16%_28%]'

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
        {([
          { label: 'Total Applications', value: stats.total, highlight: false, action: () => { setCompetitiveOnly(false); setProductFilter(''); setDeveloperFilter(''); setSearchQuery(''); setDateFrom(''); setDateTo(''); setPage(1) } },
          { label: 'Unique Customers', value: stats.customers, highlight: false, action: () => { setSortField('customerName'); setSortDir('asc'); setPage(1) } },
          { label: 'Unique Partners', value: stats.developers, highlight: false, action: () => { setSortField('developerName'); setSortDir('asc'); setPage(1) } },
          { label: 'Competitive Vendors', value: stats.competitive, highlight: true, action: () => { setCompetitiveOnly(v => !v); setPage(1) } },
          { label: 'Resell Intent', value: `${stats.resellPct}%`, highlight: false, action: () => { setSortField('resellIntent'); setSortDir('desc'); setPage(1) } },
        ]).map(s => (
          <button
            key={s.label}
            onClick={s.action}
            className={`rounded-lg border px-4 py-3 text-left transition-all ${
              s.highlight
                ? `border-ww-red/30 ${competitiveOnly ? 'bg-red-100 ring-2 ring-ww-red/30' : 'bg-red-50'} hover:bg-red-100`
                : 'border-ww-gray-200 bg-white hover:bg-ww-gray-50 hover:border-ww-gray-300'
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
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-ww-gray-50 border border-ww-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-1.5 text-ww-gray-400">
          <Filter size={14} />
          <span className="text-[11px] font-mono uppercase tracking-wider">Filters</span>
        </div>

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
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

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
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

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
      <div className="border border-ww-gray-200 rounded-lg bg-white overflow-hidden">
        {/* Header */}
        <div className={`grid ${gridCols} bg-ww-gray-50 border-b border-ww-gray-200`}>
          {(
            [
              ['customerName', 'Customer'],
              ['developerName', 'Developer / Partner'],
              ['wwProduct', 'Product'],
            ] as [SortField, string][]
          ).map(([field, label]) => (
            <button
              key={field}
              className="px-3 py-2 text-left text-[11px] font-mono text-ww-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-ww-navy flex items-center gap-1"
              onClick={() => toggleSort(field)}
            >
              {label}
              <SortIcon field={field} />
            </button>
          ))}
          <div className="px-3 py-2 text-left text-[11px] font-mono text-ww-gray-500 uppercase tracking-wider">
            Use Case
          </div>
        </div>

        {/* Rows */}
        {pageItems.length === 0 ? (
          <div className="px-3 py-12 text-center text-ww-gray-400 text-sm">
            No applications match the current filters.
          </div>
        ) : (
          pageItems.map(app => {
            const isCompetitive = isCompetitiveVendor(app.developerName)
            const competitiveMatch = matchesCompetitiveVendor(app.developerName)
            const isExpanded = expandedId === app.id
            const resell = app.customerIntendToResell ?? app.developerIntendToResell

            return (
              <div key={app.id} className="border-b border-ww-gray-100 last:border-b-0">
                <div
                  className={`grid ${gridCols} cursor-pointer items-center ${
                    isCompetitive ? 'bg-amber-50 hover:bg-amber-100/60' : 'hover:bg-ww-gray-50'
                  }`}
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                >
                  {/* Customer */}
                  <div className="px-3 py-2.5 min-w-0 overflow-hidden">
                    <p className="font-medium text-ww-navy truncate text-sm">
                      {app.customerName || '—'}
                    </p>
                  </div>
                  {/* Developer */}
                  <div className="px-3 py-2.5 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate text-sm">{app.developerName || '—'}</span>
                      {isCompetitive && (
                        <span className="shrink-0 text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          {competitiveMatch}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Product */}
                  <div className="px-3 py-2.5 min-w-0 overflow-hidden">
                    <span className="text-ww-gray-600 truncate block text-sm">{app.wwProduct || '—'}</span>
                  </div>
                  {/* Use Case */}
                  <div className="px-3 py-2.5 min-w-0 overflow-hidden flex items-center gap-2">
                    <span className="text-ww-gray-600 truncate text-sm flex-1 min-w-0">
                      {app.useCase || '—'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {resell === true && (
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1 py-0.5 rounded" title="Resell: Yes">
                          R
                        </span>
                      )}
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${confidenceColor(app.extractionConfidence)}`}
                        title={`Confidence: ${app.extractionConfidence}`}
                      />
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-ww-gray-400" />
                      ) : (
                        <ChevronDown size={14} className="text-ww-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 py-4 bg-ww-gray-50 border-t border-ww-gray-200">
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
                        <DetailRow label="Signed" value={app.signatureDate} />
                        <DetailRow label="Target Launch" value={app.targetLaunchDate} />
                        <DetailRow label="SF Case" value={app.sfCaseNumber} />
                        <DetailRow label="SF Object" value={app.sfObjectId} />
                        <DetailRow label="Form Version" value={app.formVersion} />
                        <DetailRow label="Confidence" value={app.extractionConfidence} />
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
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pb-4">
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

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <span className="text-ww-gray-400 w-24 shrink-0 text-[12px]">{label}</span>
      <span className="text-ww-gray-700 text-[13px] break-words min-w-0">{value || '—'}</span>
    </div>
  )
}
