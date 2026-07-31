/**
 * Usage Intelligence — data aggregation, use case classification,
 * synthetic volume generation, and gap signal scoring.
 *
 * Turns raw historical application data + active API requests into
 * product-gap intelligence.
 */

import type { HistoricalApplication, DataCategory } from './types'
import { normalizeProductName } from './types'
import rawApplications from './extracted-applications.json'
import { store } from './store'

const applications = rawApplications as HistoricalApplication[]

// ── Types ─────────────────────────────────────────────────────────

export type NativeStatus = 'yes' | 'partial' | 'no'

export interface CapabilityGroup {
  id: string
  label: string
  keywords: string[]
  nativeStatus: NativeStatus
  nativeNote: string
}

export interface CapabilitySignal {
  group: CapabilityGroup
  partners: string[]
  customers: string[]
  applicationCount: number
  resellIntentCount: number
  gapScore: number
  estimatedVolume: number
  sampleUseCases: string[]
  partnerDetails: PartnerDetail[]
  inferredDataCategories: Map<string, number>
}

export interface PartnerDetail {
  name: string
  appCount: number
  customerCount: number
  products: string[]
}

export interface HeatmapCell {
  dataCategory: string
  product: string
  count: number
}

// ── Capability Groups ─────────────────────────────────────────────

export const CAPABILITY_GROUPS: CapabilityGroup[] = [
  {
    id: 'crm',
    label: 'CRM / Lead Management',
    keywords: ['crm', 'lead', 'salesforce', 'prospect', 'sales center'],
    nativeStatus: 'partial',
    nativeNote: 'Sales Center',
  },
  {
    id: 'portal',
    label: 'Customer Portal / Proposals',
    keywords: ['portal', 'website', 'e-commerce', 'proposal', 'self-service'],
    nativeStatus: 'partial',
    nativeNote: '',
  },
  {
    id: 'scheduling',
    label: 'Scheduling / Route Optimization',
    keywords: ['schedule', 'route', 'dispatch', 'routing', 'optimization'],
    nativeStatus: 'yes',
    nativeNote: 'Route Manager',
  },
  {
    id: 'bi',
    label: 'BI / Reporting',
    keywords: ['power bi', 'report', 'dashboard', 'analytics', 'business intelligence'],
    nativeStatus: 'partial',
    nativeNote: 'Wavelytics',
  },
  {
    id: 'documents',
    label: 'Document Management',
    keywords: ['document', 'pdf', 'form', 'docusign', 'template'],
    nativeStatus: 'partial',
    nativeNote: '',
  },
  {
    id: 'marketing',
    label: 'Marketing / Communications',
    keywords: ['marketing', 'campaign', 'email', 'sms', 'communication'],
    nativeStatus: 'partial',
    nativeNote: 'Comm Center',
  },
  {
    id: 'reviews',
    label: 'Customer Reviews / Referrals',
    keywords: ['review', 'referral', 'reputation', 'podium'],
    nativeStatus: 'no',
    nativeNote: '',
  },
  {
    id: 'accounting',
    label: 'Accounting / Financial',
    keywords: ['accounting', 'quickbooks', 'sage', 'netsuite', 'general ledger'],
    nativeStatus: 'no',
    nativeNote: '',
  },
  {
    id: 'billing',
    label: 'Billing / Invoicing',
    keywords: ['invoice', 'billing', 'payment', 'receivable'],
    nativeStatus: 'partial',
    nativeNote: 'WW Payments',
  },
  {
    id: 'hr',
    label: 'HR / Payroll',
    keywords: ['payroll', 'hr', 'employee', 'adp', 'workforce', 'dailypay'],
    nativeStatus: 'no',
    nativeNote: '',
  },
  {
    id: 'mobile',
    label: 'Mobile / Field Service',
    keywords: ['mobile', 'field', 'technician'],
    nativeStatus: 'yes',
    nativeNote: 'PestPac Mobile',
  },
  {
    id: 'automation',
    label: 'Custom Integration / Automation',
    keywords: ['zapier', 'webhook', 'middleware', 'sync', 'automation'],
    nativeStatus: 'no',
    nativeNote: '',
  },
]

// ── Helpers ───────────────────────────────────────────────────────

/** Simple deterministic hash for a string → number 0..1 */
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h) / 2147483647
}

/** Classify a use case text into matching capability groups */
function classifyUseCase(text: string): CapabilityGroup[] {
  const lower = text.toLowerCase()
  return CAPABILITY_GROUPS.filter(g =>
    g.keywords.some(kw => lower.includes(kw))
  )
}

/** Base volume by product for synthetic data */
function baseVolumeForProduct(product: string): number {
  switch (product) {
    case 'PestPac': return 200_000
    case 'WinTeam': return 400_000
    case 'RealGreen': return 150_000
    case 'Route Manager': return 300_000
    default: return 100_000
  }
}

