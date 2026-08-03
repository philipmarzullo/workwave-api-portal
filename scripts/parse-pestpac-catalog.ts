import { readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'

// ── Types (mirroring src/data/types.ts) ─────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type CatalogDomain =
  | 'employees_hr' | 'scheduling' | 'jobs' | 'accounting' | 'payroll'
  | 'time_tracking' | 'work_schedules' | 'customers' | 'inventory'
  | 'system_admin' | 'connectors' | 'compliance' | 'contacts' | 'documents'
  | 'services' | 'reporting' | 'configuration' | 'properties'

interface CatalogEndpoint {
  id: string
  method: HttpMethod | null
  route: string
  functionName: string
  purpose: string | null
  projectName: string
  generation: 'rest'
  domain: CatalogDomain
  triggerType: 'http'
}

interface OpenApiSpec {
  info: { title: string; version: string }
  paths: Record<string, Record<string, OpenApiOperation>>
}

interface OpenApiOperation {
  tags?: string[]
  operationId?: string
  summary?: string
  description?: string
}

// ── PestPac Tag → Domain mapping ────────────────────────────

const TAG_DOMAIN_MAP: Record<string, CatalogDomain> = {
  // Accounting / financial
  Invoices: 'accounting',
  Payments: 'accounting',
  PaymentAccounts: 'accounting',
  CreditCardBilling: 'accounting',
  FinancedInvoices: 'accounting',
  GainLoss: 'accounting',
  GLCode: 'accounting',
  AdjustmentReason: 'accounting',
  DiscountCodes: 'accounting',
  TaxCodes: 'accounting',
  PayOverTime: 'accounting',
  MethodOfPayments: 'accounting',

  // Customers / locations / billing
  BillTos: 'customers',
  Locations: 'customers',
  LocationTemplates: 'customers',
  LocationBundles: 'customers',
  LocationAreaTypes: 'customers',
  Contacts: 'contacts',
  Leads: 'customers',
  Corporations: 'customers',

  // Employees / HR
  Employees: 'employees_hr',
  Skills: 'employees_hr',
  TechnicianRegions: 'employees_hr',

  // Services / service orders
  Services: 'services',
  ServiceOrders: 'services',
  ServiceOrderBatches: 'services',
  ServiceOrderAttributes: 'services',
  ServiceOrderAttributeCategories: 'services',
  ServiceSetups: 'services',
  ServiceClasses: 'services',
  ServiceFeeTypes: 'services',
  ProgramTypes: 'services',
  Bundles: 'services',

  // Scheduling / routing
  Schedules: 'scheduling',
  Scheduling: 'scheduling',
  Routes: 'scheduling',
  Calls: 'scheduling',
  TimeBlocks: 'scheduling',
  WorkDayCalendars: 'scheduling',

  // Jobs / field operations
  Jobs: 'jobs',
  Conditions: 'jobs',
  ConditionsLookups: 'jobs',
  TargetPests: 'jobs',
  TargetEvidenceTypes: 'jobs',
  Materials: 'inventory',
  MaterialsOrdering: 'inventory',
  Diagrams: 'jobs',

  // Documents / forms
  Documents: 'documents',
  FormsManager: 'documents',
  FormsManagerCommonService: 'documents',
  FormComments: 'documents',
  Email: 'documents',
  Notes: 'documents',
  NoteCodes: 'documents',
  MarketingText: 'documents',

  // Devices / vehicles / GPS
  Devices: 'connectors',
  DeviceTypes: 'connectors',
  Vehicles: 'connectors',
  VehiclesUpload: 'connectors',
  GpsData: 'connectors',
  GpsIntegrations: 'connectors',

  // Configuration / reference data
  Areas: 'configuration',
  AreaTypes: 'configuration',
  CancelReasons: 'configuration',
  NotServicedReasons: 'configuration',
  Sources: 'configuration',
  SourceClasses: 'configuration',
  Frequencies: 'configuration',
  MeasurementTypes: 'configuration',
  Types: 'configuration',
  UserDefFields: 'configuration',
  UserDefChoice: 'configuration',
  TaskTypes: 'configuration',
  Thresholds: 'configuration',

  // Properties / geography
  Branches: 'properties',
  Divisions: 'properties',
  Counties: 'properties',
  States: 'properties',

  // System / admin / platform
  CompanySetup: 'system_admin',
  CommonInternalApi: 'system_admin',
  Automation: 'system_admin',
  Remote: 'system_admin',
  ListManagement: 'system_admin',
  ActivityLog: 'system_admin',
  GenerateLog: 'system_admin',
  AutoComplete: 'system_admin',
  Marketplace: 'system_admin',
  WebHooks: 'system_admin',
  Notifications: 'system_admin',
  NotificationMessage: 'system_admin',

  // Telecom
  Telecom: 'connectors',
  TelecomEngine: 'connectors',

  // Sales
  SalesEvents: 'customers',
  DecisionIntelligence: 'reporting',
  Tasks: 'scheduling',

  // Builders
  Builders: 'system_admin',
}

function tagToDomain(tag: string): CatalogDomain {
  return TAG_DOMAIN_MAP[tag] ?? 'system_admin'
}

// ── Helpers ─────────────────────────────────────────────────

const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

function toHttpMethod(raw: string): HttpMethod | null {
  const upper = raw.toUpperCase()
  return VALID_METHODS.has(upper) ? (upper as HttpMethod) : null
}

function cleanPurpose(summary?: string, description?: string): string | null {
  const text = summary || description || ''
  const cleaned = text.trim()
  return cleaned || null
}

function deriveFunctionName(operationId: string | undefined, path: string, method: string): string {
  if (operationId) return operationId
  const segments = path
    .replace(/\/api\//, '/')
    .split('/')
    .filter(s => s && !s.startsWith('{'))
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
  return method.toLowerCase() + segments.join('')
}

// ── Main parser ─────────────────────────────────────────────

function parse(specPath: string): CatalogEndpoint[] {
  const raw = readFileSync(specPath, 'utf-8')
  const spec: OpenApiSpec = JSON.parse(raw)
  const endpoints: CatalogEndpoint[] = []

  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const httpMethod = toHttpMethod(method)
      if (!httpMethod) continue
      if (typeof operation !== 'object' || !operation) continue

      const tag = operation.tags?.[0] ?? 'Uncategorized'
      const functionName = deriveFunctionName(operation.operationId, path, method)
      const purpose = cleanPurpose(operation.summary, operation.description)

      endpoints.push({
        id: randomUUID(),
        method: httpMethod,
        route: path,
        functionName,
        purpose,
        projectName: tag,
        generation: 'rest',
        domain: tagToDomain(tag),
        triggerType: 'http',
      })
    }
  }

  return endpoints
}

// ── Run ─────────────────────────────────────────────────────

const INPUT = new URL('./pestpac-swagger.json', import.meta.url).pathname
const OUTPUT = new URL('../src/data/pestpac-api-catalog.json', import.meta.url).pathname

console.log('Parsing', INPUT, '...')
const endpoints = parse(INPUT)

console.log(`Found ${endpoints.length} HTTP endpoints`)

const byMethod: Record<string, number> = {}
for (const e of endpoints) {
  const m = e.method || 'null'
  byMethod[m] = (byMethod[m] || 0) + 1
}
console.log('  Methods:', byMethod)

const byDomain: Record<string, number> = {}
for (const e of endpoints) {
  byDomain[e.domain] = (byDomain[e.domain] || 0) + 1
}
console.log('  Domains:', byDomain)

const byTag: Record<string, number> = {}
for (const e of endpoints) {
  byTag[e.projectName] = (byTag[e.projectName] || 0) + 1
}
console.log(`  Projects (${Object.keys(byTag).length}):`)
for (const [tag, count] of Object.entries(byTag).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${tag}: ${count}`)
}

writeFileSync(OUTPUT, JSON.stringify(endpoints, null, 2))
console.log(`\nWrote ${OUTPUT}`)
