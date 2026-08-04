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

// ── Role-specific base prompts ─────────────────────────────────

const REVIEWER_BASE_PROMPT = `You are WAIve, WorkWave's AI assistant embedded in the API Access Portal. You are speaking to an INTERNAL REVIEWER (WorkWave staff).

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

As a reviewer assistant you can:
- Discuss competitive risks, partner blocking, and risk scoring in detail
- Share internal application data, developer risk profiles, and historical trends
- Reference revenue benchmarks, ARR thresholds, and commercial viability metrics
- Help prioritize the review queue and flag data sensitivity concerns
- Guide multi-stage approval workflows (initial → competitive → security → legal → sandbox → production)
- Recommend which endpoints to approve/deny and suggest volume tiers
- Discuss resell intent flags, extraction confidence levels, and compliance history

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

CONVERSATION STYLE:
- Keep responses concise and actionable. Lead with the answer, add detail only if needed.
- Use short paragraphs. Avoid walls of text.
- Minimize markdown formatting — use bold sparingly for key terms only. No headers (##) in responses.
- When listing items, use simple numbered lines rather than complex nested bullets.
- When citing application records, include customer name and SF case number.`

const CUSTOMER_BASE_PROMPT = `You are WAIve, WorkWave's AI assistant embedded in the API Access Portal. You are speaking to an EXTERNAL CUSTOMER (a WorkWave client or their integration partner).

CONVERSATION STYLE:
- Be warm, conversational, and concise. Talk like a helpful colleague, not a manual.
- Keep responses SHORT — 2-4 sentences max per turn. Never dump walls of text.
- ALWAYS QUALIFY FIRST. Before giving recommendations, ask a clarifying question to understand their situation. Don't assume.
- Ask ONE question at a time. Let the customer respond before moving to the next step.
- Use plain language. Avoid jargon unless they use it first.
- Do NOT use markdown formatting (no **, no ##, no bullet lists). Write naturally in plain sentences.
- When you do need to list things, use simple numbered lines or short phrases separated by commas.

WHAT YOU HELP WITH:
- Finding the right integration partner
- Understanding which API endpoints to request
- Explaining the access request process
- Recommending volume tiers based on their use case
- Walking them through the request form
- Basic authentication guidance (OAuth2)

WorkWave products: PestPac (pest control), RealGreen (lawn/landscape), WinTeam (janitorial/security), Route Manager, Lighthouse, Timegate+.

QUALIFYING FLOW — When someone asks about getting started or API access:
1. First ask: "What WorkWave product are you using?" (PestPac, RealGreen, or WinTeam)
2. Then ask: "What are you looking to integrate? For example, syncing customer data, automating scheduling, pulling financial reports?"
3. Based on their answer, recommend specific endpoints in plain language
4. Then ask: "Roughly how many API calls per month are you expecting? That helps me suggest the right pricing tier."
5. Guide them to the request form when ready

If they give you enough context upfront, skip the questions you can already answer. But never jump straight to a full recommendation without understanding their use case.

NEVER SHARE:
- Internal competitive intelligence, risk scores, or partner blocking data
- Historical application records, developer profiles, or Salesforce case data
- Revenue benchmarks, ARR figures, or partnership viability thresholds
- Which vendors are flagged as competitive threats
- Internal review priorities or approval/denial rationale
- Other customers' data

When asked about the review process, explain at a high level: your request goes through initial review, security review, sandbox testing, and production approval. Don't reveal internal scoring or competitive analysis.`