/** Infer data categories from use case text */
function inferDataCategories(text: string): DataCategory[] {
  const lower = text.toLowerCase()
  const cats: DataCategory[] = []
  if (/customer|client|contact|lead|prospect/.test(lower)) cats.push('customers')
  if (/invoice|invoicing|billing/.test(lower)) cats.push('invoices')
  if (/employee|payroll|workforce|staff|hr/.test(lower)) cats.push('employees')
  if (/route|dispatch|schedule|routing/.test(lower)) cats.push('routes')
  if (/appointment|service call|work order|job/.test(lower)) cats.push('appointments')
  if (/payment|receivable|charge|credit card/.test(lower)) cats.push('payments')
  if (/inventory|chemical|material|product/.test(lower)) cats.push('inventory')
  if (/service history|service record|treatment/.test(lower)) cats.push('service_history')
  if (/estimate|quote|proposal/.test(lower)) cats.push('estimates')
  if (/document|pdf|form|contract/.test(lower)) cats.push('documents')
  return cats.length > 0 ? cats : ['customers'] // fallback
}

// ── Data aggregation ──────────────────────────────────────────────

export interface UsageIntelligenceData {
  signals: CapabilitySignal[]
  heatmap: HeatmapCell[]
  allProducts: string[]
  allDataCategories: string[]
  summaryStats: {
    capabilityGroupCount: number
    topGapSignalLabel: string
    topGapScore: number
    partnersBuildingSameThing: number
    estimatedMonthlyApiCalls: number
  }
}

