import type { CatalogEndpoint, CatalogDomain, ApiGeneration, HttpMethod } from '@/data/types'

// ── Project shorthand → catalog project name mapping ───────────
// Keys are lowercase, version-stripped shorthands from endpointsRequested lines.

const PROJECT_SHORTHAND_MAP: Record<string, string[]> = {
  accounting: ['TeamSoftware.WinTeam.AccountingAPI'],
  'wtnextgen-accounts': ['Accounts API'],
  'wtnextgen-vendors': ['Vendors API'],
  'wtnextgen-employees': ['CSA Employees API (TeamSoftware.WinTeam.Employees)'],
  'wtnextgen-daily-pay-employees': ['Employees Connector (Daily Pay)'],
  'winteam-get-employees': ['TeamSoftware.WinTeam.EmployeeAPI'],
  schedules: ['TeamSoftware.WinTeam.ScheduleAPI', 'Schedules API'],
  jobcosts: ['TeamSoftware.WinTeam.JobAPI', 'Jobs API'],
  timesheets: ['TeamSoftware.WinTeam.TimekeepingAPI', 'Timekeeping API'],
}

const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

// ── Parse a single endpoint line ───────────────────────────────

export interface ParsedEndpointLine {
  project: string
  functionName: string
  method: HttpMethod | null
  raw: string
}

export function parseEndpointLine(line: string): ParsedEndpointLine | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const tokens = trimmed.split(/\s+/)
  if (tokens.length < 2) {
    return { project: tokens[0], functionName: tokens[0], method: null, raw: trimmed }
  }

  const lastToken = tokens[tokens.length - 1].toUpperCase()
  const hasMethod = VALID_METHODS.has(lastToken)

  const method = hasMethod ? (lastToken as HttpMethod) : null
  const project = tokens[0]
  const functionName = hasMethod ? tokens.slice(1, -1).join(' ') : tokens.slice(1).join(' ')

  return { project, functionName, method, raw: trimmed }
}

// ── Strip version suffix from project shorthand ────────────────

function stripVersion(project: string): string {
  return project.replace(/-V\d+$/i, '').toLowerCase()
}

// ── Find catalog project names for a shorthand ─────────────────

function resolveProjectNames(shorthand: string): string[] {
  const key = stripVersion(shorthand)
  return PROJECT_SHORTHAND_MAP[key] ?? []
}

// ── Match result for a single line ─────────────────────────────

export interface EndpointMatchResult {
  parsed: ParsedEndpointLine
  match: CatalogEndpoint | null
}

// ── Core matching for a single parsed line ─────────────────────

