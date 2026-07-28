import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import {
  Shield,
  ChevronDown,
  RotateCcw,
  Globe,
  ClipboardList,
  Eye,
  Users,
  Search,
} from 'lucide-react'
import { store } from '@/data/store'
import type { ViewMode, CustomerUser } from '@/data/types'
import { Directory } from '@/views/Directory'
import { RequestForm } from '@/views/RequestForm'
import { Confirmation } from '@/views/Confirmation'
import { CheckStatus } from '@/views/CheckStatus'
import { ReviewerQueue } from '@/views/ReviewerQueue'
import { ReviewerRequestDetail } from '@/views/ReviewerRequestDetail'
import { PartnerDetail } from '@/views/PartnerDetail'

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
}

export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600' },
  pending_agreement: { label: 'Pending Agreement', color: 'bg-amber-100 text-amber-700' },
  pending_review: { label: 'Pending Review', color: 'bg-blue-100 text-blue-700' },
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

// ── App ─────────────────────────────────────────────────────────

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [viewMode, setViewMode] = useState<ViewMode>(store.getViewMode())
  const [activeUser, setActiveUser] = useState<CustomerUser | undefined>(store.getActiveUser())
  const [userPickerOpen, setUserPickerOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Set default user on first load
  useEffect(() => {
    if (!activeUser) {
      const users = store.getCustomerUsers()
      const firstAdmin = users.find(u => u.canRequestApi)
      if (firstAdmin) {
        store.setActiveUserId(firstAdmin.id)
        setActiveUser(firstAdmin)
      }
    }
  }, [activeUser])

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

  const selectUser = (user: CustomerUser) => {
    store.setActiveUserId(user.id)
    setActiveUser(user)
    setUserPickerOpen(false)
    setRefreshKey(k => k + 1)
  }

  const handleReset = () => {
    store.reset()
    window.location.reload()
  }

  const refresh = () => setRefreshKey(k => k + 1)

  // Customer nav items
  const customerNav = [
    { path: '/', label: 'Partner Directory', icon: Globe },
    { path: '/check-status', label: 'Check Status', icon: Search },
  ]

  // Reviewer nav items
  const reviewerNav = [
    { path: '/reviewer', label: 'Review Queue', icon: ClipboardList },
    { path: '/reviewer/partners', label: 'Partner Directory', icon: Globe },
  ]

  const navItems = viewMode === 'customer' ? customerNav : reviewerNav

  const allUsers = store.getCustomerUsers()

  return (
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
              <button
                onClick={toggleViewMode}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider transition-colors bg-white/8 hover:bg-white/15 text-white/70 hover:text-white"
              >
                {viewMode === 'customer' ? <Eye size={11} /> : <Users size={11} />}
                {viewMode === 'customer' ? 'Customer' : 'Reviewer'}
              </button>

              {viewMode === 'customer' && activeUser && (
                <div className="relative">
                  <button
                    onClick={() => setUserPickerOpen(!userPickerOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] bg-white/8 hover:bg-white/15 transition-colors"
                  >
                    <div className="w-4 h-4 rounded bg-ww-primary flex items-center justify-center text-[9px] font-bold font-mono">
                      {activeUser.name.charAt(0)}
                    </div>
                    <span className="hidden md:inline text-white/80">{activeUser.name.split(' ')[0]}</span>
                    <ChevronDown size={10} className="text-white/40" />
                  </button>

                  {userPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserPickerOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-md border border-ww-gray-200 z-50 py-1 max-h-96 overflow-y-auto">
                        <div className="px-3 py-1.5 text-[10px] font-mono font-medium text-ww-gray-400 uppercase tracking-[0.08em]">Switch Demo User</div>
                        {allUsers.map(u => {
                          const c = store.getCustomer(u.customerId)
                          return (
                            <button
                              key={u.id}
                              onClick={() => selectUser(u)}
                              className={`w-full text-left px-3 py-2 hover:bg-ww-gray-50 transition-colors flex items-center gap-2.5 ${
                                u.id === activeUser?.id ? 'bg-ww-sky' : ''
                              }`}
                            >
                              <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold font-mono text-white ${u.canRequestApi ? 'bg-ww-primary' : 'bg-ww-gray-400'}`}>
                                {u.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-medium text-ww-gray-800 truncate">{u.name}</div>
                                <div className="text-[11px] text-ww-gray-500 truncate font-mono">{c?.name} · {u.role}</div>
                              </div>
                              {u.canRequestApi ? (
                                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-ww-teal/30 text-ww-teal font-medium shrink-0">API</span>
                              ) : (
                                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-ww-gray-200 text-ww-gray-400 font-medium shrink-0">View</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

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

      {/* Demo banner */}
      {viewMode === 'customer' && activeUser && !activeUser.canRequestApi && (
        <div className="bg-amber-50 border-b border-amber-200/60 px-4 py-2 text-center">
          <p className="text-[12px] text-amber-800">
            <strong>{activeUser.name}</strong> does not have API request permissions. Contact your administrator to request access.
          </p>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1" key={refreshKey}>
        <div className="w-full max-w-[1200px] mx-auto px-8">
          <Routes>
            {/* Customer routes */}
            <Route path="/" element={<Directory activeUser={activeUser} />} />
            <Route path="/request/:partnerId?" element={<RequestForm activeUser={activeUser} onSubmit={refresh} />} />
            <Route path="/confirmation/:requestId" element={<Confirmation />} />
            <Route path="/check-status" element={<CheckStatus />} />

            {/* Reviewer routes */}
            <Route path="/reviewer" element={<ReviewerQueue />} />
            <Route path="/reviewer/request/:requestId" element={<ReviewerRequestDetail onRefresh={refresh} />} />
            <Route path="/reviewer/partners" element={<Directory activeUser={activeUser} isReviewerView />} />
            <Route path="/reviewer/partner/:partnerId" element={<PartnerDetail />} />
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
  )
}