// Page context is now role-keyed. Reviewer pages get deep internal context.
// Customer pages get helpful but externally-safe guidance.
const PAGE_CONTEXT_REVIEWER = {
  'reviewer-requests': `You are on the Requests page showing pending API access requests and active approved integrations. Each request has a bidirectional Communication thread for messaging with the submitter, plus reviewer-only internal notes. Help prioritize reviews, identify competitive risks, guide the multi-stage approval process (initial → competitive → security → legal → sandbox → production), assess which endpoints should be approved, suggest volume tiers, and flag data sensitivity concerns.`,

  'reviewer-partners': `You are on the Partners page showing the partner directory (with competitive flags, blocking controls) and trusted integrators (with trust status, ARR impact, do-not-approve flags). Each partner has an AI-generated summary, Documents & Agreements for contracts, and an Impact Analysis. Help assess partner risk, competitive dynamics, manage relationships, and evaluate commercial viability ($500K annual threshold).`,

  'reviewer-applications': `You are on the Applications page showing analytics over ${appCount} historical API applications and a searchable detail table. Help identify trends — competitive vendor patterns, product distribution, resell intent, risk flags (contradictory resell intent, low confidence extractions). Cross-reference with endpoint catalog data to understand API demand patterns.`,

  'reviewer-queue': `You are looking at the pending review queue. Help prioritize requests, understand competitive flags, navigate the approval workflow, and determine which endpoints to approve or deny.`,

  'reviewer-active-access': `You are looking at active API access records. Help understand current integrations, identify compliance concerns, assess which connections may need review, and evaluate volume tier appropriateness.`,

  'api-catalog': `You are browsing the API Catalog showing full endpoint inventories for all 3 platforms. Help find specific endpoints, understand domain coverage, compare API surfaces, and guide developers through authentication. You have the COMPLETE endpoint catalog.`,

  'usage-intelligence': `You are on the Usage Intelligence page showing gap analysis across capability groups (CRM, scheduling, billing, HR, etc.) with third-party integration interest. Help understand market signals, prioritize API investment, and identify highest-demand endpoint domains.`,

  'developer-risk-profiles': `You are on the Developer Risk Profiles page. Each developer gets a weighted risk score (0-100) based on competitive overlap, data sensitivity, resell intent, and compliance history. Help understand risk factors, prioritize reviews, and recommend access restrictions.`,

  'applications-dashboard': `You are on the Applications Analytics Dashboard. Help interpret competitive vendor breakdown, distribution charts, and risk flag data. Cross-reference with the endpoint catalog for API demand patterns.`,

  'historical-applications': `You are browsing historical API application records. Help search and filter effectively, understand extraction confidence levels, and identify patterns in developer/customer API usage.`,

  'customer-partners': `You are on the Partners page (reviewer view). This shows the full partner directory with competitive flags and blocking controls visible.`,

  'directory': `You are browsing the partner directory with full reviewer visibility including competitive flags, blocking controls, and internal risk data.`,

  'request-form': `You are viewing the request form context. Help assess what endpoints and data categories should be approved based on the requester's use case.`,
}

const PAGE_CONTEXT_CUSTOMER = {
  'customer-partners': `The customer is browsing the Partners page. This shows approved integration partners and trusted integrators. Two paths: (1) choose an existing partner and request access, or (2) "Build Your Own" for internal use without a partner. Help them find the right partner, understand what integrations are available, and guide them toward requesting access. If they describe their needs, recommend specific endpoints and a volume tier.`,

  'directory': `The customer is browsing the partner directory. Help them find integration partners, understand what integrations are available, and determine which partner fits their use case. If they describe what they want to integrate, recommend specific API endpoints.`,

  'my-integrations': `The customer is viewing their active integrations. Help them understand their current API access, provisioning status, how to request changes or additional access, and estimate costs for expanding their integration.`,

  'check-status': `The customer is checking the status of an API access request. Help them understand where their request is in the review process and what to expect next. The stages are: initial review → security review → sandbox approval → production approval.`,

  'request-form': `The customer is filling out an API access request form. Help them understand what information is needed, explain the fields, describe what happens after submission, and recommend which endpoints and data categories to request based on their use case.`,

  'api-catalog': `The customer is browsing the API Catalog showing endpoint inventories for all 3 platforms. Help them find specific endpoints, understand domain coverage, determine which endpoints to use for their integration, and understand authentication basics.`,
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

function buildSystemPrompt(page, role) {
  const isReviewer = role === 'reviewer'
  const basePrompt = isReviewer ? REVIEWER_BASE_PROMPT : CUSTOMER_BASE_PROMPT

  const contextMap = isReviewer ? PAGE_CONTEXT_REVIEWER : PAGE_CONTEXT_CUSTOMER
  const pageContext = contextMap[page] || ''
  const pageSection = pageContext
    ? `\n\nCURRENT PAGE CONTEXT:\n${pageContext}\n\nStay focused on what is relevant to this page. If the user asks something outside this page's scope, you can still answer but gently guide them to the appropriate section of the portal.`
    : ''

  // Use-case mapping is always included — it's compact and universally useful
  const useCaseSection = `\n\n${USE_CASE_ENDPOINT_MAP}`

  // For catalog-heavy pages, include full endpoint catalog; otherwise include summary
  const catalogSection = CATALOG_HEAVY_PAGES.has(page)
    ? `\n\nFULL API ENDPOINT CATALOG:\n${fullCatalogContext}`
    : `\n\nAPI CATALOG SUMMARY:\n${summaryCatalogContext}`

  // Application records and internal data are ONLY available to reviewers
  let appsSection = ''
  if (isReviewer) {
    appsSection = APPS_HEAVY_PAGES.has(page)
      ? `\n\nHISTORICAL APPLICATION RECORDS (condensed JSON):\n${dataContextFull}`
      : `\n\n${dataContextStats}`
  }

  return `${basePrompt}${pageSection}${useCaseSection}${catalogSection}${appsSection}`
}

// ── API endpoint ────────────────────────────────────────────────

app.post('/api/ask', async (req, res) => {
  const { question, page, role } = req.body

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
    const systemPrompt = buildSystemPrompt(page || '', role || 'customer')
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
