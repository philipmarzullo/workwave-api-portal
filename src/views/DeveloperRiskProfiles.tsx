import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ShieldAlert,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  Bot,
  Send,
  Loader2,
  X,
  Trash2,
  AlertTriangle,
  Users,
  Repeat,
  BarChart3,
} from 'lucide-react'
import type { HistoricalApplication } from '@/data/types'
import { COMPETITIVE_VENDORS } from '@/data/types'
import rawApplications from '@/data/extracted-applications.json'

const applications = rawApplications as HistoricalApplication[]

const PAGE_SIZE = 25

// ── Risk scoring constants ──────────────────────────────────────

const RISK_KEYWORD_PATTERN =
  /\b(lead|leads|sales|crm|marketing|customer acquisition|white label|white-label|resell)\b/i

type RiskTier = 'critical' | 'high' | 'medium' | 'low'

interface RiskSignal {
  label: string
  points: number
}

interface DeveloperProfile {
  developerName: string
  customers: string[]
  products: string[]
  applications: HistoricalApplication[]
  hasResellIntent: boolean
  isCompetitiveVendor: boolean
  hasRiskKeywords: boolean
  riskScore: number
  riskTier: RiskTier
  riskSignals: RiskSignal[]
  externalProducts: string[]
  useCaseSummaries: string[]
  resellIntentApps: HistoricalApplication[]
}

type SortField = 'riskScore' | 'developerName' | 'customers' | 'products' | 'resell' | 'applications'
type SortDir = 'asc' | 'desc'

// ── Helpers ─────────────────────────────────────────────────────

function checkCompetitive(name: string): boolean {
  const lower = name.toLowerCase()
  return COMPETITIVE_VENDORS.some(v => lower.includes(v.toLowerCase()))
}

function getTier(score: number): RiskTier {
  if (score >= 70) return 'critical'
  if (score >= 40) return 'high'
  if (score >= 15) return 'medium'
  return 'low'
}

