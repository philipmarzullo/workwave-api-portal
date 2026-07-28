import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown, ChevronRight, Plus, X, HelpCircle } from 'lucide-react'
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

// ── Monogram color palette ──────────────────────────────────────

const MONOGRAM_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-600' },
  { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { bg: 'bg-amber-50', text: 'text-amber-600' },
  { bg: 'bg-purple-50', text: 'text-purple-600' },
  { bg: 'bg-rose-50', text: 'text-rose-600' },
  { bg: 'bg-cyan-50', text: 'text-cyan-600' },
]

function getMonogramColor(name: string) {
  let hash = 0
  for (const char of name) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length]
}

// ── Tier section config (reviewer only) ─────────────────────────

const TIER_SECTIONS: { key: PartnerTier; label: string; accent: string }[] = [
  { key: 'approved', label: 'Approved', accent: 'border-l-emerald-500' },
  { key: 'under_review', label: 'Under Review', accent: 'border-l-amber-500' },
  { key: 'unapproved', label: 'Not Approved', accent: 'border-l-red-400' },
]

// ── Props ───────────────────────────────────────────────────────

interface DirectoryProps {
  activeUser?: CustomerUser
  isReviewerView?: boolean
}

// ── Component ───────────────────────────────────────────────────

export function Directory({ activeUser, isReviewerView = false }: DirectoryProps) {
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

  // Collapsed sections state (reviewer only)
  const [collapsedSections, setCollapsedSections] = useState<Record<PartnerTier, boolean>>({
    approved: false,
    under_review: false,
    unapproved: false,
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
    }
    for (const partner of filteredPartners) {
      groups[partner.tier]?.push(partner)
    }
    return groups
  }, [filteredPartners])

  // Active filter chips
  const hasActiveFilters = selectedProduct !== '' || selectedIntegrationType !== ''

  // Card click handler
  const handleCardClick = (partner: Partner) => {
    if (!isReviewerView && partner.tier !== 'approved') return
    if (partner.tier === 'unapproved' && !isReviewerView) return
    if (isReviewerView) {
      navigate(`/reviewer/partner/${partner.id}`)
    } else {
      navigate(`/request/${partner.id}`)
    }
  }

  // ── No user selected state ──────────────────────────────────
  if (!isReviewerView && !activeUser) {
    return (
      <div className="py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-ww-gray-100 flex items-center justify-center mx-auto mb-4">
          <HelpCircle size={22} className="text-ww-gray-400" />
        </div>
        <h2 className="font-display text-xl font-semibold text-ww-gray-800 mb-2">
          No User Selected
        </h2>
        <p className="text-sm text-ww-gray-500 max-w-md mx-auto">
          Please select a user from the header menu to browse the partner directory and submit API access requests.
        </p>
      </div>
    )
  }

  // ── Shared header + filters ───────────────────────────────────

  function renderHeader() {
    return (
      <>
        {/* Header row */}
        <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-display font-semibold text-ww-gray-800">
              {isReviewerView ? 'Partner Directory' : 'Integration Partners'}
            </h1>
            <p className="text-sm text-ww-gray-500 mt-0.5">
              {isReviewerView
                ? 'All partners across tiers with approval status and linked customers.'
                : 'Browse approved partners and request API access for your integrations.'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ww-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search partners..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-56 pl-9 pr-3 py-2 rounded-lg border border-ww-gray-200 bg-white text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-blue/30 focus:border-ww-blue transition-colors"
              />
            </div>
            {!isReviewerView && (
              <button
                onClick={() => navigate('/request')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-ww-blue text-white hover:bg-ww-blue-light transition-colors shrink-0"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Request Unlisted Partner</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-3 pb-5 border-b border-ww-gray-100">
          <select
            value={selectedProduct}
            onChange={e => setSelectedProduct(e.target.value as WorkWaveProduct | '')}
            className="px-3 py-1.5 rounded-lg border border-ww-gray-200 bg-white text-xs text-ww-gray-700 focus:outline-none focus:ring-2 focus:ring-ww-blue/30 focus:border-ww-blue transition-colors cursor-pointer"
          >
            <option value="">All Products</option>
            {Object.entries(PRODUCT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={selectedIntegrationType}
            onChange={e => setSelectedIntegrationType(e.target.value as IntegrationType | '')}
            className="px-3 py-1.5 rounded-lg border border-ww-gray-200 bg-white text-xs text-ww-gray-700 focus:outline-none focus:ring-2 focus:ring-ww-blue/30 focus:border-ww-blue transition-colors cursor-pointer"
          >
            <option value="">All Types</option>
            {availableIntegrationTypes.map(type => (
              <option key={type} value={type}>{INTEGRATION_TYPE_LABELS[type]}</option>
            ))}
          </select>
          {hasActiveFilters && (
            <div className="flex items-center gap-2">
              {selectedProduct && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-ww-blue/10 text-ww-blue text-xs font-medium">
                  {PRODUCT_LABELS[selectedProduct] ?? selectedProduct}
                  <button onClick={() => setSelectedProduct('')} className="hover:text-ww-blue/70 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              )}
              {selectedIntegrationType && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-ww-blue/10 text-ww-blue text-xs font-medium">
                  {INTEGRATION_TYPE_LABELS[selectedIntegrationType] ?? selectedIntegrationType}
                  <button onClick={() => setSelectedIntegrationType('')} className="hover:text-ww-blue/70 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>
          )}
          <span className="ml-auto text-xs text-ww-gray-500">
            {filteredPartners.length} {filteredPartners.length === 1 ? 'partner' : 'partners'}
          </span>
        </div>
      </>
    )
  }

  // ── Partner card (customer view) ──────────────────────────────

  function renderPartnerCard(partner: Partner) {
    const mono = getMonogramColor(partner.name)
    const initial = partner.name.charAt(0).toUpperCase()

    return (
      <div
        key={partner.id}
        onClick={() => handleCardClick(partner)}
        className="bg-white rounded-xl border border-ww-gray-200 hover:border-ww-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col overflow-hidden"
      >
        <div className="p-5 flex-1 flex flex-col">
          {/* Logo + Name */}
          <div className="flex items-start gap-3.5 mb-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-semibold shrink-0 ${mono.bg} ${mono.text}`}>
              {initial}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="font-display font-semibold text-ww-gray-800 text-base leading-tight">
                {partner.name}
              </h3>
            </div>
          </div>

          {/* Description — 2 lines then truncate */}
          <p className="text-sm text-ww-gray-500 leading-relaxed mb-4 line-clamp-2">
            {partner.description}
          </p>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Divider */}
          <div className="border-t border-ww-gray-100 pt-3 mt-1">
            <div className="flex items-center justify-between gap-2">
              {/* Product tags */}
              <div className="flex flex-wrap gap-1.5 min-w-0">
                {partner.productsSupported.map(product => (
                  <span
                    key={product}
                    className="text-[11px] font-medium px-2 py-0.5 rounded bg-ww-gray-100 text-ww-gray-600"
                  >
                    {PRODUCT_LABELS[product] ?? product}
                  </span>
                ))}
              </div>
              {/* Integration type */}
              <span className="text-[11px] text-ww-gray-400 whitespace-nowrap shrink-0">
                {INTEGRATION_TYPE_LABELS[partner.integrationType] ?? partner.integrationType}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Reviewer row (for tier-grouped list) ──────────────────────

  function renderReviewerRow(partner: Partner) {
    const isUnapproved = partner.tier === 'unapproved'
    const isUnderReview = partner.tier === 'under_review'
    const mono = getMonogramColor(partner.name)
    const initial = partner.name.charAt(0).toUpperCase()
    const tierInfo = TIER_LABELS[partner.tier]

    return (
      <div
        key={partner.id}
        onClick={() => handleCardClick(partner)}
        className={`flex items-center gap-4 py-4 px-4 transition-colors ${
          isUnapproved
            ? 'cursor-pointer hover:bg-ww-gray-50'
            : 'cursor-pointer hover:bg-ww-gray-50'
        } ${isUnderReview ? 'border-l-[3px] border-l-amber-300' : ''}`}
      >
        {/* Monogram tile */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0 ${
            isUnapproved ? 'bg-ww-gray-100 text-ww-gray-400' : `${mono.bg} ${mono.text}`
          }`}
        >
          {initial}
        </div>

        {/* Name */}
        <span
          className={`text-[15px] font-semibold shrink-0 w-44 truncate ${
            isUnapproved ? 'text-ww-gray-400' : 'text-ww-gray-800'
          }`}
        >
          {partner.name}
        </span>

        {/* Tier badge */}
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${tierInfo?.color ?? 'bg-gray-100 text-gray-600'}`}>
          {tierInfo?.label ?? partner.tier}
        </span>

        {/* Description */}
        <span
          className={`text-sm flex-1 min-w-0 truncate ${
            isUnapproved ? 'text-ww-gray-300' : 'text-ww-gray-500'
          }`}
        >
          {partner.description}
        </span>

        {/* Product tags */}
        <div className="shrink-0 flex items-center gap-1.5 ml-3">
          {partner.productsSupported.map(product => (
            <span
              key={product}
              className="text-[11px] px-1.5 py-0.5 rounded bg-ww-gray-100 text-ww-gray-600 whitespace-nowrap"
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
        <div className="w-12 h-12 rounded-full bg-ww-gray-100 flex items-center justify-center mx-auto mb-3">
          <Search size={20} className="text-ww-gray-400" />
        </div>
        <p className="text-sm font-medium text-ww-gray-700 mb-1">No partners found</p>
        <p className="text-sm text-ww-gray-500">
          Try adjusting your search or filter criteria.
        </p>
      </div>
    )
  }

  // ── CUSTOMER VIEW: Card grid ──────────────────────────────────

  if (!isReviewerView) {
    return (
      <div className="pb-10">
        {renderHeader()}

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

  // ── REVIEWER VIEW: Tier-grouped rows ──────────────────────────

  return (
    <div className="pb-10">
      {renderHeader()}

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
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className={`w-full flex items-center gap-2.5 py-3 px-4 border-l-[3px] ${section.accent} bg-ww-gray-50/60 hover:bg-ww-gray-50 transition-colors rounded-r-lg`}
                >
                  {isCollapsed ? (
                    <ChevronRight size={16} className="text-ww-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-ww-gray-400 shrink-0" />
                  )}
                  <span className="text-sm font-display font-semibold text-ww-gray-700">
                    {section.label}
                  </span>
                  <span className="text-xs text-ww-gray-400 font-normal">
                    {sectionPartners.length}
                  </span>
                </button>

                {/* Section rows */}
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
