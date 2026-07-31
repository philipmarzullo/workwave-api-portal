import { readFileSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'

// ── Types (mirroring src/data/types.ts) ─────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type ApiGeneration = 'legacy' | 'csa' | 'connector'
type TriggerType = 'http' | 'service_bus' | 'event_grid' | 'timer' | 'queue' | 'blob'
type CatalogDomain =
  | 'employees_hr' | 'scheduling' | 'jobs' | 'accounting' | 'payroll'
  | 'time_tracking' | 'work_schedules' | 'customers' | 'inventory'
  | 'system_admin' | 'connectors' | 'compliance' | 'contacts' | 'documents'

interface CatalogEndpoint {
  id: string
  method: HttpMethod | null
  route: string
  functionName: string
  purpose: string | null
  projectName: string
  generation: ApiGeneration
  domain: CatalogDomain
  triggerType: TriggerType
}

// ── Domain mapping ──────────────────────────────────────────

const DOMAIN_RULES: Array<{ keywords: RegExp; domain: CatalogDomain }> = [
  { keywords: /Compliance/i, domain: 'compliance' },
  { keywords: /Contacts?\s*(API|Connector)/i, domain: 'contacts' },
  { keywords: /Connector|daily-pay|DailyPay|Corrigo|iCIMS|\baus\b/i, domain: 'connectors' },
  { keywords: /Employee|employees-api/i, domain: 'employees_hr' },
  { keywords: /Work\s*Schedule|work-schedules-api/i, domain: 'work_schedules' },
  { keywords: /Schedule|schedules-api/i, domain: 'scheduling' },
  { keywords: /\bJob|jobs-api|Action\s*Item/i, domain: 'jobs' },
  { keywords: /Account|accounts-api|Vendor/i, domain: 'accounting' },
  { keywords: /Payroll|payrolls-api|paycheck-importer|Paycheck\s*Importer/i, domain: 'payroll' },
  { keywords: /TeamTime|teamtime-api|Timekeeping|timekeeping-api|Team\s*Time\s*API/i, domain: 'time_tracking' },
  { keywords: /Customer|customers-api/i, domain: 'customers' },
  { keywords: /Inventory|inventory-api/i, domain: 'inventory' },
  { keywords: /Pdf|Location|Companies|TenantRegistration|AuditHistory|Audit\s*History|management-api|Management|systems-api|Systems\s*API|subscriptions-api|Subscription|webhooks?-api|Webhook|consumers?-api|Consumer|timers?-api|Timer|track-tik|TrackTik|hr-benefits|HR\s*Benefits/i, domain: 'system_admin' },
]

function detectDomain(projectName: string): CatalogDomain {
  for (const rule of DOMAIN_RULES) {
    if (rule.keywords.test(projectName)) return rule.domain
  }
  return 'system_admin'
}

// ── Helpers ─────────────────────────────────────────────────

const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

function parseMethod(raw: string): HttpMethod | null {
  const cleaned = raw.trim().replace(/`/g, '')
  // Handle "GET, POST" or "GET+POST" — take first
  const first = cleaned.split(/[,+]/)[0].trim().toUpperCase()
  if (VALID_METHODS.has(first)) return first as HttpMethod
  return null
}

function cleanRoute(raw: string): string {
  let r = raw.trim().replace(/`/g, '').replace(/\s*\(.*$/, '')
  // Normalize: ensure starts with /api/ or api/
  if (!r.startsWith('/') && !r.startsWith('api/')) {
    r = 'api/' + r
  }
  if (!r.startsWith('/')) {
    r = '/' + r
  }
  // Remove trailing slashes
  r = r.replace(/\/+$/, '')
  return r
}

function cleanFunctionName(raw: string): string {
  return raw.trim().replace(/`/g, '').replace(/\s*\(.*$/, '')
}

function cleanPurpose(raw: string): string | null {
  const cleaned = raw.trim().replace(/`/g, '')
  if (!cleaned || cleaned === '—' || cleaned === '-' || cleaned === '–') return null
  // Remove leading "— " or "Display: "
  let result = cleaned
    .replace(/^—\s*/, '')
    .replace(/^Display:\s*"?/i, '')
    .replace(/"$/, '')
    .trim()
  if (!result || result === '—' || result === '-') return null
  return result
}

function isSwaggerEndpoint(functionName: string, route: string): boolean {
  const fnLower = functionName.toLowerCase()
  const routeLower = route.toLowerCase()
  return fnLower === 'swagger' || routeLower.includes('/swagger')
}

// ── Parse markdown tables ───────────────────────────────────

function parseTableRow(line: string): string[] {
  // Split on | but handle escaped pipes
  const cells = line.split('|').slice(1, -1) // Remove leading/trailing empty
  return cells.map(c => c.trim())
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s-:|]+\|$/.test(line.trim())
}

// ── Main parser ─────────────────────────────────────────────

function parse(markdownPath: string): CatalogEndpoint[] {
  const content = readFileSync(markdownPath, 'utf-8')
  const lines = content.split('\n')
  const endpoints: CatalogEndpoint[] = []

  let currentPart: 'legacy' | 'csa' | 'connector' | null = null
  let currentProject: string | null = null
  let inNonHttpSection = false
  let inHttpTable = false
  let inNonHttpTable = false
  let httpTableHeaderParsed = false
  let nonHttpTableHeaderParsed = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Detect parts
    if (trimmed === '## Part 1 — Legacy / v1 APIs') {
      currentPart = 'legacy'
      currentProject = null
      inNonHttpSection = false
      inHttpTable = false
      inNonHttpTable = false
      continue
    }
    if (trimmed === '## Part 2 — CSA / NextGen APIs') {
      currentPart = 'csa'
      currentProject = null
      inNonHttpSection = false
      inHttpTable = false
      inNonHttpTable = false
      continue
    }
    if (trimmed === '## Part 3 — WinTeamAPI.Connectors') {
      currentPart = 'connector'
      currentProject = null
      inNonHttpSection = false
      inHttpTable = false
      inNonHttpTable = false
      continue
    }
    if (trimmed.startsWith('## Part 4') || trimmed.startsWith('## Appendix')) {
      currentPart = null
      continue
    }

    // Detect project headers (### level)
    if (trimmed.startsWith('### ') && currentPart) {
      const projectTitle = trimmed.slice(4).trim()
      // Skip non-project headers like "Notes and caveats", "Notes and discrepancies"
      if (/^Notes\b/i.test(projectTitle)) continue
      // Skip "Appendix" and "CSA/aqa-wtnextgen" (no endpoints)
      if (/aqa-wtnextgen/i.test(projectTitle)) continue
      if (/^Appendix/i.test(projectTitle)) continue

      currentProject = projectTitle
      inNonHttpSection = false
      inHttpTable = false
      inNonHttpTable = false
      httpTableHeaderParsed = false
      nonHttpTableHeaderParsed = false
      continue
    }

    // Detect Non-HTTP triggers section
    if (trimmed === '#### Non-HTTP triggers') {
      inNonHttpSection = true
      inHttpTable = false
      inNonHttpTable = false
      nonHttpTableHeaderParsed = false
      continue
    }

    // Detect other #### sections (Models, Logic App, etc.) — exit non-HTTP
    if (trimmed.startsWith('#### ') && !trimmed.includes('Non-HTTP')) {
      inNonHttpSection = false
      inNonHttpTable = false
      continue
    }

    // Skip if no current project or part
    if (!currentPart || !currentProject) continue

    // ── Parse HTTP endpoint tables ──

    if (!inNonHttpSection && trimmed.startsWith('|')) {
      const cells = parseTableRow(trimmed)
      if (cells.length < 4) continue

      // Check if header row
      if (!httpTableHeaderParsed) {
        if (cells[0].toLowerCase().includes('method') && cells[1].toLowerCase().includes('route')) {
          httpTableHeaderParsed = true
          inHttpTable = true
          continue
        }
      }

      // Skip separator
      if (isTableSeparator(trimmed)) continue

      // Parse data row
      if (inHttpTable && cells.length >= 4) {
        const methodStr = cells[0]
        const route = cells[1]
        const functionName = cells[2]
        const purpose = cells.length >= 6 ? cells[5] : (cells.length >= 5 ? cells[4] : '')

        const method = parseMethod(methodStr)
        const cleanedRoute = cleanRoute(route)
        const cleanedFn = cleanFunctionName(functionName)
        const cleanedPurpose = cleanPurpose(purpose)

        // Skip Swagger endpoints
        if (isSwaggerEndpoint(cleanedFn, cleanedRoute)) continue

        // Handle "GET, POST" dual-method — create two entries
        const methodsRaw = methodStr.trim().replace(/`/g, '').toUpperCase()
        const methodList = methodsRaw.split(/[,+]/).map(m => m.trim()).filter(m => VALID_METHODS.has(m))

        if (methodList.length > 1) {
          for (const m of methodList) {
            endpoints.push({
              id: randomUUID(),
              method: m as HttpMethod,
              route: cleanedRoute,
              functionName: cleanedFn,
              purpose: cleanedPurpose,
              projectName: currentProject,
              generation: currentPart,
              domain: detectDomain(currentProject),
              triggerType: 'http',
            })
          }
        } else {
          endpoints.push({
            id: randomUUID(),
            method: method,
            route: cleanedRoute,
            functionName: cleanedFn,
            purpose: cleanedPurpose,
            projectName: currentProject,
            generation: currentPart,
            domain: detectDomain(currentProject),
            triggerType: 'http',
          })
        }
      }
      continue
    }

    // When we hit a non-table line in HTTP table context, end the table
    if (inHttpTable && !trimmed.startsWith('|') && trimmed !== '') {
      inHttpTable = false
    }

    // ── Parse Non-HTTP trigger tables ──

    if (inNonHttpSection && trimmed.startsWith('|')) {
      const cells = parseTableRow(trimmed)
      if (cells.length < 2) continue

      // Header row
      if (!nonHttpTableHeaderParsed) {
        const firstCell = cells[0].toLowerCase()
        if (firstCell.includes('trigger') || firstCell.includes('function')) {
          nonHttpTableHeaderParsed = true
          inNonHttpTable = true
          continue
        }
      }

      // Skip separator
      if (isTableSeparator(trimmed)) continue

      // Parse data row
      if (inNonHttpTable && cells.length >= 2) {
        const triggerRaw = cells[0].trim().replace(/`/g, '')
        let functionName: string
        let details = ''

        // Two table formats:
        // Format 1: | Trigger | Function | Details |
        // Format 2: | Function | Trigger | Topic | Handler | Purpose |
        const firstCellLower = triggerRaw.toLowerCase()
        if (firstCellLower.includes('trigger') || firstCellLower.includes('servicebus') || firstCellLower.includes('eventgrid') || firstCellLower.includes('timer') || firstCellLower.includes('queue') || firstCellLower.includes('blob')) {
          functionName = cleanFunctionName(cells[1])
          details = cells.length >= 3 ? cells[2] : ''
        } else {
          // Format 2: Function is first column
          functionName = cleanFunctionName(cells[0])
          details = cells.length >= 3 ? cells[2] : cells[1]
          // Override triggerRaw from second column
        }

        // Determine trigger type
        let triggerType: TriggerType = 'service_bus'
        const allText = (triggerRaw + ' ' + details + ' ' + (cells[1] || '')).toLowerCase()
        if (allText.includes('timer')) triggerType = 'timer'
        else if (allText.includes('eventgrid') || allText.includes('event_grid') || allText.includes('event grid')) triggerType = 'event_grid'
        else if (allText.includes('queue') && !allText.includes('servicebus')) triggerType = 'queue'
        else if (allText.includes('blob')) triggerType = 'blob'
        else if (allText.includes('servicebus') || allText.includes('service bus') || allText.includes('service_bus')) triggerType = 'service_bus'

        // Extract purpose from last column if available
        const lastCell = cells[cells.length - 1].trim()
        const purpose = cleanPurpose(lastCell)

        // Build a route-like identifier from the trigger info
        const routeName = functionName || triggerRaw

        endpoints.push({
          id: randomUUID(),
          method: null,
          route: routeName,
          functionName: functionName || triggerRaw,
          purpose,
          projectName: currentProject,
          generation: currentPart,
          domain: detectDomain(currentProject),
          triggerType,
        })
      }
      continue
    }

    // Also catch inline non-HTTP triggers described as bullet points
    if (inNonHttpSection && trimmed.startsWith('- ') && !trimmed.startsWith('- `Model')) {
      const match = trimmed.match(/^-\s+`?(\w+)`?\s+—\s+\[`?(\w+)`?/i)
        || trimmed.match(/^-\s+`?(\w+)`?\s+—\s+`\[(\w+Trigger)/i)
      if (match) {
        const functionName = match[1]
        let triggerType: TriggerType = 'queue'
        const lower = trimmed.toLowerCase()
        if (lower.includes('timer')) triggerType = 'timer'
        else if (lower.includes('eventgrid')) triggerType = 'event_grid'
        else if (lower.includes('servicebus')) triggerType = 'service_bus'
        else if (lower.includes('blob')) triggerType = 'blob'
        else if (lower.includes('queue')) triggerType = 'queue'

        endpoints.push({
          id: randomUUID(),
          method: null,
          route: functionName,
          functionName,
          purpose: null,
          projectName: currentProject!,
          generation: currentPart,
          domain: detectDomain(currentProject!),
          triggerType,
        })
      }
    }
  }

  return endpoints
}

// ── Run ─────────────────────────────────────────────────────

const INPUT = '/Users/philip/Desktop/winteam-api-inventory.md'
const OUTPUT = new URL('../src/data/winteam-api-catalog.json', import.meta.url).pathname

console.log('Parsing', INPUT, '...')
const endpoints = parse(INPUT)

const httpEndpoints = endpoints.filter(e => e.triggerType === 'http')
const nonHttpEndpoints = endpoints.filter(e => e.triggerType !== 'http')

console.log(`Found ${httpEndpoints.length} HTTP endpoints`)
console.log(`Found ${nonHttpEndpoints.length} non-HTTP triggers`)
console.log(`Total: ${endpoints.length}`)

// Generation breakdown
const byGen = { legacy: 0, csa: 0, connector: 0 }
for (const e of httpEndpoints) byGen[e.generation]++
console.log(`  Legacy: ${byGen.legacy}, CSA: ${byGen.csa}, Connector: ${byGen.connector}`)

// Method breakdown
const byMethod: Record<string, number> = {}
for (const e of httpEndpoints) {
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

writeFileSync(OUTPUT, JSON.stringify(endpoints, null, 2))
console.log(`Wrote ${OUTPUT}`)
