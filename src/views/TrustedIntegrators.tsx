import { useState, useMemo } from 'react'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Search,
  ChevronDown,
  ChevronRight,
  Swords,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Users,
  FileText,
  Ban,
  ExternalLink,
} from 'lucide-react'
import type { TrustedIntegrator, IntegratorPlatform, CompetitiveLevel, TrustedLevel, IntegratorStatus } from '@/data/types'
import rawIntegrators from '@/data/trusted-integrators.json'

const integrators = rawIntegrators as TrustedIntegrator[]

// ── Label maps ──────────────────────────────────────────────

const PLATFORM_LABELS: Record<IntegratorPlatform, string> = {
  pestpac: 'PestPac',
  realgreen: 'RealGreen',
  winteam: 'WinTeam',
  international: 'International',
}

const PLATFORM_COLORS: Record<IntegratorPlatform, string> = {
  pestpac: 'bg-emerald-100 text-emerald-700',
  realgreen: 'bg-lime-100 text-lime-700',
  winteam: 'bg-sky-100 text-sky-700',
  international: 'bg-violet-100 text-violet-700',
}

const COMPETITIVE_CONFIG: Record<CompetitiveLevel, { label: string; color: string; icon: typeof Swords }> = {
  extremely: { label: 'Extremely Competitive', color: 'text-red-700 bg-red-50 border-red-200', icon: Swords },
  somewhat: { label: 'Somewhat Competitive', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle },
  none: { label: 'Not Competitive', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  unknown: { label: 'Unknown', color: 'text-gray-500 bg-gray-50 border-gray-200', icon: ShieldQuestion },
}

const TRUSTED_CONFIG: Record<TrustedLevel, { label: string; color: string; icon: typeof Shield }> = {
  trusted: { label: 'Trusted', color: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
  questionable: { label: 'Questionable', color: 'bg-amber-100 text-amber-700', icon: ShieldQuestion },
  not_trusted: { label: 'Not Trusted', color: 'bg-red-100 text-red-700', icon: ShieldAlert },
  unknown: { label: 'Not Assessed', color: 'bg-gray-100 text-gray-500', icon: Shield },
}

const STATUS_LABELS: Record<IntegratorStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-500' },
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
}

const INTEGRATION_TYPE_LABELS: Record<string, string> = {
  partner_api: 'Partner API',
  customer_api: 'Customer API',
  manual: 'Manual',
  none: 'None',
}

// ── Main component ──────────────────────────────────────────

export function TrustedIntegrators({ isReviewerView = false }: { isReviewerView?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState<IntegratorPlatform | 'all'>('all')
  const [competitiveFilter, setCompetitiveFilter] = useState<CompetitiveLevel | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<IntegratorStatus | 'all'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // ── Stats ──

  const stats = useMemo(() => {
    return {
      total: integrators.length,
      active: integrators.filter(i => i.status === 'active').length,
      trusted: integrators.filter(i => i.trustedStatus === 'trusted').length,
      competitive: integrators.filter(i => i.competitiveLevel === 'extremely').length,
      withAgreement: integrators.filter(i => i.commercialAgreement === 'yes').length,
      doNotApprove: integrators.filter(i => i.doNotApprove).length,
    }
  }, [])

  // ── Platform counts ──

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const i of integrators) {
      for (const p of i.platforms) {
        counts[p] = (counts[p] ?? 0) + 1
      }
    }
    return counts
  }, [])

  // ── Filtered list ──

  const filtered = useMemo(() => {
    let result = integrators

    // Customer view: only show active trusted integrators
    if (!isReviewerView) {
      result = result.filter(i => i.status === 'active' && i.trustedStatus === 'trusted' && !i.doNotApprove)
    }

    if (platformFilter !== 'all') {
      result = result.filter(i => i.platforms.includes(platformFilter))
    }

    if (competitiveFilter !== 'all') {
      result = result.filter(i => i.competitiveLevel === competitiveFilter)
    }

    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.notes && i.notes.toLowerCase().includes(q))
      )
    }

    // Sort: extremely competitive first, then by name
    if (isReviewerView) {
      const compOrder: Record<string, number> = { extremely: 0, somewhat: 1, none: 2, unknown: 3 }
      result = [...result].sort((a, b) => {
        const ca = compOrder[a.competitiveLevel] ?? 3
        const cb = compOrder[b.competitiveLevel] ?? 3
        if (ca !== cb) return ca - cb
        return a.name.localeCompare(b.name)
      })
    } else {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name))
    }

    return result
  }, [searchQuery, platformFilter, competitiveFilter, statusFilter, isReviewerView])

  // ── Total ARR ──

  const totalARR = useMemo(() => {
    return integrators.reduce((sum, i) => sum + (i.impactARR ?? 0), 0)
  }, [])

  return (
    <div className="py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-ww-primary/10 flex items-center justify-center">
            <Shield size={18} className="text-ww-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-ww-navy">
              {isReviewerView ? 'Integrator & Partner Directory' : 'Trusted Integrators'}
            </h1>
            <p className="text-sm text-ww-gray-500 mt-0.5">
              {isReviewerView
                ? `${stats.total} integrators and partners across all platforms`
                : 'Approved integration partners for WorkWave products'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards (reviewer only) */}
      {isReviewerView && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Trusted" value={stats.trusted} />
          <StatCard label="Highly Competitive" value={stats.competitive} accent="text-red-600" />
          <StatCard label="With Agreement" value={stats.withAgreement} />
          <StatCard label="Total ARR Impact" value={`$${Math.round(totalARR / 1000)}k`} />
        </div>
      )}

      {/* Platform tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <button
          onClick={() => setPlatformFilter('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
            platformFilter === 'all'
              ? 'bg-ww-navy text-white shadow-sm'
              : 'bg-white border border-ww-gray-200 text-ww-gray-700 hover:border-ww-gray-300'
          }`}
        >
          All Platforms
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
            platformFilter === 'all' ? 'bg-white/20 text-white' : 'bg-ww-gray-100 text-ww-gray-500'
          }`}>
            {filtered.length}
          </span>
        </button>
        {(['pestpac', 'realgreen', 'winteam', 'international'] as IntegratorPlatform[]).map(p => (
          <button
            key={p}
            onClick={() => setPlatformFilter(platformFilter === p ? 'all' : p)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap ${
              platformFilter === p
                ? 'bg-ww-navy text-white shadow-sm'
                : 'bg-white border border-ww-gray-200 text-ww-gray-700 hover:border-ww-gray-300'
            }`}
          >
            {PLATFORM_LABELS[p]}
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              platformFilter === p ? 'bg-white/20 text-white' : 'bg-ww-gray-100 text-ww-gray-500'
            }`}>
              {platformCounts[p] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ww-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search integrators..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-ww-gray-200 rounded-lg focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
          />
        </div>

        {isReviewerView && (
          <>
            <select
              value={competitiveFilter}
              onChange={e => setCompetitiveFilter(e.target.value as CompetitiveLevel | 'all')}
              className="text-sm border border-ww-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-ww-primary/30 outline-none"
            >
              <option value="all">All Competitive Levels</option>
              <option value="extremely">Extremely Competitive</option>
              <option value="somewhat">Somewhat Competitive</option>
              <option value="none">Not Competitive</option>
              <option value="unknown">Unknown</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as IntegratorStatus | 'all')}
              className="text-sm border border-ww-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-ww-primary/30 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </>
        )}
      </div>

      {/* Count */}
      <p className="text-[12px] font-mono text-ww-gray-400">
        {filtered.length} integrator{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Integrator list */}
      <div className="space-y-1.5">
        {filtered.map(integrator => {
          const isExpanded = expandedId === integrator.id
          const compConfig = COMPETITIVE_CONFIG[integrator.competitiveLevel]
          const trustedInfo = TRUSTED_CONFIG[integrator.trustedStatus]
          const statusInfo = STATUS_LABELS[integrator.status]
          const CompIcon = compConfig.icon
          const TrustIcon = trustedInfo.icon

          return (
            <div
              key={integrator.id}
              className={`border rounded-lg overflow-hidden bg-white transition-colors ${
                integrator.doNotApprove
                  ? 'border-red-200'
                  : integrator.competitiveLevel === 'extremely'
                    ? 'border-red-100'
                    : 'border-ww-gray-200'
              }`}
            >
              {/* Row header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : integrator.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ww-gray-50/50 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown size={14} className="text-ww-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-ww-gray-400 shrink-0" />
                )}

                {/* Name */}
                <span className="text-[13px] font-semibold text-ww-navy min-w-[160px] truncate">
                  {integrator.name}
                </span>

                {/* Do Not Approve flag */}
                {integrator.doNotApprove && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 shrink-0">
                    <Ban size={10} />
                    DO NOT APPROVE
                  </span>
                )}

                {/* Trust badge */}
                {isReviewerView && integrator.trustedStatus !== 'unknown' && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${trustedInfo.color}`}>
                    <TrustIcon size={10} />
                    {trustedInfo.label}
                  </span>
                )}

                {/* Platform badges */}
                <div className="flex items-center gap-1 shrink-0">
                  {integrator.platforms.map(p => (
                    <span key={p} className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${PLATFORM_COLORS[p]}`}>
                      {PLATFORM_LABELS[p]}
                    </span>
                  ))}
                </div>

                {/* Status */}
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>

                {/* Competitive indicator (reviewer) */}
                {isReviewerView && integrator.competitiveLevel !== 'unknown' && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${compConfig.color}`}>
                    <CompIcon size={10} />
                    {integrator.competitiveLevel === 'extremely' ? 'Highly Competitive' : integrator.competitiveLevel === 'somewhat' ? 'Somewhat' : 'Safe'}
                  </span>
                )}

                {/* Integration type */}
                <span className="text-[11px] text-ww-gray-400 ml-auto shrink-0">
                  {INTEGRATION_TYPE_LABELS[integrator.integrationType] ?? integrator.integrationType}
                </span>

                {/* ARR (reviewer) */}
                {isReviewerView && integrator.impactARR !== null && integrator.impactARR > 0 && (
                  <span className="text-[11px] font-mono text-ww-gray-500 shrink-0">
                    ${(integrator.impactARR / 1000).toFixed(0)}k
                  </span>
                )}
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-ww-gray-100 px-4 py-4 bg-ww-gray-50/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Left column */}
                    <div className="space-y-3">
                      <DetailRow icon={Shield} label="Trust Status">
                        <span className={`inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded ${trustedInfo.color}`}>
                          <TrustIcon size={12} />
                          {trustedInfo.label}
                        </span>
                      </DetailRow>

                      <DetailRow icon={Swords} label="Competitive Level">
                        <span className={`inline-flex items-center gap-1 text-[12px] font-medium px-2 py-0.5 rounded border ${compConfig.color}`}>
                          <CompIcon size={12} />
                          {compConfig.label}
                        </span>
                      </DetailRow>

                      <DetailRow icon={FileText} label="Integration Type">
                        <span className="text-[12px] text-ww-gray-700">
                          {INTEGRATION_TYPE_LABELS[integrator.integrationType]}
                        </span>
                      </DetailRow>

                      <DetailRow icon={ExternalLink} label="Platforms">
                        <div className="flex gap-1 flex-wrap">
                          {integrator.platforms.map(p => (
                            <span key={p} className={`text-[11px] font-medium px-2 py-0.5 rounded ${PLATFORM_COLORS[p]}`}>
                              {PLATFORM_LABELS[p]}
                            </span>
                          ))}
                        </div>
                      </DetailRow>
                    </div>

                    {/* Right column */}
                    <div className="space-y-3">
                      {isReviewerView && (
                        <>
                          <DetailRow icon={CheckCircle2} label="Commercial Agreement">
                            <span className="text-[12px] text-ww-gray-700">
                              {integrator.commercialAgreement === 'yes' ? 'Yes' : integrator.commercialAgreement === 'prospect' ? 'Prospect' : 'No'}
                            </span>
                          </DetailRow>

                          {integrator.impactARR !== null && integrator.impactARR > 0 && (
                            <DetailRow icon={DollarSign} label="ARR Impact">
                              <span className="text-[12px] font-semibold text-ww-navy">
                                ${integrator.impactARR.toLocaleString()}
                              </span>
                            </DetailRow>
                          )}

                          {integrator.estimatedCustomers && (
                            <DetailRow icon={Users} label="Estimated Customers">
                              <span className="text-[12px] text-ww-gray-700">{integrator.estimatedCustomers}</span>
                            </DetailRow>
                          )}
                        </>
                      )}

                      {integrator.action && isReviewerView && (
                        <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200">
                          <p className="text-[10px] font-mono text-amber-700 uppercase tracking-wider mb-1">Required Action</p>
                          <p className="text-[12px] text-amber-800 leading-relaxed">{integrator.action}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {integrator.notes && (
                    <div className="mt-3 p-2.5 rounded-md bg-ww-gray-50 border border-ww-gray-100">
                      <p className="text-[10px] font-mono text-ww-gray-400 uppercase tracking-wider mb-1">Notes</p>
                      <p className="text-[12px] text-ww-gray-600 leading-relaxed">{integrator.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-ww-gray-400">
            <Search size={24} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No integrators match the current filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="p-3 rounded-lg border border-ww-gray-200 bg-white">
      <p className="text-[11px] font-mono text-ww-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-display font-bold mt-0.5 ${accent ?? 'text-ww-navy'}`}>{value}</p>
    </div>
  )
}

function DetailRow({ icon: Icon, label, children }: { icon: typeof Shield; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={13} className="text-ww-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-mono text-ww-gray-400 uppercase tracking-wider">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  )
}
