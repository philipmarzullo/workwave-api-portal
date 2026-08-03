import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Globe,
  ExternalLink,
  Users,
  Server,
  FlaskConical,
  Link2,
  AlertTriangle,
  Clock,
  BarChart3,
  ShieldAlert,
  FileText,
  Package,
  Sparkles,
  Loader2,
  FileUp,
  Paperclip,
} from 'lucide-react'
import type { ApiRequest, PartnerCustomer } from '@/data/types'
import { WaiveIcon } from '@/components/WaiveIcon'
import { store } from '@/data/store'
import { PRODUCT_LABELS, STATUS_LABELS, TIER_LABELS, USE_CASE_LABELS } from '@/App'

const INTEGRATION_TYPE_LABELS: Record<string, string> = {
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function PartnerDetail() {
  const { partnerId } = useParams<{ partnerId: string }>()
  const navigate = useNavigate()

  const partner = useMemo(() => (partnerId ? store.getPartner(partnerId) : undefined), [partnerId])
  const links = useMemo(() => (partnerId ? store.getLinksForPartner(partnerId) : []), [partnerId])
  const requests = useMemo(() => (partnerId ? store.getRequestsForPartner(partnerId) : []), [partnerId])

  const stats = useMemo(() => {
    const activeLinks = links.filter(l => l.status === 'active')
    const sandboxLinks = links.filter(l => l.environment === 'sandbox' && l.status !== 'revoked')
    const productionLinks = links.filter(l => l.environment === 'production' && l.status !== 'revoked')
    return {
      totalLinked: links.length,
      active: activeLinks.length,
      sandbox: sandboxLinks.length,
      production: productionLinks.length,
      totalRequests: requests.length,
    }
  }, [links, requests])

  const activeCustomerNames = useMemo(() => {
    return links
      .filter(l => l.status === 'active')
      .map(l => store.getCustomer(l.customerId)?.name ?? 'Unknown')
  }, [links])

  const [summary, setSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  const generateSummary = async () => {
    if (!partner) return
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Give me a comprehensive overview of the partner "${partner.name}". They are a ${INTEGRATION_TYPE_LABELS[partner.integrationType]} integration partner supporting ${partner.productsSupported.map(p => PRODUCT_LABELS[p]).join(', ')}. Their website is ${partner.website}. They are currently ${partner.tier}. ${partner.competitiveFlag ? 'They have been flagged as potentially competitive: ' + partner.competitiveFlagReason : ''} They have ${stats.active} active customer integrations and ${stats.totalRequests} total API requests. Include: what they do, how they integrate with WorkWave, any risk factors, and recommendations.`,
          page: 'reviewer-partners',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSummary(data.answer)
      }
    } catch {
      // silently fail
    } finally {
      setSummaryLoading(false)
    }
  }

  if (!partner) {
    return (
      <div className="mx-auto py-12 text-center">
        <ShieldAlert size={48} className="mx-auto text-ww-gray-300 mb-4" />
        <h2 className="text-xl font-display font-bold text-ww-gray-700 mb-2">Partner Not Found</h2>
        <p className="text-sm text-ww-gray-500 mb-4">The partner you are looking for does not exist.</p>
        <button
          onClick={() => navigate('/reviewer')}
          className="px-4 py-2 rounded-md bg-ww-navy text-white text-sm font-medium hover:bg-ww-navy-light transition-colors"
        >
          Back to Queue
        </button>
      </div>
    )
  }

  const tierInfo = TIER_LABELS[partner.tier]

  return (
    <div className="mx-auto py-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-ww-gray-500 hover:text-ww-navy transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Partner Header */}
      <div className="bg-white rounded-md border border-ww-gray-200 p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-md bg-ww-gray-50 border border-ww-gray-200 flex items-center justify-center text-3xl shrink-0">
            {partner.logo}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-display font-bold text-ww-gray-900">{partner.name}</h1>
              {tierInfo && (
                <span className={`inline-flex px-2.5 py-1 rounded text-xs font-semibold ${tierInfo.color}`}>
                  {tierInfo.label}
                </span>
              )}
            </div>
            <p className="text-sm text-ww-gray-600 leading-relaxed mb-3">{partner.description}</p>
            <div className="flex items-center gap-4 flex-wrap text-sm">
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-ww-primary hover:underline"
              >
                <Globe size={14} />
                {partner.website}
                <ExternalLink size={10} />
              </a>
              <span className="flex items-center gap-1 text-ww-gray-500">
                <Link2 size={14} />
                {INTEGRATION_TYPE_LABELS[partner.integrationType] ?? partner.integrationType}
              </span>
              <div className="flex items-center gap-1.5">
                <Package size={14} className="text-ww-gray-400" />
                <div className="flex items-center gap-1">
                  {partner.productsSupported.map(p => (
                    <span key={p} className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-ww-sky text-ww-navy">
                      {PRODUCT_LABELS[p] ?? p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {partner.contractRef && (
              <p className="text-xs text-ww-gray-400 mt-2">
                Contract: <span className="font-mono">{partner.contractRef}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-white rounded-md border border-ww-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-mono font-semibold text-ww-gray-900 uppercase tracking-[0.06em] flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            AI Partner Summary
          </h2>
          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-ww-navy text-white hover:bg-ww-navy/90 disabled:opacity-40 transition-colors"
          >
            {summaryLoading ? <Loader2 size={12} className="animate-spin" /> : <WaiveIcon size={12} />}
            {summary ? 'Regenerate' : 'Generate Summary'}
          </button>
        </div>
        {summary ? (
          <div className="text-sm text-ww-gray-700 whitespace-pre-wrap leading-relaxed">{summary}</div>
        ) : summaryLoading ? (
          <div className="flex items-center gap-2 text-ww-gray-400 text-sm py-4">
            <Loader2 size={16} className="animate-spin" />
            WAIve is generating a partner overview...
          </div>
        ) : (
          <p className="text-sm text-ww-gray-400 italic">Click "Generate Summary" for a WAIve-powered overview of this partner, their integration, and key details.</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <button className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-ww-gray-400" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Linked Customers</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-gray-900">{stats.totalLinked}</p>
        </button>
        <button className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <Link2 size={14} className="text-ww-green" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Active</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-green">{stats.active}</p>
        </button>
        <button className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical size={14} className="text-ww-primary" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Sandbox</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-primary">{stats.sandbox}</p>
        </button>
        <button className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <Server size={14} className="text-purple-600" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Production</span>
          </div>
          <p className="text-2xl font-display font-bold text-purple-600">{stats.production}</p>
        </button>
        <button className="bg-white rounded-md border border-ww-gray-200 p-4 text-left transition-all hover:bg-ww-gray-50 hover:border-ww-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={14} className="text-ww-gray-400" />
            <span className="text-xs font-mono font-medium text-ww-gray-500 uppercase tracking-[0.06em]">Requests</span>
          </div>
          <p className="text-2xl font-display font-bold text-ww-gray-900">{stats.totalRequests}</p>
        </button>
      </div>

      {/* Linked Customers Table */}
      <div className="bg-white rounded-md border border-ww-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-ww-gray-200">
          <h2 className="text-sm font-mono font-semibold text-ww-gray-900 uppercase tracking-[0.06em] flex items-center gap-2">
            <Users size={16} className="text-ww-gray-400" />
            Linked Customers
          </h2>
        </div>
        {links.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-ww-gray-50 border-b border-ww-gray-200">
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-ww-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-ww-gray-500 uppercase tracking-wider">Environment</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-ww-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-ww-gray-500 uppercase tracking-wider">Linked</th>
                  <th className="text-left px-6 py-3 text-[10px] font-semibold text-ww-gray-500 uppercase tracking-wider">Revoked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ww-gray-100">
                {links.map((link: PartnerCustomer) => {
                  const linkCustomer = store.getCustomer(link.customerId)
                  return (
                    <tr key={link.id} className="hover:bg-ww-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-ww-gray-900">{linkCustomer?.name ?? 'Unknown'}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          link.environment === 'production'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {link.environment === 'production' ? <Server size={10} /> : <FlaskConical size={10} />}
                          {link.environment === 'production' ? 'Production' : 'Sandbox'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${
                          link.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : link.status === 'revoked'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs font-mono text-ww-gray-600">{formatDate(link.linkedAt)}</td>
                      <td className="px-6 py-3 text-xs font-mono text-ww-gray-600">
                        {link.revokedAt ? formatDate(link.revokedAt) : <span className="text-ww-gray-300">&mdash;</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <Users size={32} className="mx-auto text-ww-gray-300 mb-2" />
            <p className="text-sm text-ww-gray-400">No customers linked to this partner yet.</p>
          </div>
        )}
      </div>

      {/* Request History */}
      <div className="bg-white rounded-md border border-ww-gray-200 mb-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-ww-gray-200">
          <h2 className="text-sm font-mono font-semibold text-ww-gray-900 uppercase tracking-[0.06em] flex items-center gap-2">
            <Clock size={16} className="text-ww-gray-400" />
            Request History
          </h2>
        </div>
        {requests.length > 0 ? (
          <div className="divide-y divide-ww-gray-100">
            {requests
              .sort((a: ApiRequest, b: ApiRequest) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((req: ApiRequest) => {
                const reqCustomer = store.getCustomer(req.customerId)
                const reqStatus = STATUS_LABELS[req.status] ?? { label: req.status, color: 'bg-gray-100 text-gray-600' }
                return (
                  <div
                    key={req.id}
                    className="px-6 py-4 hover:bg-ww-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/reviewer/request/${req.id}`)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-medium text-ww-gray-900">{reqCustomer?.name ?? 'Unknown'}</p>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${reqStatus.color}`}>
                            {reqStatus.label}
                          </span>
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-ww-sky text-ww-navy">
                            {PRODUCT_LABELS[req.product] ?? req.product}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-ww-gray-500">
                          <span>{USE_CASE_LABELS[req.useCase] ?? req.useCase}</span>
                          <span className="text-ww-gray-300">|</span>
                          <span className="font-mono">Created {formatDate(req.createdAt)}</span>
                          <span className="text-ww-gray-300">|</span>
                          <span className="font-mono">Updated {formatDate(req.updatedAt)}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium shrink-0 ${
                        req.environment === 'production'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {req.environment === 'production' ? <Server size={10} /> : <FlaskConical size={10} />}
                        {req.environment === 'production' ? 'Production' : 'Sandbox'}
                      </span>
                    </div>
                  </div>
                )
              })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <FileText size={32} className="mx-auto text-ww-gray-300 mb-2" />
            <p className="text-sm text-ww-gray-400">No requests found for this partner.</p>
          </div>
        )}
      </div>

      {/* Impact Analysis */}
      <div className="bg-white rounded-md border border-ww-gray-200 p-6">
        <h2 className="text-sm font-mono font-semibold text-ww-gray-900 uppercase tracking-[0.06em] mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-ww-gray-400" />
          Impact Analysis
        </h2>
        {stats.active > 0 ? (
          <>
            <div className="flex items-start gap-2 p-4 rounded-md bg-amber-50 border border-amber-200 mb-4">
              <AlertTriangle size={16} className="text-ww-amber shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  If this partner is removed, {stats.active} customer{stats.active !== 1 ? 's' : ''} would be affected
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Active integrations would need to be migrated or discontinued.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              {activeCustomerNames.map((name, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 rounded-md bg-ww-gray-50 border border-ww-gray-100">
                  <Users size={14} className="text-ww-gray-400 shrink-0" />
                  <p className="text-sm font-medium text-ww-gray-900">{name}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-4 rounded-md bg-ww-gray-50 border border-ww-gray-100 text-center">
            <p className="text-sm text-ww-gray-500">No active integrations. Removing this partner would have no impact on customers.</p>
          </div>
        )}
      </div>

      {/* Documents & Agreements */}
      <div className="bg-white rounded-md border border-ww-gray-200 mt-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-ww-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-mono font-semibold text-ww-gray-900 uppercase tracking-[0.06em] flex items-center gap-2">
            <Paperclip size={16} className="text-ww-gray-400" />
            Documents & Agreements
          </h2>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-ww-gray-200 text-ww-gray-600 hover:bg-ww-gray-50 transition-colors">
            <FileUp size={12} />
            Upload
          </button>
        </div>
        <div className="divide-y divide-ww-gray-100">
          {partner.contractRef ? (
            <>
              <div className="px-6 py-3 flex items-center justify-between hover:bg-ww-gray-50">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-ww-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-ww-gray-900">API Partnership Agreement</p>
                    <p className="text-[11px] text-ww-gray-400 font-mono">Ref: {partner.contractRef}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-ww-gray-400">PDF</span>
              </div>
              <div className="px-6 py-3 flex items-center justify-between hover:bg-ww-gray-50">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-ww-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-ww-gray-900">API Terms & Conditions</p>
                    <p className="text-[11px] text-ww-gray-400 font-mono">Standard terms v2.1</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-ww-gray-400">PDF</span>
              </div>
            </>
          ) : (
            <div className="px-6 py-8 text-center">
              <Paperclip size={24} className="mx-auto text-ww-gray-300 mb-2" />
              <p className="text-sm text-ww-gray-400">No documents uploaded yet</p>
              <p className="text-[11px] text-ww-gray-400 mt-1">Upload partnership agreements, contracts, and negotiation documents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
