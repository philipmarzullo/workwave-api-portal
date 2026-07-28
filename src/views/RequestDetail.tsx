import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileSignature,
  Rocket,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  Database,
  Briefcase,
  Server,
  Link2,
} from 'lucide-react'
import { store } from '@/data/store'
import type { ApprovalDecision } from '@/data/types'
import {
  PRODUCT_LABELS,
  STATUS_LABELS,
  USE_CASE_LABELS,
  DATA_CATEGORY_LABELS,
  TIER_LABELS,
} from '@/App'

interface RequestDetailProps {
  onRefresh: () => void
}

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

const DECISION_CONFIG: Record<
  ApprovalDecision,
  { icon: typeof CheckCircle2; className: string; dotClass: string; label: string }
> = {
  approved: {
    icon: CheckCircle2,
    className: 'text-emerald-600',
    dotClass: 'bg-emerald-500',
    label: 'Approved',
  },
  denied: {
    icon: XCircle,
    className: 'text-red-600',
    dotClass: 'bg-red-500',
    label: 'Denied',
  },
  needs_info: {
    icon: AlertCircle,
    className: 'text-amber-600',
    dotClass: 'bg-amber-500',
    label: 'Needs Info',
  },
}

export function RequestDetail({ onRefresh }: RequestDetailProps) {
  const { requestId } = useParams<{ requestId: string }>()
  const navigate = useNavigate()

  if (!requestId) {
    navigate('/my-requests')
    return null
  }

  const request = store.getRequest(requestId)

  if (!request) {
    return (
      <div className="max-w-4xl mx-auto py-16">
        <div className="text-center">
          <h2 className="font-display text-lg font-semibold text-ww-gray-800 mb-2">
            Request Not Found
          </h2>
          <p className="text-sm text-ww-gray-500 mb-4">
            The request you are looking for does not exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/my-requests')}
            className="inline-flex items-center gap-2 text-sm text-ww-primary hover:text-ww-primary-light transition-colors"
          >
            <ArrowLeft size={14} />
            Back to My Requests
          </button>
        </div>
      </div>
    )
  }

  const partner = request.partnerId ? store.getPartner(request.partnerId) : null
  const partnerName = partner?.name ?? request.partnerNameFreetext ?? 'Unlisted Partner'
  const status = STATUS_LABELS[request.status] ?? {
    label: request.status,
    color: 'bg-gray-100 text-gray-600',
  }
  const tierInfo = partner ? TIER_LABELS[partner.tier] : null

  const approvals = store
    .getApprovalsForRequest(requestId)
    .sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime())

  const handleSignAgreement = () => {
    store.signAgreement(requestId)
    onRefresh()
  }

  const handleRequestProduction = () => {
    store.updateRequestStatus(requestId, 'pending_production_review')
    onRefresh()
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/my-requests')}
        className="inline-flex items-center gap-1.5 text-sm text-ww-gray-500 hover:text-ww-primary transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to My Requests
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="font-display text-xl font-bold text-ww-gray-900">
              {partnerName}
            </h1>
            <span
              className={`text-xs font-medium px-2.5 py-0.5 rounded ${status.color}`}
            >
              {status.label}
            </span>
          </div>
          <p className="text-sm text-ww-gray-500">
            Request ID: <span className="font-mono">{request.id}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {request.status === 'pending_agreement' && (
            <button
              onClick={handleSignAgreement}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
            >
              <FileSignature size={14} />
              Sign Agreement
            </button>
          )}
          {request.status === 'sandbox_approved' && (
            <button
              onClick={handleRequestProduction}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-ww-primary text-white text-sm font-medium hover:bg-ww-primary-light transition-colors"
            >
              <Rocket size={14} />
              Request Production Access
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detail card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-md border border-ww-gray-200 divide-y divide-ww-gray-100">
            {/* Partner info */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase size={14} className="text-ww-gray-400" />
                <h3 className="text-xs font-mono font-semibold text-ww-gray-400 uppercase tracking-wider">
                  Partner Information
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-8">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-ww-gray-500 mb-0.5">Partner</div>
                    <div className="text-sm font-medium text-ww-gray-800 flex items-center gap-2">
                      {partnerName}
                      {tierInfo && (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded ${tierInfo.color}`}
                        >
                          {tierInfo.label}
                        </span>
                      )}
                      {!request.partnerId && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-ww-gray-100 text-ww-gray-500">
                          Unlisted
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Show website for unlisted partners */}
                {!request.partnerId && request.partnerWebsite && (
                  <div>
                    <div className="text-xs text-ww-gray-500 mb-0.5">Website</div>
                    <a
                      href={request.partnerWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-ww-primary hover:text-ww-primary-light inline-flex items-center gap-1"
                    >
                      {request.partnerWebsite}
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Product & Integration */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Link2 size={14} className="text-ww-gray-400" />
                <h3 className="text-xs font-mono font-semibold text-ww-gray-400 uppercase tracking-wider">
                  Integration Details
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-ww-gray-500 mb-0.5">Product</div>
                  <span className="inline-block text-xs font-mono font-medium px-2 py-0.5 rounded bg-ww-sky text-ww-primary">
                    {PRODUCT_LABELS[request.product] ?? request.product}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-ww-gray-500 mb-0.5">Builder Type</div>
                  <div className="text-sm text-ww-gray-800">
                    {BUILDER_TYPE_LABELS[request.builderType] ?? request.builderType}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ww-gray-500 mb-0.5">Connecting System</div>
                  <div className="text-sm text-ww-gray-800">{request.connectingSystem}</div>
                </div>
              </div>
            </div>

            {/* Use case */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={14} className="text-ww-gray-400" />
                <h3 className="text-xs font-mono font-semibold text-ww-gray-400 uppercase tracking-wider">
                  Use Case
                </h3>
              </div>
              <div className="mb-2">
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-ww-gray-100 text-ww-gray-700">
                  {USE_CASE_LABELS[request.useCase] ?? request.useCase}
                </span>
              </div>
              <p className="text-sm text-ww-gray-600 leading-relaxed">
                {request.useCaseDetail}
              </p>
            </div>

            {/* Data access */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Database size={14} className="text-ww-gray-400" />
                <h3 className="text-xs font-mono font-semibold text-ww-gray-400 uppercase tracking-wider">
                  Data Access
                </h3>
              </div>
              <div className="space-y-3">
                {request.dataRead.length > 0 && (
                  <div>
                    <div className="text-xs text-ww-gray-500 mb-1.5">Read Access</div>
                    <div className="flex flex-wrap gap-1.5">
                      {request.dataRead.map((cat) => (
                        <span
                          key={cat}
                          className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700"
                        >
                          {DATA_CATEGORY_LABELS[cat] ?? cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {request.dataWrite.length > 0 && (
                  <div>
                    <div className="text-xs text-ww-gray-500 mb-1.5">Write Access</div>
                    <div className="flex flex-wrap gap-1.5">
                      {request.dataWrite.map((cat) => (
                        <span
                          key={cat}
                          className="text-[11px] font-medium px-2 py-0.5 rounded bg-orange-50 text-orange-700"
                        >
                          {DATA_CATEGORY_LABELS[cat] ?? cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {request.dataRead.length === 0 && request.dataWrite.length === 0 && (
                  <p className="text-sm text-ww-gray-400 italic">No data categories specified.</p>
                )}
                <div>
                  <div className="text-xs text-ww-gray-500 mb-0.5">
                    Data Leaves Environment
                  </div>
                  <div className="text-sm text-ww-gray-800">
                    {request.dataLeavesEnvironment ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>

            {/* Environment & Agreement */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Server size={14} className="text-ww-gray-400" />
                <h3 className="text-xs font-mono font-semibold text-ww-gray-400 uppercase tracking-wider">
                  Environment & Agreement
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-ww-gray-500 mb-0.5">Environment</div>
                  <span
                    className={`inline-block text-xs font-mono font-medium px-2 py-0.5 rounded ${
                      request.environment === 'production'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-ww-gray-100 text-ww-gray-600'
                    }`}
                  >
                    {request.environment === 'production' ? 'Production' : 'Sandbox'}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-ww-gray-500 mb-0.5">Agreement Signed</div>
                  <div className="text-sm text-ww-gray-800">
                    {request.agreementSignedAt
                      ? formatDate(request.agreementSignedAt)
                      : 'Not yet signed'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Approval timeline */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-md border border-ww-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={14} className="text-ww-gray-400" />
              <h3 className="text-xs font-mono font-semibold text-ww-gray-400 uppercase tracking-wider">
                Approval Timeline
              </h3>
            </div>

            {approvals.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-full bg-ww-gray-50 flex items-center justify-center mx-auto mb-3">
                  <Clock size={18} className="text-ww-gray-300" />
                </div>
                <p className="text-sm text-ww-gray-500 leading-relaxed">
                  Your request is in the queue. You'll see updates here as it's reviewed.
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-ww-gray-100" />

                <div className="space-y-5">
                  {approvals.map((approval) => {
                    const config = DECISION_CONFIG[approval.decision]
                    const Icon = config.icon

                    return (
                      <div key={approval.id} className="relative pl-7">
                        {/* Dot */}
                        <div
                          className={`absolute left-0 top-0.5 w-[15px] h-[15px] rounded-full border-2 border-white ${config.dotClass} ring-2 ring-white`}
                        />

                        <div>
                          {/* Stage + decision */}
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-semibold text-ww-gray-800">
                              {STAGE_LABELS[approval.stage] ?? approval.stage}
                            </span>
                            <Icon size={13} className={config.className} />
                          </div>

                          {/* Decision label */}
                          <div className={`text-[11px] font-medium mb-1 ${config.className}`}>
                            {config.label}
                          </div>

                          {/* Rationale */}
                          <p className="text-[11px] text-ww-gray-500 leading-relaxed mb-1">
                            {approval.rationale}
                          </p>

                          {/* Reviewer + time */}
                          <div className="flex items-center gap-2 text-[10px] text-ww-gray-400">
                            <span>{approval.reviewer}</span>
                            <span className="text-ww-gray-200">|</span>
                            <span className="flex items-center gap-0.5">
                              <Calendar size={9} />
                              {formatDateTime(approval.decidedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Prominent CTA below timeline */}
          {request.status === 'sandbox_approved' && (
            <div className="mt-4 bg-emerald-50 rounded-md border border-emerald-200 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <Rocket size={18} className="text-emerald-600" />
              </div>
              <h4 className="font-display text-sm font-semibold text-emerald-800 mb-1">
                Ready for Production
              </h4>
              <p className="text-xs text-emerald-600 mb-3">
                Your sandbox integration has been approved. Request production access when ready.
              </p>
              <button
                onClick={handleRequestProduction}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-ww-primary text-white text-sm font-medium hover:bg-ww-primary-light transition-colors"
              >
                <Rocket size={14} />
                Request Production Access
              </button>
            </div>
          )}

          {request.status === 'pending_agreement' && (
            <div className="mt-4 bg-amber-50 rounded-md border border-amber-200 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <FileSignature size={18} className="text-amber-600" />
              </div>
              <h4 className="font-display text-sm font-semibold text-amber-800 mb-1">
                Agreement Required
              </h4>
              <p className="text-xs text-amber-600 mb-3">
                Sign the API access agreement to proceed with your request.
              </p>
              <button
                onClick={handleSignAgreement}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                <FileSignature size={14} />
                Sign Agreement
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
