import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  ArrowRight,
  HelpCircle,
  Puzzle,
  ShieldCheck,
  Eye,
} from 'lucide-react'
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
  const [selectedTier, setSelectedTier] = useState<PartnerTier | ''>('')

  // Gather unique integration types from partners for the filter dropdown
  const availableIntegrationTypes = useMemo(() => {
    const types = new Set(partners.map(p => p.integrationType))
    return Array.from(types).sort()
  }, [partners])

  // Filtered partners
  const filteredPartners = useMemo(() => {
    return partners.filter((partner: Partner) => {
      // Search by name
      if (searchQuery && !partner.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      // Filter by product
      if (selectedProduct && !partner.productsSupported.includes(selectedProduct)) {
        return false
      }
      // Filter by integration type
      if (selectedIntegrationType && partner.integrationType !== selectedIntegrationType) {
        return false
      }
      // Filter by tier (reviewer view only)
      if (selectedTier && partner.tier !== selectedTier) {
        return false
      }
      return true
    })
  }, [partners, searchQuery, selectedProduct, selectedIntegrationType, selectedTier])

  // If no active user in customer view, show a prompt
  if (!isReviewerView && !activeUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-ww-sky flex items-center justify-center mx-auto mb-5">
          <HelpCircle size={28} className="text-ww-blue" />
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
    <div className="min-h-[calc(100vh-8rem)]">
      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-ww-navy via-ww-navy-light to-ww-navy py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium mb-6">
            <Puzzle size={14} />
            <span>WorkWave Integration Ecosystem</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Integration Partner Directory
          </h1>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Browse our approved integration partners, explore available connections for your
            WorkWave products, and request API access to power your business workflows.
          </p>
        </div>
      </section>

      {/* ── Filter & Search Bar ────────────────────────────────────── */}
      <section className="bg-white border-b border-ww-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ww-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search partners..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-ww-gray-200 bg-ww-gray-50 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-blue/30 focus:border-ww-blue transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-ww-gray-500 font-medium shrink-0">
                <Filter size={13} />
                <span className="hidden sm:inline">Filters:</span>
              </div>

              {/* Product filter */}
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value as WorkWaveProduct | '')}
                className="px-3 py-2 rounded-lg border border-ww-gray-200 bg-ww-gray-50 text-xs text-ww-gray-700 focus:outline-none focus:ring-2 focus:ring-ww-blue/30 focus:border-ww-blue transition-colors cursor-pointer"
              >
                <option value="">All Products</option>
                {Object.entries(PRODUCT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Integration type filter */}
              <select
                value={selectedIntegrationType}
                onChange={e => setSelectedIntegrationType(e.target.value as IntegrationType | '')}
                className="px-3 py-2 rounded-lg border border-ww-gray-200 bg-ww-gray-50 text-xs text-ww-gray-700 focus:outline-none focus:ring-2 focus:ring-ww-blue/30 focus:border-ww-blue transition-colors cursor-pointer"
              >
                <option value="">All Types</option>
                {availableIntegrationTypes.map(type => (
                  <option key={type} value={type}>
                    {INTEGRATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>

              {/* Tier filter (reviewer view only) */}
              {isReviewerView && (
                <select
                  value={selectedTier}
                  onChange={e => setSelectedTier(e.target.value as PartnerTier | '')}
                  className="px-3 py-2 rounded-lg border border-ww-gray-200 bg-ww-gray-50 text-xs text-ww-gray-700 focus:outline-none focus:ring-2 focus:ring-ww-blue/30 focus:border-ww-blue transition-colors cursor-pointer"
                >
                  <option value="">All Tiers</option>
                  {Object.entries(TIER_LABELS).map(([value, { label }]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Partner Grid ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Results count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-ww-gray-500">
            Showing <span className="font-semibold text-ww-gray-700">{filteredPartners.length}</span>{' '}
            {filteredPartners.length === 1 ? 'partner' : 'partners'}
          </p>
        </div>

        {filteredPartners.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-ww-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search size={22} className="text-ww-gray-400" />
            </div>
            <h3 className="font-display text-lg font-semibold text-ww-gray-700 mb-1">
              No partners found
            </h3>
            <p className="text-sm text-ww-gray-500 max-w-sm mx-auto">
              Try adjusting your search or filter criteria, or request access to a partner not listed below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPartners.map((partner: Partner) => {
              const tierInfo = TIER_LABELS[partner.tier] ?? {
                label: partner.tier,
                color: 'bg-gray-100 text-gray-600',
              }

              return (
                <div
                  key={partner.id}
                  className="bg-white rounded-xl border border-ww-gray-200 hover:shadow-lg hover:border-ww-gray-300 transition-all duration-200 flex flex-col overflow-hidden group"
                >
                  {/* Card body */}
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Top row: logo + name + tier */}
                    <div className="flex items-start gap-3.5 mb-3">
                      <div className="w-12 h-12 rounded-full bg-ww-sky flex items-center justify-center text-2xl shrink-0">
                        {partner.logo}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-semibold text-ww-gray-800 text-base leading-tight truncate">
                          {partner.name}
                        </h3>
                        <span
                          className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${tierInfo.color}`}
                        >
                          {tierInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-ww-gray-600 leading-relaxed mb-4 line-clamp-2">
                      {partner.description}
                    </p>

                    {/* Products supported */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {partner.productsSupported.map(product => (
                        <span
                          key={product}
                          className="text-[10px] font-medium px-2 py-0.5 rounded bg-ww-sky text-ww-blue"
                        >
                          {PRODUCT_LABELS[product] ?? product}
                        </span>
                      ))}
                    </div>

                    {/* Integration type */}
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-ww-gray-100 text-ww-gray-600">
                        <Puzzle size={10} />
                        {INTEGRATION_TYPE_LABELS[partner.integrationType] ?? partner.integrationType}
                      </span>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Action button */}
                    {isReviewerView ? (
                      <button
                        onClick={() => navigate(`/reviewer/partner/${partner.id}`)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-ww-gray-100 text-ww-gray-700 hover:bg-ww-gray-200 transition-colors"
                      >
                        <Eye size={15} />
                        View Details
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/request/${partner.id}`)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-ww-navy text-white hover:bg-ww-navy-light transition-colors"
                      >
                        <ShieldCheck size={15} />
                        Request Access
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Secondary CTA ──────────────────────────────────────────── */}
      {!isReviewerView && (
        <section className="bg-ww-sky border-t border-ww-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-ww-gray-800 mb-2">
              Need a partner not listed?
            </h2>
            <p className="text-sm text-ww-gray-600 max-w-lg mx-auto mb-6">
              You can still request API access for an integration partner or internal project that
              is not yet in our directory. We will review your request and get back to you.
            </p>
            <button
              onClick={() => navigate('/request')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-ww-navy text-white hover:bg-ww-navy-light transition-colors shadow-sm"
            >
              Submit a Request
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
