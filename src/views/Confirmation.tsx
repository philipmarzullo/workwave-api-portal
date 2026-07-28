import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Copy,
  Mail,
  Clock,
  Search,
  ArrowRight,
} from 'lucide-react'
import { useState } from 'react'
import { store } from '@/data/store'
import { PRODUCT_LABELS, USE_CASE_LABELS } from '@/App'

export function Confirmation() {
  const { requestId } = useParams<{ requestId: string }>()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const request = requestId ? store.getRequest(requestId) : undefined

  if (!request) {
    return (
      <div className="max-w-[600px] mx-auto py-16 text-center">
        <h2 className="font-display text-lg font-semibold text-ww-gray-800 mb-2">
          Request Not Found
        </h2>
        <p className="text-sm text-ww-gray-500 mb-4">
          This confirmation link is invalid or has expired.
        </p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-ww-primary hover:text-ww-primary-light transition-colors"
        >
          Return to Directory
        </button>
      </div>
    )
  }

  const partner = request.partnerId ? store.getPartner(request.partnerId) : null
  const partnerName = partner?.name ?? request.partnerNameFreetext ?? 'Unlisted Partner'
  const requestingUser = store.getCustomerUser(request.requestedBy)

  function handleCopy() {
    navigator.clipboard.writeText(request!.caseNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-[600px] mx-auto py-12">
      {/* Success header */}
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={28} className="text-ww-green" />
        </div>
        <h1 className="font-display text-2xl font-bold text-ww-gray-900 mb-2">
          Request Submitted
        </h1>
        <p className="text-sm text-ww-gray-500 leading-relaxed max-w-md mx-auto">
          Your API access request has been received and is now being processed.
          Save your case number for future reference.
        </p>
      </div>

      {/* Case number card */}
      <div className="bg-white rounded-md border border-ww-gray-200 p-6 mb-6">
        <div className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em] mb-2">
          Case Number
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-mono font-bold text-ww-navy tracking-wide">
            {request.caseNumber}
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-ww-gray-200 text-[11px] font-mono text-ww-gray-500 hover:border-ww-primary hover:text-ww-primary transition-colors"
          >
            <Copy size={12} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Request summary */}
      <div className="bg-white rounded-md border border-ww-gray-200 divide-y divide-ww-gray-100 mb-6">
        <div className="px-6 py-4">
          <div className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em] mb-3">
            Request Summary
          </div>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-ww-gray-500">Partner</dt>
              <dd className="text-sm font-medium text-ww-gray-800">{partnerName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-ww-gray-500">Product</dt>
              <dd className="text-[11px] font-mono uppercase tracking-[0.05em] px-2 py-0.5 rounded border border-ww-gray-200 text-ww-gray-600">
                {PRODUCT_LABELS[request.product] ?? request.product}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-ww-gray-500">Use Case</dt>
              <dd className="text-sm text-ww-gray-800">
                {USE_CASE_LABELS[request.useCase] ?? request.useCase}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-ww-gray-500">Environment</dt>
              <dd className="text-[11px] font-mono uppercase tracking-[0.05em] px-2 py-0.5 rounded border border-ww-gray-200 text-ww-gray-600">
                {request.environment}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* What happens next */}
      <div className="bg-white rounded-md border border-ww-gray-200 p-6 mb-6">
        <div className="text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em] mb-4">
          What Happens Next
        </div>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-ww-sky flex items-center justify-center shrink-0 mt-0.5">
              <Mail size={13} className="text-ww-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-ww-gray-800">Email Confirmation</p>
              <p className="text-xs text-ww-gray-500 leading-relaxed">
                A confirmation email will be sent to{' '}
                <span className="font-mono text-ww-gray-600">{requestingUser?.email ?? 'your email'}</span>{' '}
                with your case number and request details.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-ww-sky flex items-center justify-center shrink-0 mt-0.5">
              <Clock size={13} className="text-ww-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-ww-gray-800">Review Process</p>
              <p className="text-xs text-ww-gray-500 leading-relaxed">
                Our API team will review your request. You will receive email updates as your
                request moves through initial review, security review, and approval stages.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-ww-sky flex items-center justify-center shrink-0 mt-0.5">
              <Search size={13} className="text-ww-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-ww-gray-800">Check Status</p>
              <p className="text-xs text-ww-gray-500 leading-relaxed">
                You can check the status of your request at any time using your case number.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/check-status')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-ww-gray-200 text-sm font-medium text-ww-gray-700 hover:border-ww-primary hover:text-ww-primary transition-colors"
        >
          <Search size={14} />
          Check Request Status
        </button>
        <button
          onClick={() => navigate('/')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-ww-primary text-white text-sm font-medium hover:bg-ww-primary-light transition-colors"
        >
          Back to Directory
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
