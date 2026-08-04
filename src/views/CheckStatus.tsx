import { useState, useRef, useEffect } from 'react'
import {
  Search,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Building2,
  Calendar,
  ShieldCheck,
  Key,
  FileCode,
  Headphones,
  MessageSquare,
  Send,
} from 'lucide-react'
import { store } from '@/data/store'
import type { ApiRequest, Approval, RequestMessage } from '@/data/types'
import { PRODUCT_LABELS, STATUS_LABELS, USE_CASE_LABELS, STAGE_LABELS, STAGE_REVIEWER_ROLES, GATEWAY_LABELS } from '@/App'

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

const DECISION_CONFIG: Record<string, { icon: typeof CheckCircle2; className: string; label: string }> = {
  approved: { icon: CheckCircle2, className: 'text-emerald-600', label: 'Approved' },
  denied: { icon: XCircle, className: 'text-red-600', label: 'Denied' },
  needs_info: { icon: AlertCircle, className: 'text-amber-600', label: 'More Info Requested' },
}

// STAGE_LABELS and STAGE_REVIEWER_ROLES imported from App

export function CheckStatus() {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [result, setResult] = useState<ApiRequest | null>(null)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [messages, setMessages] = useState<RequestMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeUser = store.getActiveUser()

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim().toUpperCase()
    if (!trimmed) return

    const request = store.getRequestByCaseNumber(trimmed)
    setResult(request ?? null)
    if (request) {
      setApprovals(
        store.getApprovalsForRequest(request.id)
          .sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime())
      )
      setMessages(store.getMessages(request.id))
    } else {
      setApprovals([])
      setMessages([])
    }
    setSearched(true)
  }

  function handleClear() {
    setQuery('')
    setSearched(false)
    setResult(null)
    setApprovals([])
    setMessages([])
    setNewMessage('')
  }

  function handleSendMessage() {
    if (!result || !newMessage.trim() || !activeUser) return
    store.addMessage(result.id, activeUser.name, 'customer', newMessage.trim())
    setMessages(store.getMessages(result.id))
    setNewMessage('')
  }

  const partner = result?.partnerId ? store.getPartner(result.partnerId) : null
  const partnerName = partner?.name ?? result?.partnerNameFreetext ?? 'Unlisted Partner'
  const status = result ? (STATUS_LABELS[result.status] ?? { label: result.status, color: 'bg-gray-100 text-gray-600' }) : null

  return (
    <div className="max-w-[640px] mx-auto py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em] mb-1">
            Check Status
          </div>
          <h1 className="font-display text-2xl font-bold text-ww-gray-900 mb-2">
            Look Up Your Request
          </h1>
          <p className="text-sm text-ww-gray-500 leading-relaxed">
            Enter your case number to check the current status of your API access request.
          </p>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ww-gray-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="WW-API-0001"
              className="w-full pl-10 pr-4 py-2.5 rounded-md border border-ww-gray-300 text-sm font-mono text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-md bg-ww-primary text-white text-sm font-medium hover:bg-ww-primary-light transition-colors"
          >
            Search
          </button>
        </div>
        <p className="text-[11px] text-ww-gray-400 mt-2 font-mono">
          Case numbers use the format WW-API-XXXX
        </p>
      </form>

      {/* Results */}
      {searched && !result && (
        <div className="bg-white rounded-md border border-ww-gray-200 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-ww-gray-100 flex items-center justify-center mx-auto mb-4">
            <Search size={20} className="text-ww-gray-400" />
          </div>
          <h3 className="font-display text-base font-semibold text-ww-gray-800 mb-1">
            No Request Found
          </h3>
          <p className="text-sm text-ww-gray-500 mb-4">
            No request matches case number <span className="font-mono font-medium">{query.toUpperCase()}</span>.
            Please check the number and try again.
          </p>
          <button
            onClick={handleClear}
            className="text-sm text-ww-primary hover:text-ww-primary-light transition-colors"
          >
            Clear search
          </button>
        </div>
      )}

      {searched && result && status && (
        <div className="space-y-4">
          {/* Back to search */}
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-sm text-ww-gray-500 hover:text-ww-primary transition-colors"
          >
            <ArrowLeft size={14} />
            New search
          </button>

          {/* Status card */}
          <div className="bg-white rounded-md border border-ww-gray-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-ww-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em] mb-1">
                    Case Number
                  </div>
                  <h2 className="font-mono text-lg font-bold text-ww-navy">
                    {result.caseNumber}
                  </h2>
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded font-mono ${status.color}`}>
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-ww-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  Submitted {formatDate(result.createdAt)}
                </span>
                <span className="text-ww-gray-200">|</span>
                <span>Updated {formatDate(result.updatedAt)}</span>
              </div>
            </div>

            {/* Details */}
            <div className="px-6 py-5 border-b border-ww-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={13} className="text-ww-gray-400" />
                <span className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em]">
                  Request Details
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <dt className="text-[11px] text-ww-gray-400 mb-0.5">Partner</dt>
                  <dd className="text-sm font-medium text-ww-gray-800">{partnerName}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ww-gray-400 mb-0.5">Product</dt>
                  <dd className="text-[11px] font-mono uppercase tracking-[0.05em] px-2 py-0.5 rounded border border-ww-gray-200 text-ww-gray-600 inline-block">
                    {PRODUCT_LABELS[result.product] ?? result.product}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ww-gray-400 mb-0.5">Use Case</dt>
                  <dd className="text-sm text-ww-gray-800">
                    {USE_CASE_LABELS[result.useCase] ?? result.useCase}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ww-gray-400 mb-0.5">Environment</dt>
                  <dd className="text-[11px] font-mono uppercase tracking-[0.05em] px-2 py-0.5 rounded border border-ww-gray-200 text-ww-gray-600 inline-block">
                    {result.environment}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Approval timeline */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck size={13} className="text-ww-gray-400" />
                <span className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em]">
                  Review Progress
                </span>
              </div>

              {approvals.length === 0 ? (
                <div className="flex items-center gap-3 p-4 rounded-md bg-ww-gray-50 border border-ww-gray-100">
                  <Clock size={16} className="text-ww-gray-400 shrink-0" />
                  <p className="text-sm text-ww-gray-500">
                    Your request is in the queue. You will receive email updates as it progresses through review.
                  </p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-ww-gray-100" />

                  <div className="space-y-4">
                    {approvals.map(approval => {
                      const config = DECISION_CONFIG[approval.decision] ?? DECISION_CONFIG.needs_info
                      const Icon = config.icon

                      return (
                        <div key={approval.id} className="relative pl-7">
                          <div
                            className={`absolute left-0 top-0.5 w-[15px] h-[15px] rounded-full border-2 border-white ${
                              approval.decision === 'approved'
                                ? 'bg-emerald-500'
                                : approval.decision === 'denied'
                                  ? 'bg-red-500'
                                  : 'bg-amber-500'
                            } ring-2 ring-white`}
                          />
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-semibold text-ww-gray-800">
                                {STAGE_LABELS[approval.stage] ?? approval.stage}
                              </span>
                              <Icon size={13} className={config.className} />
                            </div>
                            <div className={`text-[11px] font-medium mb-1 ${config.className}`}>
                              {config.label}
                            </div>
                            <p className="text-[11px] text-ww-gray-500 leading-relaxed mb-1">
                              {approval.rationale}
                            </p>
                            <div className="text-[10px] font-mono text-ww-gray-400">
                              {STAGE_REVIEWER_ROLES[approval.stage]?.team ?? 'Review Team'} &middot; {formatDateTime(approval.decidedAt)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Provisioning Progress or Next Steps — shown for approved requests */}
          {(result.status === 'sandbox_approved' || result.status === 'production_approved') && (
            result.provisioningChecklist.length > 0 ? (
              <div className="bg-white rounded-md border border-emerald-200">
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span className="text-[10px] font-mono font-medium text-emerald-600 uppercase tracking-[0.08em]">
                      Provisioning Progress
                    </span>
                    {result.gatewayPlatform && (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-ww-gray-100 text-ww-gray-600 ml-auto">
                        {GATEWAY_LABELS[result.gatewayPlatform] ?? result.gatewayPlatform}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {(() => {
                    const completed = result.provisioningChecklist.filter(s => s.completed).length
                    const total = result.provisioningChecklist.length
                    const pct = Math.round((completed / total) * 100)
                    return (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1 h-2 bg-ww-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${completed === total ? 'bg-emerald-500' : 'bg-ww-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${completed === total ? 'text-emerald-600' : 'text-ww-gray-600'}`}>
                          {completed}/{total}
                        </span>
                      </div>
                    )
                  })()}

                  <div className="space-y-2">
                    {result.provisioningChecklist.map(step => (
                      <div key={step.id} className="flex items-start gap-3 p-2.5 rounded-md bg-ww-gray-50 border border-ww-gray-100">
                        <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          step.completed ? 'bg-emerald-500' : 'bg-ww-gray-200'
                        }`}>
                          {step.completed && (
                            <svg width="8" height="6" viewBox="0 0 10 8" fill="none" className="text-white">
                              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${step.completed ? 'text-ww-gray-500' : 'text-ww-gray-800'}`}>
                            {step.label}
                          </p>
                          {step.completed && step.completedAt && (
                            <p className="text-[10px] font-mono text-ww-gray-400 mt-0.5">
                              Completed {formatDateTime(step.completedAt)}
                            </p>
                          )}
                          {!step.completed && (
                            <p className="text-[10px] text-ww-gray-400 mt-0.5">Pending</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-md border border-emerald-200">
                <div className="px-6 py-5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span className="text-[10px] font-mono font-medium text-emerald-600 uppercase tracking-[0.08em]">
                      Approved — Next Steps
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Key size={14} className="text-ww-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-ww-gray-800">Credential Delivery</p>
                        <p className="text-xs text-ww-gray-500 leading-relaxed">
                          API credentials and {result.status === 'production_approved' ? 'production' : 'sandbox'} access keys will be delivered to your technical contact via secure email.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileCode size={14} className="text-ww-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-ww-gray-800">Integration Setup</p>
                        <p className="text-xs text-ww-gray-500 leading-relaxed">
                          Your approved endpoints and rate limits are documented in the credentials package. Refer to the API documentation for integration guidance.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Headphones size={14} className="text-ww-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-ww-gray-800">Support</p>
                        <p className="text-xs text-ww-gray-500 leading-relaxed">
                          Contact your CSM or the API team for onboarding assistance. Reference your case number in all communications.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Communication Thread */}
          <div className="bg-white rounded-md border border-ww-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-ww-gray-200">
              <h2 className="text-sm font-mono font-semibold text-ww-gray-900 uppercase tracking-[0.06em] flex items-center gap-2">
                <MessageSquare size={16} className="text-ww-gray-400" />
                Communication
              </h2>
              <p className="text-[11px] text-ww-gray-400 mt-0.5">Messages between you and the review team</p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {messages.length > 0 ? (
                <div className="divide-y divide-ww-gray-50">
                  {messages.map(msg => (
                    <div key={msg.id} className={`px-6 py-3 ${msg.role === 'reviewer' ? 'bg-blue-50/40' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          msg.role === 'reviewer' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {msg.role === 'reviewer' ? 'Reviewer' : 'Customer'}
                        </span>
                        <span className="text-[12px] font-medium text-ww-gray-700">{msg.author}</span>
                        <span className="text-[10px] text-ww-gray-400 font-mono">{formatDateTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm text-ww-gray-700 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <MessageSquare size={24} className="mx-auto text-ww-gray-300 mb-2" />
                  <p className="text-sm text-ww-gray-400">No messages yet</p>
                  <p className="text-[11px] text-ww-gray-400 mt-0.5">The review team will reach out here if they need anything</p>
                </div>
              )}
            </div>
            {activeUser && (
              <div className="px-6 py-3 border-t border-ww-gray-200 bg-ww-gray-50">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
                          e.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Type a message to the review team..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-ww-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="self-end px-4 py-2 rounded-lg bg-ww-navy text-white text-sm font-medium hover:bg-ww-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  >
                    <Send size={14} />
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help text when no search yet */}
      {!searched && (
        <div className="text-center text-sm text-ww-gray-400 mt-8">
          <p>Your case number was provided in your confirmation email after submitting a request.</p>
        </div>
      )}
    </div>
  )
}