export function computeUsageIntelligence(): UsageIntelligenceData {
  // Combine historical + active request data
  const activeRequests = store.getRequests()

  // Build per-group accumulators
  const groupAccum = new Map<string, {
    partners: Set<string>
    customers: Set<string>
    appCount: number
    resellCount: number
    volume: number
    useCases: string[]
    partnerMap: Map<string, { customers: Set<string>; products: Set<string>; count: number }>
    dataCats: Map<string, number>
  }>()

  for (const g of CAPABILITY_GROUPS) {
    groupAccum.set(g.id, {
      partners: new Set(),
      customers: new Set(),
      appCount: 0,
      resellCount: 0,
      volume: 0,
      useCases: [],
      partnerMap: new Map(),
      dataCats: new Map(),
    })
  }

  // Process historical applications
  for (const app of applications) {
    if (!app.useCase) continue

    const matchedGroups = classifyUseCase(app.useCase)
    if (matchedGroups.length === 0) continue

    const product = normalizeProductName(app.wwProduct)
    const multiplier = 0.3 + hashCode(app.id) * 3.7 // 0.3x – 4x
    const syntheticVolume = baseVolumeForProduct(product) * multiplier

    const inferredCats = inferDataCategories(app.useCase)
    const hasResell = app.customerIntendToResell === true || app.developerIntendToResell === true
    const partnerName = app.developerName || app.customerName || 'Unknown'

    for (const group of matchedGroups) {
      const acc = groupAccum.get(group.id)!
      acc.appCount++
      acc.partners.add(partnerName)
      if (app.customerName) acc.customers.add(app.customerName)
      if (hasResell) acc.resellCount++
      acc.volume += syntheticVolume

      if (acc.useCases.length < 10) {
        acc.useCases.push(app.useCase)
      }

      // Partner detail map
      if (!acc.partnerMap.has(partnerName)) {
        acc.partnerMap.set(partnerName, { customers: new Set(), products: new Set(), count: 0 })
      }
      const pd = acc.partnerMap.get(partnerName)!
      pd.count++
      if (app.customerName) pd.customers.add(app.customerName)
      pd.products.add(product)

      // Data categories
      for (const cat of inferredCats) {
        acc.dataCats.set(cat, (acc.dataCats.get(cat) || 0) + 1)
      }
    }
  }

  // Process active API requests
  for (const req of activeRequests) {
    const text = req.useCaseDetail || ''
    if (!text) continue
    const matchedGroups = classifyUseCase(text)
    if (matchedGroups.length === 0) continue

    const partner = store.getPartner(req.partnerId || '')
    const customer = store.getCustomer(req.customerId)
    const partnerName = partner?.name || req.partnerNameFreetext || 'Unknown'
    const customerName = customer?.name || 'Unknown'
    const product = normalizeProductName(req.product)
    const volume = req.estimatedMonthlyVolume || baseVolumeForProduct(product)
    const hasResell = req.customerIntendToResell === true || req.developerIntendToResell === true

    // Data categories from explicit arrays on active requests
    const cats: DataCategory[] = [...req.dataRead, ...req.dataWrite]

    for (const group of matchedGroups) {
      const acc = groupAccum.get(group.id)!
      acc.appCount++
      acc.partners.add(partnerName)
      acc.customers.add(customerName)
      if (hasResell) acc.resellCount++
      acc.volume += volume

      if (acc.useCases.length < 10) {
        acc.useCases.push(text)
      }

      if (!acc.partnerMap.has(partnerName)) {
        acc.partnerMap.set(partnerName, { customers: new Set(), products: new Set(), count: 0 })
      }
      const pd = acc.partnerMap.get(partnerName)!
      pd.count++
      pd.customers.add(customerName)
      pd.products.add(product)

      for (const cat of cats) {
        acc.dataCats.set(cat, (acc.dataCats.get(cat) || 0) + 1)
      }
    }
  }

  // Build signals
  const signals: CapabilitySignal[] = CAPABILITY_GROUPS.map(group => {
    const acc = groupAccum.get(group.id)!
    const partners = Array.from(acc.partners)
    const customers = Array.from(acc.customers)

    // Gap signal score
    const rawScore =
      partners.length * 15 +
      customers.length * 2 +
      acc.appCount * 0.5 +
      acc.resellCount * 8

    let multiplier = 1.0
    if (group.nativeStatus === 'yes') multiplier = 0.2
    else if (group.nativeStatus === 'partial') multiplier = 0.7

    const gapScore = Math.round(rawScore * multiplier)

    // Top 5 partners by app count
    const partnerDetails = Array.from(acc.partnerMap.entries())
      .map(([name, d]) => ({
        name,
        appCount: d.count,
        customerCount: d.customers.size,
        products: Array.from(d.products),
      }))
      .sort((a, b) => b.appCount - a.appCount)
      .slice(0, 5)

    // Sample use cases (deduplicated, max 5)
    const seenCases = new Set<string>()
    const sampleUseCases: string[] = []
    for (const uc of acc.useCases) {
      const truncated = uc.length > 200 ? uc.slice(0, 200) + '...' : uc
      if (!seenCases.has(truncated)) {
        seenCases.add(truncated)
        sampleUseCases.push(truncated)
        if (sampleUseCases.length >= 5) break
      }
    }

    return {
      group,
      partners,
      customers,
      applicationCount: acc.appCount,
      resellIntentCount: acc.resellCount,
      gapScore,
      estimatedVolume: Math.round(acc.volume),
      sampleUseCases,
      partnerDetails,
      inferredDataCategories: acc.dataCats,
    }
  }).sort((a, b) => b.gapScore - a.gapScore)

  // Build heatmap data
  // Collect all products and data categories across all apps
  const productSet = new Set<string>()
  const dataCatSet = new Set<string>()
  const heatmapAccum = new Map<string, number>() // "cat|product" → count

  for (const app of applications) {
    if (!app.useCase) continue
    const product = normalizeProductName(app.wwProduct)
    productSet.add(product)
    const cats = inferDataCategories(app.useCase)
    for (const cat of cats) {
      dataCatSet.add(cat)
      const key = `${cat}|${product}`
      heatmapAccum.set(key, (heatmapAccum.get(key) || 0) + 1)
    }
  }

  for (const req of activeRequests) {
    const product = normalizeProductName(req.product)
    productSet.add(product)
    const cats: DataCategory[] = [...req.dataRead, ...req.dataWrite]
    for (const cat of cats) {
      dataCatSet.add(cat)
      const key = `${cat}|${product}`
      heatmapAccum.set(key, (heatmapAccum.get(key) || 0) + 1)
    }
  }

  const allProducts = Array.from(productSet).sort()
  const allDataCategories = Array.from(dataCatSet).sort()

  const heatmap: HeatmapCell[] = []
  for (const cat of allDataCategories) {
    for (const product of allProducts) {
      const count = heatmapAccum.get(`${cat}|${product}`) || 0
      heatmap.push({ dataCategory: cat, product, count })
    }
  }

  // Summary stats
  const topSignal = signals[0]
  const partnersBuildingSameThing = signals.filter(
    s => s.partners.length >= 3
  ).length

  const totalVolume = signals.reduce((sum, s) => sum + s.estimatedVolume, 0)

  return {
    signals,
    heatmap,
    allProducts,
    allDataCategories,
    summaryStats: {
      capabilityGroupCount: CAPABILITY_GROUPS.length,
      topGapSignalLabel: topSignal?.group.label || '—',
      topGapScore: topSignal?.gapScore || 0,
      partnersBuildingSameThing,
      estimatedMonthlyApiCalls: totalVolume,
    },
  }
}

// ── Data Category Labels ──────────────────────────────────────────

export const DATA_CAT_LABELS: Record<string, string> = {
  customers: 'Customers',
  appointments: 'Appointments',
  invoices: 'Invoices',
  payments: 'Payments',
  employees: 'Employees',
  routes: 'Routes',
  inventory: 'Inventory',
  service_history: 'Service History',
  estimates: 'Estimates',
  documents: 'Documents',
}
