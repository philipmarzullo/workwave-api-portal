import { useState, useMemo, useRef } from 'react'
import {
  Radar,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Users,
  Layers,
  Activity,
} from 'lucide-react'
import {
  computeUsageIntelligence,
  DATA_CAT_LABELS,
  type CapabilitySignal,
  type NativeStatus,
} from '@/data/usage-intelligence'

// ── Helpers ──────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function statusBadge(status: NativeStatus): { label: string; className: string } {
  if (status === 'no') return { label: 'BUILD OPPORTUNITY', className: 'bg-amber-100 text-amber-800 font-semibold' }
  if (status === 'partial') return { label: 'ENHANCE', className: 'bg-blue-100 text-blue-700 font-semibold' }
  return { label: 'COVERED', className: 'bg-ww-gray-100 text-ww-gray-500' }
}

function rowBg(signal: CapabilitySignal): string {
  if (signal.group.nativeStatus === 'no' && signal.gapScore > 50) return 'bg-amber-50/60'
  if (signal.group.nativeStatus === 'partial') return 'bg-blue-50/40'
  return ''
}

// ── Component ────────────────────────────────────────────────────

export function UsageIntelligence() {
  const data = useMemo(() => computeUsageIntelligence(), [])

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  // Heatmap max for opacity scaling
  const heatmapMax = useMemo(
    () => Math.max(...data.heatmap.map(c => c.count), 1),
    [data.heatmap]
  )

  // Convergence: groups with 3+ distinct partners
  const convergenceGroups = useMemo(
    () => data.signals.filter(s => s.partners.length >= 3),
    [data.signals]
  )

  // Section refs for card click-through
  const gapTableRef = useRef<HTMLElement>(null)
  const heatmapRef = useRef<HTMLElement>(null)
  const convergenceRef = useRef<HTMLElement>(null)

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="py-8 space-y-6">
      {/* ── Section A: Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radar size={20} className="text-ww-primary" />
            <h1 className="text-xl font-display font-bold text-ww-navy">
              API Usage Intelligence
            </h1>
          </div>
          <p className="text-sm text-ww-gray-500">
            Identify product gaps from partner API usage patterns
          </p>
        </div>
      </div>

      {/* ── Section B: Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Layers size={14} className="text-ww-primary" />}
          label="Capability Groups"
          value={data.summaryStats.capabilityGroupCount}
          onClick={() => scrollTo(gapTableRef)}
        />
        <SummaryCard
          icon={<TrendingUp size={14} className="text-amber-600" />}
          label="Top Gap Signal"
          value={data.summaryStats.topGapSignalLabel}
          sub={`Score: ${data.summaryStats.topGapScore}`}
          variant="warning"
          onClick={() => {
            const topId = data.signals[0]?.group.id
            if (topId) setExpandedGroup(topId)
            scrollTo(gapTableRef)
          }}
        />
        <SummaryCard
          icon={<Users size={14} className="text-ww-teal" />}
          label="Partners Building Same Thing"
          value={data.summaryStats.partnersBuildingSameThing}
          sub="groups with 3+ partners"
          onClick={() => scrollTo(convergenceRef)}
        />
        <SummaryCard
          icon={<Activity size={14} className="text-ww-primary" />}
          label="Est. Monthly API Calls"
          value={fmtNum(data.summaryStats.estimatedMonthlyApiCalls)}
          sub="synthetic estimate"
          onClick={() => scrollTo(heatmapRef)}
        />
      </div>

      {/* ── Section C: Product Gap Signals Table ── */}
      <section ref={gapTableRef}>
        <h2 className="text-lg font-display font-bold text-ww-navy mb-3">Product Gap Signals</h2>
        <div className="border border-ww-gray-200 rounded-lg bg-white overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[140px_1fr_80px_90px_90px_100px_130px] bg-ww-gray-50 border-b border-ww-gray-200">
            {['Gap Score', 'Capability', 'Partners', 'Customers', 'Apps', 'Est. Volume', 'Native Status'].map(h => (
              <div key={h} className="px-3 py-2 text-[11px] font-mono text-ww-gray-500 uppercase tracking-wider">
                {h}
              </div>
            ))}
          </div>

          {/* Rows */}
          {data.signals.map(signal => {
            const badge = statusBadge(signal.group.nativeStatus)
            const isExpanded = expandedGroup === signal.group.id
            const maxScore = data.signals[0]?.gapScore || 1
            const barPct = Math.max((signal.gapScore / maxScore) * 100, 2)

            return (
              <div key={signal.group.id} className={`border-b border-ww-gray-100 last:border-b-0 ${rowBg(signal)}`}>
                <div
                  className="grid grid-cols-[140px_1fr_80px_90px_90px_100px_130px] items-center cursor-pointer hover:bg-black/[0.02] transition-colors"
                  onClick={() => setExpandedGroup(isExpanded ? null : signal.group.id)}
                >
                  {/* Gap Score bar + number */}
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    <div className="flex-1 h-4 bg-ww-gray-100 rounded overflow-hidden">
                      <div
                        className={`h-full rounded ${
                          signal.group.nativeStatus === 'no' ? 'bg-amber-500' :
                          signal.group.nativeStatus === 'partial' ? 'bg-blue-400' :
                          'bg-ww-gray-300'
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono font-bold text-ww-navy w-8 text-right shrink-0">
                      {signal.gapScore}
                    </span>
                  </div>

                  {/* Capability */}
                  <div className="px-3 py-2.5 flex items-center gap-2 min-w-0">
                    <span className="font-medium text-ww-navy text-sm truncate">{signal.group.label}</span>
                    {isExpanded
                      ? <ChevronUp size={14} className="text-ww-gray-400 shrink-0" />
                      : <ChevronDown size={14} className="text-ww-gray-400 shrink-0" />}
                  </div>

                  {/* Partners */}
                  <div className="px-3 py-2.5">
                    <span className="text-sm font-mono text-ww-navy">{signal.partners.length}</span>
                  </div>

                  {/* Customers */}
                  <div className="px-3 py-2.5">
                    <span className="text-sm font-mono text-ww-navy">{signal.customers.length}</span>
                  </div>

                  {/* Applications */}
                  <div className="px-3 py-2.5">
                    <span className="text-sm font-mono text-ww-navy">{signal.applicationCount}</span>
                  </div>

                  {/* Est. Volume */}
                  <div className="px-3 py-2.5">
                    <span className="text-sm font-mono text-ww-gray-600">{fmtNum(signal.estimatedVolume)}</span>
                  </div>

                  {/* Native Status */}
                  <div className="px-3 py-2.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 py-4 border-t border-ww-gray-200 bg-ww-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Top partners */}
                      <div>
                        <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider mb-2">
                          Top Partners Building This
                        </h4>
                        {signal.partnerDetails.length > 0 ? (
                          <div className="space-y-2">
                            {signal.partnerDetails.map(pd => (
                              <div key={pd.name} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-ww-navy truncate flex-1 min-w-0">{pd.name}</span>
                                <span className="text-[11px] font-mono text-ww-gray-500">{pd.appCount} apps</span>
                                <span className="text-[11px] font-mono text-ww-gray-400">{pd.customerCount} cust</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-ww-gray-400">No partner data</p>
                        )}
                      </div>

                      {/* Sample use cases */}
                      <div>
                        <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider mb-2">
                          Sample Use Cases
                        </h4>
                        {signal.sampleUseCases.length > 0 ? (
                          <div className="space-y-1.5">
                            {signal.sampleUseCases.map((uc, i) => (
                              <p key={i} className="text-[12px] text-ww-gray-600 bg-white border border-ww-gray-200 rounded px-2.5 py-1.5 leading-snug">
                                {uc}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-ww-gray-400">No use case samples</p>
                        )}
                      </div>

                      {/* Inferred data categories */}
                      <div>
                        <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider mb-2">
                          Data Categories Accessed
                        </h4>
                        {signal.inferredDataCategories.size > 0 ? (
                          <DataCategoryBars categories={signal.inferredDataCategories} />
                        ) : (
                          <p className="text-sm text-ww-gray-400">No data category info</p>
                        )}
                      </div>
                    </div>

                    {signal.group.nativeNote && (
                      <p className="mt-3 text-[11px] text-ww-gray-400">
                        WW native coverage: <span className="font-medium text-ww-gray-600">{signal.group.nativeNote}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Section D: Data Category Demand Heatmap ── */}
      <section ref={heatmapRef}>
        <h2 className="text-lg font-display font-bold text-ww-navy mb-3">Data Category Demand</h2>
        <p className="text-sm text-ww-gray-500 mb-4">
          Application count by data category and WW product. Darker cells indicate higher demand.
        </p>
        <div className="border border-ww-gray-200 rounded-lg bg-white overflow-x-auto">
          <div
            className="grid gap-0"
            style={{
              gridTemplateColumns: `160px repeat(${data.allProducts.length}, 1fr)`,
            }}
          >
            {/* Header row */}
            <div className="px-3 py-2 border-b border-r border-ww-gray-200 bg-ww-gray-50" />
            {data.allProducts.map(p => (
              <div
                key={p}
                className="px-2 py-2 text-[11px] font-mono text-ww-gray-500 uppercase tracking-wider text-center border-b border-r border-ww-gray-200 bg-ww-gray-50 last:border-r-0"
              >
                {p}
              </div>
            ))}

            {/* Data rows */}
            {data.allDataCategories.map(cat => (
              <>
                <div
                  key={`label-${cat}`}
                  className="px-3 py-2 text-[12px] font-medium text-ww-gray-700 border-b border-r border-ww-gray-100"
                >
                  {DATA_CAT_LABELS[cat] || cat}
                </div>
                {data.allProducts.map(product => {
                  const cell = data.heatmap.find(c => c.dataCategory === cat && c.product === product)
                  const count = cell?.count || 0
                  const opacity = count > 0 ? Math.max(0.1, Math.min(1, count / heatmapMax)) : 0
                  return (
                    <div
                      key={`${cat}-${product}`}
                      className="px-2 py-2 text-center border-b border-r border-ww-gray-100 last:border-r-0 relative group"
                      style={{
                        backgroundColor: count > 0 ? `rgba(15, 149, 164, ${opacity})` : undefined,
                      }}
                      title={`${DATA_CAT_LABELS[cat] || cat} × ${product}: ${count}`}
                    >
                      {count > 0 && (
                        <span className={`text-[11px] font-mono ${opacity > 0.5 ? 'text-white' : 'text-ww-teal'} font-medium`}>
                          {count}
                        </span>
                      )}
                      <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-ww-navy text-white text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {DATA_CAT_LABELS[cat] || cat} × {product}: {count}
                      </div>
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section E: Partner Convergence Cards ── */}
      {convergenceGroups.length > 0 && (
        <section ref={convergenceRef}>
          <h2 className="text-lg font-display font-bold text-ww-navy mb-3">Partner Convergence</h2>
          <p className="text-sm text-ww-gray-500 mb-4">
            Capability areas where 3+ distinct partners are building the same thing — strongest signals for native product investment.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {convergenceGroups.map(signal => {
              const badge = statusBadge(signal.group.nativeStatus)
              const maxApps = Math.max(...signal.partnerDetails.map(p => p.appCount), 1)
              return (
                <div
                  key={signal.group.id}
                  className={`border border-ww-gray-200 rounded-lg bg-white overflow-hidden ${
                    signal.group.nativeStatus === 'no' ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-blue-300'
                  }`}
                >
                  <div className="px-4 py-3 border-b border-ww-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-display font-bold text-ww-navy">{signal.group.label}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-ww-gray-500">
                      {signal.partners.length} partners &middot; {signal.customers.length} customers &middot; {signal.applicationCount} applications
                    </p>
                  </div>

                  <div className="px-4 py-3 space-y-1.5">
                    {signal.partnerDetails.map(pd => {
                      const barPct = Math.max((pd.appCount / maxApps) * 100, 4)
                      return (
                        <div key={pd.name} className="flex items-center gap-2">
                          <span className="text-[12px] text-ww-gray-700 w-36 truncate shrink-0">{pd.name}</span>
                          <div className="flex-1 h-3.5 bg-ww-gray-100 rounded overflow-hidden">
                            <div
                              className={`h-full rounded ${signal.group.nativeStatus === 'no' ? 'bg-amber-400' : 'bg-blue-400'}`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-ww-gray-500 w-12 text-right">{pd.appCount}</span>
                        </div>
                      )
                    })}
                    {signal.partners.length > signal.partnerDetails.length && (
                      <p className="text-[11px] text-ww-gray-400 mt-1">
                        +{signal.partners.length - signal.partnerDetails.length} more partners
                      </p>
                    )}
                  </div>

                  <div className="px-4 py-2.5 bg-ww-gray-50 border-t border-ww-gray-100">
                    <p className="text-[11px] text-ww-gray-500">
                      If built natively, would consolidate <span className="font-semibold text-ww-navy">{signal.applicationCount}</span> integrations
                      serving <span className="font-semibold text-ww-navy">{signal.customers.length}</span> customers
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  sub,
  variant,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  variant?: 'warning'
  onClick?: () => void
}) {
  const borderClass =
    variant === 'warning'
      ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-100/60'
      : 'border-ww-gray-200 bg-white hover:bg-ww-gray-50 hover:border-ww-gray-300'
  const textClass = variant === 'warning' ? 'text-amber-800' : 'text-ww-navy'

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition-all ${borderClass}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-xl font-display font-bold ${textClass} truncate`}>{value}</p>
      {sub && <p className="text-[11px] text-ww-gray-400 mt-0.5">{sub}</p>}
    </button>
  )
}

function DataCategoryBars({ categories }: { categories: Map<string, number> }) {
  const entries = Array.from(categories.entries()).sort((a, b) => b[1] - a[1])
  const max = entries[0]?.[1] || 1

  return (
    <div className="space-y-1">
      {entries.map(([cat, count]) => {
        const pct = Math.max((count / max) * 100, 4)
        return (
          <div key={cat} className="flex items-center gap-2">
            <span className="text-[11px] text-ww-gray-600 w-24 truncate text-right shrink-0">
              {DATA_CAT_LABELS[cat] || cat}
            </span>
            <div className="flex-1 h-3 bg-ww-gray-100 rounded overflow-hidden">
              <div className="h-full rounded bg-ww-teal" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-mono text-ww-gray-500 w-6 text-right">{count}</span>
          </div>
        )
      })}
    </div>
  )
}
