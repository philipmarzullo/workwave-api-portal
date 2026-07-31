import { useState, useMemo, useRef, useEffect } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Bot,
  Send,
  Loader2,
  X,
  Trash2,
  Search,
  Filter,
  ChevronsDown,
  ChevronsUp,
  Zap,
  Timer,
  Radio,
  Database,
  FileBox,
} from 'lucide-react'
import type { CatalogEndpoint, CatalogDomain, ApiGeneration, HttpMethod, TriggerType } from '@/data/types'
import rawCatalog from '@/data/winteam-api-catalog.json'
import { DOMAIN_LABELS, GENERATION_LABELS, METHOD_COLORS } from '@/data/catalog-labels'
import { getCatalogUsageCounts } from '@/data/catalog-matcher'
import { store } from '@/data/store'

const catalog = rawCatalog as CatalogEndpoint[]

const TRIGGER_ICONS: Record<TriggerType, typeof Zap> = {
  http: Zap,
  service_bus: Radio,
  event_grid: Zap,
  timer: Timer,
  queue: Database,
  blob: FileBox,
}

const TRIGGER_LABELS: Record<TriggerType, string> = {
  http: 'HTTP',
  service_bus: 'Service Bus',
  event_grid: 'Event Grid',
  timer: 'Timer',
  queue: 'Queue',
  blob: 'Blob',
}

// ── Suggested questions ─────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'Which endpoints handle employee payroll data?',
  'How many POST endpoints exist across accounting?',
  'What is the CSA equivalent of the legacy ScheduleAPI?',
  'List all undocumented endpoints in the scheduling domain',
]

// ── Main component ──────────────────────────────────────────

