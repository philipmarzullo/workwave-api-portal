import express from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
app.use(express.json({ limit: '1mb' }))

const PORT = process.env.PORT || 3001
const DAILY_BUDGET_CENTS = 500 // $5.00
const MODEL = 'claude-haiku-4-5-20251001'

// Haiku 4.5 pricing (per million tokens)
const INPUT_COST_PER_MTOK = 0.80
const OUTPUT_COST_PER_MTOK = 4.00

// ── Daily spend tracking (resets on server restart or new day) ───

let dailySpend = { date: new Date().toISOString().slice(0, 10), cents: 0 }

function getDailySpendCents() {
  const today = new Date().toISOString().slice(0, 10)
  if (dailySpend.date !== today) {
    dailySpend = { date: today, cents: 0 }
  }
  return dailySpend.cents
}

function addSpend(inputTokens, outputTokens) {
  const today = new Date().toISOString().slice(0, 10)
  if (dailySpend.date !== today) {
    dailySpend = { date: today, cents: 0 }
  }
  const costCents =
    (inputTokens / 1_000_000) * INPUT_COST_PER_MTOK * 100 +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_MTOK * 100
  dailySpend.cents += costCents
  return dailySpend.cents
}

// ── Load and condense application data for context ──────────────

let dataContextFull = '[]'  // Full records for application-focused pages
let dataContextStats = ''   // Aggregate stats for other pages
let appCount = 0

try {
  const raw = readFileSync(join(__dirname, 'src', 'data', 'extracted-applications.json'), 'utf-8')
  const apps = JSON.parse(raw)
  appCount = apps.length

  // Full condensed records (for applications pages)
  const condensed = apps.map((a) => {
    const r = {}
    if (a.customerName) r.customer = a.customerName
    if (a.developerName) r.developer = a.developerName
    if (a.wwProduct) r.product = a.wwProduct
    if (a.useCase) r.useCase = a.useCase.slice(0, 200)
    if (a.externalProduct) r.extProduct = a.externalProduct
    if (a.customerIntendToResell != null) r.custResell = a.customerIntendToResell
    if (a.developerIntendToResell != null) r.devResell = a.developerIntendToResell
    if (a.signatureDate) r.signed = a.signatureDate
    if (a.sfCaseNumber) r.sfCase = a.sfCaseNumber
    if (a.customerContactEmail) r.custEmail = a.customerContactEmail
    if (a.developerContactEmail) r.devEmail = a.developerContactEmail
    if (a.customerCompanyKey) r.compKey = a.customerCompanyKey
    if (a.extractionConfidence !== 'high') r.confidence = a.extractionConfidence
    return r
  })
  dataContextFull = JSON.stringify(condensed)

  // Compute aggregate stats (for non-application pages — much smaller)
  const byProduct = {}
  const byDeveloper = {}
  const byUseCase = {}
  const competitiveHits = {}
  const COMPETITIVE = ['Sellify AI', 'Smarter Launch', 'Clicki', 'Avoca AI', 'Podium', 'Applause', 'Captivated', 'Cinch']
  let resellConflicts = 0

  for (const a of apps) {
    if (a.wwProduct) byProduct[a.wwProduct] = (byProduct[a.wwProduct] || 0) + 1
    if (a.developerName) byDeveloper[a.developerName] = (byDeveloper[a.developerName] || 0) + 1
    if (a.useCase) {
      const shortUC = a.useCase.slice(0, 60)
      byUseCase[shortUC] = (byUseCase[shortUC] || 0) + 1
    }
    if (a.developerName) {
      for (const cv of COMPETITIVE) {
        if (a.developerName.toLowerCase().includes(cv.toLowerCase())) {
          competitiveHits[cv] = (competitiveHits[cv] || 0) + 1
        }
      }
    }
    if (a.customerIntendToResell != null && a.developerIntendToResell != null && a.customerIntendToResell !== a.developerIntendToResell) {
      resellConflicts++
    }
  }

  const topDevs = Object.entries(byDeveloper).sort((a, b) => b[1] - a[1]).slice(0, 20)
  const productLines = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).map(([p, c]) => `${p}: ${c}`).join(', ')
  const compLines = Object.entries(competitiveHits).sort((a, b) => b[1] - a[1]).map(([v, c]) => `${v}: ${c}`).join(', ')
  const topDevLines = topDevs.map(([d, c]) => `${d}: ${c} apps`).join(', ')

  dataContextStats = `APPLICATION ANALYTICS (${apps.length} total records):
Products: ${productLines}
Top developers: ${topDevLines}
Competitive vendor matches: ${compLines || 'None found'}
Resell intent conflicts: ${resellConflicts} records
Date range: ${apps.filter(a => a.signatureDate).map(a => a.signatureDate).sort()[0] || 'unknown'} to ${apps.filter(a => a.signatureDate).map(a => a.signatureDate).sort().pop() || 'unknown'}`

  console.log(`Loaded ${apps.length} applications (full: ${Math.round(dataContextFull.length / 1024)}KB, stats: ${Math.round(dataContextStats.length / 1024)}KB)`)
} catch (e) {
  console.warn('Could not load extracted-applications.json:', e.message)
}