const TIER_CONFIG: Record<RiskTier, { label: string; color: string; bg: string; barColor: string; badgeBg: string; badgeText: string }> = {
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-50', barColor: 'bg-red-500', badgeBg: 'bg-red-100', badgeText: 'text-red-700' },
  high:     { label: 'High',     color: 'text-amber-700', bg: 'bg-amber-50', barColor: 'bg-amber-500', badgeBg: 'bg-amber-100', badgeText: 'text-amber-700' },
  medium:   { label: 'Medium',   color: 'text-yellow-700', bg: 'bg-yellow-50', barColor: 'bg-yellow-500', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-700' },
  low:      { label: 'Low',      color: 'text-green-700', bg: 'bg-white', barColor: 'bg-green-500', badgeBg: 'bg-green-100', badgeText: 'text-green-700' },
}

// ── Build profiles ──────────────────────────────────────────────

function buildProfiles(): DeveloperProfile[] {
  const map = new Map<string, HistoricalApplication[]>()

  for (const app of applications) {
    const name = app.developerName?.trim() || '(Self-Build / No Developer)'
    const existing = map.get(name)
    if (existing) {
      existing.push(app)
    } else {
      map.set(name, [app])
    }
  }

  const profiles: DeveloperProfile[] = []

  for (const [developerName, apps] of map) {
    const customerSet = new Set<string>()
    const productSet = new Set<string>()
    const externalProductSet = new Set<string>()
    const useCases: string[] = []
    let hasResellIntent = false
    let hasRiskKeywords = false
    const resellIntentApps: HistoricalApplication[] = []

    for (const app of apps) {
      if (app.customerName) customerSet.add(app.customerName)
      if (app.wwProduct) productSet.add(app.wwProduct)
      if (app.externalProduct) externalProductSet.add(app.externalProduct)
      if (app.useCase) {
        useCases.push(app.useCase)
        if (RISK_KEYWORD_PATTERN.test(app.useCase)) hasRiskKeywords = true
      }
      if (app.customerIntendToResell === true || app.developerIntendToResell === true) {
        hasResellIntent = true
        resellIntentApps.push(app)
      }
    }

    const isCompetitive = developerName !== '(Self-Build / No Developer)' && checkCompetitive(developerName)
    const customers = Array.from(customerSet).sort()
    const products = Array.from(productSet).sort()
    const externalProducts = Array.from(externalProductSet).sort()

    // Compute risk score
    const signals: RiskSignal[] = []
    let score = 0

    if (isCompetitive) {
      signals.push({ label: 'Known competitive vendor', points: 40 })
      score += 40
    }

    const concentrationPoints = Math.min(customers.length * 5, 25)
    if (concentrationPoints > 0) {
      signals.push({ label: `Customer concentration (${customers.length} customer${customers.length !== 1 ? 's' : ''})`, points: concentrationPoints })
      score += concentrationPoints
    }

    if (hasResellIntent) {
      signals.push({ label: 'Resell intent declared', points: 15 })
      score += 15
    }

    if (products.length >= 2) {
      signals.push({ label: `Multi-product access (${products.length} products)`, points: 10 })
      score += 10
    }

    if (hasRiskKeywords) {
      signals.push({ label: 'High-risk use case keywords', points: 10 })
      score += 10
    }

    score = Math.min(score, 100)

    profiles.push({
      developerName,
      customers,
      products,
      applications: apps,
      hasResellIntent,
      isCompetitiveVendor: isCompetitive,
      hasRiskKeywords,
      riskScore: score,
      riskTier: getTier(score),
      riskSignals: signals,
      externalProducts,
      useCaseSummaries: useCases.slice(0, 5),
      resellIntentApps,
    })
  }

  return profiles
}

// ── Component ───────────────────────────────────────────────────

export function DeveloperRiskProfiles() {
  const allProfiles = useMemo(() => buildProfiles(), [])

  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<RiskTier | ''>('')
  const [productFilter, setProductFilter] = useState('')
  const [resellOnly, setResellOnly] = useState(false)
  const [sortField, setSortField] = useState<SortField>('riskScore')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)
  const [expandedDev, setExpandedDev] = useState<string | null>(null)

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

  // All unique products across profiles
  const allProducts = useMemo(() => {
    const set = new Set<string>()
    for (const p of allProfiles) {
      for (const prod of p.products) set.add(prod)
    }
    return Array.from(set).sort()
  }, [allProfiles])

  // Summary stats
  const stats = useMemo(() => {
    let critical = 0
    let high = 0
    let resellCount = 0
    let totalCustomers = 0

    for (const p of allProfiles) {
      if (p.riskTier === 'critical') critical++
      if (p.riskTier === 'high') high++
      if (p.hasResellIntent) resellCount++
      totalCustomers += p.customers.length
    }

    return {
      total: allProfiles.length,
      critical,
      high,
      resellCount,
      avgCustomers: allProfiles.length > 0 ? (totalCustomers / allProfiles.length).toFixed(1) : '0',
    }
  }, [allProfiles])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = [...allProfiles]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        p =>
          p.developerName.toLowerCase().includes(q) ||
          p.customers.some(c => c.toLowerCase().includes(q))
      )
    }

    if (tierFilter) {
      result = result.filter(p => p.riskTier === tierFilter)
    }

    if (productFilter) {
      result = result.filter(p => p.products.includes(productFilter))
    }

    if (resellOnly) {
      result = result.filter(p => p.hasResellIntent)
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'riskScore':
          cmp = a.riskScore - b.riskScore
          break
        case 'developerName':
          cmp = a.developerName.localeCompare(b.developerName)
          break
        case 'customers':
          cmp = a.customers.length - b.customers.length
          break
        case 'products':
          cmp = a.products.length - b.products.length
          break
        case 'resell':
          cmp = (a.hasResellIntent ? 1 : 0) - (b.hasResellIntent ? 1 : 0)
          break
        case 'applications':
          cmp = a.applications.length - b.applications.length
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [allProfiles, searchQuery, tierFilter, productFilter, resellOnly, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'developerName' ? 'asc' : 'desc')
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

  // Column grid: Score 14% | Developer 26% | Customers 12% | Products 14% | Resell 10% | Applications 12% | Tier 12%
  const gridCols = 'grid-cols-[14%_26%_12%_14%_10%_12%_12%]'

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert size={20} className="text-red-600" />
            <h1 className="text-xl font-display font-bold text-ww-navy">Developer Risk Profiles</h1>
          </div>
          <p className="text-sm text-ww-gray-500">
            Risk-scored developer profiles across {applications.length.toLocaleString()} historical applications
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <SummaryCard
          label="Total Developers"
          value={stats.total}
          icon={<Users size={14} className="text-ww-gray-400" />}
          onClick={() => { setTierFilter(''); setResellOnly(false); setSearchQuery(''); setProductFilter(''); setPage(1) }}
        />
        <SummaryCard
          label="Critical Risk"
          value={stats.critical}
          icon={<AlertTriangle size={14} className="text-red-500" />}
          highlight="red"
          active={tierFilter === 'critical'}
          onClick={() => { setTierFilter(tierFilter === 'critical' ? '' : 'critical'); setPage(1) }}
        />
        <SummaryCard
          label="High Risk"
          value={stats.high}
          icon={<AlertTriangle size={14} className="text-amber-500" />}
          highlight="amber"
          active={tierFilter === 'high'}
          onClick={() => { setTierFilter(tierFilter === 'high' ? '' : 'high'); setPage(1) }}
        />
        <SummaryCard
          label="Resell Intent"
          value={stats.resellCount}
          icon={<Repeat size={14} className="text-ww-gray-400" />}
          active={resellOnly}
          onClick={() => { setResellOnly(v => !v); setPage(1) }}
        />
        <SummaryCard
          label="Avg. Customers / Dev"
          value={stats.avgCustomers}
          icon={<BarChart3 size={14} className="text-ww-gray-400" />}
        />
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
              <div className="p-4">
                <p className="text-xs text-ww-gray-400 mb-2">Try a question:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Which unknown developers show the most risk signals?',
                    'List developers with resell intent across multiple products',
                    'Who has the highest customer concentration?',
                    'Any developers that look like potential competitors?',
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
                      Analyzing developer risk profiles...
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

          {/* Input */}
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
                placeholder={agentMessages.length > 0 ? 'Ask a follow-up...' : 'Ask about developer risk profiles...'}
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
            placeholder="Search developer or customer name..."
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-ww-gray-200 rounded focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
          />
        </div>

        <select
          value={tierFilter}
          onChange={e => {
            setTierFilter(e.target.value as RiskTier | '')
            setPage(1)
          }}
          className="text-sm border border-ww-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-ww-primary/30 outline-none"
        >
          <option value="">All Risk Tiers</option>
          <option value="critical">Critical (70–100)</option>
          <option value="high">High (40–69)</option>
          <option value="medium">Medium (15–39)</option>
          <option value="low">Low (0–14)</option>
        </select>

        <select
          value={productFilter}
          onChange={e => {
            setProductFilter(e.target.value)
            setPage(1)
          }}
          className="text-sm border border-ww-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-ww-primary/30 outline-none"
        >
          <option value="">All Products</option>
          {allProducts.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={resellOnly}
            onChange={e => {
              setResellOnly(e.target.checked)
              setPage(1)
            }}
            className="rounded border-ww-gray-300"
          />
          <Repeat size={13} className="text-amber-600" />
          <span className="text-ww-gray-700">Resell intent only</span>
        </label>
      </div>

      {/* Results count */}
      <p className="text-[12px] font-mono text-ww-gray-400">
        {filtered.length} developer{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== allProfiles.length ? ` of ${allProfiles.length}` : ''}
      </p>

      {/* Table */}
      <div className="border border-ww-gray-200 rounded-lg bg-white overflow-hidden">
        {/* Header */}
        <div className={`grid ${gridCols} bg-ww-gray-50 border-b border-ww-gray-200`}>
          {([
            ['riskScore', 'Risk Score'],
            ['developerName', 'Developer'],
            ['customers', 'Customers'],
            ['products', 'Products'],
            ['resell', 'Resell'],
            ['applications', 'Applications'],
          ] as [SortField, string][]).map(([field, label]) => (
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
            Tier
          </div>
        </div>

        {/* Rows */}
        {pageItems.length === 0 ? (
          <div className="px-3 py-12 text-center text-ww-gray-400 text-sm">
            No developers match the current filters.
          </div>
        ) : (
          pageItems.map(profile => {
            const tier = TIER_CONFIG[profile.riskTier]
            const isExpanded = expandedDev === profile.developerName

            return (
              <div key={profile.developerName} className="border-b border-ww-gray-100 last:border-b-0">
                <div
                  className={`grid ${gridCols} cursor-pointer items-center ${tier.bg} hover:brightness-95 transition-all`}
                  onClick={() => setExpandedDev(isExpanded ? null : profile.developerName)}
                >
                  {/* Risk Score */}
                  <div className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-ww-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${tier.barColor}`}
                          style={{ width: `${profile.riskScore}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold font-mono ${tier.color}`}>
                        {profile.riskScore}
                      </span>
                    </div>
                  </div>

                  {/* Developer */}
                  <div className="px-3 py-2.5 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate text-sm font-medium text-ww-navy">
                        {profile.developerName}
                      </span>
                      {profile.isCompetitiveVendor && (
                        <span className="shrink-0 text-[10px] font-semibold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                          Competitive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customers */}
                  <div className="px-3 py-2.5">
                    <span className="text-sm text-ww-gray-600">{profile.customers.length}</span>
                  </div>

                  {/* Products */}
                  <div className="px-3 py-2.5">
                    <span className="text-sm text-ww-gray-600">{profile.products.join(', ') || '—'}</span>
                  </div>

                  {/* Resell */}
                  <div className="px-3 py-2.5">
                    {profile.hasResellIntent ? (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        Yes
                      </span>
                    ) : (
                      <span className="text-sm text-ww-gray-400">—</span>
                    )}
                  </div>

                  {/* Applications */}
                  <div className="px-3 py-2.5">
                    <span className="text-sm text-ww-gray-600">{profile.applications.length}</span>
                  </div>

                  {/* Tier */}
                  <div className="px-3 py-2.5 flex items-center justify-between">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${tier.badgeBg} ${tier.badgeText}`}>
                      {tier.label}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-ww-gray-400" />
                    ) : (
                      <ChevronDown size={14} className="text-ww-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 py-4 bg-ww-gray-50 border-t border-ww-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                      {/* Customers served */}
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">
                          Customers Served ({profile.customers.length})
                        </h4>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {profile.customers.map(c => (
                            <p key={c} className="text-[13px] text-ww-gray-700">{c}</p>
                          ))}
                          {profile.customers.length === 0 && (
                            <p className="text-[13px] text-ww-gray-400 italic">No customer data</p>
                          )}
                        </div>
                      </div>

                      {/* Products & External Products */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">
                            WW Products Accessed
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.products.map(p => (
                              <span key={p} className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                {p}
                              </span>
                            ))}
                            {profile.products.length === 0 && (
                              <p className="text-[13px] text-ww-gray-400 italic">None specified</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">
                            External Product
                          </h4>
                          {profile.externalProducts.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {profile.externalProducts.map(p => (
                                <span key={p} className="text-[11px] font-medium bg-gray-100 text-ww-gray-600 px-2 py-0.5 rounded">
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[13px] text-ww-gray-400 italic">None specified</p>
                          )}
                        </div>
                      </div>

                      {/* Resell Intent Details */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">
                            Resell Intent Details
                          </h4>
                          {profile.resellIntentApps.length > 0 ? (
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                              {profile.resellIntentApps.map(app => (
                                <div key={app.id} className="text-[12px] bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                                  <p className="text-amber-800 font-medium">{app.customerName || 'Unknown customer'}</p>
                                  <p className="text-amber-600">
                                    {app.customerIntendToResell && 'Customer intends to resell'}
                                    {app.customerIntendToResell && app.developerIntendToResell && ' · '}
                                    {app.developerIntendToResell && 'Developer intends to resell'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[13px] text-ww-gray-400 italic">No resell intent declared</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Use case summaries */}
                    {profile.useCaseSummaries.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider mb-2">
                          Use Case Summaries (showing up to 5)
                        </h4>
                        <div className="space-y-1.5">
                          {profile.useCaseSummaries.map((uc, i) => (
                            <p key={i} className="text-sm text-ww-gray-600 bg-white border border-ww-gray-200 rounded px-3 py-2 line-clamp-2">
                              {uc}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Risk signal breakdown */}
                    <div className="mt-4">
                      <h4 className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider mb-2">
                        Risk Signal Breakdown
                      </h4>
                      {profile.riskSignals.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {profile.riskSignals.map((signal, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 text-[12px] bg-white border border-ww-gray-200 rounded px-2.5 py-1.5"
                            >
                              <span className={`font-bold font-mono ${signal.points >= 25 ? 'text-red-600' : signal.points >= 10 ? 'text-amber-600' : 'text-yellow-600'}`}>
                                +{signal.points}
                              </span>
                              <span className="text-ww-gray-600">{signal.label}</span>
                            </div>
                          ))}
                          <div className="flex items-center gap-1.5 text-[12px] bg-ww-navy/5 border border-ww-navy/20 rounded px-2.5 py-1.5">
                            <span className="font-bold font-mono text-ww-navy">= {profile.riskScore}</span>
                            <span className="text-ww-gray-600">Total Score</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[13px] text-ww-gray-400 italic">No risk signals detected</p>
                      )}
                    </div>
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

// ── Summary card ────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
  highlight,
  active,
  onClick,
}: {
  label: string
  value: string | number
  icon?: React.ReactNode
  highlight?: 'red' | 'amber'
  active?: boolean
  onClick?: () => void
}) {
  const border = highlight === 'red'
    ? `border-red-300/50 ${active ? 'bg-red-100 ring-2 ring-red-300/40' : 'bg-red-50'} hover:bg-red-100`
    : highlight === 'amber'
      ? `border-amber-300/50 ${active ? 'bg-amber-100 ring-2 ring-amber-300/40' : 'bg-amber-50'} hover:bg-amber-100`
      : `border-ww-gray-200 ${active ? 'bg-ww-primary/5 ring-2 ring-ww-primary/20' : 'bg-white'} hover:bg-ww-gray-50 hover:border-ww-gray-300`

  const valueColor = highlight === 'red'
    ? 'text-red-700'
    : highlight === 'amber'
      ? 'text-amber-700'
      : 'text-ww-navy'

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-4 py-3 text-left transition-all ${border}`}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon}
        <p className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className={`text-xl font-display font-bold ${valueColor}`}>
        {value}
      </p>
    </button>
  )
}
