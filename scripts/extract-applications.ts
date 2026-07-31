#!/usr/bin/env npx tsx

/**
 * PDF Application Extraction Script
 *
 * Extracts structured data from WorkWave API Developer Application PDFs
 * using Claude's vision (PDF support).
 *
 * Usage:
 *   cd scripts && npx tsx extract-applications.ts --dir ~/Desktop/api_application_files
 *   cd scripts && npx tsx extract-applications.ts --dir ~/Desktop/api_application_files --limit 10
 *
 * Environment:
 *   ANTHROPIC_API_KEY — required
 *
 * Output:
 *   ../src/data/extracted-applications.json
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Types (mirrors src/data/types.ts HistoricalApplication) ─────

interface HistoricalApplication {
  id: string
  sourceFile: string
  sfCaseNumber: string | null
  sfObjectId: string | null
  customerName: string | null
  customerContactName: string | null
  customerContactEmail: string | null
  customerContactPhone: string | null
  customerAddress: string | null
  customerCompanyKey: string | null
  subsidiaries: string | null
  developerName: string | null
  developerContactName: string | null
  developerContactEmail: string | null
  developerContactPhone: string | null
  externalProduct: string | null
  wwProduct: string | null
  isWwCustomer: boolean | null
  useCase: string | null
  customerIntendToResell: boolean | null
  developerIntendToResell: boolean | null
  targetLaunchDate: string | null
  signatureDate: string | null
  formVersion: 'v1_legacy' | 'v2_fillable' | 'v3_dual_app' | 'unknown' | null
  extractionConfidence: 'high' | 'medium' | 'low'
  extractionNotes: string | null
  extractedAt: string
}

// ── Config ──────────────────────────────────────────────────────

const DEFAULT_INPUT_DIR = path.join(
  process.env.HOME || '~',
  'Desktop',
  'api_application_files'
)
const OUTPUT_PATH = path.resolve(__dirname, '..', 'src', 'data', 'extracted-applications.json')
const MODEL = 'claude-haiku-4-5-20251001'
const DELAY_MS = 1000
const MAX_RETRIES = 3

// ── CLI args ────────────────────────────────────────────────────

function parseArgs(): { dir: string; limit: number | null } {
  const args = process.argv.slice(2)
  let dir = DEFAULT_INPUT_DIR
  let limit: number | null = null

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1]) {
      dir = path.resolve(args[++i])
    } else if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[++i], 10)
    }
  }

  return { dir, limit }
}

// ── Extraction prompt ───────────────────────────────────────────

const EXTRACTION_PROMPT = `Extract structured data from this WorkWave API Developer Application PDF.
Return ONLY valid JSON matching this exact schema — no markdown, no code fences, just the JSON object:

{
  "sfCaseNumber": "string or null — Salesforce case number if visible (e.g. 01584498)",
  "sfObjectId": "string or null — Salesforce object ID if visible (e.g. 068dK000005eMi5QAE)",
  "customerName": "string or null — the company applying for API access (the customer/applicant)",
  "customerContactName": "string or null — contact person at the customer company",
  "customerContactEmail": "string or null",
  "customerContactPhone": "string or null",
  "customerAddress": "string or null — city, state, zip combined",
  "customerCompanyKey": "string or null — PestPac or RealGreen tenant/company key",
  "subsidiaries": "string or null — any subsidiaries listed",
  "developerName": "string or null — the partner/developer company building the integration (NOT the customer)",
  "developerContactName": "string or null — contact at the developer/partner company",
  "developerContactEmail": "string or null",
  "developerContactPhone": "string or null",
  "externalProduct": "string or null — the partner's product/tool name",
  "wwProduct": "string or null — WorkWave product (PestPac, RealGreen, WinTeam, etc.)",
  "isWwCustomer": "boolean or null — 'Are you a WorkWave customer?' checkbox",
  "useCase": "string or null — description of what the integration will do",
  "customerIntendToResell": "boolean or null — does the customer intend to resell?",
  "developerIntendToResell": "boolean or null — does the developer intend to resell?",
  "targetLaunchDate": "string or null — target launch/go-live date",
  "signatureDate": "string or null — date the application was signed",
  "formVersion": "'v1_legacy' | 'v2_fillable' | 'v3_dual_app' | 'unknown' — v1_legacy: simple one-page form; v2_fillable: fillable PDF with form fields; v3_dual_app: has separate customer and developer sections",
  "extractionConfidence": "'high' | 'medium' | 'low' — high: all key fields readable; medium: some fields unclear; low: significant portions illegible or missing",
  "extractionNotes": "string or null — any issues, ambiguities, or notable observations"
}

Rules:
- Extract exactly what's written — do not infer or guess missing values
- For yes/no checkboxes, return true/false/null (null if not checked or unclear)
- The customer is the company applying for access; the developer/partner is who builds the integration
- If a field is blank, illegible, or not present on this form version, return null
- For formVersion: look at the overall layout to determine which version
- Return ONLY the JSON object, nothing else`

// ── Helpers ─────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function loadExistingResults(): HistoricalApplication[] {
  try {
    const raw = fs.readFileSync(OUTPUT_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // file doesn't exist or is invalid
  }
  return []
}

function saveResults(results: HistoricalApplication[]): void {
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2) + '\n', 'utf-8')
}

function extractSfMetadataFromFilename(filename: string): {
  sfCaseNumber: string | null
  sfObjectId: string | null
} {
  // Try to extract case number — typically 8 digits at the start
  const caseMatch = filename.match(/^(\d{8})/)
  const sfCaseNumber = caseMatch ? caseMatch[1] : null

  // Try to extract SF object ID — pattern like 068dK000005eMi5QAE
  const objectMatch = filename.match(/([0-9a-zA-Z]{18})/)
  const sfObjectId = objectMatch ? objectMatch[1] : null

  return { sfCaseNumber, sfObjectId }
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  const { dir, limit } = parseArgs()

  // Validate environment
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required')
    process.exit(1)
  }

  // Validate input directory
  if (!fs.existsSync(dir)) {
    console.error(`Error: Input directory not found: ${dir}`)
    process.exit(1)
  }

  const client = new Anthropic()

  // List PDF files
  const allFiles = fs.readdirSync(dir).sort()
  const pdfFiles = allFiles.filter(f => f.toLowerCase().endsWith('.pdf'))
  const skippedFiles = allFiles.filter(f =>
    f.toLowerCase().endsWith('.docx') || f.toLowerCase().endsWith('.doc')
  )

  if (skippedFiles.length > 0) {
    console.log(`\nSkipping ${skippedFiles.length} .docx/.doc files (not supported):`)
    skippedFiles.forEach(f => console.log(`  - ${f}`))
  }

  // Load existing results to enable resume
  const existing = loadExistingResults()
  const processedFiles = new Set(existing.map(r => r.sourceFile))
  const results: HistoricalApplication[] = [...existing]

  // Determine files to process
  let filesToProcess = pdfFiles.filter(f => !processedFiles.has(f))
  if (limit !== null) {
    filesToProcess = filesToProcess.slice(0, limit)
  }

  const totalTarget = filesToProcess.length
  const alreadyDone = processedFiles.size

  console.log(`\n── WorkWave API Application PDF Extraction ──`)
  console.log(`Input:     ${dir}`)
  console.log(`Output:    ${OUTPUT_PATH}`)
  console.log(`Model:     ${MODEL}`)
  console.log(`PDF files: ${pdfFiles.length} total`)
  console.log(`Already:   ${alreadyDone} extracted`)
  console.log(`To do:     ${totalTarget} remaining${limit !== null ? ` (limited to ${limit})` : ''}`)
  console.log(``)

  if (totalTarget === 0) {
    console.log('Nothing to process. All files already extracted.')
    return
  }

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < filesToProcess.length; i++) {
    const filename = filesToProcess[i]
    const filePath = path.join(dir, filename)
    const fileNum = alreadyDone + i + 1
    const totalNum = alreadyDone + totalTarget

    console.log(`[${fileNum}/${totalNum}] Extracting: ${filename}...`)

    try {
      // Read PDF as base64
      const pdfBuffer = fs.readFileSync(filePath)
      const pdfBase64 = pdfBuffer.toString('base64')

      // Call Claude with the PDF
      let response: Anthropic.Message | null = null
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          response = await client.messages.create({
            model: MODEL,
            max_tokens: 2048,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: {
                      type: 'base64',
                      media_type: 'application/pdf',
                      data: pdfBase64,
                    },
                  },
                  {
                    type: 'text',
                    text: EXTRACTION_PROMPT,
                  },
                ],
              },
            ],
          })
          break // success
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err)
          if (attempt < MAX_RETRIES) {
            console.log(`  Retry ${attempt}/${MAX_RETRIES} after error: ${errMsg}`)
            await sleep(DELAY_MS * attempt * 2) // exponential backoff
          } else {
            throw err
          }
        }
      }

      if (!response) throw new Error('No response from API')

      // Extract text from response
      const textBlock = response.content.find(b => b.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text in API response')
      }

      // Parse JSON — strip any accidental markdown fences
      let jsonText = textBlock.text.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const extracted = JSON.parse(jsonText)

      // Merge filename metadata
      const { sfCaseNumber: fileCase, sfObjectId: fileObj } =
        extractSfMetadataFromFilename(filename)

      const record: HistoricalApplication = {
        id: randomUUID(),
        sourceFile: filename,
        sfCaseNumber: extracted.sfCaseNumber || fileCase,
        sfObjectId: extracted.sfObjectId || fileObj,
        customerName: extracted.customerName ?? null,
        customerContactName: extracted.customerContactName ?? null,
        customerContactEmail: extracted.customerContactEmail ?? null,
        customerContactPhone: extracted.customerContactPhone ?? null,
        customerAddress: extracted.customerAddress ?? null,
        customerCompanyKey: extracted.customerCompanyKey ?? null,
        subsidiaries: extracted.subsidiaries ?? null,
        developerName: extracted.developerName ?? null,
        developerContactName: extracted.developerContactName ?? null,
        developerContactEmail: extracted.developerContactEmail ?? null,
        developerContactPhone: extracted.developerContactPhone ?? null,
        externalProduct: extracted.externalProduct ?? null,
        wwProduct: extracted.wwProduct ?? null,
        isWwCustomer: extracted.isWwCustomer ?? null,
        useCase: extracted.useCase ?? null,
        customerIntendToResell: extracted.customerIntendToResell ?? null,
        developerIntendToResell: extracted.developerIntendToResell ?? null,
        targetLaunchDate: extracted.targetLaunchDate ?? null,
        signatureDate: extracted.signatureDate ?? null,
        formVersion: extracted.formVersion ?? 'unknown',
        extractionConfidence: extracted.extractionConfidence ?? 'medium',
        extractionNotes: extracted.extractionNotes ?? null,
        extractedAt: new Date().toISOString(),
      }

      results.push(record)
      saveResults(results)
      successCount++

      const summary = [
        record.customerName || 'Unknown Customer',
        record.developerName ? `→ ${record.developerName}` : '',
        record.wwProduct ? `(${record.wwProduct})` : '',
      ]
        .filter(Boolean)
        .join(' ')
      console.log(`  ✓ ${summary} [${record.extractionConfidence}]`)
    } catch (err: unknown) {
      failCount++
      const errMsg = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ FAILED: ${errMsg}`)
    }

    // Rate limit delay
    if (i < filesToProcess.length - 1) {
      await sleep(DELAY_MS)
    }
  }

  console.log(`\n── Complete ──`)
  console.log(`Extracted: ${successCount}`)
  console.log(`Failed:    ${failCount}`)
  console.log(`Total:     ${results.length} records in output file`)
  console.log(`Output:    ${OUTPUT_PATH}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
