import type { CatalogDomain, ApiGeneration, HttpMethod } from '@/data/types'

export const DOMAIN_LABELS: Record<CatalogDomain, string> = {
  employees_hr: 'Employees / HR',
  scheduling: 'Scheduling',
  jobs: 'Jobs',
  accounting: 'Accounting',
  payroll: 'Payroll',
  time_tracking: 'Time Tracking',
  work_schedules: 'Work Schedules',
  customers: 'Customers',
  inventory: 'Inventory',
  system_admin: 'System / Admin',
  connectors: 'Connectors',
  compliance: 'Compliance',
  contacts: 'Contacts',
  documents: 'Documents',
  services: 'Services / Programs',
  reporting: 'Reporting / Metrics',
  configuration: 'Configuration / Codes',
  properties: 'Properties / Territory',
}

export const GENERATION_LABELS: Record<ApiGeneration, { label: string; color: string }> = {
  legacy: { label: 'Legacy', color: 'bg-gray-100 text-gray-600' },
  csa: { label: 'CSA', color: 'bg-sky-100 text-sky-700' },
  connector: { label: 'Connector', color: 'bg-teal-100 text-teal-700' },
  rest: { label: 'REST', color: 'bg-emerald-100 text-emerald-700' },
}

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PATCH: 'bg-purple-100 text-purple-700',
  DELETE: 'bg-red-100 text-red-700',
  PUT: 'bg-amber-100 text-amber-700',
}