export function ApiCatalog() {
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [generationFilter, setGenerationFilter] = useState<ApiGeneration | 'all'>('all')
  const [methodFilter, setMethodFilter] = useState<HttpMethod | 'all'>('all')
  const [domainFilter, setDomainFilter] = useState<CatalogDomain | 'all'>('all')
  const [httpOnly, setHttpOnly] = useState(true)

  // Accordion
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [allExpanded, setAllExpanded] = useState(false)

  // Agent
  const [agentOpen, setAgentOpen] = useState(false)
  const [agentQuestion, setAgentQuestion] = useState('')
  const [agentMessages, setAgentMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const agentInputRef = useRef<HTMLTextAreaElement>(null)
  const agentScrollRef = useRef<HTMLDivElement>(null)

  // ── Computed stats ──

  const stats = useMemo(() => {
    const httpEndpoints = catalog.filter(e => e.triggerType === 'http')
    const documented = httpEndpoints.filter(e => e.purpose !== null)
    return {
      total: httpEndpoints.length,
      legacy: httpEndpoints.filter(e => e.generation === 'legacy').length,
      csa: httpEndpoints.filter(e => e.generation === 'csa').length,
      connector: httpEndpoints.filter(e => e.generation === 'connector').length,
      documented: documented.length,
      documentedPct: httpEndpoints.length > 0 ? Math.round((documented.length / httpEndpoints.length) * 100) : 0,
    }
  }, [])

  // ── Usage counts per project (from approved requests) ──

  const usageCounts = useMemo(() => {
    const allRequests = store.getRequests()
    return getCatalogUsageCounts(allRequests, catalog)
  }, [])

  // ── Filtered endpoints ──

  const filtered = useMemo(() => {
    let result = catalog

    // HTTP-only toggle
    if (httpOnly) {
      result = result.filter(e => e.triggerType === 'http')
    }

    // Generation filter
    if (generationFilter !== 'all') {
      result = result.filter(e => e.generation === generationFilter)
    }

    // Method filter
    if (methodFilter !== 'all') {
      result = result.filter(e => e.method === methodFilter)
    }

    // Domain filter
    if (domainFilter !== 'all') {
      result = result.filter(e => e.domain === domainFilter)
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(e =>
        e.route.toLowerCase().includes(q) ||
        e.functionName.toLowerCase().includes(q) ||
        (e.purpose && e.purpose.toLowerCase().includes(q)) ||
        e.projectName.toLowerCase().includes(q)
      )
    }

    return result
  }, [searchQuery, generationFilter, methodFilter, domainFilter, httpOnly])

  // ── Grouped by project ──

  const grouped = useMemo(() => {
    const map = new Map<string, { endpoints: CatalogEndpoint[]; generation: ApiGeneration; domain: CatalogDomain }>()
    for (const ep of filtered) {
      if (!map.has(ep.projectName)) {
        map.set(ep.projectName, { endpoints: [], generation: ep.generation, domain: ep.domain })
      }
      map.get(ep.projectName)!.endpoints.push(ep)
    }
    // Sort by domain then project name
    return Array.from(map.entries()).sort((a, b) => {
      const domainCmp = a[1].domain.localeCompare(b[1].domain)
      if (domainCmp !== 0) return domainCmp
      return a[0].localeCompare(b[0])
    })
  }, [filtered])

  // ── Domain tabs ──

  const activeDomains = useMemo(() => {
    const domains = new Set<CatalogDomain>()
    for (const ep of catalog) {
      if (httpOnly && ep.triggerType !== 'http') continue
      domains.add(ep.domain)
    }
    return Array.from(domains).sort()
  }, [httpOnly])

  // ── Accordion controls ──

  const toggleProject = (project: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      if (next.has(project)) next.delete(project)
      else next.add(project)
      return next
    })
  }

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedProjects(new Set())
      setAllExpanded(false)
    } else {
      setExpandedProjects(new Set(grouped.map(([name]) => name)))
      setAllExpanded(true)
    }
  }

  // ── Stat card click ──

  const handleStatClick = (gen: ApiGeneration | 'all') => {
    setGenerationFilter(gen)
    setDomainFilter('all')
    setMethodFilter('all')
    setSearchQuery('')
  }

  // ── Agent ──

  useEffect(() => {
    if (agentOpen && agentScrollRef.current) {
      agentScrollRef.current.scrollTop = agentScrollRef.current.scrollHeight
    }
  }, [agentMessages, agentOpen])

  const askAgent = async (question?: string) => {
    const q = (question || agentQuestion).trim()
    if (!q || agentLoading) return

    setAgentMessages(prev => [...prev, { role: 'user', text: q }])
    setAgentQuestion('')
    setAgentLoading(true)
    setAgentError(null)

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
      }
    } catch {
      setAgentError('Failed to connect to server')
    } finally {
      setAgentLoading(false)
    }
  }

  // ── Render ──

  return (
    <div className="py-8 space-y-6">
      {/* Section A: Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ww-primary/10 flex items-center justify-center">
            <BookOpen size={18} className="text-ww-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-ww-navy">WinTeam API Catalog</h1>
            <p className="text-sm text-ww-gray-500 mt-0.5">
              {stats.total} business endpoints across Concourse (Azure APIM)
            </p>
          </div>
        </div>
        <button
          onClick={() => setAgentOpen(!agentOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium bg-ww-navy text-white hover:bg-ww-navy/90 transition-colors"
        >
          <Bot size={14} />
          Ask the Agent
        </button>
      </div>

      {/* Section B: Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard
          label="Total Endpoints"
          value={stats.total}
          active={generationFilter === 'all'}
          onClick={() => handleStatClick('all')}
        />
        <StatCard
          label="Legacy (v1)"
          value={stats.legacy}
          active={generationFilter === 'legacy'}
          onClick={() => handleStatClick('legacy')}
        />
        <StatCard
          label="CSA (NextGen)"
          value={stats.csa}
          active={generationFilter === 'csa'}
          onClick={() => handleStatClick('csa')}
        />
        <StatCard
          label="Connectors"
          value={stats.connector}
          active={generationFilter === 'connector'}
          onClick={() => handleStatClick('connector')}
        />
        <StatCard
          label="Documented"
          value={stats.documented}
          sub={`${stats.documentedPct}%`}
          active={false}
        />
      </div>

      {/* Section C: Agent Panel */}
      {agentOpen && (
        <div className="border border-ww-gray-200 rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-ww-gray-200 bg-ww-gray-50">
            <div className="flex items-center gap-2">
              <Bot size={14} className="text-ww-primary" />
              <span className="text-[13px] font-semibold text-ww-navy">API Catalog Agent</span>
            </div>
            <div className="flex items-center gap-1">
              {agentMessages.length > 0 && (
                <button
                  onClick={() => { setAgentMessages([]); setAgentError(null) }}
                  className="p-1 rounded text-ww-gray-400 hover:text-ww-gray-600 transition-colors"
                  title="Clear conversation"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setAgentOpen(false)}
                className="p-1 rounded text-ww-gray-400 hover:text-ww-gray-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Suggested questions */}
          {agentMessages.length === 0 && (
            <div className="px-4 py-3 border-b border-ww-gray-100">
              <p className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider mb-2">Suggested questions</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => askAgent(q)}
                    className="text-[12px] px-2.5 py-1 rounded-full border border-ww-gray-200 text-ww-gray-600 hover:bg-ww-gray-50 hover:border-ww-gray-300 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {agentMessages.length > 0 && (
            <div ref={agentScrollRef} className="max-h-64 overflow-y-auto px-4 py-3 space-y-3">
              {agentMessages.map((msg, i) => (
                <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-ww-navy font-medium' : 'text-ww-gray-600'}`}>
                  <span className="text-[10px] font-mono text-ww-gray-400 uppercase mr-1.5">
                    {msg.role === 'user' ? 'You' : 'Agent'}
                  </span>
                  <span className="whitespace-pre-wrap">{msg.text}</span>
                </div>
              ))}
              {agentLoading && (
                <div className="flex items-center gap-2 text-ww-gray-400 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          )}

          {agentError && (
            <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">
              {agentError}
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-2.5 border-t border-ww-gray-200 flex gap-2">
            <textarea
              ref={agentInputRef}
              value={agentQuestion}
              onChange={e => setAgentQuestion(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askAgent() }
              }}
              placeholder="Ask about the WinTeam API surface..."
              rows={1}
              className="flex-1 resize-none text-sm border border-ww-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
            />
            <button
              onClick={() => askAgent()}
              disabled={!agentQuestion.trim() || agentLoading}
              className="px-3 py-2 rounded-lg bg-ww-navy text-white hover:bg-ww-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Section D: Domain Tabs + Filter Bar */}
      <div className="space-y-3">
        {/* Domain pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setDomainFilter('all')}
            className={`text-[12px] px-3 py-1 rounded-full font-medium transition-colors ${
              domainFilter === 'all'
                ? 'bg-ww-navy text-white'
                : 'bg-ww-gray-100 text-ww-gray-600 hover:bg-ww-gray-200'
            }`}
          >
            All
          </button>
          {activeDomains.map(d => (
            <button
              key={d}
              onClick={() => setDomainFilter(d === domainFilter ? 'all' : d)}
              className={`text-[12px] px-3 py-1 rounded-full font-medium transition-colors ${
                domainFilter === d
                  ? 'bg-ww-navy text-white'
                  : 'bg-ww-gray-100 text-ww-gray-600 hover:bg-ww-gray-200'
              }`}
            >
              {DOMAIN_LABELS[d]}
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ww-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search route, function, purpose, project..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-ww-gray-200 rounded-lg focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-ww-gray-400" />
          </div>

          <select
            value={generationFilter}
            onChange={e => setGenerationFilter(e.target.value as ApiGeneration | 'all')}
            className="text-sm border border-ww-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
          >
            <option value="all">All Generations</option>
            <option value="legacy">Legacy</option>
            <option value="csa">CSA / NextGen</option>
            <option value="connector">Connector</option>
          </select>

          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value as HttpMethod | 'all')}
            className="text-sm border border-ww-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
          >
            <option value="all">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="PUT">PUT</option>
          </select>

          <label className="flex items-center gap-1.5 text-[12px] text-ww-gray-600 cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={httpOnly}
              onChange={e => setHttpOnly(e.target.checked)}
              className="rounded border-ww-gray-300"
            />
            HTTP only
          </label>
        </div>
      </div>

      {/* Section E: Grouped Endpoint Table */}
      <div className="space-y-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-[12px] font-mono text-ww-gray-400">
            {filtered.length} endpoint{filtered.length !== 1 ? 's' : ''} across {grouped.length} project{grouped.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={toggleAll}
            className="flex items-center gap-1 text-[12px] text-ww-gray-500 hover:text-ww-navy transition-colors"
          >
            {allExpanded ? <ChevronsUp size={13} /> : <ChevronsDown size={13} />}
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        {/* Project groups */}
        {grouped.map(([projectName, { endpoints: projectEndpoints, generation }]) => {
          const isExpanded = expandedProjects.has(projectName)
          const genInfo = GENERATION_LABELS[generation]
          const usage = usageCounts.get(projectName)

          return (
            <div key={projectName} className="border border-ww-gray-200 rounded-lg overflow-hidden bg-white">
              {/* Project header */}
              <button
                onClick={() => toggleProject(projectName)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-ww-gray-50 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-ww-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-ww-gray-400 shrink-0" />
                )}
                <span className="text-[13px] font-semibold text-ww-navy truncate">{projectName}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${genInfo.color} shrink-0`}>
                  {genInfo.label}
                </span>
                {usage && usage > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
                    Used by {usage} request{usage !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-[12px] text-ww-gray-400 ml-auto shrink-0">
                  {projectEndpoints.length} endpoint{projectEndpoints.length !== 1 ? 's' : ''}
                </span>
              </button>

              {/* Endpoint rows */}
              {isExpanded && (
                <div className="border-t border-ww-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-ww-gray-50 border-b border-ww-gray-100">
                        <th className="text-left text-[10px] font-mono text-ww-gray-400 uppercase tracking-wider px-4 py-1.5 w-20">Method</th>
                        <th className="text-left text-[10px] font-mono text-ww-gray-400 uppercase tracking-wider px-4 py-1.5">Route</th>
                        <th className="text-left text-[10px] font-mono text-ww-gray-400 uppercase tracking-wider px-4 py-1.5 w-48">Function</th>
                        <th className="text-left text-[10px] font-mono text-ww-gray-400 uppercase tracking-wider px-4 py-1.5">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectEndpoints.map(ep => (
                        <tr key={ep.id} className="border-b border-ww-gray-50 last:border-b-0 hover:bg-ww-gray-50/50">
                          <td className="px-4 py-2">
                            {ep.method ? (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${METHOD_COLORS[ep.method]}`}>
                                {ep.method}
                              </span>
                            ) : (
                              <TriggerBadge triggerType={ep.triggerType} />
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <code className="text-[12px] font-mono text-ww-gray-700">{ep.route}</code>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-[12px] text-ww-gray-600 truncate block max-w-[180px]" title={ep.functionName}>
                              {ep.functionName}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {ep.purpose ? (
                              <span className="text-[12px] text-ww-gray-600 line-clamp-2">{ep.purpose}</span>
                            ) : (
                              <span className="text-[12px] text-ww-gray-300 italic">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}

        {grouped.length === 0 && (
          <div className="text-center py-12 text-ww-gray-400">
            <Search size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No endpoints match the current filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function StatCard({ label, value, sub, active, onClick }: {
  label: string
  value: number
  sub?: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-3 rounded-lg border transition-colors ${
        active
          ? 'border-ww-primary bg-ww-primary/5'
          : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
      }`}
    >
      <p className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">{label}</p>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <p className={`text-xl font-display font-bold ${active ? 'text-ww-primary' : 'text-ww-navy'}`}>{value}</p>
        {sub && <span className="text-sm text-ww-gray-400">{sub}</span>}
      </div>
    </button>
  )
}

function TriggerBadge({ triggerType }: { triggerType: TriggerType }) {
  const Icon = TRIGGER_ICONS[triggerType]
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700" title={TRIGGER_LABELS[triggerType]}>
      <Icon size={10} />
      {TRIGGER_LABELS[triggerType]}
    </span>
  )
}