function matchSingleEndpoint(
  parsed: ParsedEndpointLine,
  catalog: CatalogEndpoint[],
): CatalogEndpoint | null {
  const fnLower = parsed.functionName.toLowerCase()
  const projectNames = resolveProjectNames(parsed.project)

  // Priority 1: Exact function name match (case-insensitive)
  const fnMatches = catalog.filter(
    e => e.functionName.toLowerCase() === fnLower,
  )

  if (fnMatches.length === 1) return fnMatches[0]

  if (fnMatches.length > 1) {
    // Disambiguate by project name
    if (projectNames.length > 0) {
      const projectFiltered = fnMatches.filter(e =>
        projectNames.includes(e.projectName),
      )
      if (projectFiltered.length > 0) return projectFiltered[0]
    }
    // Disambiguate by method
    if (parsed.method) {
      const methodFiltered = fnMatches.filter(
        e => e.method === parsed.method,
      )
      if (methodFiltered.length === 1) return methodFiltered[0]
      if (methodFiltered.length > 1 && projectNames.length > 0) {
        const both = methodFiltered.filter(e =>
          projectNames.includes(e.projectName),
        )
        if (both.length > 0) return both[0]
      }
      if (methodFiltered.length > 0) return methodFiltered[0]
    }
    return fnMatches[0]
  }

  // Priority 2: Match within resolved project(s) by function name prefix-stripping
  // For CSA auto-generated names like "getApiEmployees" → look for "GetEmployees" in the project
  if (projectNames.length > 0) {
    const projectEndpoints = catalog.filter(e =>
      projectNames.includes(e.projectName),
    )

    // Strip getApi/postApi/putApi/patchApi/deleteApi prefix and search
    const strippedFn = parsed.functionName.replace(
      /^(get|post|put|patch|delete)Api/i,
      '',
    )
    if (strippedFn && strippedFn !== parsed.functionName) {
      const strippedLower = strippedFn.toLowerCase()

      // Try matching the stripped name against the end of catalog function names
      const stripped = projectEndpoints.filter(e => {
        const eFnLower = e.functionName.toLowerCase()
        // e.g. "GetEmployees" ends with "employees" matches stripped "Employees"
        return eFnLower.endsWith(strippedLower)
      })
      if (stripped.length > 0) {
        // Prefer method match
        if (parsed.method) {
          const methodMatch = stripped.filter(e => e.method === parsed.method)
          if (methodMatch.length > 0) return methodMatch[0]
        }
        return stripped[0]
      }

      // Try route substring match: stripped name segments as route parts
      const routeSegments = strippedFn
        .replace(/([A-Z])/g, '/$1')
        .toLowerCase()
        .split('/')
        .filter(Boolean)

      if (routeSegments.length > 0) {
        const routeMatches = projectEndpoints.filter(e => {
          const routeLower = e.route.toLowerCase()
          return routeSegments.every(seg => routeLower.includes(seg))
        })
        if (routeMatches.length > 0) {
          if (parsed.method) {
            const methodMatch = routeMatches.filter(
              e => e.method === parsed.method,
            )
            if (methodMatch.length > 0) return methodMatch[0]
          }
          return routeMatches[0]
        }
      }
    }

    // Simple function name contains match within the project
    const partialMatch = projectEndpoints.filter(e =>
      e.functionName.toLowerCase().includes(fnLower) ||
      fnLower.includes(e.functionName.toLowerCase()),
    )
    if (partialMatch.length > 0) {
      if (parsed.method) {
        const methodMatch = partialMatch.filter(
          e => e.method === parsed.method,
        )
        if (methodMatch.length > 0) return methodMatch[0]
      }
      return partialMatch[0]
    }
  }

  // Priority 3: Route substring match across full catalog
  const strippedFn = parsed.functionName.replace(
    /^(get|post|put|patch|delete)Api/i,
    '',
  )
  if (strippedFn && strippedFn.length > 4) {
    const strippedLower = strippedFn.toLowerCase()
    const routeMatches = catalog.filter(e => {
      const routeClean = e.route
        .replace(/\/api\//i, '/')
        .replace(/\{[^}]+\}/g, '')
        .replace(/[/:]/g, '')
        .toLowerCase()
      return routeClean.includes(strippedLower)
    })
    if (routeMatches.length > 0) {
      if (parsed.method) {
        const methodMatch = routeMatches.filter(
          e => e.method === parsed.method,
        )
        if (methodMatch.length > 0) return methodMatch[0]
      }
      return routeMatches[0]
    }
  }

  return null
}

// ── Main matching function ─────────────────────────────────────

export interface MatchResults {
  matchResults: EndpointMatchResult[]
  matchedCount: number
  unmatchedCount: number
  domains: CatalogDomain[]
  generations: ApiGeneration[]
  projects: string[]
}

export function matchEndpointsRequested(
  text: string,
  catalog: CatalogEndpoint[],
): MatchResults {
  const lines = text.split('\n').filter(l => l.trim())
  const matchResults: EndpointMatchResult[] = []
  const domainSet = new Set<CatalogDomain>()
  const genSet = new Set<ApiGeneration>()
  const projectSet = new Set<string>()

  for (const line of lines) {
    const parsed = parseEndpointLine(line)
    if (!parsed) continue

    const match = matchSingleEndpoint(parsed, catalog)
    matchResults.push({ parsed, match })

    if (match) {
      domainSet.add(match.domain)
      genSet.add(match.generation)
      projectSet.add(match.projectName)
    }
  }

  return {
    matchResults,
    matchedCount: matchResults.filter(r => r.match !== null).length,
    unmatchedCount: matchResults.filter(r => r.match === null).length,
    domains: Array.from(domainSet).sort(),
    generations: Array.from(genSet).sort(),
    projects: Array.from(projectSet).sort(),
  }
}

// ── Domain badges for a request's endpointsRequested ───────────

export interface DomainBadge {
  domain: CatalogDomain
  label: string
  count: number
}

export function getDomainBadges(
  text: string,
  catalog: CatalogEndpoint[],
  domainLabels: Record<CatalogDomain, string>,
): DomainBadge[] {
  const { matchResults } = matchEndpointsRequested(text, catalog)
  const counts = new Map<CatalogDomain, number>()

  for (const r of matchResults) {
    if (r.match) {
      counts.set(r.match.domain, (counts.get(r.match.domain) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([domain, count]) => ({
      domain,
      label: domainLabels[domain],
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

// ── Usage counts: how many approved requests reference each project ──

export function getCatalogUsageCounts(
  requests: { endpointsApproved: string | null }[],
  catalog: CatalogEndpoint[],
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const req of requests) {
    if (!req.endpointsApproved) continue
    const { projects } = matchEndpointsRequested(req.endpointsApproved, catalog)
    const seen = new Set<string>()
    for (const p of projects) {
      if (!seen.has(p)) {
        seen.add(p)
        counts.set(p, (counts.get(p) ?? 0) + 1)
      }
    }
  }

  return counts
}
