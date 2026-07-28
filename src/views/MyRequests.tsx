import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  Calendar,
  ArrowRight,
  FileSignature,
  Rocket,
  PackageOpen,
  Globe,
} from 'lucide-react'
import { store } from '@/data/store'
import type { CustomerUser, ApiRequest } from '@/data/types'
import { PRODUCT_LABELS, STATUS_LABELS, USE_CASE_LABELS } from '@/App'

interface MyRequestsProps {
  activeUser?: CustomerUser
  onRefresh: () => void
}

const TIER_BADGE: Record<string, { label: string; className: string }> = {
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700' },
  under_review: { label: 'Under Review', className: 'bg-amber-100 text-amber-700' },
  unapproved: { label: 'Not Approved', className: 'bg-red-100 text-red-700' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function partnerDisplayName(request: ApiRequest): string {
  if (request.partnerId) {
    const partner = store.getPartner(request.partnerId)
    return partner?.name ?? 'Unknown Partner'
  }
  return request.partnerNameFreetext ?? 'Unlisted Partner'
}

function partnerTier(request: ApiRequest): string | null {
  if (request.partnerId) {
    const partner = store.getPartner(request.partnerId)
    return partner?.tier ?? null
  }
  return null
}

export function MyRequests({ activeUser, onRefresh }: MyRequestsProps) {
  const navigate = useNavigate()

  if (!activeUser) {
    return (
      <div className="max-w-4xl mx-auto py-16">
        <div className="text-center">
          <div className="w-16 h-16 rounded-md bg-ww-gray-100 flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={28} className="text-ww-gray-400" />
          </div>
          <h2 className="font-display text-lg font-semibold text-ww-gray-800 mb-2">
            Select a User
          </h2>
          <p className="text-sm text-ww-gray-500">
            Choose a user from the header menu to view their API requests.
          </p>
        </div>
      </div>
    )
  }

  const requests = store
    .getRequestsForCustomer(activeUser.customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const handleSignAgreement = (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation()
    store.signAgreement(requestId)
    onRefresh()
  }

  const handleRequestProduction = (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation()
    store.updateRequestStatus(requestId, 'pending_production_review')
    onRefresh()
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-ww-sky flex items-center justify-center">
            <ClipboardList size={20} className="text-ww-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-ww-gray-900">
              My API Requests
            </h1>
            <p className="text-sm text-ww-gray-500">
              {requests.length} {requests.length === 1 ? 'request' : 'requests'}
            </p>
          </div>
        </div>
      </div>

      {/* Request list */}
      {requests.length === 0 ? (
        <div className="bg-white rounded-md border border-ww-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-md bg-ww-gray-50 flex items-center justify-center mx-auto mb-4">
            <PackageOpen size={28} className="text-ww-gray-300" />
          </div>
          <h3 className="font-display text-base font-semibold text-ww-gray-800 mb-2">
            No requests yet
          </h3>
          <p className="text-sm text-ww-gray-500 mb-6 max-w-md mx-auto">
            Browse the partner directory to get started. Find an integration partner and
            submit your first API access request.
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ww-primary text-white text-sm font-medium hover:bg-ww-primary-light transition-colors"
          >
            <Globe size={14} />
            Browse Partner Directory
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const status = STATUS_LABELS[request.status] ?? {
              label: request.status,
              color: 'bg-gray-100 text-gray-600',
            }
            const tier = partnerTier(request)
            const tierBadge = tier ? TIER_BADGE[tier] : null

            return (
              <div
                key={request.id}
                onClick={() => navigate(`/my-requests/${request.id}`)}
                className="bg-white rounded-md border border-ww-gray-200 p-5 hover:border-ww-primary/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left content */}
                  <div className="flex-1 min-w-0">
                    {/* Partner name + tier badge */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-display text-sm font-semibold text-ww-gray-800">
                        {partnerDisplayName(request)}
                      </h3>
                      {tierBadge && (
                        <span
                          className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded ${tierBadge.className}`}
                        >
                          {tierBadge.label}
                        </span>
                      )}
                      {!request.partnerId && (
                        <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded bg-ww-gray-100 text-ww-gray-500">
                          Unlisted
                        </span>
                      )}
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {/* Product */}
                      <span className="text-[11px] font-medium font-mono px-2 py-0.5 rounded bg-ww-sky text-ww-primary">
                        {PRODUCT_LABELS[request.product] ?? request.product}
                      </span>

                      {/* Use case */}
                      <span className="text-[11px] text-ww-gray-500">
                        {USE_CASE_LABELS[request.useCase] ?? request.useCase}
                      </span>

                      {/* Separator */}
                      <span className="text-ww-gray-300">|</span>

                      {/* Environment */}
                      <span
                        className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded ${
                          request.environment === 'production'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-ww-gray-100 text-ww-gray-600'
                        }`}
                      >
                        {request.environment === 'production' ? 'Production' : 'Sandbox'}
                      </span>

                      {/* Status */}
                      <span
                        className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Created date */}
                    <div className="flex items-center gap-1.5 text-[11px] text-ww-gray-400">
                      <Calendar size={11} />
                      <span>Submitted {formatDate(request.createdAt)}</span>
                    </div>
                  </div>

                  {/* Right side: CTA buttons or arrow */}
                  <div className="flex items-center gap-2 shrink-0">
                    {request.status === 'pending_agreement' && (
                      <button
                        onClick={(e) => handleSignAgreement(e, request.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
                      >
                        <FileSignature size={12} />
                        Sign Agreement
                      </button>
                    )}

                    {request.status === 'sandbox_approved' && (
                      <button
                        onClick={(e) => handleRequestProduction(e, request.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ww-primary text-white text-xs font-medium hover:bg-ww-primary-light transition-colors"
                      >
                        <Rocket size={12} />
                        Request Production Access
                      </button>
                    )}

                    <ArrowRight
                      size={16}
                      className="text-ww-gray-300 group-hover:text-ww-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
