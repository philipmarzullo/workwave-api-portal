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
  Approval,
  ViewMode,
  RequestStatus,
  ApprovalStage,
  ApprovalDecision,
  Environment,
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

const SEED_VERSION = '2'
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

// ── UID helper ───────────────────────────────────────────────────

let counter = 0
function uid(): string {
  return `${Date.now().toString(36)}-${(counter++).toString(36)}`
}

function now(): string {
  return new Date().toISOString()
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
    const pendingStatuses: RequestStatus[] = ['pending_review', 'pending_production_review']
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

  createRequest(req: Omit<ApiRequest, 'id' | 'caseNumber' | 'createdAt' | 'updatedAt' | 'status' | 'agreementSignedAt'>): ApiRequest {
    const requests = this.getRequests()
    const newReq: ApiRequest = {
      ...req,
      id: `req-${uid()}`,
      caseNumber: this.nextCaseNumber(),
      status: 'pending_agreement',
      agreementSignedAt: null,
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
