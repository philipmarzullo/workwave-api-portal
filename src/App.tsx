import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  Shield,
  ShieldAlert,
  RotateCcw,
  Globe,
  ClipboardList,
  Eye,
  Users,
  Search,
  Layers,
  ChevronDown,
  User,
  FileText,
  Lock,
  Radar,
  BookOpen,
} from 'lucide-react'
import { store } from '@/data/store'
import type { ViewMode, CustomerUser } from '@/data/types'
import { RequestForm } from '@/views/RequestForm'
import { Confirmation } from '@/views/Confirmation'
import { CheckStatus } from '@/views/CheckStatus'
import { ReviewerRequestDetail } from '@/views/ReviewerRequestDetail'
import { PartnerDetail } from '@/views/PartnerDetail'
import { MyIntegrations } from '@/views/MyIntegrations'
import { DeveloperRiskProfiles } from '@/views/DeveloperRiskProfiles'
import { UsageIntelligence } from '@/views/UsageIntelligence'
import { ApiCatalog } from '@/views/ApiCatalog'
import { ReviewerRequests } from '@/views/ReviewerRequests'
import { ReviewerPartners } from '@/views/ReviewerPartners'
import { CustomerPartners } from '@/views/CustomerPartners'
import { ReviewerApplications } from '@/views/ReviewerApplications'
import { WaiveWidget } from '@/components/WaiveWidget'

// ── Product labels ──────────────────────────────────────────────

export const PRODUCT_LABELS: Record<string, string> = {
  pestpac: 'PestPac',
  realgreen: 'RealGreen',
  winteam: 'WinTeam',
  lighthouse: 'Lighthouse',
  timegate_plus: 'Timegate+',
  route_manager: 'RouteManager',
  hire: 'Hire by WorkWave',
}

export const TIER_LABELS: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  under_review: { label: 'Under Review', color: 'bg-amber-100 text-amber-700' },
  unapproved: { label: 'Not Approved', color: 'bg-red-100 text-red-700' },
  blocked: { label: 'Blocked', color: 'bg-red-200 text-red-900' },
}

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  pending_agreement: { label: 'Pending Agreement', color: 'bg-amber-100 text-amber-700' },
  pending_review: { label: 'Pending Review', color: 'bg-blue-100 text-blue-700' },
  on_hold: { label: 'On Hold', color: 'bg-orange-100 text-orange-800' },
  sandbox_approved: { label: 'Sandbox Approved', color: 'bg-emerald-100 text-emerald-700' },
  sandbox_denied: { label: 'Sandbox Denied', color: 'bg-red-100 text-red-700' },
  pending_production_review: { label: 'Production Review', color: 'bg-purple-100 text-purple-700' },
  production_approved: { label: 'Production Approved', color: 'bg-emerald-100 text-emerald-800' },
  production_denied: { label: 'Production Denied', color: 'bg-red-100 text-red-800' },
  revoked: { label: 'Revoked', color: 'bg-gray-200 text-gray-600' },
}

export const USE_CASE_LABELS: Record<string, string> = {
  sync_customer_data: 'Sync Customer Data',
  automate_scheduling: 'Automate Scheduling',
  financial_reporting: 'Financial Reporting',
  payment_processing: 'Payment Processing',
  fleet_tracking: 'Fleet Tracking',
  marketing_automation: 'Marketing Automation',
  hr_integration: 'HR Integration',
  custom_reporting: 'Custom Reporting',
  mobile_app: 'Mobile App Integration',
  other: 'Other',
}

export const STAGE_LABELS: Record<string, string> = {
  initial_review: 'Initial Review',
  competitive_review: 'Competitive Review',
  security_review: 'Security Review',
  legal_review: 'Legal Review',
  sandbox_approval: 'Sandbox Approval',
  production_approval: 'Production Approval',
}

export const STAGE_REVIEWER_ROLES: Record<string, { role: string; team: string }> = {
  initial_review: { role: 'CSM', team: 'Customer Success' },
  competitive_review: { role: 'Partnerships Lead', team: 'Partnerships' },
  security_review: { role: 'Security Analyst', team: 'InfoSec' },
  legal_review: { role: 'Legal Counsel', team: 'Legal' },
  sandbox_approval: { role: 'API Engineer', team: 'API Team' },
  production_approval: { role: 'API Team Lead', team: 'API Team' },
}

