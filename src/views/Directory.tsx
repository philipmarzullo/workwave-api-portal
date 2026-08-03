import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown, ChevronRight, Plus, X, HelpCircle, Send, Loader2, Trash2 } from 'lucide-react'
import { WaiveIcon } from '@/components/WaiveIcon'
import { store } from '@/data/store'
import type { CustomerUser, WorkWaveProduct, IntegrationType, PartnerTier, Partner } from '@/data/types'
import { PRODUCT_LABELS, TIER_LABELS } from '@/App'

// ── Integration type display labels ─────────────────────────────

const INTEGRATION_TYPE_LABELS: Record<IntegrationType, string> = {
  scheduling: 'Scheduling',
  crm: 'CRM',
  accounting: 'Accounting',
  payments: 'Payments',
  fleet: 'Fleet',
  reporting: 'Reporting',
  hr: 'HR',
  marketing: 'Marketing',
  field_service: 'Field Service',
  custom: 'Custom',
}

// ── Tier section config (reviewer only) ─────────────────────────

const TIER_SECTIONS: { key: PartnerTier; label: string; accent: string }[] = [
  { key: 'approved', label: 'APPROVED', accent: 'border-l-ww-teal' },
  { key: 'under_review', label: 'UNDER REVIEW', accent: 'border-l-ww-amber' },
  { key: 'unapproved', label: 'NOT APPROVED', accent: 'border-l-ww-red' },
  { key: 'blocked', label: 'BLOCKED', accent: 'border-l-red-700' },
]

// ── Props ───────────────────────────────────────────────────────

interface DirectoryProps {
  activeUser?: CustomerUser
  isReviewerView?: boolean
  hideHeader?: boolean
}

// ── Component ───────────────────────────────────────────────────

