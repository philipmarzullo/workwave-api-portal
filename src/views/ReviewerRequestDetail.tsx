import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  User,
  Globe,
  Mail,
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
} from 'lucide-react'
import type { ApprovalStage, ApprovalDecision } from '@/data/types'
import { store } from '@/data/store'
import {
  PRODUCT_LABELS,
  STATUS_LABELS,
  TIER_LABELS,
  USE_CASE_LABELS,
  DATA_CATEGORY_LABELS,
} from '@/App'

const STAGE_LABELS: Record<string, string> = {
  initial_review: 'Initial Review',
  security_review: 'Security Review',
  legal_review: 'Legal Review',
  sandbox_approval: 'Sandbox Approval',
  production_approval: 'Production Approval',
}

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

  const request = useMemo(() => (requestId ? store.getRequest(requestId) : undefined), [requestId])
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
          className="px-4 py-2 rounded-lg bg-ww-navy text-white text-sm font-medium hover:bg-ww-navy-light transition-colors"
        >
          Back to Queue
        </button>
      </div>
    )
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

  const stageOptions: { value: ApprovalStage; label: string }[] = [
    { value: 'initial_review', label: 'Initial Review' },
    { value: 'security_review', label: 'Security Review' },
    { value: 'legal_review', label: 'Legal Review' },
    { value: 'sandbox_approval', label: 'Sandbox Approval' },
    { value: 'production_approval', label: 'Production Approval' },
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
          <div className="bg-white rounded-xl border border-ww-gray-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-xl font-display font-bold text-ww-gray-900 mb-1">
                  API Access Request
                </h1>
                <p className="text-xs text-ww-gray-400 font-mono">{request.id}</p>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-ww-gray-500 flex-wrap">
              <span>Created {formatDate(request.createdAt)}</span>
              <span className="text-ww-gray-300">|</span>
              <span>Updated {formatDate(request.updatedAt)}</span>
              {request.agreementSignedAt && (
                <>
                  <span className="text-ww-gray-300">|</span>
                  <span className="text-ww-green">Agreement signed {formatDate(request.agreementSignedAt)}</span>
                </>
              )}
            </div>
          </div>

          {/* Partner Info */}
          <div className="bg-white rounded-xl border border-ww-gray-200 p-6">
            <h2 className="text-sm font-display font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
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
                      className="text-xs text-ww-blue hover:underline flex items-center gap-1"
                    >
                      {partner.website}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
                <p className="text-sm text-ww-gray-600">{partner.description}</p>
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
                      className="text-ww-blue hover:underline flex items-center gap-1"
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
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-xl border border-ww-gray-200 p-6">
            <h2 className="text-sm font-display font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <User size={16} className="text-ww-gray-400" />
              Customer Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-1">Company</p>
                <p className="text-sm font-semibold text-ww-gray-900">{customer?.name ?? 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-1">Plan</p>
                <p className="text-sm font-semibold text-ww-gray-900 capitalize">{customer?.plan ?? 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-1">Requested By</p>
                <p className="text-sm font-semibold text-ww-gray-900">{requestingUser?.name ?? 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm text-ww-gray-700">{requestingUser?.email ?? 'Unknown'}</p>
              </div>
            </div>
          </div>

          {/* Integration Details */}
          <div className="bg-white rounded-xl border border-ww-gray-200 p-6">
            <h2 className="text-sm font-display font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <BookOpen size={16} className="text-ww-gray-400" />
              Integration Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-1">Product</p>
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-ww-sky text-ww-navy">
                  {PRODUCT_LABELS[request.product] ?? request.product}
                </span>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-1">Builder Type</p>
                <p className="text-sm font-semibold text-ww-gray-900">{BUILDER_TYPE_LABELS[request.builderType] ?? request.builderType}</p>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-1">Connecting System</p>
                <p className="text-sm font-semibold text-ww-gray-900">{request.connectingSystem}</p>
              </div>
              <div>
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-1">Use Case</p>
                <p className="text-sm font-semibold text-ww-gray-900">{USE_CASE_LABELS[request.useCase] ?? request.useCase}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-1">Environment</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  request.environment === 'production'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {request.environment === 'production' ? <Server size={12} /> : <FlaskConical size={12} />}
                  {request.environment === 'production' ? 'Production' : 'Sandbox'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-1">Use Case Detail</p>
              <p className="text-sm text-ww-gray-700 leading-relaxed">{request.useCaseDetail}</p>
            </div>
          </div>

          {/* Data Access */}
          <div className="bg-white rounded-xl border border-ww-gray-200 p-6">
            <h2 className="text-sm font-display font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Database size={16} className="text-ww-gray-400" />
              Data Access
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
              <div>
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-2">Read Access</p>
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
                <p className="text-xs text-ww-gray-400 font-medium uppercase tracking-wide mb-2">Write Access</p>
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
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <ShieldAlert size={16} className="text-ww-red shrink-0" />
                <span className="text-sm font-medium text-red-700">Data will leave the customer environment</span>
              </div>
            )}
          </div>

          {/* Previous Approvals Timeline */}
          <div className="bg-white rounded-xl border border-ww-gray-200 p-6">
            <h2 className="text-sm font-display font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
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
                        <p className="text-xs text-ww-gray-400 mt-0.5">
                          {appr.reviewer} &middot; {formatDateTime(appr.decidedAt)}
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
            <div className="bg-white rounded-xl border border-ww-gray-200 p-6">
              <h2 className="text-sm font-display font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Users size={16} className="text-ww-gray-400" />
                Other Customers Using This Partner
              </h2>
              <div className="space-y-2">
                {partnerLinks.map(link => {
                  const linkCustomer = store.getCustomer(link.customerId)
                  return (
                    <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-ww-gray-50 border border-ww-gray-100">
                      <div>
                        <p className="text-sm font-medium text-ww-gray-900">{linkCustomer?.name ?? 'Unknown'}</p>
                        <p className="text-xs text-ww-gray-500">Linked {formatDate(link.linkedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
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
            {/* Flags Section */}
            {(isUnlisted || isUnapproved || request.dataLeavesEnvironment) && (
              <div className="bg-white rounded-xl border border-ww-gray-200 p-5 space-y-3">
                <h3 className="text-sm font-display font-semibold text-ww-gray-900 uppercase tracking-wide flex items-center gap-2">
                  <Flag size={14} className="text-ww-amber" />
                  Review Flags
                </h3>
                {isUnlisted && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle size={16} className="text-ww-amber shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">Unlisted Partner</p>
                      <p className="text-xs text-amber-700 mt-0.5">Requires full review + legal assessment</p>
                    </div>
                  </div>
                )}
                {isUnapproved && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <XCircle size={16} className="text-ww-red shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Unapproved Partner</p>
                      <p className="text-xs text-red-700 mt-0.5">This partner has not been approved for integrations</p>
                    </div>
                  </div>
                )}
                {request.dataLeavesEnvironment && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                    <ShieldAlert size={16} className="text-ww-red shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Data Leaves Environment</p>
                      <p className="text-xs text-red-700 mt-0.5">Customer data will be transmitted outside the environment</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Decision Panel */}
            <div className="bg-white rounded-xl border border-ww-gray-200 p-5">
              <h3 className="text-sm font-display font-semibold text-ww-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
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
                    className="mt-4 px-4 py-2 rounded-lg bg-ww-navy text-white text-sm font-medium hover:bg-ww-navy-light transition-colors"
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
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-ww-gray-200 bg-white text-sm text-ww-gray-900 hover:border-ww-gray-300 transition-colors"
                      >
                        <span>{STAGE_LABELS[stage]}</span>
                        <ChevronDown size={14} className="text-ww-gray-400" />
                      </button>
                      {stageDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setStageDropdownOpen(false)} />
                          <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-ww-gray-200 rounded-lg shadow-lg py-1">
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
                                {opt.label}
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
                        className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 text-xs font-medium transition-all ${
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
                        className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 text-xs font-medium transition-all ${
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
                        className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border-2 text-xs font-medium transition-all ${
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
                      className="w-full px-3 py-2 rounded-lg border border-ww-gray-200 text-sm text-ww-gray-900 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-blue/30 focus:border-ww-blue resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={!decision || !rationale.trim()}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
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
          </div>
        </div>
      </div>
    </div>
  )
}
