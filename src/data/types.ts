// Product lines
export type WorkWaveProduct = 'pestpac' | 'realgreen' | 'winteam' | 'lighthouse' | 'timegate_plus' | 'route_manager' | 'hire'

// Partner tiers
export type PartnerTier = 'approved' | 'under_review' | 'unapproved'

// Integration types
export type IntegrationType = 'scheduling' | 'crm' | 'accounting' | 'payments' | 'fleet' | 'reporting' | 'hr' | 'marketing' | 'field_service' | 'custom'

// Request statuses
export type RequestStatus = 'draft' | 'pending_agreement' | 'pending_review' | 'sandbox_approved' | 'sandbox_denied' | 'pending_production_review' | 'production_approved' | 'production_denied' | 'revoked'

// Approval stages
export type ApprovalStage = 'initial_review' | 'security_review' | 'legal_review' | 'sandbox_approval' | 'production_approval'

export type ApprovalDecision = 'approved' | 'denied' | 'needs_info'

// Environment
export type Environment = 'sandbox' | 'production'

// Builder type
export type BuilderType = 'partner' | 'internal_team' | 'contractor'

// Common use cases for the intake form
export type UseCase =
  | 'sync_customer_data'
  | 'automate_scheduling'
  | 'financial_reporting'
  | 'payment_processing'
  | 'fleet_tracking'
  | 'marketing_automation'
  | 'hr_integration'
  | 'custom_reporting'
  | 'mobile_app'
  | 'other'

// Data access categories
export type DataCategory =
  | 'customers'
  | 'appointments'
  | 'invoices'
  | 'payments'
  | 'employees'
  | 'routes'
  | 'inventory'
  | 'service_history'
  | 'estimates'
  | 'documents'

export interface Partner {
  id: string
  name: string
  logo: string  // emoji or URL placeholder
  description: string
  tier: PartnerTier
  productsSupported: WorkWaveProduct[]
  integrationType: IntegrationType
  contractRef: string | null
  website: string
  category: string
}

export interface Customer {
  id: string
  name: string
  products: WorkWaveProduct[]
  plan: 'starter' | 'professional' | 'enterprise'
}

export interface CustomerUser {
  id: string
  customerId: string
  name: string
  email: string
  canRequestApi: boolean
  role: string
}

export interface PartnerCustomer {
  id: string
  partnerId: string
  customerId: string
  status: 'active' | 'pending' | 'revoked'
  environment: Environment
  linkedAt: string
  revokedAt: string | null
}

export interface ApiRequest {
  id: string
  caseNumber: string  // human-readable case number, e.g. WW-API-0042
  customerId: string
  requestedBy: string  // CustomerUser.id
  partnerId: string | null  // null for unlisted partner
  partnerNameFreetext: string | null  // for unlisted partner requests
  partnerWebsite: string | null
  partnerContact: string | null
  product: WorkWaveProduct
  builderType: BuilderType
  connectingSystem: string  // what they're connecting to
  useCase: UseCase
  useCaseDetail: string  // brief description
  dataRead: DataCategory[]
  dataWrite: DataCategory[]
  dataLeavesEnvironment: boolean
  environment: Environment
  status: RequestStatus
  agreementSignedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface Approval {
  id: string
  requestId: string
  reviewer: string
  stage: ApprovalStage
  decision: ApprovalDecision
  rationale: string
  decidedAt: string
}

// Session context
export type ViewMode = 'customer' | 'reviewer'