export function Directory({ activeUser, isReviewerView = false, hideHeader = false }: DirectoryProps) {
  const navigate = useNavigate()

  // Agent state (customer view only)
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
        body: JSON.stringify({ question: q, page: 'directory' }),
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

  const allPartners = store.getPartners()

  // Customer view: approved only. Reviewer view: all.
  const partners = useMemo(() => {
    if (isReviewerView) return allPartners
    return allPartners.filter((p: Partner) => p.tier === 'approved')
  }, [allPartners, isReviewerView])

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<WorkWaveProduct | ''>('')
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<IntegrationType | ''>('')

  // Collapsed sections state (reviewer only)
  const [collapsedSections, setCollapsedSections] = useState<Record<PartnerTier, boolean>>({
    approved: false,
    under_review: false,
    unapproved: false,
    blocked: false,
  })

  const toggleSection = (tier: PartnerTier) => {
    setCollapsedSections(prev => ({ ...prev, [tier]: !prev[tier] }))
  }

  // Gather unique integration types from visible partners
  const availableIntegrationTypes = useMemo(() => {
    const types = new Set(partners.map((p: Partner) => p.integrationType))
    return Array.from(types).sort()
  }, [partners])

  // Filtered partners
  const filteredPartners = useMemo(() => {
    return partners.filter((partner: Partner) => {
      if (searchQuery && !partner.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (selectedProduct && !partner.productsSupported.includes(selectedProduct)) {
        return false
      }
      if (selectedIntegrationType && partner.integrationType !== selectedIntegrationType) {
        return false
      }
      return true
    })
  }, [partners, searchQuery, selectedProduct, selectedIntegrationType])

  // Group filtered partners by tier (reviewer view)
  const groupedPartners = useMemo(() => {
    const groups: Record<PartnerTier, Partner[]> = {
      approved: [],
      under_review: [],
      unapproved: [],
      blocked: [],
    }
    for (const partner of filteredPartners) {
      groups[partner.tier]?.push(partner)
    }
    return groups
  }, [filteredPartners])

  const hasActiveFilters = selectedProduct !== '' || selectedIntegrationType !== ''

  const handleCardClick = (partner: Partner) => {
    if (!isReviewerView && partner.tier !== 'approved') return
    if (isReviewerView) {
      navigate(`/reviewer/partner/${partner.id}`)
    } else {
      navigate(`/request/${partner.id}`)
    }
  }

  // ── No user selected ──────────────────────────────────────────
  if (!isReviewerView && !activeUser) {
    return (
      <div className="py-20 text-center">
        <div className="w-12 h-12 rounded-md bg-ww-gray-100 flex items-center justify-center mx-auto mb-4">
          <HelpCircle size={20} className="text-ww-gray-400" />
        </div>
        <h2 className="font-display text-lg font-bold text-ww-navy mb-2">
          No User Selected
        </h2>
        <p className="text-sm text-ww-gray-500 max-w-sm mx-auto">
          Select a user from the header to browse the partner directory.
        </p>
      </div>
    )
  }

  // ── Header + filters ──────────────────────────────────────────

  function renderHeader() {
    return (
      <>
        <div className="pt-8 pb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-mono font-medium uppercase tracking-[0.1em] text-ww-gray-400 mb-1">
              {isReviewerView ? 'Admin' : 'Directory'}
            </p>
            <h1 className="text-[28px] font-display font-bold text-ww-navy leading-tight tracking-tight">
              {isReviewerView ? 'Partner Directory' : 'Integration Partners'}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ww-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search partners..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-52 pl-9 pr-3 py-2 rounded-md border border-ww-gray-200 bg-white text-sm placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary/20 focus:border-ww-primary transition-colors"
              />
            </div>
            {!isReviewerView && (
              <>
                <button
                  onClick={() => navigate('/request')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-semibold bg-ww-primary text-white hover:bg-ww-primary-light transition-colors shrink-0"
                >
                  <Plus size={14} />
                  <span className="hidden sm:inline">Request Unlisted Partner</span>
                  <span className="sm:hidden">New</span>
                </button>
                <button
                  onClick={() => {
                    setAgentOpen(o => !o)
                    if (!agentOpen) setTimeout(() => agentInputRef.current?.focus(), 100)
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    agentOpen
                      ? 'bg-ww-primary text-white border-ww-primary'
                      : 'border-ww-primary/30 text-ww-primary bg-ww-primary/5 hover:bg-ww-primary/10'
                  }`}
                >
                  <WaiveIcon size={15} />
                  Ask WAIve
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 pb-5 border-b border-ww-gray-200">
          <select
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value as WorkWaveProduct | '')}
            className="px-3 py-1.5 rounded-md border border-ww-gray-200 bg-white text-[12px] font-mono uppercase tracking-wider text-ww-gray-600 focus:outline-none focus:ring-2 focus:ring-ww-primary/20 focus:border-ww-primary cursor-pointer"
          >
            <option value="">All Products</option>
            {Object.entries(PRODUCT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={selectedIntegrationType}
            onChange={e => setSelectedIntegrationType(e.target.value as IntegrationType | '')}
            className="px-3 py-1.5 rounded-md border border-ww-gray-200 bg-white text-[12px] font-mono uppercase tracking-wider text-ww-gray-600 focus:outline-none focus:ring-2 focus:ring-ww-primary/20 focus:border-ww-primary cursor-pointer"
          >
            <option value="">All Types</option>
            {availableIntegrationTypes.map(type => (
              <option key={type} value={type}>{INTEGRATION_TYPE_LABELS[type]}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              {selectedProduct && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-ww-primary/20 text-ww-primary text-[11px] font-mono uppercase tracking-wider">
                  {PRODUCT_LABELS[selectedProduct] ?? selectedProduct}
                  <button onClick={() => setSelectedProduct('')} className="hover:text-ww-primary/60 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              )}
              {selectedIntegrationType && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-ww-primary/20 text-ww-primary text-[11px] font-mono uppercase tracking-wider">
                  {INTEGRATION_TYPE_LABELS[selectedIntegrationType] ?? selectedIntegrationType}
                  <button onClick={() => setSelectedIntegrationType('')} className="hover:text-ww-primary/60 transition-colors">
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
          )}
          <span className="ml-auto text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">
            {filteredPartners.length} {filteredPartners.length === 1 ? 'partner' : 'partners'}
          </span>
        </div>
      </>
    )
  }

  // ── Partner card (customer view) ──────────────────────────────

  function renderPartnerCard(partner: Partner) {
    const initial = partner.name.charAt(0).toUpperCase()

    return (
      <div
        key={partner.id}
        onClick={() => handleCardClick(partner)}
        className="bg-white rounded-md border border-ww-gray-200 hover:border-ww-primary transition-colors duration-150 cursor-pointer flex flex-col"
      >
        <div className="p-5 flex-1 flex flex-col">
          {/* Logo + Name */}
          <div className="flex items-start gap-3.5 mb-3">
            <div className="w-12 h-12 rounded-md bg-ww-sky flex items-center justify-center text-lg font-bold font-mono text-ww-navy shrink-0">
              {initial}
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <h3 className="font-display font-semibold text-ww-navy text-base leading-tight tracking-tight">
                {partner.name}
              </h3>
            </div>
          </div>

          {/* Description — 2 lines */}
          <p className="text-sm text-ww-gray-500 leading-relaxed mb-4 line-clamp-2">
            {partner.description}
          </p>

          <div className="flex-1" />

          {/* Divider + metadata */}
          <div className="border-t border-ww-gray-200 pt-3 mt-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5 min-w-0">
                {partner.productsSupported.map(product => (
                  <span
                    key={product}
                    className="text-[11px] font-mono font-medium uppercase tracking-[0.05em] px-2 py-0.5 rounded-sm border border-ww-gray-200 text-ww-gray-600"
                  >
                    {PRODUCT_LABELS[product] ?? product}
                  </span>
                ))}
              </div>
              <span className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider whitespace-nowrap shrink-0">
                {INTEGRATION_TYPE_LABELS[partner.integrationType] ?? partner.integrationType}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Reviewer row ──────────────────────────────────────────────

  function renderReviewerRow(partner: Partner) {
    const isUnapproved = partner.tier === 'unapproved'
    const isUnderReview = partner.tier === 'under_review'
    const initial = partner.name.charAt(0).toUpperCase()
    const tierInfo = TIER_LABELS[partner.tier]

    return (
      <div
        key={partner.id}
        onClick={() => handleCardClick(partner)}
        className={`flex items-center gap-4 py-3.5 px-4 transition-colors cursor-pointer hover:bg-ww-gray-50 ${
          isUnderReview ? 'border-l-[3px] border-l-ww-amber' : ''
        }`}
      >
        <div
          className={`w-9 h-9 rounded-md flex items-center justify-center text-sm font-bold font-mono shrink-0 ${
            isUnapproved ? 'bg-ww-gray-100 text-ww-gray-400' : 'bg-ww-sky text-ww-navy'
          }`}
        >
          {initial}
        </div>

        <span
          className={`text-[15px] font-semibold tracking-tight shrink-0 w-44 truncate ${
            isUnapproved ? 'text-ww-gray-400' : 'text-ww-navy'
          }`}
        >
          {partner.name}
        </span>

        <span className={`text-[10px] font-mono font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded-sm shrink-0 ${tierInfo?.color ?? 'bg-gray-100 text-gray-600'}`}>
          {tierInfo?.label ?? partner.tier}
        </span>

        <span
          className={`text-sm flex-1 min-w-0 truncate ${
            isUnapproved ? 'text-ww-gray-300' : 'text-ww-gray-500'
          }`}
        >
          {partner.description}
        </span>

        <div className="shrink-0 flex items-center gap-1.5 ml-3">
          {partner.productsSupported.map(product => (
            <span
              key={product}
              className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm border border-ww-gray-200 text-ww-gray-500 whitespace-nowrap"
            >
              {PRODUCT_LABELS[product] ?? product}
            </span>
          ))}
        </div>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────

  function renderEmpty() {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 rounded-md bg-ww-gray-100 flex items-center justify-center mx-auto mb-3">
          <Search size={18} className="text-ww-gray-400" />
        </div>
        <p className="text-sm font-semibold text-ww-gray-700 mb-1">No partners found</p>
        <p className="text-sm text-ww-gray-500">
          Adjust your search or filter criteria.
        </p>
      </div>
    )
  }

  // ── CUSTOMER VIEW ─────────────────────────────────────────────

  if (!isReviewerView) {
    return (
      <div className="pb-12">
        {!hideHeader && renderHeader()}

        {/* Ask WAIve panel */}
        {agentOpen && (
          <div className="rounded-lg border border-ww-primary/30 bg-white overflow-hidden flex flex-col mt-5" style={{ maxHeight: '480px' }}>
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
                      'Which partners support PestPac integrations?',
                      'Can I request access for a partner not listed here?',
                      'What types of integrations are available?',
                      'How do I get started with an API integration?',
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
                        Thinking...
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
                  placeholder={agentMessages.length > 0 ? 'Ask a follow-up...' : 'Ask WAIve about partners, integrations...'}
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

        {filteredPartners.length === 0 ? (
          renderEmpty()
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
            {filteredPartners.map(partner => renderPartnerCard(partner))}
          </div>
        )}
      </div>
    )
  }

  // ── REVIEWER VIEW ─────────────────────────────────────────────

  return (
    <div className="pb-12">
      {!hideHeader && renderHeader()}

      {filteredPartners.length === 0 ? (
        renderEmpty()
      ) : (
        <div className="mt-4">
          {TIER_SECTIONS.map(section => {
            const sectionPartners = groupedPartners[section.key]
            if (sectionPartners.length === 0) return null

            const isCollapsed = collapsedSections[section.key]

            return (
              <div key={section.key} className="mb-3">
                <button
                  onClick={() => toggleSection(section.key)}
                  className={`w-full flex items-center gap-2.5 py-2.5 px-4 border-l-[3px] ${section.accent} bg-ww-gray-50 hover:bg-ww-gray-100 transition-colors rounded-r-sm`}
                >
                  {isCollapsed ? (
                    <ChevronRight size={14} className="text-ww-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown size={14} className="text-ww-gray-400 shrink-0" />
                  )}
                  <span className="text-[11px] font-mono font-medium uppercase tracking-[0.1em] text-ww-gray-600">
                    {section.label}
                  </span>
                  <span className="text-[11px] font-mono text-ww-gray-400">
                    {sectionPartners.length}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="divide-y divide-ww-gray-100">
                    {sectionPartners.map(partner => renderReviewerRow(partner))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
