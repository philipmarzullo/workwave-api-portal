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

// ── Historical Application (extracted from PDF) ──────────────────
export type FormVersion = 'v1_legacy' | 'v2_fillable' | 'v3_dual_app' | 'unknown'
export type ExtractionConfidence = 'high' | 'medium' | 'low'

export interface HistoricalApplication {
  id: string
  sourceFile: string
  sfCaseNumber: string | null
  sfObjectId: string | null

  // Customer (applicant) fields
  customerName: string | null
  customerContactName: string | null
  customerContactEmail: string | null
  customerContactPhone: string | null
  customerAddress: string | null
  customerCompanyKey: string | null
  subsidiaries: string | null

  // Developer / Partner fields
  developerName: string | null
  developerContactName: string | null
  developerContactEmail: string | null
  developerContactPhone: string | null
  externalProduct: string | null

  // Application details
  wwProduct: string | null
  isWwCustomer: boolean | null
  useCase: string | null
  customerIntendToResell: boolean | null
  developerIntendToResell: boolean | null
  targetLaunchDate: string | null
  signatureDate: string | null

  // Extraction metadata
  formVersion: FormVersion | null
  extractionConfidence: ExtractionConfidence
  extractionNotes: string | null
  extractedAt: string
}

export const COMPETITIVE_VENDORS = [
  'Sellify AI',
  'Smarter Launch',
  'Clicki',
  'Avoca AI',
  'Podium',
  'Applause',
  'Captivated',
  'Cinch',
] as const

/**
 * Normalizes the free-text wwProduct field from historical applications
 * into one of the canonical WorkWave product names.
 *
 * Historical data has 150+ variations including typos, casing differences,
 * multi-product lists, and addon references. This maps them all to a small
 * set of canonical labels.
 */
