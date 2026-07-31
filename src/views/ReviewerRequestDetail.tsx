import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  User,
  Globe,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Flag,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Server,
  FlaskConical,
  ExternalLink,
  BookOpen,
  Database,
  Users,
  ChevronDown,
  DollarSign,
  FileText,
  StickyNote,
  Save,
  ListChecks,
  ArrowUpFromLine,
  Tag,
  Briefcase,
  TriangleAlert,
  Pause,
  Play,
  Swords,
  Ban,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react'
import type { ApprovalStage, ApprovalDecision, ApiPricing, VolumeTier, ApiCategory, SupportPackage, CatalogEndpoint, CatalogDomain } from '@/data/types'
import { store, VOLUME_TIERS, suggestTier } from '@/data/store'
import rawCatalog from '@/data/winteam-api-catalog.json'
import { DOMAIN_LABELS, GENERATION_LABELS, METHOD_COLORS } from '@/data/catalog-labels'
import { matchEndpointsRequested } from '@/data/catalog-matcher'
import type { MatchResults } from '@/data/catalog-matcher'

const catalog = rawCatalog as CatalogEndpoint[]
import {
  PRODUCT_LABELS,
  STATUS_LABELS,
  TIER_LABELS,
  USE_CASE_LABELS,
  DATA_CATEGORY_LABELS,
  STAGE_LABELS,
  STAGE_REVIEWER_ROLES,
  REQUEST_TYPE_LABELS,
  LEGACY_METHOD_LABELS,
  GATEWAY_LABELS,
  VOLUME_TIER_LABELS,
  API_CATEGORY_LABELS,
  SUPPORT_PACKAGE_LABELS,
} from '@/App'

const BUILDER_TYPE_LABELS: Record<string, string> = {
  partner: 'Partner',
  internal_team: 'Internal Team',
  contractor: 'Contractor',
}

