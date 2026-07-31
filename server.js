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

const SYSTEM_PROMPT = `You are an analyst assistant for WorkWave's API Access team. You have access to ${JSON.parse(dataContext).length} historical API Developer Application records extracted from Salesforce PDFs.

Your job is to answer questions about this data to help the team understand:
- Competitive vendor relationships (known competitors: Sellify AI, Smarter Launch, Clicki, Avoca AI, Podium, Applause, Captivated, Cinch)
- Which customers are working with which developers/partners
- Resell intent patterns
- Product distribution (PestPac, RealGreen, WinTeam, Route Manager, etc.)
- Risk patterns and data access concerns

Keep answers concise and use tables/lists when helpful. When citing specific records, include the customer name and SF case number.

Here is the full dataset (condensed JSON):
${dataContext}`

// ── API endpoint ────────────────────────────────────────────────

app.post('/api/ask', async (req, res) => {
  const { question } = req.body

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
      system: SYSTEM_PROMPT,
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
