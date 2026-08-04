import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown, ChevronRight, Plus, X, HelpCircle, ExternalLink, Sparkles, Loader2, ChevronLeft } from 'lucide-react'
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

  // Partner detail panel state (customer view)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [partnerSummary, setPartnerSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

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
      setSelectedPartner(partner)
      setPartnerSummary(null)
      setSummaryLoading(false)
    }
  }

  const generatePartnerSummary = async (partner: Partner) => {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Give me a customer-friendly overview of the integration partner "${partner.name}". They are a ${INTEGRATION_TYPE_LABELS[partner.integrationType]} integration partner supporting ${partner.productsSupported.map(p => PRODUCT_LABELS[p] ?? p).join(', ')}. Their website is ${partner.website}. Description: ${partner.description}. Include: what they do, how they integrate with WorkWave products, which industries they serve, and key benefits for customers. Keep it concise and informative.`,
          page: 'directory',
          role: 'customer',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setPartnerSummary(data.answer)
      }
    } catch {
      setPartnerSummary('Unable to generate summary at this time. Please try again later.')
    } finally {
      setSummaryLoading(false)
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
              <button
                onClick={() => navigate('/request')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-semibold bg-ww-primary text-white hover:bg-ww-primary-light transition-colors shrink-0"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Request Unlisted Partner</span>
                <span className="sm:hidden">New</span>
              </button>
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

  // ── Partner detail panel (customer view) ─────────────────────

  function renderPartnerDetail(partner: Partner) {
    const initial = partner.name.charAt(0).toUpperCase()

    return (
      <div className="pb-12">
        {/* Back button */}
        <div className="pt-6 pb-4">
          <button
            onClick={() => { setSelectedPartner(null); setPartnerSummary(null) }}
            className="flex items-center gap-1.5 text-sm text-ww-gray-500 hover:text-ww-primary transition-colors"
          >
            <ChevronLeft size={16} />
            Back to directory
          </button>
        </div>

        <div className="bg-white rounded-md border border-ww-gray-200 overflow-hidden">
          {/* Partner header */}
          <div className="px-6 py-6 border-b border-ww-gray-100">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-md bg-ww-sky flex items-center justify-center text-2xl font-bold font-mono text-ww-navy shrink-0">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-xl font-bold text-ww-navy mb-1">
                  {partner.name}
                </h2>
                <p className="text-sm text-ww-gray-500 leading-relaxed mb-3">
                  {partner.description}
                </p>
                {partner.website && (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-ww-primary hover:underline"
                  >
                    <ExternalLink size={12} />
                    {partner.website}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Partner metadata */}
          <div className="px-6 py-4 border-b border-ww-gray-100">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div>
                <dt className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em] mb-1">Integration Type</dt>
                <dd className="text-sm font-medium text-ww-gray-800">
                  {INTEGRATION_TYPE_LABELS[partner.integrationType] ?? partner.integrationType}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em] mb-1">Products Supported</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {partner.productsSupported.map(product => (
                    <span
                      key={product}
                      className="text-[11px] font-mono font-medium uppercase tracking-[0.05em] px-2 py-0.5 rounded-sm border border-ww-gray-200 text-ww-gray-600"
                    >
                      {PRODUCT_LABELS[product] ?? product}
                    </span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em] mb-1">Category</dt>
                <dd className="text-sm font-medium text-ww-gray-800">{partner.category}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em] mb-1">Status</dt>
                <dd>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold font-mono ${TIER_LABELS[partner.tier]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                    {TIER_LABELS[partner.tier]?.label ?? partner.tier}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* AI Overview */}
          <div className="px-6 py-5 border-b border-ww-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-mono font-semibold text-ww-gray-900 uppercase tracking-[0.06em] flex items-center gap-2">
                <Sparkles size={14} className="text-purple-500" />
                AI Overview
              </h3>
              {!partnerSummary && !summaryLoading && (
                <button
                  onClick={() => generatePartnerSummary(partner)}
                  className="text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  Generate
                </button>
              )}
            </div>
            {summaryLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 size={16} className="text-purple-500 animate-spin" />
                <span className="text-sm text-ww-gray-500">Generating partner overview...</span>
              </div>
            ) : partnerSummary ? (
              <div className="text-sm text-ww-gray-700 leading-relaxed whitespace-pre-wrap bg-purple-50/50 rounded-md p-4 border border-purple-100">
                {partnerSummary}
              </div>
            ) : (
              <p className="text-sm text-ww-gray-400 italic">
                Click "Generate" to get an AI-powered overview of this partner.
              </p>
            )}
          </div>

          {/* Request Access button */}
          <div className="px-6 py-5">
            <button
              onClick={() => navigate(`/request/${partner.id}`)}
              className="w-full px-5 py-3 rounded-lg bg-ww-primary text-white text-sm font-semibold hover:bg-ww-primary-light transition-colors flex items-center justify-center gap-2"
            >
              Request Access
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!isReviewerView) {
    // Show partner detail panel if one is selected
    if (selectedPartner) {
      return renderPartnerDetail(selectedPartner)
    }

    return (
      <div className="pb-12">
        {!hideHeader && renderHeader()}

        {/* Hero CTA */}
        <div className="bg-gradient-to-r from-ww-navy to-ww-primary/90 rounded-xl p-6 mt-5 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-bold">Ready to integrate?</h2>
              <p className="text-white/70 text-sm mt-1">Select a partner below or let WAIve guide you through the process</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('waive:start-wizard'))}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#6310D1] text-white text-sm font-semibold hover:bg-[#5009B0] transition-colors shadow-lg shadow-[#6310D1]/30"
              >
                <WaiveIcon size={16} className="brightness-0 invert" />
                Guided Request
              </button>
              <button
                onClick={() => navigate('/request')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-ww-navy text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                <Plus size={16} />
                Request API Access
              </button>
              <button
                onClick={() => navigate('/request?self=true')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-white/40 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                Build Your Own
              </button>
            </div>
          </div>
        </div>

        {/* Product-first filter */}
        <div className="flex items-center gap-2 mt-5 mb-1">
          <span className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider mr-1">Filter by product:</span>
          {(['pestpac', 'realgreen', 'winteam'] as const).map(product => (
            <button
              key={product}
              onClick={() => setSelectedProduct(selectedProduct === product ? '' : product)}
              className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                selectedProduct === product
                  ? 'bg-ww-navy text-white shadow-sm'
                  : 'bg-white border border-ww-gray-200 text-ww-gray-700 hover:border-ww-gray-300 hover:bg-ww-gray-50'
              }`}
            >
              {PRODUCT_LABELS[product]}
            </button>
          ))}
          {selectedProduct && (
            <button
              onClick={() => setSelectedProduct('')}
              className="text-[11px] text-ww-gray-400 hover:text-ww-gray-600 transition-colors ml-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

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

  // ── Compact search + filters for embedded (hideHeader) mode ──

  function renderCompactFilters() {
    return (
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-ww-gray-200">
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
            className="w-52 pl-9 pr-3 py-1.5 rounded-md border border-ww-gray-200 bg-white text-sm placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary/20 focus:border-ww-primary transition-colors"
          />
        </div>
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
          <button
            onClick={() => { setSelectedProduct(''); setSelectedIntegrationType('') }}
            className="text-[11px] text-ww-gray-500 hover:text-ww-gray-700 transition-colors"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-[11px] text-ww-gray-400 font-mono">
          {filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''}
        </span>
      </div>
    )
  }

  // ── REVIEWER VIEW ─────────────────────────────────────────────

  return (
    <div className="pb-12">
      {!hideHeader && renderHeader()}
      {hideHeader && renderCompactFilters()}

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