export function normalizeProductName(raw: string | null): string {
  if (!raw) return 'Unknown'
  const s = raw.trim()
  if (!s) return 'Unknown'
  const lower = s.toLowerCase()

  // Exact or near-exact matches first (before multi-product detection)
  // PestPac variants
  if (/^pest\s*pac$/i.test(s) || /^pestpac$/i.test(s) || /^pestpal$/i.test(s) || /^pestpax$/i.test(s) || /^pestpack$/i.test(s) || /^pest\s*pac\s*$/i.test(s)) return 'PestPac'
  // Route Manager variants
  if (/^route\s*manager$/i.test(s) || /^routemanager$/i.test(s) || /^route\s*manger$/i.test(s)) return 'Route Manager'
  if (/^workwave('s)?\s*route\s*manager$/i.test(s) || /^ww\s*route\s*manager$/i.test(s) || /^www\s*route\s*manager$/i.test(s) || /^wwrm$/i.test(s)) return 'Route Manager'
  if (/^route\s*manager\s*360/i.test(s)) return 'Route Manager'
  if (/^routing$/i.test(s) || /^routing\s*manager$/i.test(s) || /^workwave\s*routing$/i.test(s)) return 'Route Manager'
  if (/^route\s*manager\s*\/\s*mobile/i.test(s)) return 'Route Manager'
  // RealGreen / SA5 variants
  if (/^real\s*green$/i.test(s) || /^realgreen$/i.test(s)) return 'RealGreen'
  if (/^sa\s*5$/i.test(s) || /^sa-5$/i.test(s) || /^sas$/i.test(s)) return 'RealGreen'
  if (/^service\s*assist(ant|ance)?\s*(5)?$/i.test(s)) return 'RealGreen'
  if (/^real\s*green\s*sa\s*5$/i.test(s) || /^realgreen\s*sa\s*5$/i.test(s)) return 'RealGreen'
  if (/^realgreen\s*\/\s*service/i.test(s) || /^real\s*green\s*\/\s*sa5$/i.test(s) || /^real\s*green\s*-\s*sa5$/i.test(s)) return 'RealGreen'
  if (/^realgreen\s*service/i.test(s) || /^realgreen\s*la5$/i.test(s)) return 'RealGreen'
  if (/^workwave\s*service\s*assistant$/i.test(s)) return 'RealGreen'
  // WinTeam variants
  if (/^team\s*lite$/i.test(s)) return 'WinTeam'
  // Sales Center (PestPac addon)
  if (/^sales\s*center$/i.test(s)) return 'PestPac'
  // Enterprise (PestPac Enterprise)
  if (/^enterprise(\s*plus)?$/i.test(s)) return 'PestPac'
  // Generic "all" or "most" or long descriptions → Multiple
  if (/^all$/i.test(s) || /^most$/i.test(s) || /^api$/i.test(s) || /^apis$/i.test(s)) return 'Multiple'
  if (lower.startsWith('almost') || lower.startsWith('most add')) return 'Multiple'
  if (lower === 'api details' || lower === 'api / crm' || lower === 'team lite / api / crm') return 'Multiple'
  if (lower === 'all of them') return 'Multiple'
  if (lower.startsWith('rna')) return 'PestPac'
  if (lower.startsWith('rgs') || lower === 'gro lawn') return 'RealGreen'
  if (lower.includes('insight') || lower === 'workwave 360') return 'Route Manager'
  if (lower === 'collection module') return 'PestPac'
  if (lower.startsWith('wws')) return 'Route Manager'
  if (lower.startsWith('clicki')) return 'Other'
  if (lower === 'netcov') return 'Other'

  // Multi-product strings (contains comma or "and")
  if (s.includes(',') || / and /i.test(s) || s.includes('/') || s.includes('&')) {
    return detectPrimaryProduct(lower)
  }

  // Keyword-based fallback for remaining strings
  if (lower.includes('pestpac') || lower.includes('pest pac') || lower.includes('pest ai')) return 'PestPac'
  if (lower.includes('route') && (lower.includes('manager') || lower.includes('op'))) return 'Route Manager'
  if (lower.includes('realgreen') || lower.includes('real green') || lower.includes('sa5') || lower.includes('sa-5') || lower.includes('service assistant') || lower.includes('sas')) return 'RealGreen'
  if (lower.includes('winteam') || lower.includes('team lite')) return 'WinTeam'
  if (lower.includes('lighthouse')) return 'Lighthouse'
  if (lower.includes('timegate')) return 'Timegate+'
  if (lower.includes('workwave service') || lower.includes('work wave service')) return 'Route Manager'
  if (lower.includes('workwave route') || lower.includes('work wave route')) return 'Route Manager'
  if (lower.includes('routing') || lower.includes('route op')) return 'Route Manager'

  // Remaining unmatched
  return 'Other'
}

function detectPrimaryProduct(lower: string): string {
  // Count product keyword matches to find the primary
  const scores: Record<string, number> = {}
  if (/pestpac|pest pac|pest\s*pac/i.test(lower)) scores['PestPac'] = (scores['PestPac'] || 0) + 3
  if (/realgreen|real green|sa5|sa\-5|service assist/i.test(lower)) scores['RealGreen'] = (scores['RealGreen'] || 0) + 3
  if (/route\s*manager|routemanager|wwrm/i.test(lower)) scores['Route Manager'] = (scores['Route Manager'] || 0) + 3
  if (/winteam|team lite/i.test(lower)) scores['WinTeam'] = (scores['WinTeam'] || 0) + 3

  // Secondary signals (addons/modules — attribute to their parent)
  if (/sales\s*center|lead\s*management/i.test(lower)) scores['PestPac'] = (scores['PestPac'] || 0) + 1
  if (/route\s*op|routeop/i.test(lower)) scores['PestPac'] = (scores['PestPac'] || 0) + 1
  if (/communication|comm\s*center/i.test(lower)) scores['PestPac'] = (scores['PestPac'] || 0) + 1
  if (/mobile\s*live|caw|ama|routing\s*assist/i.test(lower)) scores['RealGreen'] = (scores['RealGreen'] || 0) + 1
  if (/wavelytics/i.test(lower)) scores['PestPac'] = (scores['PestPac'] || 0) + 1

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return 'Multiple'
  if (entries.length > 1 && entries[0][1] === entries[1][1]) return 'Multiple'
  return entries[0][0]
}

// ── WinTeam API Catalog ──────────────────────────────────────
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ApiGeneration = 'legacy' | 'csa' | 'connector'
export type TriggerType = 'http' | 'service_bus' | 'event_grid' | 'timer' | 'queue' | 'blob'
export type CatalogDomain =
  | 'employees_hr' | 'scheduling' | 'jobs' | 'accounting' | 'payroll'
  | 'time_tracking' | 'work_schedules' | 'customers' | 'inventory'
  | 'system_admin' | 'connectors' | 'compliance' | 'contacts' | 'documents'

export interface CatalogEndpoint {
  id: string
  method: HttpMethod | null      // null for non-HTTP triggers
  route: string                  // /api/... path or trigger name
  functionName: string
  purpose: string | null         // null if undocumented ("—")
  projectName: string            // e.g. "employees-api", "EmployeeAPI"
  generation: ApiGeneration
  domain: CatalogDomain
  triggerType: TriggerType
}

// ── Trusted Integrators & Partners ──────────────────────────

export type IntegratorPlatform = 'pestpac' | 'realgreen' | 'winteam' | 'international'
export type IntegratorStatus = 'active' | 'inactive' | 'pending'
export type IntegratorApiType = 'partner_api' | 'customer_api' | 'manual' | 'none'
export type TrustedLevel = 'trusted' | 'questionable' | 'not_trusted' | 'unknown'
export type CompetitiveLevel = 'extremely' | 'somewhat' | 'none' | 'unknown'

export interface TrustedIntegrator {
  id: string
  name: string
  status: IntegratorStatus
  platforms: IntegratorPlatform[]
  integrationType: IntegratorApiType
  trustedStatus: TrustedLevel
  doNotApprove: boolean
  competitiveLevel: CompetitiveLevel
  commercialAgreement: 'yes' | 'no' | 'prospect'
  impactARR: number | null
  estimatedCustomers: string | null
  notes: string | null
  action: string | null
}

// ── Hackathon Feedback ───────────────────────────────────────

export interface FeedbackReply {
  id: string
  author: string
  comment: string
  createdAt: string     // ISO date
}

export interface FeedbackItem {
  id: string
  page: string          // route path when feedback was submitted
  viewMode: ViewMode    // customer or reviewer
  author: string        // free-text name
  comment: string
  createdAt: string     // ISO date
  replies?: FeedbackReply[]
}

// Session context
export type ViewMode = 'customer' | 'reviewer'