export const DATA_CATEGORY_LABELS: Record<string, string> = {
  customers: 'Customers',
  appointments: 'Appointments',
  invoices: 'Invoices',
  payments: 'Payments',
  employees: 'Employees',
  routes: 'Routes',
  inventory: 'Inventory',
  service_history: 'Service History',
  estimates: 'Estimates',
  documents: 'Documents',
}

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  new_access: 'New Access',
  migration: 'Migration',
  expand_access: 'Expand Access',
}

export const LEGACY_METHOD_LABELS: Record<string, string> = {
  sap_bi: 'SAP BI',
  vpn: 'VPN Direct Access',
  sftp: 'SFTP',
  createam: 'CreaTEAM',
  insights: 'Insights',
  query_scheduler: 'Query Scheduler',
}

export const GATEWAY_LABELS: Record<string, string> = {
  apigee: 'Google Apigee',
  concourse: 'Concourse (Azure APIM)',
  manual: 'Manual Configuration',
}

export const VOLUME_TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 — 100K calls/mo',
  2: 'Tier 2 — 500K calls/mo',
  3: 'Tier 3 — 2M calls/mo',
  4: 'Tier 4 — 5M calls/mo',
  5: 'Tier 5 — 10M calls/mo',
  6: 'Tier 6 — 50M calls/mo',
  7: 'Tier 7 — 100M calls/mo',
}

export const API_CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  standard: { label: 'Standard', color: 'bg-blue-100 text-blue-700' },
  premium: { label: 'Premium', color: 'bg-purple-100 text-purple-700' },
}

export const SUPPORT_PACKAGE_LABELS: Record<string, { label: string; description: string; hours: string; price: string }> = {
  standard: { label: 'Standard Onboarding', description: 'Basic integration support and documentation access', hours: '10 hrs', price: '$5,000' },
  premium: { label: 'Premium Onboarding', description: 'Dedicated integration engineer, sandbox validation, and go-live support', hours: '25 hrs', price: '$12,500' },
  enterprise: { label: 'Enterprise', description: 'Custom engagement with dedicated team, architecture review, and ongoing support', hours: 'Custom', price: 'Custom' },
  none: { label: 'Self-Service', description: 'No professional services — customer manages integration independently', hours: '0 hrs', price: '$0' },
}

export const API_SUB_CATEGORY_LABELS: Record<string, string> = {
  employee_information: 'Employee Information',
  jobs_work_orders: 'Jobs & Work Orders',
  general: 'General',
  payroll_information: 'Payroll Information',
  financials: 'Financials',
  schedules: 'Schedules',
  timekeeping_calculations: 'Timekeeping & Calculations',
}

// ── Password gate ───────────────────────────────────────────────

