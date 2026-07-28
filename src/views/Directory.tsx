import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronDown, ChevronRight, Plus, X } from 'lucide-react'
import { store } from '@/data/store'
import type { CustomerUser, WorkWaveProduct, IntegrationType, PartnerTier, Partner } from '@/data/types'
import { PRODUCT_LABELS } from '@/App'

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
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

function getMonogramColor(name: string) {
  let hash = 0
  for (const char of name) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return MONOGRAM_COLORS[Math.abs(hash) % MONOGRAM_COLORS.length]
}

// ── Tier section config ─────────────────────────────────────────

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
  const partners = store.getPartners()

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<WorkWaveProduct | ''>('')
  const [selectedIntegrationType, setSelectedIntegrationType] = useState<IntegrationType | ''>('')

  // Collapsed sections state — reviewer sees all expanded, customer collapses under_review and unapproved
  const [collapsedSections, setCollapsedSections] = useState<Record<PartnerTier, boolean>>({
    approved: false,
    under_review: !isReviewerView,
    unapproved: !isReviewerView,
  })

  const toggleSection = (tier: PartnerTier) => {
    setCollapsedSections(prev => ({ ...prev, [tier]: !prev[tier] }))
  }

  // Gather unique integration types from partners
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

  // Group filtered partners by tier
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

  // Row click handler
  const handleRowClick = (partner: Partner) => {
    if (partner.tier === 'unapproved') return
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
          <Search size={22} className="text-ww-gray-400" />
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

  return (
    <div className="pb-10">
      {/* ── Compact Header ─────────────────────────────────────────── */}
      <div className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-display font-semibold text-ww-gray-800">
            Integration Partners
          </h1>
          <p className="text-sm text-ww-gray-500 mt-0.5">
            Browse approved partners, request API access, or suggest a new integration.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Search */}
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
          {/* Request a partner not listed */}
          {!isReviewerView && (
            <button
              onClick={() => navigate('/request')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-ww-blue text-white hover:bg-ww-blue/90 transition-colors shrink-0"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Request Unlisted Partner</span>
              <span className="sm:hidden">New</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Chips Row ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 pb-5 border-b border-ww-gray-100">
        {/* Product filter dropdown */}
        <select
          value={selectedProduct}
          onChange={e => setSelectedProduct(e.target.value as WorkWaveProduct | '')}
          className="px-3 py-1.5 rounded-lg border border-ww-gray-200 bg-white text-xs text-ww-gray-700 focus:outline-none focus:ring-2 focus:ring-ww-blue/30 focus:border-ww-blue transition-colors cursor-pointer"
        >
          <option value="">All Products</option>
          {Object.entries(PRODUCT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* Integration type filter dropdown */}
        <select
          value={selectedIntegrationType}
          onChange={e => setSelectedIntegrationType(e.target.value as IntegrationType | '')}
          className="px-3 py-1.5 rounded-lg border border-ww-gray-200 bg-white text-xs text-ww-gray-700 focus:outline-none focus:ring-2 focus:ring-ww-blue/30 focus:border-ww-blue transition-colors cursor-pointer"
        >
          <option value="">All Types</option>
          {availableIntegrationTypes.map(type => (
            <option key={type} value={type}>
              {INTEGRATION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            {selectedProduct && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-ww-blue/10 text-ww-blue text-xs font-medium">
                {PRODUCT_LABELS[selectedProduct] ?? selectedProduct}
                <button
                  onClick={() => setSelectedProduct('')}
                  className="hover:text-ww-blue/70 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedIntegrationType && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-ww-blue/10 text-ww-blue text-xs font-medium">
                {INTEGRATION_TYPE_LABELS[selectedIntegrationType] ?? selectedIntegrationType}
                <button
                  onClick={() => setSelectedIntegrationType('')}
                  className="hover:text-ww-blue/70 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Result count — pushed right */}
        <span className="ml-auto text-xs text-ww-gray-500">
          {filteredPartners.length} {filteredPartners.length === 1 ? 'partner' : 'partners'}
        </span>
      </div>

      {/* ── Empty State ────────────────────────────────────────────── */}
      {filteredPartners.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-ww-gray-100 flex items-center justify-center mx-auto mb-3">
            <Search size={20} className="text-ww-gray-400" />
          </div>
          <p className="text-sm font-medium text-ww-gray-700 mb-1">No partners found</p>
          <p className="text-sm text-ww-gray-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        /* ── Tier-grouped Sections ──────────────────────────────────── */
        <div className="mt-2">
          {TIER_SECTIONS.map(section => {
            const sectionPartners = groupedPartners[section.key]
            if (sectionPartners.length === 0) return null

            const isCollapsed = collapsedSections[section.key]

            return (
              <div key={section.key} className="mb-2">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className={`w-full flex items-center gap-2.5 py-3 px-3 border-l-[3px] ${section.accent} bg-ww-gray-50/60 hover:bg-ww-gray-50 transition-colors rounded-r-lg`}
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
                  <div>
                    {sectionPartners.map((partner: Partner) => {
                      const isUnapproved = partner.tier === 'unapproved'
                      const isUnderReview = partner.tier === 'under_review'
                      const monogramColor = getMonogramColor(partner.name)
                      const monogramLetter = partner.name.charAt(0).toUpperCase()

                      return (
                        <div
                          key={partner.id}
                          onClick={() => handleRowClick(partner)}
                          className={`flex items-center gap-3 h-16 px-3 border-b border-ww-gray-100 transition-colors ${
                            isUnapproved
                              ? 'cursor-default'
                              : 'cursor-pointer hover:bg-ww-gray-50'
                          } ${isUnderReview ? 'border-l-[3px] border-l-amber-300' : ''}`}
                        >
                          {/* Monogram tile */}
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0 ${
                              isUnapproved ? 'bg-ww-gray-100 text-ww-gray-400' : monogramColor
                            }`}
                          >
                            {monogramLetter}
                          </div>

                          {/* Name */}
                          <span
                            className={`text-sm font-medium shrink-0 w-40 truncate ${
                              isUnapproved ? 'text-ww-gray-400' : 'text-ww-gray-800'
                            }`}
                          >
                            {partner.name}
                          </span>

                          {/* Description */}
                          <span
                            className={`text-sm flex-1 min-w-0 truncate ${
                              isUnapproved ? 'text-ww-gray-300' : 'text-ww-gray-500'
                            }`}
                          >
                            {partner.description}
                          </span>

                          {/* Right side: product tags or unapproved message */}
                          <div className="shrink-0 flex items-center gap-1.5 ml-3">
                            {isUnapproved ? (
                              <span className="text-xs text-ww-gray-400 italic whitespace-nowrap">
                                Not approved for API access
                              </span>
                            ) : (
                              partner.productsSupported.map(product => (
                                <span
                                  key={product}
                                  className="text-[11px] px-1.5 py-0.5 rounded bg-ww-gray-100 text-ww-gray-600 whitespace-nowrap"
                                >
                                  {PRODUCT_LABELS[product] ?? product}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      )
                    })}
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
