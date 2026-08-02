/**
 * LocalStorage-backed data store with seed data.
 * Clear seam for Supabase migration: replace load/save with Supabase client calls.
 */

import type {
  Partner,
  Customer,
  CustomerUser,
  PartnerCustomer,
  ApiRequest,
  ApiPricing,
  Approval,
  ReviewerNote,
  ViewMode,
  RequestStatus,
  ApprovalStage,
  ApprovalDecision,
  Environment,
  ProvisioningStep,
  WorkWaveProduct,
  GatewayPlatform,
  VolumeTier,
  VolumeTierDefinition,
  ApiCategory,
  SupportPackage,
  FeedbackItem,
} from './types'

import {
  seedPartners,
  seedCustomers,
  seedCustomerUsers,
  seedPartnerCustomers,
  seedRequests,
  seedApprovals,
} from './seed'

// ── Storage helpers ──────────────────────────────────────────────

const SEED_VERSION = '10'
const PREFIX = 'ww-api-portal:'

function key(name: string): string {
  return `${PREFIX}${name}`
}

function load<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key(k))
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save<T>(k: string, value: T): void {
  localStorage.setItem(key(k), JSON.stringify(value))
}

// Reset seed data if version changed
function ensureSeed(): void {
  const stored = localStorage.getItem(key('seed-version'))
  if (stored !== SEED_VERSION) {
    // Clear all portal data
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) keysToRemove.push(k)
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    localStorage.setItem(key('seed-version'), SEED_VERSION)
  }
}

ensureSeed()

// ── Volume Tier Pricing ─────────────────────────────────────────

export const VOLUME_TIERS: VolumeTierDefinition[] = [
  { tier: 1, label: 'Tier 1', callsPerMonth: 100_000,     monthlyRate: 345,     perCallRate: 0.00345, overageRate: 0.008625 },
  { tier: 2, label: 'Tier 2', callsPerMonth: 500_000,     monthlyRate: 1_560,   perCallRate: 0.00312, overageRate: 0.0078 },
  { tier: 3, label: 'Tier 3', callsPerMonth: 2_000_000,   monthlyRate: 5_220,   perCallRate: 0.00261, overageRate: 0.006525 },
  { tier: 4, label: 'Tier 4', callsPerMonth: 5_000_000,   monthlyRate: 12_083,  perCallRate: 0.00242, overageRate: 0.00605 },
  { tier: 5, label: 'Tier 5', callsPerMonth: 10_000_000,  monthlyRate: 22_530,  perCallRate: 0.00225, overageRate: 0.005625 },
  { tier: 6, label: 'Tier 6', callsPerMonth: 50_000_000,  monthlyRate: 70_950,  perCallRate: 0.00142, overageRate: 0.00355 },
  { tier: 7, label: 'Tier 7', callsPerMonth: 100_000_000, monthlyRate: 105_600, perCallRate: 0.00106, overageRate: 0.00265 },
]

export function suggestTier(volume: number): VolumeTier {
  for (const t of VOLUME_TIERS) {
    if (t.callsPerMonth >= volume) return t.tier
  }
  return 7
}

// ── UID helper ───────────────────────────────────────────────────

let counter = 0
function uid(): string {
  return `${Date.now().toString(36)}-${(counter++).toString(36)}`
}

function now(): string {
  return new Date().toISOString()
}

// ── Provisioning helpers ─────────────────────────────────────────

function getGatewayForProduct(product: WorkWaveProduct): GatewayPlatform {
  if (product === 'pestpac' || product === 'realgreen') return 'apigee'
  if (product === 'winteam' || product === 'timegate_plus' || product === 'lighthouse') return 'concourse'
  return 'manual'
}

function getGatewayLabel(product: WorkWaveProduct): string {
  if (product === 'pestpac' || product === 'realgreen') return 'Apigee'
  if (product === 'winteam' || product === 'timegate_plus' || product === 'lighthouse') return 'Concourse (Azure APIM)'
  return 'API Gateway'
}