// ── Load and condense API catalogs ──────────────────────────────

function loadCatalog(filename) {
  try {
    const raw = readFileSync(join(__dirname, 'src', 'data', filename), 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    console.warn(`Could not load ${filename}:`, e.message)
    return []
  }
}

const catalogs = {
  winteam: loadCatalog('winteam-api-catalog.json'),
  realgreen: loadCatalog('realgreen-api-catalog.json'),
  pestpac: loadCatalog('pestpac-api-catalog.json'),
}

// Build condensed catalog: domain → { methods, routes, purposes }
function condenseCatalog(endpoints, platformName) {
  const httpEndpoints = endpoints.filter((e) => e.triggerType === 'http')
  const byDomain = {}

  for (const ep of httpEndpoints) {
    if (!byDomain[ep.domain]) {
      byDomain[ep.domain] = { count: 0, methods: {}, tags: new Set(), routes: [] }
    }
    const d = byDomain[ep.domain]
    d.count++
    d.methods[ep.method] = (d.methods[ep.method] || 0) + 1
    d.tags.add(ep.projectName)
    // Keep route + truncated purpose for all endpoints (condensed format)
    if (ep.purpose) {
      const shortPurpose = ep.purpose.length > 80 ? ep.purpose.slice(0, 77) + '...' : ep.purpose
      d.routes.push(`${ep.method} ${ep.route} — ${shortPurpose}`)
    } else {
      d.routes.push(`${ep.method} ${ep.route}`)
    }
  }

  const lines = [`## ${platformName} (${httpEndpoints.length} HTTP endpoints)`]
  for (const [domain, info] of Object.entries(byDomain).sort((a, b) => b[1].count - a[1].count)) {
    const methodStr = Object.entries(info.methods)
      .sort((a, b) => b[1] - a[1])
      .map(([m, c]) => `${m}:${c}`)
      .join(', ')
    const tagList = Array.from(info.tags).sort()
    lines.push(`\n### ${domain} (${info.count} endpoints) [${methodStr}]`)
    lines.push(`Tags: ${tagList.join(', ')}`)
    // Include all routes
    for (const r of info.routes) {
      lines.push(`  ${r}`)
    }
  }
  return lines.join('\n')
}

// Build a short summary (domain counts + key routes only)
function summarizeCatalog(endpoints, platformName) {
  const httpEndpoints = endpoints.filter((e) => e.triggerType === 'http')
  const byDomain = {}
  for (const ep of httpEndpoints) {
    if (!byDomain[ep.domain]) {
      byDomain[ep.domain] = { count: 0, keyRoutes: [] }
    }
    byDomain[ep.domain].count++
    // Keep up to 5 representative routes per domain
    if (byDomain[ep.domain].keyRoutes.length < 5 && ep.purpose) {
      byDomain[ep.domain].keyRoutes.push(`${ep.method} ${ep.route} — ${ep.purpose}`)
    }
  }

  const lines = [`${platformName} (${httpEndpoints.length} endpoints):`]
  for (const [domain, info] of Object.entries(byDomain).sort((a, b) => b[1].count - a[1].count)) {
    lines.push(`  ${domain}: ${info.count} endpoints`)
    for (const r of info.keyRoutes) {
      lines.push(`    ${r}`)
    }
  }
  return lines.join('\n')
}

// Pre-compute all catalog contexts at startup
const catalogFull = {
  winteam: condenseCatalog(catalogs.winteam, 'WinTeam (Concourse/Azure APIM)'),
  realgreen: condenseCatalog(catalogs.realgreen, 'RealGreen (Apigee)'),
  pestpac: condenseCatalog(catalogs.pestpac, 'PestPac (Apigee)'),
}

const catalogSummary = {
  winteam: summarizeCatalog(catalogs.winteam, 'WinTeam'),
  realgreen: summarizeCatalog(catalogs.realgreen, 'RealGreen'),
  pestpac: summarizeCatalog(catalogs.pestpac, 'PestPac'),
}

const fullCatalogContext = [catalogFull.winteam, catalogFull.realgreen, catalogFull.pestpac].join('\n\n')
const summaryCatalogContext = [catalogSummary.winteam, catalogSummary.realgreen, catalogSummary.pestpac].join('\n')

console.log(`Catalog context sizes: full=${Math.round(fullCatalogContext.length / 1024)}KB, summary=${Math.round(summaryCatalogContext.length / 1024)}KB`)
console.log(`  WinTeam: ${catalogs.winteam.filter((e) => e.triggerType === 'http').length} HTTP endpoints`)
console.log(`  RealGreen: ${catalogs.realgreen.filter((e) => e.triggerType === 'http').length} HTTP endpoints`)
console.log(`  PestPac: ${catalogs.pestpac.filter((e) => e.triggerType === 'http').length} HTTP endpoints`)

// ── Use-case to endpoint mapping ────────────────────────────────

const USE_CASE_ENDPOINT_MAP = `
## USE CASE → ENDPOINT MAPPING

When a customer or reviewer asks "which endpoints do I need for X?", use this mapping to recommend specific routes.

### Customer Data Sync / CRM
- PestPac: GET/POST /BillTos, GET/POST /Locations, GET/POST /Contacts, GET/POST /Leads, GET /Corporations
- RealGreen: GET/POST /Customer, GET /CustomerSearch, GET/POST /Contact, GET/POST /Property
- WinTeam: GET/POST /api/Customers, GET/POST /api/Sites, GET/POST /api/Contacts

### Scheduling & Appointments
- PestPac: GET/POST /Schedules, GET /Scheduling, GET/POST /Routes, GET/POST /Calls, GET/POST /Tasks, GET/POST /TimeBlocks
- RealGreen: GET/POST /Schedule, GET /DailyRoute, GET/POST /ServiceStop, GET /ScheduleSearch
- WinTeam: GET/POST /api/Schedules, GET/POST /api/Jobs, GET/POST /api/WorkSchedules

### Invoicing & Billing
- PestPac: GET/POST /Invoices, GET/POST /Payments, GET/POST /PaymentAccounts, GET /FinancedInvoices, GET /GainLoss
- RealGreen: GET/POST /Invoice, GET /InvoicePayment, GET/POST /Payment, GET /AR, GET /StatementHistory
- WinTeam: GET/POST /api/Invoices, GET/POST /api/Payments, GET /api/BillingSetup

### Employee / HR
- PestPac: GET/POST /Employees, GET /Skills, GET /TechnicianRegions
- RealGreen: GET/POST /Employee, GET /EmployeeSearch, GET /EmployeePayroll
- WinTeam: GET/POST /api/Employees, GET /api/EmployeePayrollData, GET /api/EmployeeSecurity, GET /api/PayRates

### Service Operations / Jobs
- PestPac: GET/POST /Services, GET/POST /ServiceOrders, GET/POST /ServiceOrderBatches, GET/POST /Jobs, GET /Conditions, GET /TargetPests, GET /Materials
- RealGreen: GET/POST /ServiceSetup, GET/POST /Application, GET /ApplicationSearch, GET /ServicePlan
- WinTeam: GET/POST /api/Jobs, GET/POST /api/JobPostings, GET/POST /api/WorkOrders

### Marketing & Communication
- PestPac: POST /Email, GET/POST /MarketingText, GET /SalesEvents, GET /DecisionIntelligence
- RealGreen: GET/POST /MarketingSource, GET /MarketingList, POST /Email
- WinTeam: limited — use customer/contact endpoints + external marketing tools

### Payments & Credit Cards
- PestPac: GET/POST /Payments, GET/POST /CreditCardBilling, GET /PayOverTime, GET /MethodOfPayments
- RealGreen: GET/POST /Payment, GET /PaymentMethod, GET /CreditCard
- WinTeam: GET/POST /api/Payments

### Inventory & Materials
- PestPac: GET/POST /Materials, GET/POST /MaterialsOrdering
- RealGreen: GET/POST /ChemicalApplication, GET /Product
- WinTeam: GET/POST /api/Inventory, GET /api/Assets

### Documents & Forms
- PestPac: GET/POST /Documents, GET/POST /FormsManager, GET/POST /FormComments, GET/POST /Notes
- RealGreen: GET/POST /Document, GET/POST /Note, GET /Attachment
- WinTeam: GET /api/Documents, GET /api/Attachments

### Fleet & GPS
- PestPac: GET /GpsData, GET /GpsIntegrations, GET/POST /Vehicles, GET /Devices
- RealGreen: GET /Vehicle, GET /GPS
- WinTeam: limited — typically use Route Manager integration

### Configuration & Lookups
- PestPac: GET /Areas, GET /Frequencies, GET /Sources, GET /Types, GET /UserDefFields, GET /Branches, GET /Divisions, GET /TaxCodes, GET /GLCode
- RealGreen: GET /LookupList, GET /Branch, GET /Division, GET /ServiceType, GET /TaxCode
- WinTeam: GET /api/Departments, GET /api/Locations, GET /api/PayCodes, GET /api/DeductionCodes

### Automation & Webhooks
- PestPac: GET/POST /WebHooks, GET/POST /Automation, GET /Notifications
- RealGreen: GET/POST /Webhook, GET /Trigger
- WinTeam: Event Grid triggers, Service Bus triggers (non-HTTP; ask about connector-generation endpoints)

## BUSINESS CASE GUIDANCE

When helping build a business case for API access, consider:

1. **Volume Pricing Tiers** (monthly):
   - Tier 1: 100K calls/mo — $345/mo ($0.00345/call)
   - Tier 2: 500K calls/mo — $1,560/mo ($0.00312/call)
   - Tier 3: 2M calls/mo — $5,220/mo ($0.00261/call)
   - Tier 4: 5M calls/mo — $12,083/mo ($0.00242/call)
   - Tier 5: 10M calls/mo — $22,530/mo ($0.00225/call)
   - Tier 6: 50M calls/mo — $70,950/mo ($0.00142/call)
   - Tier 7: 100M calls/mo — $105,600/mo ($0.00106/call)
   Overage: 2.5x the per-call rate for the tier.

2. **Professional Services Packages**:
   - Standard Onboarding: $5,000 (10 hrs) — basic integration support
   - Premium Onboarding: $12,500 (25 hrs) — dedicated engineer, sandbox validation, go-live
   - Enterprise: Custom — architecture review, dedicated team, ongoing support
   - Self-Service: $0 — customer manages independently

3. **Data Sensitivity Categories**:
   - Standard: employee info, jobs/work orders, schedules, general
   - Premium: payroll information, financials, timekeeping calculations

4. **Typical Integration Patterns by Use Case**:
   - CRM sync: ~5K-50K calls/mo (Tier 1-2), read-heavy, standard data
   - Scheduling integration: ~10K-100K calls/mo (Tier 1), mixed read/write
   - Financial reporting: ~1K-10K calls/mo (Tier 1), read-only, premium data
   - Payment processing: ~5K-50K calls/mo (Tier 1-2), write-heavy, premium data
   - Full platform integration: ~100K-500K calls/mo (Tier 1-2), all categories

5. **Revenue Benchmarks** (from existing partnerships):
   - Applause: ~$130K/quarter revenue share (~995 PestPac customers, 20% rev share)
   - Typical commercial partner threshold: $500K annual revenue to justify partnership investment
   - Smaller integrations: professional services fees + API volume pricing

6. **API Gateway Details**:
   - PestPac & RealGreen: Google Apigee on AWS. REST APIs, OAuth2 client credentials flow.
   - WinTeam: Concourse on Azure APIM. Mix of legacy + CSA/NextGen + connector generations. OAuth2 + Azure AD.
   - Legacy WinTeam endpoints: still functional but not recommended for new integrations. CSA/NextGen equivalents preferred.

## AUTHENTICATION DETAILS

### PestPac & RealGreen (Apigee)
- OAuth2 client credentials flow
- Token endpoint: POST to Apigee token URL with client_id + client_secret
- Tokens are Bearer tokens, expire typically in 1 hour
- Include "Authorization: Bearer <token>" in all API requests
- Rate limits enforced at the Apigee proxy level per API product

### WinTeam (Concourse / Azure APIM)
- OAuth2 + Azure AD authentication
- Token endpoint: Azure AD token URL with client_id + client_secret + tenant
- Subscription key required in header: "Ocp-Apim-Subscription-Key"
- Some legacy endpoints may use basic auth (being deprecated)
- Rate limits enforced at Azure APIM level

### Common Error Responses
- 401 Unauthorized: Token expired or invalid → re-authenticate
- 403 Forbidden: Endpoint not in your approved scope → request expanded access
- 429 Too Many Requests: Rate limit exceeded → implement backoff, consider upgrading tier
- 400 Bad Request: Malformed request body → check API documentation
- 404 Not Found: Resource doesn't exist → verify IDs and path parameters
- 500 Internal Server Error: Platform issue → retry with exponential backoff
`

// ── Prompt construction ─────────────────────────────────────────

const BASE_PROMPT = `You are WAIve, WorkWave's AI assistant embedded in the API Access Portal. You are an expert on WorkWave's API ecosystem across all platforms.

You have deep knowledge of:
- ${appCount} historical API Developer Application records extracted from Salesforce PDFs
- 1,737 HTTP API endpoints across 3 platforms: WinTeam (462), RealGreen (439), PestPac (836)
- Volume-based API pricing tiers, professional services packages, and commercial terms
- Authentication flows for Apigee (PestPac/RealGreen) and Concourse/Azure APIM (WinTeam)
- Use-case to endpoint mapping for common integration patterns
- Competitive landscape and partner risk assessment

Known competitive vendors: Sellify AI, Smarter Launch, Clicki, Avoca AI, Podium, Applause, Captivated, Cinch.
WorkWave products: PestPac (pest control), RealGreen (lawn/landscape), WinTeam (janitorial/security), Route Manager, Lighthouse, Timegate+.
API gateways: PestPac & RealGreen use Apigee (AWS). WinTeam uses Concourse/APIM (Azure).

When users ask which endpoints to use:
- Recommend specific routes with methods (e.g., "GET /BillTos for customer lookup, POST /Locations for creating service locations")
- Explain what each endpoint does using the purpose descriptions from the catalog
- Call out which platform the endpoints belong to
- Suggest volume tiers based on their use case
- Flag if they need premium (payroll/financial) vs standard data access

When helping build a business case:
- Reference pricing tiers and professional services packages
- Estimate monthly API call volumes based on use case patterns
- Reference comparable existing integrations when relevant
- Flag competitive risks if the partner/developer is a known competitor

Keep answers concise. Use tables/lists when helpful. When citing application records, include customer name and SF case number.`

const PAGE_CONTEXT = {
  'customer-partners': `The user is a CUSTOMER browsing the Partners page. This shows approved integration partners and trusted integrators. There are two paths: (1) choose an existing partner and click to request access, or (2) "Build Your Own" for customers who want APIs for internal use without a partner. Customers can filter partners by product (PestPac, RealGreen, WinTeam). Help them understand which partners are available, what integrations they support, and how to request API access. Guide them toward the Request Access flow or the self-build path. If they describe their integration needs, recommend specific endpoints and a volume tier.`,

  'reviewer-requests': `The user is a REVIEWER on the Requests page. This shows pending API access requests awaiting review and active approved integrations. Each request now has a bidirectional Communication thread for messaging with the submitter (customer), plus reviewer-only internal notes. Help them prioritize reviews, understand request patterns, identify competitive risks, guide the multi-stage approval process (initial → competitive → security → legal → sandbox → production), and communicate with submitters when more information is needed. When reviewing an integration request, help assess which endpoints should be approved, suggest a volume tier, and flag any data sensitivity concerns.`,

  'reviewer-partners': `The user is a REVIEWER on the Partners page. This shows the partner directory (with competitive flags, blocking controls) and trusted integrators (with trust status, ARR impact, do-not-approve flags). Each partner profile includes an AI-generated summary, a Documents & Agreements section for contracts, and an Impact Analysis showing which customers would be affected if the partner is removed. Help them assess partner risk, understand competitive dynamics, manage partner relationships, and evaluate the commercial viability of partnerships ($500K annual threshold).`,

  'reviewer-applications': `The user is a REVIEWER on the Applications page. This shows analytics over 974 historical API applications and a searchable detail table. Help them identify trends — competitive vendor patterns, product distribution, resell intent, risk flags (contradictory resell intent, low confidence extractions). Cross-reference with endpoint catalog data to understand what APIs are most commonly requested.`,

  'reviewer-queue': `The user is a REVIEWER looking at the pending review queue. Help them prioritize which requests to review first, understand competitive flags, navigate the approval workflow, and determine which endpoints to approve or deny for each request.`,

  'reviewer-active-access': `The user is a REVIEWER looking at active API access records. Help them understand current integrations, identify compliance concerns, assess which active connections may need review, and evaluate whether integrations are using appropriate volume tiers.`,

  'api-catalog': `The user is browsing the API Catalog. This page shows the full endpoint inventories for all 3 platforms. Help them find specific endpoints, understand domain coverage, compare API surfaces across platforms, determine which endpoints to use for their integration, and guide developers through authentication. You have the COMPLETE endpoint catalog with every route, method, and purpose description.`,

  'usage-intelligence': `The user is on the Usage Intelligence page. This shows gap analysis across capability groups (CRM, scheduling, billing, HR, etc.), showing which capabilities have the most third-party integration interest. Help them understand market signals, prioritize API investment, and identify which endpoint domains have the strongest demand.`,

  'developer-risk-profiles': `The user is on the Developer Risk Profiles page. Each developer gets a weighted risk score (0-100) based on competitive overlap, data sensitivity, resell intent, and compliance history. Help them understand risk factors, prioritize reviews, and recommend appropriate access restrictions for high-risk developers.`,

  'my-integrations': `The user is a CUSTOMER viewing their active integrations. Help them understand their current API access, provisioning status, how to request changes or additional access, and estimate costs for expanding their integration.`,

  'check-status': `The user is checking the status of an API access request. Help them understand where their request is in the review process and what to expect next.`,

  'request-form': `The user is filling out an API access request form. Help them understand what information is needed, explain the fields, describe what happens after submission, and recommend which endpoints and data categories they should request based on their use case.`,

  'directory': `The user is browsing the partner directory. Help them find integration partners, understand partner tiers, learn about available integrations, and determine which partner best fits their use case. If they describe what they want to integrate, recommend specific API endpoints.`,

  'applications-dashboard': `The user is on the Applications Analytics Dashboard. Help them interpret the competitive vendor breakdown, distribution charts, and risk flag data. Cross-reference with the endpoint catalog to understand API demand patterns.`,

  'historical-applications': `The user is browsing historical API application records. Help them search and filter effectively, understand extraction confidence levels, and identify patterns in how different developers and customers use WorkWave APIs.`,
}

// Pages that benefit from the full endpoint catalog in context
const CATALOG_HEAVY_PAGES = new Set([
  'api-catalog',
  'request-form',
  'reviewer-queue',
  'reviewer-requests',
  'reviewer-active-access',
  'directory',
  'customer-partners',
])

// Pages that benefit from full application records
const APPS_HEAVY_PAGES = new Set([
  'reviewer-applications',
  'applications-dashboard',
  'historical-applications',
  'reviewer-requests',
  'reviewer-queue',
  'developer-risk-profiles',
])

function buildSystemPrompt(page) {
  const pageContext = PAGE_CONTEXT[page] || ''
  const pageSection = pageContext
    ? `\n\nCURRENT PAGE CONTEXT:\n${pageContext}\n\nStay focused on what is relevant to this page. If the user asks something outside this page's scope, you can still answer but gently guide them to the appropriate section of the portal.`
    : ''

  // Use-case mapping is always included — it's compact and universally useful
  const useCaseSection = `\n\n${USE_CASE_ENDPOINT_MAP}`

  // For catalog-heavy pages, include full endpoint catalog; otherwise include summary
  const catalogSection = CATALOG_HEAVY_PAGES.has(page)
    ? `\n\nFULL API ENDPOINT CATALOG:\n${fullCatalogContext}`
    : `\n\nAPI CATALOG SUMMARY:\n${summaryCatalogContext}`

  // For application-heavy pages, include full records; otherwise include aggregate stats
  const appsSection = APPS_HEAVY_PAGES.has(page)
    ? `\n\nHISTORICAL APPLICATION RECORDS (condensed JSON):\n${dataContextFull}`
    : `\n\n${dataContextStats}`

  return `${BASE_PROMPT}${pageSection}${useCaseSection}${catalogSection}${appsSection}`
}

// ── API endpoint ────────────────────────────────────────────────

app.post('/api/ask', async (req, res) => {
  const { question, page } = req.body

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Question is required' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' })
  }

  // Check daily budget
  const spent = getDailySpendCents()
  if (spent >= DAILY_BUDGET_CENTS) {
    return res.status(429).json({
      error: 'Daily budget reached ($5.00). Resets at midnight UTC.',
      spent: `$${(spent / 100).toFixed(2)}`,
    })
  }

  try {
    const client = new Anthropic()
    const systemPrompt = buildSystemPrompt(page || '')
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: question.trim() }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const inputTokens = response.usage?.input_tokens || 0
    const outputTokens = response.usage?.output_tokens || 0
    const totalSpent = addSpend(inputTokens, outputTokens)

    res.json({
      answer: text,
      usage: {
        inputTokens,
        outputTokens,
        dailySpentCents: Math.round(totalSpent),
        dailyBudgetCents: DAILY_BUDGET_CENTS,
      },
    })
  } catch (err) {
    console.error('Claude API error:', err.message)
    res.status(500).json({ error: 'Failed to get response from Claude' })
  }
})

// Budget status endpoint
app.get('/api/budget', (_req, res) => {
  const spent = getDailySpendCents()
  res.json({
    dailySpentCents: Math.round(spent),
    dailyBudgetCents: DAILY_BUDGET_CENTS,
    remaining: `$${((DAILY_BUDGET_CENTS - spent) / 100).toFixed(2)}`,
  })
})

// ── Serve static files (Vite build output) ──────────────────────

app.use(express.static(join(__dirname, 'dist')))

// SPA fallback — serve index.html for all non-API routes
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`WorkWave API Portal server running on port ${PORT}`)
  console.log(`Daily budget: $${(DAILY_BUDGET_CENTS / 100).toFixed(2)}`)
})