const PASS_HASH = '8750271a5c68aabcc93e9bd8cc742b205914e1b0d1ba49049d49d9a0950364ae'

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('ww_authed') === '1')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChecking(true)
    setError(false)
    const hash = await sha256(password)
    if (hash === PASS_HASH) {
      sessionStorage.setItem('ww_authed', '1')
      setAuthed(true)
    } else {
      setError(true)
      setPassword('')
    }
    setChecking(false)
  }

  if (authed) return <>{children}</>

  return (
    <div className="min-h-screen bg-ww-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg border border-ww-gray-200 shadow-sm px-6 py-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-10 h-10 rounded-full bg-ww-navy flex items-center justify-center mb-3">
              <Shield size={18} className="text-ww-teal" />
            </div>
            <h1 className="font-display font-bold text-lg text-ww-navy">WorkWave API Portal</h1>
            <p className="text-xs text-ww-gray-400 font-mono mt-0.5">Internal access only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ww-gray-400" />
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(false) }}
                placeholder="Enter password"
                autoFocus
                className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-ww-primary/30 focus:border-ww-primary outline-none ${
                  error ? 'border-red-300 bg-red-50' : 'border-ww-gray-200'
                }`}
              />
            </div>
            {error && (
              <p className="text-xs text-red-600">Incorrect password</p>
            )}
            <button
              type="submit"
              disabled={!password || checking}
              className="w-full py-2.5 rounded-lg bg-ww-navy text-white text-sm font-medium hover:bg-ww-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {checking ? 'Checking...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── App ─────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [viewMode, setViewMode] = useState<ViewMode>(store.getViewMode())
  const [refreshKey, setRefreshKey] = useState(0)
  const [personaOpen, setPersonaOpen] = useState(false)

  // WAIve toggle: ?waive=off in URL disables it, ?waive=on re-enables
  const [waiveEnabled] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const p = params.get('waive')
    if (p === 'off') return false
    if (p === 'on') return true
    return true
  })

  // Persona / active user state
  const [activeUser, setActiveUser] = useState<CustomerUser | undefined>(() => {
    const existing = store.getActiveUser()
    if (existing) return existing
    const users = store.getCustomerUsers()
    const firstAdmin = users.find(u => u.canRequestApi)
    if (firstAdmin) {
      store.setActiveUserId(firstAdmin.id)
      return firstAdmin
    }
    return undefined
  })

  const allUsers = store.getCustomerUsers().filter(u => u.canRequestApi)

  const switchUser = (user: CustomerUser) => {
    store.setActiveUserId(user.id)
    setActiveUser(user)
    setPersonaOpen(false)
    setRefreshKey(k => k + 1)
  }

  const activeCustomer = activeUser ? store.getCustomer(activeUser.customerId) : undefined

  const toggleViewMode = () => {
    const next: ViewMode = viewMode === 'customer' ? 'reviewer' : 'customer'
    store.setViewMode(next)
    setViewMode(next)
    if (next === 'reviewer') {
      navigate('/reviewer')
    } else {
      navigate('/')
    }
  }

  const handleReset = () => {
    store.reset()
    window.location.reload()
  }

  const refresh = () => setRefreshKey(k => k + 1)

  // Customer nav items
  const customerNav = [
    { path: '/', label: 'Partners', icon: Globe },
    { path: '/my-integrations', label: 'My Integrations', icon: Layers },
    { path: '/check-status', label: 'Check Status', icon: Search },
  ]

  // Reviewer nav items
  const reviewerNav = [
    { path: '/reviewer', label: 'Requests', icon: ClipboardList },
    { path: '/reviewer/partners', label: 'Partners', icon: Globe },
    { path: '/reviewer/risk-profiles', label: 'Risk Profiles', icon: ShieldAlert },
    { path: '/reviewer/applications', label: 'Applications', icon: FileText },
    { path: '/reviewer/usage-intelligence', label: 'Usage Intelligence', icon: Radar },
    { path: '/reviewer/api-catalog', label: 'API Catalog', icon: BookOpen },
  ]

  const navItems = viewMode === 'customer' ? customerNav : reviewerNav

  return (
    <AuthGate>
    <div className="min-h-screen flex flex-col">
      {/* ── Nav bar — tight, structural ── */}
      <header className="bg-ww-navy text-white sticky top-0 z-50 border-b border-white/5">
        <div className="w-full max-w-[1200px] mx-auto px-8">
          <div className="flex items-center justify-between h-12">
            {/* Logo */}
            <button onClick={() => navigate(viewMode === 'reviewer' ? '/reviewer' : '/')} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Shield size={16} className="text-ww-teal" />
              <span className="font-display font-bold text-[13px] tracking-tight">WORKWAVE</span>
              <span className="text-white/40 text-[13px] font-mono">/ api</span>
            </button>

            {/* Nav links */}
            <nav className="hidden sm:flex items-center gap-0.5">
              {navItems.map(item => {
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-white/12 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/8'
                    }`}
                  >
                    <item.icon size={13} />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Persona picker — customer mode only */}
              {viewMode === 'customer' && activeUser && (
                <div className="relative">
                  <button
                    onClick={() => setPersonaOpen(!personaOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] transition-colors bg-white/8 hover:bg-white/15 text-white/70 hover:text-white"
                  >
                    <User size={11} />
                    <span className="font-medium max-w-[140px] truncate">{activeUser.name}</span>
                    <span className="text-white/40 font-mono hidden md:inline">({activeCustomer?.name?.split(' ')[0]})</span>
                    <ChevronDown size={10} className="text-white/40" />
                  </button>
                  {personaOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setPersonaOpen(false)} />
                      <div className="absolute z-50 top-full mt-1 right-0 w-72 bg-white border border-ww-gray-200 rounded-md shadow-lg py-1">
                        <p className="px-3 py-1.5 text-[10px] font-mono text-ww-gray-400 uppercase tracking-wider">Switch Persona</p>
                        {allUsers.map(u => {
                          const cust = store.getCustomer(u.customerId)
                          const isActive = u.id === activeUser.id
                          return (
                            <button
                              key={u.id}
                              onClick={() => switchUser(u)}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-ww-gray-50 transition-colors ${
                                isActive ? 'bg-ww-sky' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className={`font-medium ${isActive ? 'text-ww-navy' : 'text-ww-gray-900'}`}>{u.name}</p>
                                  <p className="text-[11px] text-ww-gray-500">{cust?.name} &middot; {u.role}</p>
                                </div>
                                {isActive && (
                                  <span className="text-[10px] font-semibold text-ww-navy bg-ww-sky px-1.5 py-0.5 rounded">Active</span>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={toggleViewMode}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider transition-colors bg-white/8 hover:bg-white/15 text-white/70 hover:text-white"
              >
                {viewMode === 'customer' ? <Eye size={11} /> : <Users size={11} />}
                {viewMode === 'customer' ? 'Customer' : 'Reviewer'}
              </button>

              <button
                onClick={handleReset}
                className="p-1 rounded text-white/30 hover:text-white/60 transition-colors"
                title="Reset demo data"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden border-t border-white/10 px-4 py-1.5 flex gap-0.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-[11px] font-medium transition-colors ${
                  isActive ? 'bg-white/12 text-white' : 'text-white/60'
                }`}
              >
                <item.icon size={11} />
                {item.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1" key={refreshKey}>
        <div className="w-full max-w-[1200px] mx-auto px-8">
          <Routes>
            {/* Customer routes */}
            <Route path="/" element={<CustomerPartners activeUser={activeUser} />} />
            <Route path="/request/:partnerId?" element={<RequestForm activeUser={activeUser} onSubmit={refresh} />} />
            <Route path="/confirmation/:requestId" element={<Confirmation />} />
            <Route path="/my-integrations" element={<MyIntegrations activeUser={activeUser} />} />
            <Route path="/check-status" element={<CheckStatus />} />

            {/* Reviewer routes */}
            <Route path="/reviewer" element={<ReviewerRequests />} />
            <Route path="/reviewer/request/:requestId" element={<ReviewerRequestDetail onRefresh={refresh} />} />
            <Route path="/reviewer/partners" element={<ReviewerPartners activeUser={activeUser} />} />
            <Route path="/reviewer/partner/:partnerId" element={<PartnerDetail />} />
            <Route path="/reviewer/risk-profiles" element={<DeveloperRiskProfiles />} />
            <Route path="/reviewer/applications" element={<ReviewerApplications />} />
            <Route path="/reviewer/usage-intelligence" element={<UsageIntelligence />} />
            <Route path="/reviewer/api-catalog" element={<ApiCatalog />} />
          </Routes>
        </div>
      </main>

      {/* Footer — mono treatment */}
      <footer className="border-t border-ww-gray-200 py-5 mt-auto">
        <div className="w-full max-w-[1200px] mx-auto px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-ww-gray-400">
            <Shield size={12} />
            <span className="text-[11px] font-mono uppercase tracking-[0.06em]">WorkWave API Access Portal</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-ww-gray-400">
            <span className="uppercase tracking-[0.06em]">POC</span>
            <button onClick={handleReset} className="flex items-center gap-1 hover:text-ww-gray-600 transition-colors uppercase tracking-[0.06em]">
              <RotateCcw size={10} /> Reset
            </button>
          </div>
        </div>
      </footer>
    </div>
    {waiveEnabled && <WaiveWidget viewMode={viewMode} activeUser={activeUser} />}
    </AuthGate>
  )
}