function getDefaultProvisioningChecklist(product: WorkWaveProduct, _environment: Environment): ProvisioningStep[] {
  const gateway = getGatewayLabel(product)
  return [
    { id: 'prov-1', label: 'Create API Credentials', description: `Generate client ID and secret for ${gateway}`, completed: false, completedAt: null, completedBy: null },
    { id: 'prov-2', label: `Configure ${gateway}`, description: `Set up API proxy/product in ${gateway}`, completed: false, completedAt: null, completedBy: null },
    { id: 'prov-3', label: 'Set Rate Limits', description: `Configure rate limits and quotas in ${gateway}`, completed: false, completedAt: null, completedBy: null },
    { id: 'prov-4', label: 'Deliver Credentials', description: 'Send credentials package to technical contact via secure channel', completed: false, completedAt: null, completedBy: null },
    { id: 'prov-5', label: 'Update Billing', description: 'Configure billing and usage tracking for this integration', completed: false, completedAt: null, completedBy: null },
  ]
}

// ── Store ────────────────────────────────────────────────────────

export const store = {
  // ── Partners ─────────────────────────────────────────────────

  getPartners(): Partner[] {
    return load<Partner[]>('partners', seedPartners)
  },

  getPartner(id: string): Partner | undefined {
    return this.getPartners().find(p => p.id === id)
  },

  // ── Customers ────────────────────────────────────────────────

  getCustomers(): Customer[] {
    return load<Customer[]>('customers', seedCustomers)
  },

  getCustomer(id: string): Customer | undefined {
    return this.getCustomers().find(c => c.id === id)
  },

  // ── Customer Users ───────────────────────────────────────────

  getCustomerUsers(): CustomerUser[] {
    return load<CustomerUser[]>('customer-users', seedCustomerUsers)
  },

  getCustomerUser(id: string): CustomerUser | undefined {
    return this.getCustomerUsers().find(u => u.id === id)
  },

  getCustomerUsersForCustomer(customerId: string): CustomerUser[] {
    return this.getCustomerUsers().filter(u => u.customerId === customerId)
  },

  // ── Partner-Customer Links ───────────────────────────────────

  getPartnerCustomers(): PartnerCustomer[] {
    return load<PartnerCustomer[]>('partner-customers', seedPartnerCustomers)
  },

  getLinksForPartner(partnerId: string): PartnerCustomer[] {
    return this.getPartnerCustomers().filter(pc => pc.partnerId === partnerId)
  },

  getLinksForCustomer(customerId: string): PartnerCustomer[] {
    return this.getPartnerCustomers().filter(pc => pc.customerId === customerId)
  },

  // ── Requests ─────────────────────────────────────────────────

  getRequests(): ApiRequest[] {
    return load<ApiRequest[]>('requests', seedRequests)
  },

  getRequest(id: string): ApiRequest | undefined {
    return this.getRequests().find(r => r.id === id)
  },

  getRequestByCaseNumber(caseNumber: string): ApiRequest | undefined {
    return this.getRequests().find(r => r.caseNumber === caseNumber.toUpperCase())
  },

  getRequestsForCustomer(customerId: string): ApiRequest[] {
    return this.getRequests().filter(r => r.customerId === customerId)
  },

  getRequestsForPartner(partnerId: string): ApiRequest[] {
    return this.getRequests().filter(r => r.partnerId === partnerId)
  },

  getPendingRequests(): ApiRequest[] {
    const pendingStatuses: RequestStatus[] = ['pending_review', 'pending_production_review', 'on_hold']
    return this.getRequests().filter(r => pendingStatuses.includes(r.status))
  },

  nextCaseNumber(): string {
    const requests = this.getRequests()
    let max = 0
    for (const r of requests) {
      const match = r.caseNumber?.match(/WW-API-(\d+)/)
      if (match) {
        const n = parseInt(match[1], 10)
        if (n > max) max = n
      }
    }
    return `WW-API-${String(max + 1).padStart(4, '0')}`
  },

  createRequest(req: Omit<ApiRequest, 'id' | 'caseNumber' | 'createdAt' | 'updatedAt' | 'status' | 'agreementSignedAt' | 'pricing' | 'supportPackage' | 'endpointsApproved' | 'reviewerNotes' | 'provisioningChecklist' | 'gatewayPlatform' | 'estimatedMonthlyVolume' | 'apiCategories' | 'salesforceCaseId' | 'holdReason' | 'holdPlacedBy' | 'holdPlacedAt'>): ApiRequest {
    const requests = this.getRequests()
    const newReq: ApiRequest = {
      ...req,
      id: `req-${uid()}`,
      caseNumber: this.nextCaseNumber(),
      status: 'pending_agreement',
      agreementSignedAt: null,
      pricing: null,
      supportPackage: null,
      endpointsApproved: null,
      reviewerNotes: [],
      provisioningChecklist: [],
      gatewayPlatform: null,
      estimatedMonthlyVolume: null,
      apiCategories: null,
      salesforceCaseId: null,
      holdReason: null,
      holdPlacedBy: null,
      holdPlacedAt: null,
      createdAt: now(),
      updatedAt: now(),
    }
    requests.push(newReq)
    save('requests', requests)
    return newReq
  },

  signAgreement(requestId: string): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    requests[idx] = {
      ...requests[idx],
      status: 'pending_review',
      agreementSignedAt: now(),
      updatedAt: now(),
    }
    save('requests', requests)
    return requests[idx]
  },

  updateRequestStatus(requestId: string, status: RequestStatus): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    requests[idx] = { ...requests[idx], status, updatedAt: now() }

    // Auto-initialize provisioning checklist when status becomes approved
    if ((status === 'sandbox_approved' || status === 'production_approved') && requests[idx].provisioningChecklist.length === 0) {
      const checklist = getDefaultProvisioningChecklist(requests[idx].product, requests[idx].environment)
      const gw = getGatewayForProduct(requests[idx].product)
      requests[idx] = { ...requests[idx], provisioningChecklist: checklist, gatewayPlatform: gw }
    }

    save('requests', requests)

    // If approved, create/update partner-customer link
    if (status === 'sandbox_approved' || status === 'production_approved') {
      const req = requests[idx]
      if (req.partnerId) {
        const links = this.getPartnerCustomers()
        const existing = links.find(
          l => l.partnerId === req.partnerId && l.customerId === req.customerId
        )
        const env: Environment = status === 'production_approved' ? 'production' : 'sandbox'
        if (existing) {
          const linkIdx = links.findIndex(l => l.id === existing.id)
          links[linkIdx] = { ...existing, environment: env, status: 'active', revokedAt: null }
        } else {
          links.push({
            id: `pc-${uid()}`,
            partnerId: req.partnerId,
            customerId: req.customerId,
            status: 'active',
            environment: env,
            linkedAt: now(),
            revokedAt: null,
          })
        }
        save('partner-customers', links)
      }
    }

    return requests[idx]
  },

  // ── Pricing ─────────────────────────────────────────────────

  setPricing(requestId: string, pricing: ApiPricing): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    requests[idx] = { ...requests[idx], pricing, updatedAt: now() }
    save('requests', requests)
    return requests[idx]
  },

  setEstimatedVolume(requestId: string, volume: number | null): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    requests[idx] = { ...requests[idx], estimatedMonthlyVolume: volume, updatedAt: now() }
    save('requests', requests)
    return requests[idx]
  },

  setApiCategories(requestId: string, categories: ApiCategory[] | null): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    requests[idx] = { ...requests[idx], apiCategories: categories, updatedAt: now() }
    save('requests', requests)
    return requests[idx]
  },

  setSupportPackage(requestId: string, pkg: SupportPackage): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    requests[idx] = { ...requests[idx], supportPackage: pkg, updatedAt: now() }
    save('requests', requests)
    return requests[idx]
  },

  // ── Provisioning ──────────────────────────────────────────────

  initializeProvisioningChecklist(requestId: string): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    const req = requests[idx]
    const checklist = getDefaultProvisioningChecklist(req.product, req.environment)
    const gw = getGatewayForProduct(req.product)
    requests[idx] = { ...req, provisioningChecklist: checklist, gatewayPlatform: gw, updatedAt: now() }
    save('requests', requests)
    return requests[idx]
  },

  toggleProvisioningStep(requestId: string, stepId: string, completedBy: string): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    const checklist = requests[idx].provisioningChecklist.map(step => {
      if (step.id !== stepId) return step
      return step.completed
        ? { ...step, completed: false, completedAt: null, completedBy: null }
        : { ...step, completed: true, completedAt: now(), completedBy }
    })
    requests[idx] = { ...requests[idx], provisioningChecklist: checklist, updatedAt: now() }
    save('requests', requests)
    return requests[idx]
  },

  // ── Active Integration Queries ────────────────────────────────

  getApprovedRequests(): ApiRequest[] {
    const approvedStatuses: RequestStatus[] = ['sandbox_approved', 'production_approved']
    return this.getRequests().filter(r => approvedStatuses.includes(r.status))
  },

  getActiveIntegrationsForCustomer(customerId: string): ApiRequest[] {
    const approvedStatuses: RequestStatus[] = ['sandbox_approved', 'production_approved']
    return this.getRequests().filter(r => r.customerId === customerId && approvedStatuses.includes(r.status))
  },

  // ── Endpoints Approved ──────────────────────────────────────

  setEndpointsApproved(requestId: string, endpoints: string): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    requests[idx] = { ...requests[idx], endpointsApproved: endpoints, updatedAt: now() }
    save('requests', requests)
    return requests[idx]
  },

  // ── Reviewer Notes ────────────────────────────────────────

  addReviewerNote(requestId: string, author: string, content: string): ReviewerNote | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    const note: ReviewerNote = {
      id: `note-${uid()}`,
      author,
      content,
      createdAt: now(),
    }
    requests[idx] = {
      ...requests[idx],
      reviewerNotes: [...requests[idx].reviewerNotes, note],
      updatedAt: now(),
    }
    save('requests', requests)
    return note
  },

  // ── Approvals ────────────────────────────────────────────────

  getApprovals(): Approval[] {
    return load<Approval[]>('approvals', seedApprovals)
  },

  getApprovalsForRequest(requestId: string): Approval[] {
    return this.getApprovals().filter(a => a.requestId === requestId)
  },

  addApproval(
    requestId: string,
    reviewer: string,
    stage: ApprovalStage,
    decision: ApprovalDecision,
    rationale: string
  ): Approval {
    const approvals = this.getApprovals()
    const newApproval: Approval = {
      id: `appr-${uid()}`,
      requestId,
      reviewer,
      stage,
      decision,
      rationale,
      decidedAt: now(),
    }
    approvals.push(newApproval)
    save('approvals', approvals)

    // Update request status based on decision
    if (decision === 'approved') {
      const req = this.getRequest(requestId)
      if (req) {
        if (stage === 'sandbox_approval') {
          this.updateRequestStatus(requestId, 'sandbox_approved')
        } else if (stage === 'production_approval') {
          this.updateRequestStatus(requestId, 'production_approved')
        }
      }
    } else if (decision === 'denied') {
      const req = this.getRequest(requestId)
      if (req) {
        if (stage === 'sandbox_approval' || stage === 'initial_review' || stage === 'security_review' || stage === 'legal_review') {
          this.updateRequestStatus(requestId, 'sandbox_denied')
        } else if (stage === 'production_approval') {
          this.updateRequestStatus(requestId, 'production_denied')
        }
      }
    }

    return newApproval
  },

  // ── Hold / Competitive Review ──────────────────────────────────

  holdRequest(requestId: string, reason: string, placedBy: string): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    requests[idx] = {
      ...requests[idx],
      status: 'on_hold',
      holdReason: reason,
      holdPlacedBy: placedBy,
      holdPlacedAt: now(),
      updatedAt: now(),
    }
    save('requests', requests)
    return requests[idx]
  },

  releaseHold(requestId: string): ApiRequest | undefined {
    const requests = this.getRequests()
    const idx = requests.findIndex(r => r.id === requestId)
    if (idx === -1) return undefined
    requests[idx] = {
      ...requests[idx],
      status: 'pending_review',
      updatedAt: now(),
    }
    save('requests', requests)
    return requests[idx]
  },

  // ── Partner Blocking ──────────────────────────────────────────

  blockPartner(partnerId: string, reason: string): Partner | undefined {
    const partners = this.getPartners()
    const idx = partners.findIndex(p => p.id === partnerId)
    if (idx === -1) return undefined
    partners[idx] = { ...partners[idx], tier: 'blocked', blockedReason: reason }
    save('partners', partners)
    return partners[idx]
  },

  unblockPartner(partnerId: string): Partner | undefined {
    const partners = this.getPartners()
    const idx = partners.findIndex(p => p.id === partnerId)
    if (idx === -1) return undefined
    partners[idx] = { ...partners[idx], tier: 'under_review', blockedReason: undefined }
    save('partners', partners)
    return partners[idx]
  },

  toggleCompetitiveFlag(partnerId: string, flaggedBy: string, reason: string): Partner | undefined {
    const partners = this.getPartners()
    const idx = partners.findIndex(p => p.id === partnerId)
    if (idx === -1) return undefined
    const p = partners[idx]
    if (p.competitiveFlag) {
      partners[idx] = { ...p, competitiveFlag: false, competitiveFlagReason: undefined, competitiveFlaggedBy: undefined, competitiveFlaggedAt: undefined }
    } else {
      partners[idx] = { ...p, competitiveFlag: true, competitiveFlagReason: reason, competitiveFlaggedBy: flaggedBy, competitiveFlaggedAt: now() }
    }
    save('partners', partners)
    return partners[idx]
  },

  // ── Cross-reference queries ───────────────────────────────────

  getCustomersByPartner(partnerId: string): { customer: import('./types').Customer; links: PartnerCustomer[]; requests: ApiRequest[] }[] {
    const links = this.getLinksForPartner(partnerId)
    const requests = this.getRequestsForPartner(partnerId)
    const customerIds = new Set([
      ...links.map(l => l.customerId),
      ...requests.map(r => r.customerId),
    ])
    return Array.from(customerIds).map(cid => ({
      customer: this.getCustomer(cid)!,
      links: links.filter(l => l.customerId === cid),
      requests: requests.filter(r => r.customerId === cid),
    })).filter(entry => entry.customer)
  },

  getCompetitiveFlaggedPartners(): Partner[] {
    return this.getPartners().filter(p => p.competitiveFlag || p.tier === 'blocked')
  },

  hasContradictoryResellIntent(request: ApiRequest): boolean {
    if (request.customerIntendToResell === null || request.developerIntendToResell === null) return false
    return request.customerIntendToResell !== request.developerIntendToResell
  },

  // ── View Mode ────────────────────────────────────────────────

  getViewMode(): ViewMode {
    return (localStorage.getItem(key('view-mode')) as ViewMode) || 'customer'
  },

  setViewMode(mode: ViewMode): void {
    localStorage.setItem(key('view-mode'), mode)
  },

  // ── Session ──────────────────────────────────────────────────
  // For the demo: which customer user is "logged in"

  getActiveUserId(): string | null {
    return localStorage.getItem(key('active-user-id'))
  },

  setActiveUserId(userId: string): void {
    localStorage.setItem(key('active-user-id'), userId)
  },

  getActiveUser(): CustomerUser | undefined {
    const id = this.getActiveUserId()
    return id ? this.getCustomerUser(id) : undefined
  },

  // ── Feedback ─────────────────────────────────────────────────

  getFeedback(): FeedbackItem[] {
    return load<FeedbackItem[]>('feedback', [])
  },

  addFeedback(item: Omit<FeedbackItem, 'id' | 'createdAt'>): FeedbackItem {
    const items = this.getFeedback()
    const newItem: FeedbackItem = {
      ...item,
      id: `fb-${uid()}`,
      createdAt: now(),
    }
    items.push(newItem)
    save('feedback', items)
    return newItem
  },

  addReply(feedbackId: string, reply: { author: string; comment: string }): void {
    const items = this.getFeedback()
    const item = items.find(f => f.id === feedbackId)
    if (!item) return
    if (!item.replies) item.replies = []
    item.replies.push({
      id: `re-${uid()}`,
      author: reply.author,
      comment: reply.comment,
      createdAt: now(),
    })
    save('feedback', items)
  },

  deleteFeedback(id: string): void {
    const items = this.getFeedback().filter(f => f.id !== id)
    save('feedback', items)
  },

  clearFeedback(): void {
    save('feedback', [])
  },

  isFeedbackEnabled(): boolean {
    return localStorage.getItem(key('feedback-enabled')) !== '0'
  },

  setFeedbackEnabled(enabled: boolean): void {
    localStorage.setItem(key('feedback-enabled'), enabled ? '1' : '0')
  },

  // ── Reset ────────────────────────────────────────────────────

  reset(): void {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) keysToRemove.push(k)
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    localStorage.setItem(key('seed-version'), SEED_VERSION)
  },
}
