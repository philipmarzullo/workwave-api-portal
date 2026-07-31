// Product lines
export type WorkWaveProduct = 'pestpac' | 'realgreen' | 'winteam' | 'lighthouse' | 'timegate_plus' | 'route_manager' | 'hire'

// Partner tiers
export type PartnerTier = 'approved' | 'under_review' | 'unapproved' | 'blocked'

// Integration types
export type IntegrationType = 'scheduling' | 'crm' | 'accounting' | 'payments' | 'fleet' | 'reporting' | 'hr' | 'marketing' | 'field_service' | 'custom'

// Request statuses
export type RequestStatus = 'draft' | 'pending_agreement' | 'pending_review' | 'on_hold' | 'sandbox_approved' | 'sandbox_denied' | 'pending_production_review' | 'production_approved' | 'production_denied' | 'revoked'

// Approval stages
export type ApprovalStage = 'initial_review' | 'competitive_review' | 'security_review' | 'legal_review' | 'sandbox_approval' | 'production_approval'

export type ApprovalDecision = 'approved' | 'denied' | 'needs_info'

// Environment
export type Environment = 'sandbox' | 'production'

// Builder type
export type BuilderType = 'partner' | 'internal_team' | 'contractor'

// Request type
export type RequestType = 'new_access' | 'migration' | 'expand_access'

// Legacy access methods (for migration requests)
export type LegacyAccessMethod = 'sap_bi' | 'vpn' | 'sftp' | 'createam' | 'insights' | 'query_scheduler'

// Gateway platform
export type GatewayPlatform = 'apigee' | 'concourse' | 'manual'

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
  // Competitive watchlist fields
  competitiveFlag?: boolean           // flagged for competitive concern
  competitiveFlagReason?: string      // why flagged (e.g. "Competes with WorkWave Sales Center")
  competitiveFlaggedBy?: string       // who flagged (e.g. "Jerry Hsu")
  competitiveFlaggedAt?: string       // ISO date
  blockedReason?: string              // reason for blocking (when tier === 'blocked')
  salesforceCaseId?: string           // SF case reference for contract tracking
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

export type VolumeTier = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface VolumeTierDefinition {
  tier: VolumeTier
  label: string
  callsPerMonth: number
  monthlyRate: number
  perCallRate: number
  overageRate: number  // 2.5x per-call rate (from original proposal doc)
}

export type ApiCategory = 'standard' | 'premium'
export type ApiSubCategory =
  | 'employee_information' | 'jobs_work_orders' | 'general'
  | 'payroll_information' | 'financials' | 'schedules' | 'timekeeping_calculations'

// Professional services packages bundled with API access
export type SupportPackage = 'standard' | 'premium' | 'enterprise' | 'none'

// Pricing model: legacy (per-use-case) vs. volume (new tiered model)
export type PricingModel = 'volume' | 'legacy'

export interface ApiPricing {
  volumeTier: VolumeTier
  monthlyRate: number
  perCallRate: number
  callsIncluded: number
  notes: string
  setBy: string             // reviewer name
  setAt: string             // ISO date
  pricingModel?: PricingModel       // 'volume' (default) or 'legacy'
  legacyUseCaseCount?: number       // number of use cases under legacy pricing
  legacyMonthlyCost?: number        // legacy monthly total ($330/use case)
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
  endpointsRequested: string
  endpointsApproved: string | null
  thirdPartyTool: string | null
  thirdPartyToolUrl: string | null
  technicalContactName: string | null
  technicalContactEmail: string | null
  technicalContactPhone: string | null
  targetTimeline: string | null
  reviewerNotes: ReviewerNote[]
  environment: Environment
  status: RequestStatus
  agreementSignedAt: string | null
  pricing: ApiPricing | null  // set by reviewer after approval
  supportPackage: SupportPackage | null  // professional services package
  requestType: RequestType
  migratingFrom: LegacyAccessMethod | null
  provisioningChecklist: ProvisioningStep[]
  gatewayPlatform: GatewayPlatform | null
  estimatedMonthlyVolume: number | null
  apiCategories: ApiCategory[] | null
  // Competitive / compliance fields
  salesforceCaseId: string | null     // SF case record reference
  customerIntendToResell: boolean | null   // customer says they'll resell to other WW customers?
  developerIntendToResell: boolean | null  // developer says they'll resell to other WW customers?
  holdReason: string | null           // why the request is on hold
  holdPlacedBy: string | null         // who placed the hold
  holdPlacedAt: string | null         // when hold was placed
  createdAt: string
  updatedAt: string
}

export interface ProvisioningStep {
  id: string
  label: string
  description: string
  completed: boolean
  completedAt: string | null
  completedBy: string | null
}

export interface ReviewerNote {
  id: string
  author: string
  content: string
  createdAt: string
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
