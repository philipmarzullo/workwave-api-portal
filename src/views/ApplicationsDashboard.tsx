import { useState, useMemo, useRef, useEffect } from 'react'
import {
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Eye,
  Send,
  Loader2,
  X,
  Trash2,
} from 'lucide-react'
import { WaiveIcon } from '@/components/WaiveIcon'
import type { HistoricalApplication } from '@/data/types'
import { COMPETITIVE_VENDORS, normalizeProductName } from '@/data/types'
import rawApplications from '@/data/extracted-applications.json'

const applications = rawApplications as HistoricalApplication[]

function isCompetitiveVendor(name: string | null): boolean {
  if (!name) return false
  const lower = name.toLowerCase()
  return COMPETITIVE_VENDORS.some(v => lower.includes(v.toLowerCase()))
}

function matchCompetitiveVendor(name: string | null): string | null {
  if (!name) return null
  const lower = name.toLowerCase()
  return COMPETITIVE_VENDORS.find(v => lower.includes(v.toLowerCase())) ?? null
}

export function ApplicationsDashboard({ hideHeader = false }: { hideHeader?: boolean }) {
  // ── Summary stats ──
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
      competitivePct: applications.length > 0 ? Math.round((competitive / applications.length) * 100) : 0,
      resellYes,
      resellPct: resellAnswered > 0 ? Math.round((resellYes / resellAnswered) * 100) : 0,
    }
  }, [])

  // ── Competitive vendor breakdown ──
  const competitiveBreakdown = useMemo(() => {
    const vendorMap = new Map<
      string,
      {
        vendor: string
        count: number
        customers: Set<string>
        products: Set<string>
        resellYes: number
        applications: HistoricalApplication[]
      }
    >()

    // Initialize all known vendors
    for (const v of COMPETITIVE_VENDORS) {
      vendorMap.set(v, {
        vendor: v,
        count: 0,
        customers: new Set(),
        products: new Set(),
        resellYes: 0,
        applications: [],
      })
    }

    for (const app of applications) {
      const match = matchCompetitiveVendor(app.developerName)
      if (!match) continue
      const entry = vendorMap.get(match)!
      entry.count++
      if (app.customerName) entry.customers.add(app.customerName)
      if (app.wwProduct) entry.products.add(normalizeProductName(app.wwProduct))
      if (app.customerIntendToResell === true || app.developerIntendToResell === true) {
        entry.resellYes++
      }
      entry.applications.push(app)
    }

    return Array.from(vendorMap.values()).sort((a, b) => b.count - a.count)
  }, [])

  // ── Distribution data ──
  const productDistribution = useMemo(() => {
    const counts = new Map<string, number>()
    for (const app of applications) {
      const key = normalizeProductName(app.wwProduct)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
  }, [])

  const developerDistribution = useMemo(() => {
    const counts = new Map<string, number>()
    for (const app of applications) {
      const key = app.developerName || 'Unknown'
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
  }, [])

  const yearDistribution = useMemo(() => {
    const counts = new Map<string, number>()
    for (const app of applications) {
      if (app.signatureDate) {
        const year = app.signatureDate.slice(0, 4)
        if (/^\d{4}$/.test(year)) {
          counts.set(year, (counts.get(year) || 0) + 1)
        }
      }
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [])

  const resellDistribution = useMemo(() => {
    let yes = 0
    let no = 0
    let unanswered = 0
    for (const app of applications) {
      const resell = app.customerIntendToResell ?? app.developerIntendToResell
      if (resell === true) yes++
      else if (resell === false) no++
      else unanswered++
    }
    return { yes, no, unanswered, total: applications.length }
  }, [])

  // ── Risk flags ──
  const riskFlags = useMemo(() => {
    const contradictory: HistoricalApplication[] = []
    const lowConfidence: HistoricalApplication[] = []
    const noDeveloper: HistoricalApplication[] = []

    for (const app of applications) {
      // Contradictory resell intent
      if (
        app.customerIntendToResell !== null &&
        app.developerIntendToResell !== null &&
        app.customerIntendToResell !== app.developerIntendToResell
      ) {
        contradictory.push(app)
      }
      if (app.extractionConfidence === 'low') {
        lowConfidence.push(app)
      }
      if (!app.developerName) {
        noDeveloper.push(app)
      }
    }

    return { contradictory, lowConfidence, noDeveloper }
  }, [])

  // ── Agent state ──
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

  // ── Section refs for card click-through ──
  const competitiveRef = useRef<HTMLElement>(null)
  const chartsRef = useRef<HTMLElement>(null)
  const riskRef = useRef<HTMLElement>(null)

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="py-8 space-y-8">
      {/* Header */}
      {!hideHeader && (
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={20} className="text-ww-primary" />
            <h1 className="text-xl font-display font-bold text-ww-navy">
              Applications Analytics
            </h1>
          </div>
          <p className="text-sm text-ww-gray-500">
            Competitive risk analysis and application distribution insights
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
          <WaiveIcon size={15} />
          Ask WAIve
        </button>
      </div>
      )}

      {/* A. Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard label="Total Applications" value={stats.total} onClick={() => scrollTo(chartsRef)} />
        <SummaryCard label="Unique Customers" value={stats.customers} onClick={() => scrollTo(chartsRef)} />
        <SummaryCard label="Unique Partners" value={stats.developers} onClick={() => scrollTo(chartsRef)} />
        <SummaryCard
          label="Competitive Vendor"
          value={`${stats.competitive}`}
          sub={`${stats.competitivePct}%`}
          variant="danger"
          onClick={() => scrollTo(competitiveRef)}
        />
        <SummaryCard
          label="Resell Intent (Yes)"
          value={`${stats.resellYes}`}
          sub={`${stats.resellPct}%`}
          variant="warning"
          onClick={() => scrollTo(riskRef)}
        />
      </div>

      {/* Ask WAIve panel */}
      {agentOpen && (
        <div className="rounded-lg border border-ww-primary/30 bg-white overflow-hidden flex flex-col" style={{ maxHeight: '480px' }}>
          <div className="flex items-center justify-between px-4 py-2 bg-ww-primary/5 border-b border-ww-primary/10 shrink-0">
            <div className="flex items-center gap-2">
              <WaiveIcon size={14} />
              <span className="text-sm font-display font-bold text-ww-navy">Ask WAIve</span>
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

          <div ref={agentScrollRef} className="flex-1 overflow-y-auto min-h-0">
            {agentMessages.length === 0 && !agentLoading ? (
              <div className="p-4">
                <p className="text-xs text-ww-gray-400 mb-2">Try a question:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Which competitive vendors have the most applications?',
                    'What products are competitive vendors targeting?',
                    'Summarize the resell intent patterns',
                    'Which risk flags should I prioritize?',
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

          {agentError && (
            <div className="mx-3 mb-2 px-3 py-2 rounded bg-red-50 border border-red-200 text-sm text-red-700 shrink-0">
              {agentError}
            </div>
          )}

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
                placeholder={agentMessages.length > 0 ? 'Ask a follow-up...' : 'Ask WAIve about the analytics data...'}
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

      {/* B. Competitive Vendor Breakdown */}
      <section ref={competitiveRef}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-ww-red" />
          <h2 className="text-lg font-display font-bold text-ww-navy">
            Competitive Vendor Breakdown
          </h2>
        </div>
        <CompetitiveTable data={competitiveBreakdown} />
      </section>

      {/* C. Distribution Charts */}
      <section ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Product */}
        <div className="border border-ww-gray-200 rounded-lg p-4 bg-white">
          <h3 className="text-sm font-display font-bold text-ww-navy mb-3">By Product</h3>
          <BarChart
            data={productDistribution}
            maxValue={Math.max(...productDistribution.map(d => d[1]), 1)}
            color="bg-ww-primary"
          />
        </div>

        {/* By Developer */}
        <div className="border border-ww-gray-200 rounded-lg p-4 bg-white">
          <h3 className="text-sm font-display font-bold text-ww-navy mb-3">
            Top 15 Partners by Application Count
          </h3>
          <BarChart
            data={developerDistribution}
            maxValue={Math.max(...developerDistribution.map(d => d[1]), 1)}
            color="bg-ww-teal"
            highlightCompetitive
          />
        </div>

        {/* By Year */}
        <div className="border border-ww-gray-200 rounded-lg p-4 bg-white">
          <h3 className="text-sm font-display font-bold text-ww-navy mb-3">
            Applications Over Time
          </h3>
          {yearDistribution.length > 0 ? (
            <BarChart
              data={yearDistribution}
              maxValue={Math.max(...yearDistribution.map(d => d[1]), 1)}
              color="bg-ww-navy"
            />
          ) : (
            <p className="text-sm text-ww-gray-400 py-4 text-center">
              No signature dates available
            </p>
          )}
        </div>

        {/* Resell Intent */}
        <div className="border border-ww-gray-200 rounded-lg p-4 bg-white">
          <h3 className="text-sm font-display font-bold text-ww-navy mb-3">Resell Intent</h3>
          <ResellChart data={resellDistribution} />
        </div>
      </section>

      {/* D. Risk Flags */}
      <section ref={riskRef}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-ww-amber" />
          <h2 className="text-lg font-display font-bold text-ww-navy">Risk Flags</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RiskCard
            title="Contradictory Resell Intent"
            description="Customer and developer gave opposite resell answers"
            items={riskFlags.contradictory}
            color="border-l-ww-red"
          />
          <RiskCard
            title="Low Extraction Confidence"
            description="May need manual review"
            items={riskFlags.lowConfidence}
            color="border-l-ww-amber"
          />
          <RiskCard
            title="No Developer Identified"
            description="Developer/partner name not found in PDF"
            items={riskFlags.noDeveloper}
            color="border-l-ww-gray-400"
          />
        </div>
      </section>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  variant,
  onClick,
}: {
  label: string
  value: string | number
  sub?: string
  variant?: 'danger' | 'warning'
  onClick?: () => void
}) {
  const borderClass =
    variant === 'danger'
      ? 'border-ww-red/30 bg-red-50 hover:bg-red-100'
      : variant === 'warning'
        ? 'border-ww-amber/30 bg-amber-50 hover:bg-amber-100'
        : 'border-ww-gray-200 bg-white hover:bg-ww-gray-50 hover:border-ww-gray-300'
  const textClass =
    variant === 'danger'
      ? 'text-ww-red'
      : variant === 'warning'
        ? 'text-ww-amber'
        : 'text-ww-navy'

  return (
    <button onClick={onClick} className={`rounded-lg border px-4 py-3 text-left transition-all ${borderClass}`}>
      <p className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <p className={`text-xl font-display font-bold ${textClass}`}>{value}</p>
        {sub && <span className="text-sm text-ww-gray-400">{sub}</span>}
      </div>
    </button>
  )
}

function CompetitiveTable({
  data,
}: {
  data: {
    vendor: string
    count: number
    customers: Set<string>
    products: Set<string>
    resellYes: number
    applications: HistoricalApplication[]
  }[]
}) {
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null)

  return (
    <div className="border border-ww-gray-200 rounded-lg overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-red-50 border-b border-ww-gray-200">
            <th className="px-3 py-2 text-left text-[11px] font-mono text-ww-gray-500 uppercase tracking-wider">
              Vendor
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-mono text-ww-gray-500 uppercase tracking-wider">
              Applications
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-mono text-ww-gray-500 uppercase tracking-wider">
              Customers
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-mono text-ww-gray-500 uppercase tracking-wider">
              Products
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-mono text-ww-gray-500 uppercase tracking-wider">
              Resell Intent
            </th>
            <th className="px-3 py-2 w-8" />
          </tr>
        </thead>
        <tbody>
          {data.map(row => {
            const isExpanded = expandedVendor === row.vendor
            return (
              <tr key={row.vendor}>
                <td colSpan={6} className="p-0">
                  <div
                    className={`flex items-center cursor-pointer hover:bg-red-50/50 ${
                      row.count > 0 ? '' : 'opacity-50'
                    }`}
                    onClick={() =>
                      setExpandedVendor(isExpanded ? null : row.vendor)
                    }
                  >
                    <div className="flex-[2] px-3 py-2.5">
                      <span className="font-medium text-ww-navy flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-ww-red" />
                        {row.vendor}
                      </span>
                    </div>
                    <div className="flex-[1] px-3 py-2.5">
                      <span className="font-mono font-bold text-ww-navy">{row.count}</span>
                    </div>
                    <div className="flex-[2] px-3 py-2.5">
                      <span className="text-ww-gray-600 text-[12px]">
                        {row.count > 0
                          ? Array.from(row.customers).slice(0, 3).join(', ') +
                            (row.customers.size > 3 ? ` +${row.customers.size - 3} more` : '')
                          : '—'}
                      </span>
                    </div>
                    <div className="flex-[1] px-3 py-2.5">
                      <span className="text-ww-gray-600 text-[12px]">
                        {row.count > 0 ? Array.from(row.products).join(', ') : '—'}
                      </span>
                    </div>
                    <div className="flex-[1] px-3 py-2.5">
                      {row.resellYes > 0 ? (
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          {row.resellYes} Yes
                        </span>
                      ) : (
                        <span className="text-ww-gray-300">—</span>
                      )}
                    </div>
                    <div className="w-8 px-2 py-2.5">
                      {row.count > 0 &&
                        (isExpanded ? (
                          <ChevronUp size={14} className="text-ww-gray-400" />
                        ) : (
                          <ChevronDown size={14} className="text-ww-gray-400" />
                        ))}
                    </div>
                  </div>

                  {/* Expanded: list individual applications */}
                  {isExpanded && row.applications.length > 0 && (
                    <div className="bg-red-50/30 border-t border-ww-gray-100 px-6 py-3">
                      <div className="space-y-2">
                        {row.applications.map(app => (
                          <div
                            key={app.id}
                            className="flex items-center gap-4 text-[12px] py-1.5 border-b border-ww-gray-100 last:border-0"
                          >
                            <span className="font-medium text-ww-navy w-48 truncate">
                              {app.customerName || 'Unknown'}
                            </span>
                            <span className="text-ww-gray-500 w-24">
                              {normalizeProductName(app.wwProduct)}
                            </span>
                            <span className="text-ww-gray-500 flex-1 truncate">
                              {app.useCase
                                ? app.useCase.length > 80
                                  ? app.useCase.slice(0, 80) + '...'
                                  : app.useCase
                                : '—'}
                            </span>
                            <span className="text-ww-gray-400 font-mono w-28">
                              {app.signatureDate || '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function BarChart({
  data,
  maxValue,
  color,
  highlightCompetitive,
}: {
  data: [string, number][]
  maxValue: number
  color: string
  highlightCompetitive?: boolean
}) {
  return (
    <div className="space-y-1.5">
      {data.map(([label, count]) => {
        const pct = maxValue > 0 ? (count / maxValue) * 100 : 0
        const competitive = highlightCompetitive && isCompetitiveVendor(label)
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`text-[12px] w-36 truncate text-right ${
                competitive ? 'text-ww-red font-semibold' : 'text-ww-gray-600'
              }`}
              title={label}
            >
              {competitive && (
                <AlertTriangle size={10} className="inline mr-1 text-ww-red" />
              )}
              {label}
            </span>
            <div className="flex-1 h-5 bg-ww-gray-100 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all ${
                  competitive ? 'bg-ww-red' : color
                }`}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className="text-[12px] font-mono text-ww-gray-500 w-8 text-right">
              {count}
            </span>
          </div>
        )
      })}
      {data.length === 0 && (
        <p className="text-sm text-ww-gray-400 py-4 text-center">No data available</p>
      )}
    </div>
  )
}

function ResellChart({
  data,
}: {
  data: { yes: number; no: number; unanswered: number; total: number }
}) {
  const { yes, no, unanswered, total } = data
  if (total === 0)
    return <p className="text-sm text-ww-gray-400 py-4 text-center">No data available</p>

  const segments = [
    { label: 'Yes', count: yes, pct: Math.round((yes / total) * 100), color: 'bg-ww-amber' },
    { label: 'No', count: no, pct: Math.round((no / total) * 100), color: 'bg-emerald-500' },
    {
      label: 'Unanswered',
      count: unanswered,
      pct: Math.round((unanswered / total) * 100),
      color: 'bg-ww-gray-300',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div className="h-8 flex rounded overflow-hidden">
        {segments.map(
          s =>
            s.pct > 0 && (
              <div
                key={s.label}
                className={`${s.color} flex items-center justify-center text-[11px] font-semibold text-white`}
                style={{ width: `${s.pct}%` }}
                title={`${s.label}: ${s.count} (${s.pct}%)`}
              >
                {s.pct >= 10 ? `${s.pct}%` : ''}
              </div>
            )
        )}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[12px]">
            <span className={`w-3 h-3 rounded-sm ${s.color}`} />
            <span className="text-ww-gray-600">
              {s.label}: {s.count} ({s.pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function RiskCard({
  title,
  description,
  items,
  color,
}: {
  title: string
  description: string
  items: HistoricalApplication[]
  color: string
}) {
  const [expanded, setExpanded] = useState(false)
  const displayItems = expanded ? items : items.slice(0, 5)

  return (
    <div className={`border border-ww-gray-200 rounded-lg bg-white border-l-4 ${color}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-display font-bold text-ww-navy">{title}</h4>
          <span className="text-lg font-display font-bold text-ww-navy">{items.length}</span>
        </div>
        <p className="text-[12px] text-ww-gray-400 mt-0.5">{description}</p>
      </div>
      {items.length > 0 && (
        <div className="border-t border-ww-gray-100 px-4 py-2">
          <div className="space-y-1">
            {displayItems.map(app => (
              <div key={app.id} className="flex items-center gap-2 text-[12px] py-0.5">
                <Eye size={10} className="text-ww-gray-300 shrink-0" />
                <span className="text-ww-gray-700 truncate">
                  {app.customerName || 'Unknown'}{' '}
                  {app.developerName ? `→ ${app.developerName}` : ''}
                </span>
              </div>
            ))}
          </div>
          {items.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-ww-primary hover:text-ww-primary-light font-medium mt-1.5 flex items-center gap-0.5"
            >
              {expanded ? 'Show less' : `Show all ${items.length}`}
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
