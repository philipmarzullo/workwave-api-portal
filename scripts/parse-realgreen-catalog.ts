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

// ── OpenAPI types (subset) ──────────────────────────────────

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

// ── Tag → Domain mapping ────────────────────────────────────

const TAG_DOMAIN_MAP: Record<string, CatalogDomain> = {
  // Accounting / financial
  Account: 'accounting',
  AdjustmentCode: 'accounting',
  Batch: 'accounting',
  DiscountCode: 'accounting',
  PrepayCode: 'accounting',
  PriceTable: 'accounting',
  Tax: 'accounting',

  // Customers
  Customer: 'customers',
  CustomerPropertyInventory: 'customers',
  CustomerTemplateLetter: 'customers',
  LeadForm: 'customers',

  // Employees
  Employee: 'employees_hr',

  // Services / Programs
  Service: 'services',
  ServiceCode: 'services',
  ServiceConditions: 'services',
  ServiceStatus: 'services',
  ServiceSummary: 'services',
  Program: 'services',
  ProgramCode: 'services',
  ProgramType: 'services',
  Products: 'services',

  // Scheduling / routing
  Route: 'scheduling',
  CallAhead: 'scheduling',
  CallLog: 'scheduling',
  CallReason: 'scheduling',
  Vehicle: 'scheduling',

  // Reporting / metrics
  Reporting: 'reporting',
  TrackingMetric: 'reporting',
  History: 'reporting',

  // Documents
  Letters: 'documents',
  DocumentCategory: 'documents',

  // Properties / territory
  PropertyInventory: 'properties',
  Subdivision: 'properties',
  Territory: 'properties',
  ZipCode: 'properties',

  // Configuration / reference codes
  ActionStatus: 'configuration',
  CancelReason: 'configuration',
  ConditionCode: 'configuration',
  Flag: 'configuration',
  HoldCode: 'configuration',
  NoServiceReason: 'configuration',
  RejectCode: 'configuration',
  SourceCode: 'configuration',
  Suffix: 'configuration',
  Title: 'configuration',
  Topic: 'configuration',

  // System / admin
  Authentication: 'system_admin',
  AssemblyInfo: 'system_admin',
  AuditLog: 'system_admin',
  Company: 'system_admin',
  Parameter: 'system_admin',
  SecurityCode: 'system_admin',
  Utilities: 'system_admin',
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

// Derive a readable function name from operationId or the path
function deriveFunctionName(operationId: string | undefined, path: string, method: string): string {
  if (operationId) return operationId
  // Fallback: build from method + path segments
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
      // Skip non-operation keys like "parameters"
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

const INPUT = new URL('./realgreen-swagger.json', import.meta.url).pathname
const OUTPUT = new URL('../src/data/realgreen-api-catalog.json', import.meta.url).pathname

console.log('Parsing', INPUT, '...')
const endpoints = parse(INPUT)

console.log(`Found ${endpoints.length} HTTP endpoints`)

// Method breakdown
const byMethod: Record<string, number> = {}
for (const e of endpoints) {
  const m = e.method || 'null'
  byMethod[m] = (byMethod[m] || 0) + 1
}
console.log('  Methods:', byMethod)

// Domain breakdown
const byDomain: Record<string, number> = {}
for (const e of endpoints) {
  byDomain[e.domain] = (byDomain[e.domain] || 0) + 1
}
console.log('  Domains:', byDomain)

// Tag/project breakdown
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