const DECISION_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: 'text-emerald-700' },
  denied: { label: 'Denied', color: 'text-red-700' },
  needs_info: { label: 'More Info Requested', color: 'text-amber-700' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ReviewerRequestDetail({ onRefresh }: { onRefresh: () => void }) {
  const { requestId } = useParams<{ requestId: string }>()
  const navigate = useNavigate()

  const [stage, setStage] = useState<ApprovalStage>('initial_review')
  const [decision, setDecision] = useState<ApprovalDecision | null>(null)
  const [rationale, setRationale] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false)

  // Pricing state
  const [selectedVolumeTier, setSelectedVolumeTier] = useState<VolumeTier | null>(null)
  const [pricingNotes, setPricingNotes] = useState('')
  const [pricingSaved, setPricingSaved] = useState(false)
  const [estimatedVolumeInput, setEstimatedVolumeInput] = useState('')
  const [categoriesRefresh, setCategoriesRefresh] = useState(0)

  // Support package state
  const [supportPackageSaved, setSupportPackageSaved] = useState(false)

  // Legacy pricing state
  const [isLegacyPricing, setIsLegacyPricing] = useState(false)
  const [legacyUseCaseCount, setLegacyUseCaseCount] = useState('1')

  // Endpoints approved state
  const [endpointsApprovedText, setEndpointsApprovedText] = useState('')
  const [endpointsApprovedSaved, setEndpointsApprovedSaved] = useState(false)
  const [endpointsApprovedInit, setEndpointsApprovedInit] = useState(false)

  // Internal notes state
  const [noteContent, setNoteContent] = useState('')
  const [noteSubmitted, setNoteSubmitted] = useState(false)

  // Provisioning state
  const [provisioningRefresh, setProvisioningRefresh] = useState(0)

  const request = useMemo(() => (requestId ? store.getRequest(requestId) : undefined), [requestId, pricingSaved, endpointsApprovedSaved, noteSubmitted, provisioningRefresh, categoriesRefresh, supportPackageSaved])
  const customer = useMemo(() => (request ? store.getCustomer(request.customerId) : undefined), [request])
  const requestingUser = useMemo(() => (request ? store.getCustomerUser(request.requestedBy) : undefined), [request])
  const partner = useMemo(() => (request?.partnerId ? store.getPartner(request.partnerId) : undefined), [request])
  const approvals = useMemo(() => (requestId ? store.getApprovalsForRequest(requestId) : []), [requestId, submitted])
  const partnerLinks = useMemo(() => (request?.partnerId ? store.getLinksForPartner(request.partnerId) : []), [request])

  if (!request) {
    return (
      <div className="mx-auto py-12 text-center">
        <ShieldAlert size={48} className="mx-auto text-ww-gray-300 mb-4" />
        <h2 className="text-xl font-display font-bold text-ww-gray-700 mb-2">Request Not Found</h2>
        <p className="text-sm text-ww-gray-500 mb-4">The request you are looking for does not exist.</p>
        <button
          onClick={() => navigate('/reviewer')}
          className="px-4 py-2 rounded-md bg-ww-navy text-white text-sm font-medium hover:bg-ww-navy-light transition-colors"
        >
          Back to Queue
        </button>
      </div>
    )
  }

  const TIMELINE_LABELS: Record<string, string> = {
    asap: 'ASAP',
    this_quarter: 'This Quarter',
    next_quarter: 'Next Quarter',
    exploring: 'Exploring',
  }

  const isUnlisted = request.partnerId === null
  const isUnapproved = partner?.tier === 'unapproved'
  const status = STATUS_LABELS[request.status] ?? { label: request.status, color: 'bg-gray-100 text-gray-600' }
  const tierInfo = partner ? TIER_LABELS[partner.tier] : null

  const handleSubmit = () => {
    if (!decision || !rationale.trim() || !requestId) return
    store.addApproval(requestId, 'Reviewer', stage, decision, rationale.trim())
    setSubmitted(true)
    onRefresh()
  }

  // Pre-fill pricing form if pricing already exists
  const initPricing = useCallback(() => {
    if (request?.pricing) {
      setSelectedVolumeTier(request.pricing.volumeTier)
      setPricingNotes(request.pricing.notes)
    } else if (request?.estimatedMonthlyVolume) {
      setSelectedVolumeTier(suggestTier(request.estimatedMonthlyVolume))
    }
  }, [request?.pricing, request?.estimatedMonthlyVolume])

  // Initialize on first render when pricing exists
  useMemo(() => {
    initPricing()
  }, [initPricing])

  // Initialize endpoints approved text
  useMemo(() => {
    if (request && !endpointsApprovedInit) {
      setEndpointsApprovedText(request.endpointsApproved ?? request.endpointsRequested ?? '')
      setEndpointsApprovedInit(true)
    }
  }, [request, endpointsApprovedInit])

  const handleSaveEndpointsApproved = () => {
    if (!requestId) return
    store.setEndpointsApproved(requestId, endpointsApprovedText.trim())
    setEndpointsApprovedSaved(true)
    setTimeout(() => setEndpointsApprovedSaved(false), 2000)
    onRefresh()
  }

  const handleAddNote = () => {
    if (!requestId || !noteContent.trim()) return
    store.addReviewerNote(requestId, 'Reviewer', noteContent.trim())
    setNoteContent('')
    setNoteSubmitted(prev => !prev)
    onRefresh()
  }

  const handleSavePricing = () => {
    if (!requestId || !selectedVolumeTier) return
    const tierDef = VOLUME_TIERS.find(t => t.tier === selectedVolumeTier)
    if (!tierDef) return

    const pricing: ApiPricing = {
      volumeTier: selectedVolumeTier,
      monthlyRate: tierDef.monthlyRate,
      perCallRate: tierDef.perCallRate,
      callsIncluded: tierDef.callsPerMonth,
      notes: pricingNotes.trim(),
      setBy: 'Reviewer',
      setAt: new Date().toISOString(),
    }
    store.setPricing(requestId, pricing)
    setPricingSaved(true)
    setTimeout(() => setPricingSaved(false), 2000)
    onRefresh()
  }

  const handleSaveEstimatedVolume = () => {
    if (!requestId) return
    const vol = parseInt(estimatedVolumeInput.replace(/,/g, ''), 10)
    if (isNaN(vol) || vol <= 0) return
    store.setEstimatedVolume(requestId, vol)
    setEstimatedVolumeInput('')
    setCategoriesRefresh(p => p + 1)
    onRefresh()
  }

  const handleToggleCategory = (cat: ApiCategory) => {
    if (!requestId || !request) return
    const current = request.apiCategories ?? []
    const next = current.includes(cat)
      ? current.filter(c => c !== cat)
      : [...current, cat]
    store.setApiCategories(requestId, next.length > 0 ? next : null)
    setCategoriesRefresh(p => p + 1)
    onRefresh()
  }

  const handleSaveSupportPackage = (pkg: SupportPackage) => {
    if (!requestId) return
    store.setSupportPackage(requestId, pkg)
    setSupportPackageSaved(prev => !prev)
    onRefresh()
  }

  const handleSavePricingWithLegacy = () => {
    if (!requestId) return
    if (isLegacyPricing) {
      const count = parseInt(legacyUseCaseCount, 10) || 1
      const legacyMonthly = count * 330
      const pricing: ApiPricing = {
        volumeTier: 1,
        monthlyRate: legacyMonthly,
        perCallRate: 0,
        callsIncluded: 0,
        notes: pricingNotes.trim() || `Legacy pricing: ${count} use case(s) × $330/mo. Pending migration to volume-based tiers.`,
        setBy: 'Reviewer',
        setAt: new Date().toISOString(),
        pricingModel: 'legacy',
        legacyUseCaseCount: count,
        legacyMonthlyCost: legacyMonthly,
      }
      store.setPricing(requestId, pricing)
      setPricingSaved(true)
      setTimeout(() => setPricingSaved(false), 2000)
      onRefresh()
      return
    }
    handleSavePricing()
  }

  const suggestedTier = request?.estimatedMonthlyVolume ? suggestTier(request.estimatedMonthlyVolume) : null
  const isConcourseProduct = request?.product === 'winteam' || request?.product === 'timegate_plus' || request?.product === 'lighthouse'

  const stageOptions: { value: ApprovalStage; label: string; role: string }[] = [
    { value: 'initial_review', label: 'Initial Review', role: STAGE_REVIEWER_ROLES.initial_review.role },
    { value: 'competitive_review', label: 'Competitive Review', role: STAGE_REVIEWER_ROLES.competitive_review.role },
    { value: 'security_review', label: 'Security Review', role: STAGE_REVIEWER_ROLES.security_review.role },
    { value: 'legal_review', label: 'Legal Review', role: STAGE_REVIEWER_ROLES.legal_review.role },
    { value: 'sandbox_approval', label: 'Sandbox Approval', role: STAGE_REVIEWER_ROLES.sandbox_approval.role },
    { value: 'production_approval', label: 'Production Approval', role: STAGE_REVIEWER_ROLES.production_approval.role },
  ]

  return (
    <div className="mx-auto py-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/reviewer')}
        className="flex items-center gap-1.5 text-sm font-medium text-ww-gray-500 hover:text-ww-navy transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Queue
      </button>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Request Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Header */}
          <div className="bg-white rounded-md border border-ww-gray-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl font-display font-bold text-ww-gray-900 mb-1">
                  API Access Request
                </h1>
                <p className="text-xs text-ww-gray-400 font-mono">{request.id}</p>
              </div>
              <span className={`inline-flex px-3 py-1 rounded text-xs font-semibold ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-ww-gray-500 flex-wrap font-mono">
              <span>Created {formatDate(request.createdAt)}</span>
              <span className="text-ww-gray-300">|</span>
              <span>Updated {formatDate(request.updatedAt)}</span>
              {request.agreementSignedAt && (
                <>
                  <span className="text-ww-gray-300">|</span>
                  <span className="text-ww-green font-mono">Agreement signed {formatDate(request.agreementSignedAt)}</span>
                </>
              )}
              {request.targetTimeline && (
                <>
                  <span className="text-ww-gray-300">|</span>
                  <span className="text-amber-600 font-mono">Timeline: {TIMELINE_LABELS[request.targetTimeline] ?? request.targetTimeline}</span>
                </>
              )}
              {request.salesforceCaseId && (
                <>
                  <span className="text-ww-gray-300">|</span>
                  <span className="text-ww-primary font-mono">SF: {request.salesforceCaseId}</span>
                </>
              )}
            </div>
            {/* Resell Intent */}
            {(request.customerIntendToResell !== null || request.developerIntendToResell !== null) && (
              <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
                {request.customerIntendToResell !== null && (
                  <span className={`inline-flex px-2 py-0.5 rounded font-medium ${request.customerIntendToResell ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    Customer resell: {request.customerIntendToResell ? 'Yes' : 'No'}
                  </span>
                )}
                {request.developerIntendToResell !== null && (
                  <span className={`inline-flex px-2 py-0.5 rounded font-medium ${request.developerIntendToResell ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    Developer resell: {request.developerIntendToResell ? 'Yes' : 'No'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Partner Info */}
          <div className="bg-white rounded-md border border-ww-gray-200 p-6">
            <h2 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-ww-gray-400" />
              Partner Information
            </h2>
            {partner ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{partner.logo}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ww-gray-900">{partner.name}</span>
                      {tierInfo && (
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${tierInfo.color}`}>
                          {tierInfo.label}
                        </span>
                      )}
                    </div>
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ww-primary hover:underline flex items-center gap-1"
                    >
                      {partner.website}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
                <p className="text-sm text-ww-gray-600">{partner.description}</p>
                {request.thirdPartyTool && (
                  <div className="mt-3 pt-3 border-t border-ww-gray-100">
                    <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Third-Party Tool</p>
                    <p className="text-sm font-semibold text-ww-gray-900">{request.thirdPartyTool}</p>
                    {request.thirdPartyToolUrl && (
                      <a
                        href={request.thirdPartyToolUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-ww-primary hover:underline flex items-center gap-1 mt-0.5"
                      >
                        {request.thirdPartyToolUrl}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-ww-gray-900">{request.partnerNameFreetext ?? 'Unknown Partner'}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                    <AlertTriangle size={10} />
                    Unlisted Partner
                  </span>
                </div>
                {request.partnerWebsite && (
                  <div className="flex items-center gap-2 text-sm text-ww-gray-600">
                    <Globe size={14} className="text-ww-gray-400" />
                    <a
                      href={request.partnerWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ww-primary hover:underline flex items-center gap-1"
                    >
                      {request.partnerWebsite}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
                {request.partnerContact && (
                  <div className="flex items-center gap-2 text-sm text-ww-gray-600">
                    <Mail size={14} className="text-ww-gray-400" />
                    <span>{request.partnerContact}</span>
                  </div>
                )}
                {request.thirdPartyTool && (
                  <div className="mt-3 pt-3 border-t border-ww-gray-100">
                    <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Third-Party Tool</p>
                    <p className="text-sm font-semibold text-ww-gray-900">{request.thirdPartyTool}</p>
                    {request.thirdPartyToolUrl && (
                      <a
                        href={request.thirdPartyToolUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-ww-primary hover:underline flex items-center gap-1 mt-0.5"
                      >
                        {request.thirdPartyToolUrl}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-md border border-ww-gray-200 p-6">
            <h2 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <User size={16} className="text-ww-gray-400" />
              Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Company</p>
                <p className="text-sm font-semibold text-ww-gray-900">{customer?.name ?? 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Plan</p>
                <p className="text-sm font-semibold text-ww-gray-900 capitalize">{customer?.plan ?? 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Requested By</p>
                <p className="text-sm font-semibold text-ww-gray-900">{requestingUser?.name ?? 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm text-ww-gray-700">{requestingUser?.email ?? 'Unknown'}</p>
              </div>
            </div>
            {(request.technicalContactName || request.technicalContactEmail || request.technicalContactPhone) && (
              <div className="mt-4 pt-4 border-t border-ww-gray-100">
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-3">Technical Contact</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {request.technicalContactName && (
                    <div className="flex items-center gap-2 text-sm text-ww-gray-700">
                      <User size={14} className="text-ww-gray-400" />
                      <span>{request.technicalContactName}</span>
                    </div>
                  )}
                  {request.technicalContactEmail && (
                    <div className="flex items-center gap-2 text-sm text-ww-gray-700">
                      <Mail size={14} className="text-ww-gray-400" />
                      <span>{request.technicalContactEmail}</span>
                    </div>
                  )}
                  {request.technicalContactPhone && (
                    <div className="flex items-center gap-2 text-sm text-ww-gray-700">
                      <Phone size={14} className="text-ww-gray-400" />
                      <span>{request.technicalContactPhone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Integration Details */}
          <div className="bg-white rounded-md border border-ww-gray-200 p-6">
            <h2 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-ww-gray-400" />
              Integration Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Product</p>
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-mono font-semibold bg-ww-sky text-ww-navy">
                  {PRODUCT_LABELS[request.product] ?? request.product}
                </span>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Builder Type</p>
                <p className="text-sm font-semibold text-ww-gray-900">{BUILDER_TYPE_LABELS[request.builderType] ?? request.builderType}</p>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Request Type</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                    request.requestType === 'migration' ? 'bg-amber-100 text-amber-700'
                    : request.requestType === 'expand_access' ? 'bg-blue-100 text-blue-700'
                    : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {REQUEST_TYPE_LABELS[request.requestType] ?? request.requestType}
                  </span>
                  {request.requestType === 'migration' && request.migratingFrom && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                      <ArrowUpFromLine size={10} />
                      {LEGACY_METHOD_LABELS[request.migratingFrom] ?? request.migratingFrom}
                    </span>
                  )}
                </div>
              </div>
              {request.gatewayPlatform && (
                <div>
                  <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Gateway</p>
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-ww-gray-100 text-ww-gray-700">
                    {GATEWAY_LABELS[request.gatewayPlatform] ?? request.gatewayPlatform}
                  </span>
                </div>
              )}
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Connecting System</p>
                <p className="text-sm font-semibold text-ww-gray-900">{request.connectingSystem}</p>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Use Case</p>
                <p className="text-sm font-semibold text-ww-gray-900">{USE_CASE_LABELS[request.useCase] ?? request.useCase}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Environment</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium ${
                  request.environment === 'production'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {request.environment === 'production' ? <Server size={12} /> : <FlaskConical size={12} />}
                  {request.environment === 'production' ? 'Production' : 'Sandbox'}
                </span>
              </div>
              {request.estimatedMonthlyVolume && (
                <div>
                  <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Est. Monthly Volume</p>
                  <p className="text-sm font-semibold text-ww-gray-900">{request.estimatedMonthlyVolume.toLocaleString()} calls</p>
                </div>
              )}
              {request.apiCategories && request.apiCategories.length > 0 && (
                <div>
                  <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">API Classification</p>
                  <div className="flex flex-wrap gap-1.5">
                    {request.apiCategories.map(cat => {
                      const catInfo = API_CATEGORY_LABELS[cat]
                      return (
                        <span key={cat} className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${catInfo?.color ?? 'bg-gray-100 text-gray-700'}`}>
                          {catInfo?.label ?? cat}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-1">Use Case Detail</p>
              <p className="text-sm text-ww-gray-700 leading-relaxed">{request.useCaseDetail}</p>
            </div>
            {request.endpointsRequested && (
              <EndpointsRequestedPanel text={request.endpointsRequested} />
            )}
          </div>

          {/* Data Access */}
          <div className="bg-white rounded-md border border-ww-gray-200 p-6">
            <h2 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Database size={16} className="text-ww-gray-400" />
              Data Access
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-2">Read Access</p>
                {request.dataRead.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {request.dataRead.map(cat => (
                      <span key={cat} className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {DATA_CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ww-gray-400 italic">None requested</p>
                )}
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide mb-2">Write Access</p>
                {request.dataWrite.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {request.dataWrite.map(cat => (
                      <span key={cat} className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        {DATA_CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ww-gray-400 italic">None requested</p>
                )}
              </div>
            </div>
            {request.dataLeavesEnvironment && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-200">
                <ShieldAlert size={16} className="text-ww-red shrink-0" />
                <span className="text-sm font-medium text-red-700">Data will leave the customer environment</span>
              </div>
            )}
          </div>

          {/* Provisioning Checklist — visible for approved requests */}
          {(request.status === 'sandbox_approved' || request.status === 'production_approved') && (
            <div className="bg-white rounded-md border border-ww-gray-200 p-6">
              <h2 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <ListChecks size={16} className="text-ww-gray-400" />
                Provisioning Checklist
              </h2>

              {request.gatewayPlatform && (
                <div className="mb-4">
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-ww-gray-100 text-ww-gray-700">
                    {GATEWAY_LABELS[request.gatewayPlatform] ?? request.gatewayPlatform}
                  </span>
                </div>
              )}

              {request.provisioningChecklist.length === 0 ? (
                <div>
                  <p className="text-sm text-ww-gray-500 mb-3">Provisioning checklist has not been initialized for this request.</p>
                  <button
                    onClick={() => {
                      if (!requestId) return
                      store.initializeProvisioningChecklist(requestId)
                      setProvisioningRefresh(p => p + 1)
                      onRefresh()
                    }}
                    className="px-4 py-2 rounded-md bg-ww-navy text-white text-sm font-medium hover:bg-ww-navy-light transition-colors"
                  >
                    Initialize Checklist
                  </button>
                </div>
              ) : (
                <div>
                  {/* Progress summary */}
                  <div className="flex items-center gap-3 mb-4">
                    {(() => {
                      const completed = request.provisioningChecklist.filter(s => s.completed).length
                      const total = request.provisioningChecklist.length
                      const pct = Math.round((completed / total) * 100)
                      return (
                        <>
                          <div className="flex-1 h-2 bg-ww-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${completed === total ? 'bg-emerald-500' : 'bg-ww-primary'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${completed === total ? 'text-emerald-600' : 'text-ww-gray-600'}`}>
                            {completed}/{total}
                          </span>
                        </>
                      )
                    })()}
                  </div>

                  {/* Checklist items */}
                  <div className="space-y-2">
                    {request.provisioningChecklist.map(step => (
                      <div key={step.id} className="flex items-start gap-3 p-3 rounded-md bg-ww-gray-50 border border-ww-gray-100">
                        <button
                          onClick={() => {
                            if (!requestId) return
                            store.toggleProvisioningStep(requestId, step.id, 'Reviewer')
                            setProvisioningRefresh(p => p + 1)
                            onRefresh()
                          }}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            step.completed
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-ww-gray-300 bg-white hover:border-ww-primary'
                          }`}
                        >
                          {step.completed && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
                              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${step.completed ? 'text-ww-gray-500 line-through' : 'text-ww-gray-900'}`}>
                            {step.label}
                          </p>
                          <p className="text-xs text-ww-gray-400 mt-0.5">{step.description}</p>
                          {step.completed && step.completedAt && (
                            <p className="text-[10px] font-mono text-ww-gray-400 mt-1">
                              {step.completedBy ?? 'Reviewer'} &middot; {formatDateTime(step.completedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Previous Approvals Timeline */}
          <div className="bg-white rounded-md border border-ww-gray-200 p-6">
            <h2 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Clock size={16} className="text-ww-gray-400" />
              Approval Timeline
            </h2>
            {approvals.length > 0 ? (
              <div className="space-y-4">
                {approvals.map((appr, idx) => {
                  const decisionInfo = DECISION_LABELS[appr.decision] ?? { label: appr.decision, color: 'text-gray-700' }
                  return (
                    <div key={appr.id} className="relative pl-6">
                      {/* Timeline line */}
                      {idx < approvals.length - 1 && (
                        <div className="absolute left-[9px] top-6 bottom-0 w-px bg-ww-gray-200" />
                      )}
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                        appr.decision === 'approved'
                          ? 'bg-emerald-100'
                          : appr.decision === 'denied'
                          ? 'bg-red-100'
                          : 'bg-amber-100'
                      }`}>
                        {appr.decision === 'approved' ? (
                          <CheckCircle2 size={12} className="text-emerald-600" />
                        ) : appr.decision === 'denied' ? (
                          <XCircle size={12} className="text-red-600" />
                        ) : (
                          <MessageSquare size={12} className="text-amber-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-ww-gray-900">
                            {STAGE_LABELS[appr.stage] ?? appr.stage}
                          </span>
                          <span className={`text-xs font-medium ${decisionInfo.color}`}>
                            {decisionInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-ww-gray-400 mt-0.5 font-mono">
                          {appr.reviewer}
                          {STAGE_REVIEWER_ROLES[appr.stage] && (
                            <span className="text-ww-gray-300"> ({STAGE_REVIEWER_ROLES[appr.stage].team})</span>
                          )}
                          {' '}&middot; {formatDateTime(appr.decidedAt)}
                        </p>
                        <p className="text-sm text-ww-gray-600 mt-1 leading-relaxed">{appr.rationale}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-ww-gray-400 italic">No review decisions have been recorded yet.</p>
            )}
          </div>

          {/* Other Customers Using This Partner */}
          {request.partnerId && partnerLinks.length > 0 && (
            <div className="bg-white rounded-md border border-ww-gray-200 p-6">
              <h2 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Users size={16} className="text-ww-gray-400" />
                Other Customers Using This Partner
              </h2>
              <div className="space-y-2">
                {partnerLinks.map(link => {
                  const linkCustomer = store.getCustomer(link.customerId)
                  return (
                    <div key={link.id} className="flex items-center justify-between p-3 rounded-md bg-ww-gray-50 border border-ww-gray-100">
                      <div>
                        <p className="text-sm font-medium text-ww-gray-900">{linkCustomer?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-ww-gray-500 font-mono">Linked {formatDate(link.linkedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          link.environment === 'production'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {link.environment === 'production' ? 'Production' : 'Sandbox'}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                          link.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : link.status === 'revoked'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Review Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Hold Banner */}
            {request.status === 'on_hold' && (
              <div className="bg-orange-50 rounded-md border border-orange-300 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Pause size={16} className="text-orange-700" />
                  <h3 className="text-sm font-display font-semibold text-orange-800">On Hold</h3>
                </div>
                {request.holdReason && (
                  <p className="text-xs text-orange-700 mb-2">{request.holdReason}</p>
                )}
                <div className="flex items-center gap-2 text-[10px] font-mono text-orange-600 mb-3">
                  {request.holdPlacedBy && <span>Held by {request.holdPlacedBy}</span>}
                  {request.holdPlacedAt && <span>&middot; {formatDate(request.holdPlacedAt)}</span>}
                </div>
                <button
                  onClick={() => {
                    if (!requestId) return
                    store.releaseHold(requestId)
                    onRefresh()
                    window.location.reload()
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-700 text-white text-xs font-medium hover:bg-orange-800 transition-colors"
                >
                  <Play size={12} />
                  Release Hold
                </button>
              </div>
            )}

            {/* Flags Section */}
            {(isUnlisted || isUnapproved || partner?.tier === 'blocked' || partner?.competitiveFlag || request.dataLeavesEnvironment || store.hasContradictoryResellIntent(request)) && (
              <div className="bg-white rounded-md border border-ww-gray-200 p-5 space-y-3">
                <h3 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <Flag size={14} className="text-ww-amber" />
                  Review Flags
                </h3>
                {partner?.tier === 'blocked' && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-red-100 border border-red-300">
                    <Ban size={16} className="text-red-800 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-900">Vendor Blocked</p>
                      <p className="text-xs text-red-700 mt-0.5">{partner.blockedReason || 'This vendor has been blocked from all API access.'}</p>
                    </div>
                  </div>
                )}
                {partner?.competitiveFlag && partner.tier !== 'blocked' && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200">
                    <Swords size={16} className="text-red-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Competitive Concern</p>
                      <p className="text-xs text-red-700 mt-0.5">{partner.competitiveFlagReason || 'Flagged for potential competitive conflict.'}</p>
                      {partner.competitiveFlaggedBy && (
                        <p className="text-[10px] text-red-500 mt-1 font-mono">
                          Flagged by {partner.competitiveFlaggedBy}
                          {partner.competitiveFlaggedAt && ` on ${formatDate(partner.competitiveFlaggedAt)}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {store.hasContradictoryResellIntent(request) && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                    <TriangleAlert size={16} className="text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Contradictory Resell Intent</p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Customer says {request.customerIntendToResell ? 'Yes' : 'No'} to reselling, but developer says {request.developerIntendToResell ? 'Yes' : 'No'}.
                      </p>
                    </div>
                  </div>
                )}
                {isUnlisted && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                    <AlertTriangle size={16} className="text-ww-amber shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Unlisted Partner</p>
                      <p className="text-xs text-amber-700 mt-0.5">Requires full review + legal assessment</p>
                    </div>
                  </div>
                )}
                {isUnapproved && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200">
                    <XCircle size={16} className="text-ww-red shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Unapproved Partner</p>
                      <p className="text-xs text-red-700 mt-0.5">This partner has not been approved for integrations</p>
                    </div>
                  </div>
                )}
                {request.dataLeavesEnvironment && (
                  <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200">
                    <ShieldAlert size={16} className="text-ww-red shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Data Leaves Environment</p>
                      <p className="text-xs text-red-700 mt-0.5">Customer data will be transmitted outside the environment</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hold Action — for pending requests not already on hold */}
            {(request.status === 'pending_review' || request.status === 'pending_production_review') && (
              <div className="bg-white rounded-md border border-ww-gray-200 p-5">
                <h3 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Pause size={14} className="text-orange-600" />
                  Place On Hold
                </h3>
                <p className="text-xs text-ww-gray-500 mb-3">Hold this request for competitive review or leadership decision.</p>
                <button
                  onClick={() => {
                    if (!requestId) return
                    const reason = prompt('Hold reason:')
                    if (!reason) return
                    store.holdRequest(requestId, reason, 'Reviewer')
                    onRefresh()
                    window.location.reload()
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-100 text-orange-800 text-xs font-semibold hover:bg-orange-200 transition-colors"
                >
                  <Pause size={12} />
                  Place On Hold
                </button>
              </div>
            )}

            {/* Decision Panel */}
            <div className="bg-white rounded-md border border-ww-gray-200 p-5">
              <h3 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Shield size={14} className="text-ww-navy" />
                Submit Decision
              </h3>

              {submitted ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={40} className="mx-auto text-ww-green mb-3" />
                  <p className="text-sm font-semibold text-ww-gray-900">Decision Submitted</p>
                  <p className="text-xs text-ww-gray-500 mt-1">Your review decision has been recorded.</p>
                  <button
                    onClick={() => navigate('/reviewer')}
                    className="mt-4 px-4 py-2 rounded-md bg-ww-navy text-white text-sm font-medium hover:bg-ww-navy-light transition-colors"
                  >
                    Return to Queue
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Stage Selector */}
                  <div>
                    <label className="block text-xs font-medium text-ww-gray-600 mb-1.5">Review Stage</label>
                    <div className="relative">
                      <button
                        onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-ww-gray-200 bg-white text-sm text-ww-gray-900 hover:border-ww-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span>{STAGE_LABELS[stage]}</span>
                          <span className="text-[10px] font-mono text-ww-gray-400 bg-ww-gray-100 px-1.5 py-0.5 rounded">
                            {STAGE_REVIEWER_ROLES[stage]?.role}
                          </span>
                        </div>
                        <ChevronDown size={14} className="text-ww-gray-400" />
                      </button>
                      {stageDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setStageDropdownOpen(false)} />
                          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-ww-gray-200 rounded-md py-1">
                            {stageOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  setStage(opt.value)
                                  setStageDropdownOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-ww-gray-50 transition-colors ${
                                  stage === opt.value ? 'bg-ww-sky text-ww-navy font-medium' : 'text-ww-gray-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{opt.label}</span>
                                  <span className="text-[10px] font-mono text-ww-gray-400">{opt.role}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Decision Buttons */}
                  <div>
                    <label className="block text-xs font-medium text-ww-gray-600 mb-1.5">Decision</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setDecision('approved')}
                        className={`flex flex-col items-center gap-1 px-3 py-3 rounded-md border-2 text-xs font-medium transition-all ${
                          decision === 'approved'
                            ? 'border-ww-green bg-emerald-50 text-emerald-700'
                            : 'border-ww-gray-200 text-ww-gray-500 hover:border-ww-gray-300'
                        }`}
                      >
                        <CheckCircle2 size={18} />
                        Approve
                      </button>
                      <button
                        onClick={() => setDecision('denied')}
                        className={`flex flex-col items-center gap-1 px-3 py-3 rounded-md border-2 text-xs font-medium transition-all ${
                          decision === 'denied'
                            ? 'border-ww-red bg-red-50 text-red-700'
                            : 'border-ww-gray-200 text-ww-gray-500 hover:border-ww-gray-300'
                        }`}
                      >
                        <XCircle size={18} />
                        Deny
                      </button>
                      <button
                        onClick={() => setDecision('needs_info')}
                        className={`flex flex-col items-center gap-1 px-3 py-3 rounded-md border-2 text-xs font-medium transition-all ${
                          decision === 'needs_info'
                            ? 'border-ww-amber bg-amber-50 text-amber-700'
                            : 'border-ww-gray-200 text-ww-gray-500 hover:border-ww-gray-300'
                        }`}
                      >
                        <MessageSquare size={18} />
                        More Info
                      </button>
                    </div>
                  </div>

                  {/* Rationale */}
                  <div>
                    <label className="block text-xs font-medium text-ww-gray-600 mb-1.5">
                      Rationale <span className="text-ww-red">*</span>
                    </label>
                    <textarea
                      value={rationale}
                      onChange={e => setRationale(e.target.value)}
                      placeholder="Provide your review rationale..."
                      rows={4}
                      className="w-full px-3 py-2 rounded-md border border-ww-gray-200 text-sm text-ww-gray-900 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!decision || !rationale.trim()}
                    className={`w-full py-2.5 rounded-md text-sm font-semibold transition-colors ${
                      decision && rationale.trim()
                        ? 'bg-ww-navy text-white hover:bg-ww-navy-light'
                        : 'bg-ww-gray-200 text-ww-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Submit Decision
                  </button>
                </div>
              )}
            </div>

            {/* Endpoints Approved Panel */}
            {request.endpointsRequested && (
              <EndpointsApprovedPanel
                requestId={requestId!}
                endpointsRequested={request.endpointsRequested}
                endpointsApprovedText={endpointsApprovedText}
                setEndpointsApprovedText={setEndpointsApprovedText}
                onSave={handleSaveEndpointsApproved}
                saved={endpointsApprovedSaved}
                hasExisting={!!request.endpointsApproved}
              />
            )}

            {/* Internal Notes Panel */}
            <div className="bg-white rounded-md border border-ww-gray-200 p-5">
              <h3 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <StickyNote size={14} className="text-ww-navy" />
                Internal Notes
              </h3>

              {/* Existing notes */}
              {request.reviewerNotes && request.reviewerNotes.length > 0 ? (
                <div className="space-y-3 mb-4">
                  {request.reviewerNotes.map(note => (
                    <div key={note.id} className="p-3 rounded-md bg-ww-gray-50 border border-ww-gray-100">
                      <p className="text-sm text-ww-gray-700 leading-relaxed">{note.content}</p>
                      <p className="text-[10px] font-mono text-ww-gray-400 mt-2">
                        {note.author} &middot; {formatDateTime(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ww-gray-400 italic mb-4">No internal notes yet.</p>
              )}

              {/* Add note */}
              <div className="space-y-3">
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Add an internal note..."
                  rows={3}
                  className="w-full px-2.5 py-1.5 rounded-md border border-ww-gray-200 text-sm text-ww-gray-900 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary resize-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteContent.trim()}
                  className={`w-full py-2 rounded-md text-sm font-semibold transition-colors ${
                    noteContent.trim()
                      ? 'bg-ww-navy text-white hover:bg-ww-navy-light'
                      : 'bg-ww-gray-200 text-ww-gray-400 cursor-not-allowed'
                  }`}
                >
                  Add Note
                </button>
              </div>
            </div>

            {/* Pricing Panel */}
            <div className="bg-white rounded-md border border-ww-gray-200 p-5">
              <h3 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <DollarSign size={14} className="text-ww-navy" />
                API Pricing
              </h3>

              {/* Pricing Set summary */}
              {request.pricing && !pricingSaved ? (
                <div className="space-y-3 mb-4">
                  <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">Pricing Set</span>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-ww-gray-400 font-mono">Tier</dt>
                        <dd className="font-semibold text-ww-gray-900">{VOLUME_TIER_LABELS[request.pricing.volumeTier] ?? `Tier ${request.pricing.volumeTier}`}</dd>
                      </div>
                      <div>
                        <dt className="text-ww-gray-400 font-mono">Monthly</dt>
                        <dd className="font-semibold text-ww-gray-900">${request.pricing.monthlyRate.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-ww-gray-400 font-mono">Per Call</dt>
                        <dd className="font-semibold text-ww-gray-900">${request.pricing.perCallRate}</dd>
                      </div>
                      <div>
                        <dt className="text-ww-gray-400 font-mono">Calls Included</dt>
                        <dd className="font-semibold text-ww-gray-900">{request.pricing.callsIncluded.toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-ww-gray-400 font-mono">Annual</dt>
                        <dd className="font-semibold text-ww-gray-900">${(request.pricing.monthlyRate * 12).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-ww-gray-400 font-mono">Overage Rate</dt>
                        <dd className="font-semibold text-ww-gray-900">${(VOLUME_TIERS.find(t => t.tier === request.pricing!.volumeTier)?.overageRate ?? 0).toFixed(6)}</dd>
                      </div>
                    </dl>
                    {request.pricing.notes && (
                      <p className="text-xs text-ww-gray-500 mt-2 border-t border-emerald-200 pt-2">{request.pricing.notes}</p>
                    )}
                    <p className="text-[10px] font-mono text-ww-gray-400 mt-2">
                      Set by {request.pricing.setBy} on {formatDate(request.pricing.setAt)}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {/* Estimated Volume context */}
                {request.estimatedMonthlyVolume ? (
                  <div className="p-2.5 rounded-md bg-ww-gray-50 border border-ww-gray-100">
                    <p className="text-[10px] text-ww-gray-400 font-mono uppercase tracking-wide">Est. Volume</p>
                    <p className="text-sm font-semibold text-ww-gray-900">{request.estimatedMonthlyVolume.toLocaleString()} calls/mo</p>
                    {suggestedTier && (
                      <span className="inline-flex mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-ww-sky text-ww-navy">
                        Suggested: Tier {suggestedTier}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={estimatedVolumeInput}
                      onChange={e => setEstimatedVolumeInput(e.target.value)}
                      placeholder="Est. monthly calls"
                      className="flex-1 px-2.5 py-1.5 rounded-md border border-ww-gray-200 text-sm text-ww-gray-900 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary"
                    />
                    <button
                      onClick={handleSaveEstimatedVolume}
                      disabled={!estimatedVolumeInput.trim()}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                        estimatedVolumeInput.trim()
                          ? 'bg-ww-navy text-white hover:bg-ww-navy-light'
                          : 'bg-ww-gray-200 text-ww-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Set
                    </button>
                  </div>
                )}

                {/* Volume Tier Table */}
                <div>
                  <label className="block text-xs font-medium text-ww-gray-600 mb-1.5">Volume Tier</label>
                  <div className="border border-ww-gray-200 rounded-md overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="bg-ww-gray-50 text-ww-gray-500 font-mono uppercase tracking-wide">
                          <th className="text-left pl-2 pr-1 py-1.5">Tier</th>
                          <th className="text-right px-1 py-1.5">Calls/Mo</th>
                          <th className="text-right px-1 py-1.5">Monthly</th>
                          <th className="text-right pl-1 pr-2 py-1.5">Per Call</th>
                        </tr>
                      </thead>
                      <tbody>
                        {VOLUME_TIERS.map(t => {
                          const isSelected = selectedVolumeTier === t.tier
                          const isSuggested = suggestedTier === t.tier
                          return (
                            <tr
                              key={t.tier}
                              onClick={() => setSelectedVolumeTier(t.tier)}
                              className={`cursor-pointer border-t border-ww-gray-100 transition-colors ${
                                isSelected ? 'bg-ww-sky font-medium' : 'hover:bg-ww-gray-50'
                              }`}
                            >
                              <td className="pl-2 pr-1 py-1.5 text-ww-gray-900 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="radio"
                                    checked={isSelected}
                                    onChange={() => setSelectedVolumeTier(t.tier)}
                                    className="w-3 h-3"
                                  />
                                  <span>{t.tier}</span>
                                  {isSuggested && (
                                    <span className="inline-flex px-1 py-0 rounded text-[9px] font-semibold bg-ww-navy/10 text-ww-navy">Rec.</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-1 py-1.5 text-right text-ww-gray-700 font-mono">{t.callsPerMonth >= 1_000_000 ? `${t.callsPerMonth / 1_000_000}M` : `${t.callsPerMonth / 1_000}K`}</td>
                              <td className="px-1 py-1.5 text-right text-ww-gray-700 font-mono">${t.monthlyRate.toLocaleString()}</td>
                              <td className="pl-1 pr-2 py-1.5 text-right text-ww-gray-700 font-mono">${t.perCallRate}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-ww-gray-400 mt-1 font-mono">Overage: 2.5× per-call rate</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-ww-gray-600 mb-1">Notes</label>
                  <textarea
                    value={pricingNotes}
                    onChange={e => setPricingNotes(e.target.value)}
                    placeholder="Pricing notes, special terms, etc."
                    rows={2}
                    className="w-full px-2.5 py-1.5 rounded-md border border-ww-gray-200 text-sm text-ww-gray-900 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary resize-none"
                  />
                </div>

                {/* Save */}
                <button
                  onClick={handleSavePricing}
                  disabled={!selectedVolumeTier}
                  className={`w-full py-2 rounded-md text-sm font-semibold transition-colors ${
                    selectedVolumeTier
                      ? 'bg-ww-navy text-white hover:bg-ww-navy-light'
                      : 'bg-ww-gray-200 text-ww-gray-400 cursor-not-allowed'
                  }`}
                >
                  {pricingSaved ? 'Saved!' : request.pricing ? 'Update Pricing' : 'Set Pricing'}
                </button>
              </div>
            </div>

            {/* API Classification Panel — Concourse products only */}
            {isConcourseProduct && (
              <div className="bg-white rounded-md border border-ww-gray-200 p-5">
                <h3 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Tag size={14} className="text-ww-navy" />
                  API Classification
                </h3>
                <p className="text-xs text-ww-gray-500 mb-3">Classify API endpoints used by this integration.</p>
                <div className="flex gap-2">
                  {(Object.entries(API_CATEGORY_LABELS) as [string, { label: string; color: string }][]).map(([key, info]) => {
                    const isActive = request.apiCategories?.includes(key as ApiCategory) ?? false
                    return (
                      <button
                        key={key}
                        onClick={() => handleToggleCategory(key as ApiCategory)}
                        className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold border-2 transition-all ${
                          isActive
                            ? `${info.color} border-current`
                            : 'border-ww-gray-200 text-ww-gray-400 hover:border-ww-gray-300'
                        }`}
                      >
                        {info.label}
                      </button>
                    )
                  })}
                </div>
                {request.apiCategories && request.apiCategories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {request.apiCategories.map(cat => {
                      const catInfo = API_CATEGORY_LABELS[cat]
                      return (
                        <span key={cat} className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${catInfo?.color ?? 'bg-gray-100 text-gray-700'}`}>
                          {catInfo?.label ?? cat}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Professional Services Package Panel */}
            <div className="bg-white rounded-md border border-ww-gray-200 p-5">
              <h3 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Briefcase size={14} className="text-ww-navy" />
                Professional Services
              </h3>

              {request.supportPackage && !supportPackageSaved ? (
                <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">Package Assigned</span>
                  </div>
                  <p className="text-sm font-semibold text-ww-gray-900">{SUPPORT_PACKAGE_LABELS[request.supportPackage]?.label ?? request.supportPackage}</p>
                  <p className="text-xs text-ww-gray-500 mt-0.5">{SUPPORT_PACKAGE_LABELS[request.supportPackage]?.description}</p>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="font-mono text-ww-gray-600">{SUPPORT_PACKAGE_LABELS[request.supportPackage]?.hours}</span>
                    <span className="font-semibold text-ww-gray-900">{SUPPORT_PACKAGE_LABELS[request.supportPackage]?.price}</span>
                  </div>
                </div>
              ) : null}

              <p className="text-xs text-ww-gray-500 mb-3">API access requires a bundled consulting package for onboarding and integration support.</p>
              <div className="space-y-2">
                {(Object.entries(SUPPORT_PACKAGE_LABELS) as [string, { label: string; description: string; hours: string; price: string }][]).map(([key, info]) => {
                  const isActive = request.supportPackage === key
                  return (
                    <button
                      key={key}
                      onClick={() => handleSaveSupportPackage(key as SupportPackage)}
                      className={`w-full text-left px-3 py-2.5 rounded-md border-2 transition-all ${
                        isActive
                          ? 'border-ww-navy bg-ww-sky'
                          : 'border-ww-gray-200 hover:border-ww-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isActive ? 'text-ww-navy' : 'text-ww-gray-700'}`}>{info.label}</span>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-ww-gray-500">
                          <span>{info.hours}</span>
                          <span className="font-semibold text-ww-gray-700">{info.price}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-ww-gray-500 mt-0.5">{info.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legacy Pricing Migration Indicator */}
            {request.pricing?.pricingModel === 'legacy' ? (
              <div className="bg-amber-50 rounded-md border border-amber-300 p-5">
                <h3 className="text-sm font-display font-mono font-semibold text-amber-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <TriangleAlert size={14} className="text-amber-600" />
                  Legacy Pricing Active
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-amber-700">Model</span>
                    <span className="font-semibold text-amber-900">Per Use Case ($330/mo)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Use Cases</span>
                    <span className="font-semibold text-amber-900">{request.pricing.legacyUseCaseCount ?? 1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Monthly Total</span>
                    <span className="font-semibold text-amber-900">${request.pricing.legacyMonthlyCost?.toLocaleString() ?? '$330'}</span>
                  </div>
                  <div className="mt-3 p-2.5 rounded bg-amber-100 border border-amber-200">
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      This customer is on legacy per-use-case pricing. No Salesforce SKUs or billing workflow exist for the new volume-based model yet.
                      Pricing will migrate to volume tiers once operationalized.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-md border border-ww-gray-200 p-5">
                <h3 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <TriangleAlert size={14} className="text-ww-gray-400" />
                  Pricing Model
                </h3>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={isLegacyPricing}
                    onChange={e => setIsLegacyPricing(e.target.checked)}
                    className="w-3.5 h-3.5 rounded"
                  />
                  <span className="text-xs text-ww-gray-700">Flag as legacy pricing ($330/use case)</span>
                </label>
                {isLegacyPricing && (
                  <div className="space-y-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-amber-700 shrink-0">Use Cases:</label>
                      <input
                        type="number"
                        min="1"
                        value={legacyUseCaseCount}
                        onChange={e => setLegacyUseCaseCount(e.target.value)}
                        className="w-16 px-2 py-1 rounded border border-amber-300 text-xs text-ww-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                      <span className="text-xs font-mono text-amber-800">
                        = ${(parseInt(legacyUseCaseCount, 10) || 1) * 330}/mo
                      </span>
                    </div>
                    <button
                      onClick={handleSavePricingWithLegacy}
                      className="w-full py-1.5 rounded-md text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                    >
                      {pricingSaved ? 'Saved!' : 'Set Legacy Pricing'}
                    </button>
                    <p className="text-[10px] text-amber-600">No Salesforce SKUs exist yet. This flags the request for migration when volume pricing is operationalized.</p>
                  </div>
                )}
                {!isLegacyPricing && (
                  <p className="text-[10px] text-ww-gray-400">Using volume-based tier pricing (default). Check box above to flag existing customers on legacy per-use-case contracts.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Endpoints Requested Panel ──────────────────────────────────

function EndpointsRequestedPanel({ text }: { text: string }) {
  const [showRaw, setShowRaw] = useState(false)

  const results = useMemo<MatchResults>(
    () => matchEndpointsRequested(text, catalog),
    [text],
  )

  const genLabels = results.generations.map(g => GENERATION_LABELS[g].label)
  const domainLabels = results.domains.map(d => DOMAIN_LABELS[d])

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-ww-gray-400 font-medium font-mono uppercase tracking-wide">Endpoints Requested</p>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1 text-[11px] text-ww-gray-400 hover:text-ww-gray-600 transition-colors"
        >
          {showRaw ? <EyeOff size={12} /> : <Eye size={12} />}
          {showRaw ? 'Show enriched' : 'Show raw'}
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-2 flex-wrap mb-3 text-[11px]">
        <span className="font-medium text-ww-gray-600">
          {results.matchResults.length} endpoint{results.matchResults.length !== 1 ? 's' : ''}
        </span>
        <span className="text-ww-gray-300">&middot;</span>
        <span className="text-emerald-600 font-medium">{results.matchedCount} matched</span>
        {results.unmatchedCount > 0 && (
          <>
            <span className="text-ww-gray-300">&middot;</span>
            <span className="text-amber-600 font-medium">{results.unmatchedCount} unmatched</span>
          </>
        )}
        {domainLabels.length > 0 && (
          <>
            <span className="text-ww-gray-300">&middot;</span>
            <span className="text-ww-gray-500">Domains: {domainLabels.join(', ')}</span>
          </>
        )}
        {genLabels.length > 0 && (
          <>
            <span className="text-ww-gray-300">&middot;</span>
            <span className="text-ww-gray-500">{genLabels.join(' + ')}</span>
          </>
        )}
      </div>

      {showRaw ? (
        <pre className="text-sm text-ww-gray-700 leading-relaxed font-mono whitespace-pre-wrap bg-ww-gray-50 border border-ww-gray-100 rounded-md p-3">
          {text}
        </pre>
      ) : (
        <div className="space-y-1.5">
          {results.matchResults.map((r, i) => {
            if (r.match) {
              const ep = r.match
              const genInfo = GENERATION_LABELS[ep.generation]
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 rounded-md bg-white border border-ww-gray-100 hover:border-ww-gray-200 transition-colors"
                >
                  {ep.method && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${METHOD_COLORS[ep.method]}`}>
                      {ep.method}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold text-ww-navy truncate">{ep.functionName}</span>
                      <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${genInfo.color} shrink-0`}>
                        {genInfo.label}
                      </span>
                    </div>
                    <code className="text-[11px] font-mono text-ww-gray-500 block truncate">{ep.route}</code>
                    {ep.purpose && (
                      <p className="text-[11px] text-ww-gray-400 line-clamp-1 mt-0.5">{ep.purpose}</p>
                    )}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-ww-gray-50 text-ww-gray-400 shrink-0 mt-0.5">
                    {DOMAIN_LABELS[ep.domain]}
                  </span>
                </div>
              )
            }
            // Unmatched line
            return (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50/50 border border-amber-100"
              >
                <code className="text-[12px] font-mono text-ww-gray-600 flex-1 truncate">{r.parsed.raw}</code>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
                  Unmatched
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Endpoints Approved Panel ───────────────────────────────────

function EndpointsApprovedPanel({
  requestId,
  endpointsRequested,
  endpointsApprovedText,
  setEndpointsApprovedText,
  onSave,
  saved,
  hasExisting,
}: {
  requestId: string
  endpointsRequested: string
  endpointsApprovedText: string
  setEndpointsApprovedText: (text: string) => void
  onSave: () => void
  saved: boolean
  hasExisting: boolean
}) {
  const [activeTab, setActiveTab] = useState<'picker' | 'freetext'>('picker')
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerDomain, setPickerDomain] = useState<CatalogDomain | 'all'>('all')

  // Parse currently approved lines into a set for the picker
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const text = endpointsApprovedText || endpointsRequested
    const { matchResults } = matchEndpointsRequested(text, catalog)
    return new Set(matchResults.filter(r => r.match).map(r => r.match!.id))
  })

  // Cross-reference: how many other approved requests share domains
  const crossRefCount = useMemo(() => {
    const { domains } = matchEndpointsRequested(endpointsRequested, catalog)
    if (domains.length === 0) return 0
    const allRequests = store.getRequests()
    let count = 0
    for (const req of allRequests) {
      if (req.id === requestId) continue
      if (!req.endpointsApproved) continue
      const { domains: reqDomains } = matchEndpointsRequested(req.endpointsApproved, catalog)
      if (reqDomains.some(d => domains.includes(d))) count++
    }
    return count
  }, [requestId, endpointsRequested])

  // HTTP catalog endpoints grouped by project, filtered
  const pickerGroups = useMemo(() => {
    let eps = catalog.filter(e => e.triggerType === 'http')
    if (pickerDomain !== 'all') {
      eps = eps.filter(e => e.domain === pickerDomain)
    }
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase().trim()
      eps = eps.filter(
        e =>
          e.functionName.toLowerCase().includes(q) ||
          e.route.toLowerCase().includes(q) ||
          (e.purpose && e.purpose.toLowerCase().includes(q)) ||
          e.projectName.toLowerCase().includes(q),
      )
    }
    const map = new Map<string, CatalogEndpoint[]>()
    for (const ep of eps) {
      if (!map.has(ep.projectName)) map.set(ep.projectName, [])
      map.get(ep.projectName)!.push(ep)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [pickerSearch, pickerDomain])

  const activeDomains = useMemo(() => {
    const set = new Set<CatalogDomain>()
    for (const ep of catalog) {
      if (ep.triggerType === 'http') set.add(ep.domain)
    }
    return Array.from(set).sort()
  }, [])

  const toggleEndpoint = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSaveFromPicker = () => {
    // Serialize selected catalog endpoints back to the expected line format
    const lines: string[] = []
    for (const ep of catalog) {
      if (selectedIds.has(ep.id) && ep.triggerType === 'http') {
        lines.push(`${ep.projectName} ${ep.functionName} ${ep.method ?? 'GET'}`)
      }
    }
    setEndpointsApprovedText(lines.join('\n'))
    // Trigger save after state update
    setTimeout(() => onSave(), 0)
  }

  return (
    <div className="bg-white rounded-md border border-ww-gray-200 p-5">
      <h3 className="text-sm font-display font-mono font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
        <FileText size={14} className="text-ww-navy" />
        Endpoints Approved
      </h3>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-ww-gray-100 rounded-lg p-0.5 mb-4">
        <button
          onClick={() => setActiveTab('picker')}
          className={`flex-1 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
            activeTab === 'picker' ? 'bg-white text-ww-navy shadow-sm' : 'text-ww-gray-500 hover:text-ww-gray-700'
          }`}
        >
          Catalog Picker
        </button>
        <button
          onClick={() => setActiveTab('freetext')}
          className={`flex-1 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
            activeTab === 'freetext' ? 'bg-white text-ww-navy shadow-sm' : 'text-ww-gray-500 hover:text-ww-gray-700'
          }`}
        >
          Free Text
        </button>
      </div>

      {crossRefCount > 0 && (
        <div className="mb-3 px-3 py-2 rounded-md bg-sky-50 border border-sky-200 text-[11px] text-sky-700">
          {crossRefCount} other approved request{crossRefCount !== 1 ? 's' : ''} include{crossRefCount === 1 ? 's' : ''} endpoints from {crossRefCount === 1 ? 'this' : 'these'} domain{crossRefCount !== 1 ? 's' : ''}
        </div>
      )}

      {activeTab === 'picker' ? (
        <div>
          {/* Search + domain filter */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ww-gray-400" />
              <input
                type="text"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                placeholder="Search endpoints..."
                className="w-full pl-7 pr-2 py-1.5 text-[12px] border border-ww-gray-200 rounded-md focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
              />
            </div>
            <select
              value={pickerDomain}
              onChange={e => setPickerDomain(e.target.value as CatalogDomain | 'all')}
              className="text-[12px] border border-ww-gray-200 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-ww-primary/30 outline-none"
            >
              <option value="all">All Domains</option>
              {activeDomains.map(d => (
                <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>
              ))}
            </select>
          </div>

          {/* Selected count */}
          <div className="text-[11px] text-ww-gray-500 mb-2">
            {selectedIds.size} endpoint{selectedIds.size !== 1 ? 's' : ''} selected
          </div>

          {/* Grouped list */}
          <div className="max-h-64 overflow-y-auto border border-ww-gray-100 rounded-md divide-y divide-ww-gray-50">
            {pickerGroups.map(([projectName, eps]) => (
              <div key={projectName}>
                <div className="sticky top-0 bg-ww-gray-50 px-3 py-1.5 text-[10px] font-mono font-semibold text-ww-gray-500 uppercase tracking-wider">
                  {projectName}
                </div>
                {eps.map(ep => {
                  const checked = selectedIds.has(ep.id)
                  return (
                    <label
                      key={ep.id}
                      className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-ww-gray-50/50 transition-colors ${
                        checked ? 'bg-ww-primary/5' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEndpoint(ep.id)}
                        className="w-3.5 h-3.5 rounded border-ww-gray-300 shrink-0"
                      />
                      {ep.method && (
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${METHOD_COLORS[ep.method]} shrink-0`}>
                          {ep.method}
                        </span>
                      )}
                      <span className="text-[11px] text-ww-gray-700 truncate flex-1">{ep.functionName}</span>
                      <code className="text-[10px] font-mono text-ww-gray-400 truncate max-w-[150px] hidden sm:block">{ep.route}</code>
                    </label>
                  )
                })}
              </div>
            ))}
            {pickerGroups.length === 0 && (
              <div className="px-3 py-6 text-center text-[12px] text-ww-gray-400">
                No endpoints match the search
              </div>
            )}
          </div>

          {/* Save from picker */}
          <button
            onClick={handleSaveFromPicker}
            disabled={selectedIds.size === 0}
            className={`w-full flex items-center justify-center gap-1.5 py-2 mt-3 rounded-md text-sm font-semibold transition-colors ${
              selectedIds.size > 0
                ? 'bg-ww-navy text-white hover:bg-ww-navy-light'
                : 'bg-ww-gray-200 text-ww-gray-400 cursor-not-allowed'
            }`}
          >
            <Save size={14} />
            {saved ? 'Saved!' : hasExisting ? 'Update Approved Endpoints' : 'Save Approved Endpoints'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ww-gray-600 mb-1">Approved Endpoints</label>
            <textarea
              value={endpointsApprovedText}
              onChange={e => setEndpointsApprovedText(e.target.value)}
              placeholder="Enter approved endpoints (one per line)..."
              rows={4}
              className="w-full px-2.5 py-1.5 rounded-md border border-ww-gray-200 text-sm text-ww-gray-900 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary resize-none font-mono"
            />
          </div>
          <button
            onClick={onSave}
            disabled={!endpointsApprovedText.trim()}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-semibold transition-colors ${
              endpointsApprovedText.trim()
                ? 'bg-ww-navy text-white hover:bg-ww-navy-light'
                : 'bg-ww-gray-200 text-ww-gray-400 cursor-not-allowed'
            }`}
          >
            <Save size={14} />
            {saved ? 'Saved!' : hasExisting ? 'Update Approved Endpoints' : 'Save Approved Endpoints'}
          </button>
        </div>
      )}
    </div>
  )
}
