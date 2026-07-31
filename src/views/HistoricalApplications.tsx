import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Filter,
  FileText,
  Bot,
  Send,
  Loader2,
  X,
  Trash2,
} from 'lucide-react'
import type { HistoricalApplication } from '@/data/types'
import { COMPETITIVE_VENDORS, normalizeProductName } from '@/data/types'
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

  // Agent state
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentQuestion, setAgentQuestion] = useState('')
  const [agentMessages, setAgentMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState('')
  const [agentUsage, setAgentUsage] = useState<{ dailySpentCents: number; dailyBudgetCents: number } | null>(null)
  const agentInputRef = useRef<HTMLTextAreaElement>(null)
  const agentScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (agentScrollRef.current) {
      agentScrollRef.current.scrollTop = agentScrollRef.current.scrollHeight
    }
  }, [agentMessages, agentLoading])

  const askAgent = async () => {
    const q = agentQuestion.trim()
    if (!q || agentLoading) return
    setAgentMessages(prev => [...prev, { role: 'user', text: q }])
    setAgentQuestion('')
    setAgentLoading(true)
    setAgentError('')
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAgentError(data.error || 'Request failed')
      } else {
        setAgentMessages(prev => [...prev, { role: 'assistant', text: data.answer }])
        if (data.usage) setAgentUsage(data.usage)
      }
    } catch {
      setAgentError('Failed to connect to server')
    } finally {
      setAgentLoading(false)
      setTimeout(() => agentInputRef.current?.focus(), 50)
    }
  }

  const products = useMemo(() => {
    const set = new Set<string>()
    for (const app of applications) {
      set.add(normalizeProductName(app.wwProduct))
    }
    return Array.from(set).filter(v => v !== 'Unknown').sort()
  }, [])
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
      result = result.filter(a => normalizeProductName(a.wwProduct) === productFilter)
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
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={20} className="text-ww-primary" />
            <h1 className="text-xl font-display font-bold text-ww-navy">Historical Applications</h1>
          </div>
          <p className="text-sm text-ww-gray-500">
            {applications.length} API Developer Applications extracted from Salesforce
          </p>
        </div>
        <button
          onClick={() => {
            setAgentOpen(o => !o)
            if (!agentOpen) setTimeout(() => agentInputRef.current?.focus(), 100)
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
            agentOpen
              ? 'bg-ww-primary text-white border-ww-primary'
              : 'border-ww-primary/30 text-ww-primary bg-ww-primary/5 hover:bg-ww-primary/10'
          }`}
        >
          <Bot size={15} />
          Ask the Agent
        </button>
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

      {/* Ask the Agent panel */}
      {agentOpen && (
        <div className="rounded-lg border border-ww-primary/30 bg-white overflow-hidden flex flex-col" style={{ maxHeight: '480px' }}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-2 bg-ww-primary/5 border-b border-ww-primary/10 shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-ww-primary" />
              <span className="text-sm font-display font-bold text-ww-navy">Ask the Agent</span>
              {agentUsage && (
                <span className="text-[10px] font-mono text-ww-gray-400">
                  ${((agentUsage.dailyBudgetCents - agentUsage.dailySpentCents) / 100).toFixed(2)} remaining today
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {agentMessages.length > 0 && (
                <button
                  onClick={() => { setAgentMessages([]); setAgentError('') }}
                  className="p-1 rounded hover:bg-ww-gray-100 text-ww-gray-400 hover:text-ww-gray-600 transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setAgentOpen(false)}
                className="p-1 rounded hover:bg-ww-gray-100 text-ww-gray-400 hover:text-ww-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Conversation area */}
          <div ref={agentScrollRef} className="flex-1 overflow-y-auto min-h-0">
            {agentMessages.length === 0 && !agentLoading ? (
              /* Quick questions — shown only when empty */
              <div className="p-4">
                <p className="text-xs text-ww-gray-400 mb-2">Try a question:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'List all competitive vendor applications',
                    'Which customers have resell intent?',
                    'Summarize the top 10 developers by volume',
                    'Any customers working with multiple competitors?',
                  ].map(q => (
                    <button
                      key={q}
                      onClick={() => {
                        setAgentQuestion(q)
                        setTimeout(() => agentInputRef.current?.focus(), 50)
                      }}
                      className="text-[11px] px-2 py-1 rounded-full border border-ww-gray-200 text-ww-gray-500 hover:border-ww-primary/30 hover:text-ww-primary hover:bg-ww-primary/5 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Chat messages */
              <div className="p-3 space-y-3">
                {agentMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-ww-primary text-white'
                          : 'bg-ww-gray-50 border border-ww-gray-200 text-ww-gray-700'
                      }`}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    </div>
                  </div>
                ))}
                {agentLoading && (
                  <div className="flex justify-start">
                    <div className="bg-ww-gray-50 border border-ww-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-ww-gray-400">
                      <Loader2 size={14} className="animate-spin" />
                      Analyzing {applications.length} applications...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {agentError && (
            <div className="mx-3 mb-2 px-3 py-2 rounded bg-red-50 border border-red-200 text-sm text-red-700 shrink-0">
              {agentError}
            </div>
          )}

          {/* Input — always at bottom */}
          <div className="border-t border-ww-gray-100 px-3 py-2 shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={agentInputRef}
                value={agentQuestion}
                onChange={e => setAgentQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    askAgent()
                  }
                }}
                placeholder={agentMessages.length > 0 ? 'Ask a follow-up...' : 'Ask about the application data...'}
                rows={1}
                className="flex-1 px-3 py-2 text-sm border border-ww-gray-200 rounded resize-none focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
              />
              <button
                onClick={askAgent}
                disabled={agentLoading || !agentQuestion.trim()}
                className="px-3 py-2 rounded bg-ww-primary text-white text-sm hover:bg-ww-primary-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 self-end"
              >
                {agentLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <span className="text-ww-gray-600 truncate block text-sm">{normalizeProductName(app.wwProduct)}</span>
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
                        <DetailRow label="WW Product" value={normalizeProductName(app.wwProduct)} />
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
