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

let dataContext = '[]'
try {
  const raw = readFileSync(join(__dirname, 'src', 'data', 'extracted-applications.json'), 'utf-8')
  const apps = JSON.parse(raw)
  // Condense: keep only fields useful for analysis, drop nulls
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
  dataContext = JSON.stringify(condensed)
  console.log(`Loaded ${apps.length} applications (${Math.round(dataContext.length / 1024)}KB condensed context)`)
} catch (e) {
  console.warn('Could not load extracted-applications.json:', e.message)
}

const BASE_PROMPT = `You are WAIve, WorkWave's AI assistant embedded in the API Access Portal. You have access to ${JSON.parse(dataContext).length} historical API Developer Application records extracted from Salesforce PDFs.

Known competitive vendors: Sellify AI, Smarter Launch, Clicki, Avoca AI, Podium, Applause, Captivated, Cinch.
WorkWave products: PestPac (pest control), RealGreen (lawn/landscape), WinTeam (janitorial/security), Route Manager, Lighthouse, Timegate+.
API gateways: PestPac & RealGreen use Apigee (AWS). WinTeam uses Concourse/APIM (Azure).

Keep answers concise. Use tables/lists when helpful. When citing records, include customer name and SF case number.`

const PAGE_CONTEXT = {
  'customer-partners': `The user is a CUSTOMER browsing the Partners page. This shows approved integration partners and trusted integrators. There are two paths: (1) choose an existing partner and click to request access, or (2) "Build Your Own" for customers who want APIs for internal use without a partner. Customers can filter partners by product (PestPac, RealGreen, WinTeam). Help them understand which partners are available, what integrations they support, and how to request API access. Guide them toward the Request Access flow or the self-build path.`,

  'reviewer-requests': `The user is a REVIEWER on the Requests page. This shows pending API access requests awaiting review and active approved integrations. Each request now has a bidirectional Communication thread for messaging with the submitter (customer), plus reviewer-only internal notes. Help them prioritize reviews, understand request patterns, identify competitive risks, guide the multi-stage approval process (initial → competitive → security → legal → sandbox → production), and communicate with submitters when more information is needed.`,

  'reviewer-partners': `The user is a REVIEWER on the Partners page. This shows the partner directory (with competitive flags, blocking controls) and trusted integrators (with trust status, ARR impact, do-not-approve flags). Each partner profile now includes an AI-generated summary (via WAIve), a Documents & Agreements section for storing contracts and negotiation docs, and an Impact Analysis showing which customers would be affected if the partner is removed. Help them assess partner risk, understand competitive dynamics, manage partner relationships, and review partner documents.`,

  'reviewer-applications': `The user is a REVIEWER on the Applications page. This shows analytics over 974 historical API applications and a searchable detail table. Help them identify trends — competitive vendor patterns, product distribution, resell intent, risk flags (contradictory resell intent, low confidence extractions).`,

  'reviewer-queue': `The user is a REVIEWER looking at the pending review queue. Help them prioritize which requests to review first, understand competitive flags, and navigate the approval workflow.`,

  'reviewer-active-access': `The user is a REVIEWER looking at active API access records. Help them understand current integrations, identify compliance concerns, and assess which active connections may need review.`,

  'api-catalog': `The user is browsing the API Catalog. WinTeam has 462 endpoints (legacy, CSA/NextGen, connector generations). RealGreen has 439 endpoints (REST API, 53 tags across 10 domains). PestPac has 836 endpoints (REST API, 96 tags across 14 domains). Total: 1,737 endpoints across 3 platforms. The catalog now includes a Developer Quick Start section with authentication walkthroughs, common error responses, and SDK availability. Legacy WinTeam endpoints are flagged with a LEGACY badge. Help them find specific endpoints, understand domain coverage, compare API surfaces across platforms, and guide developers through authentication and getting started.`,

  'usage-intelligence': `The user is on the Usage Intelligence page. This shows gap analysis across capability groups (CRM, scheduling, billing, HR, etc.), showing which capabilities have the most third-party integration interest. Help them understand market signals and prioritize API investment.`,

  'developer-risk-profiles': `The user is on the Developer Risk Profiles page. Each developer gets a weighted risk score (0-100) based on competitive overlap, data sensitivity, resell intent, and compliance history. Help them understand risk factors and prioritize reviews.`,

  'my-integrations': `The user is a CUSTOMER viewing their active integrations. Help them understand their current API access, provisioning status, and how to request changes or additional access.`,

  'check-status': `The user is checking the status of an API access request. Help them understand where their request is in the review process and what to expect next.`,

  'request-form': `The user is filling out an API access request form. Help them understand what information is needed, explain the fields, and describe what happens after submission.`,

  'directory': `The user is browsing the partner directory. Help them find integration partners, understand partner tiers, and learn about available integrations.`,

  'applications-dashboard': `The user is on the Applications Analytics Dashboard. Help them interpret the competitive vendor breakdown, distribution charts, and risk flag data.`,

  'historical-applications': `The user is browsing historical API application records. Help them search and filter effectively, understand extraction confidence levels, and identify patterns.`,
}

function buildSystemPrompt(page) {
  const pageContext = PAGE_CONTEXT[page] || ''
  const pageSection = pageContext
    ? `\n\nCURRENT PAGE CONTEXT:\n${pageContext}\n\nStay focused on what is relevant to this page. If the user asks something outside this page's scope, you can still answer but gently guide them to the appropriate section of the portal.`
    : ''

  return `${BASE_PROMPT}${pageSection}\n\nHere is the full dataset (condensed JSON):\n${dataContext}`
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
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: buildSystemPrompt(page || ''),
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
