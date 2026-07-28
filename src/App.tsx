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
} from 'lucide-react'
import { store } from '@/data/store'
import type { ViewMode, CustomerUser } from '@/data/types'
import { Directory } from '@/views/Directory'
import { RequestForm } from '@/views/RequestForm'
import { MyRequests } from '@/views/MyRequests'
import { RequestDetail } from '@/views/RequestDetail'
import { ReviewerQueue } from '@/views/ReviewerQueue'
import { ReviewerRequestDetail } from '@/views/ReviewerRequestDetail'
import { PartnerDetail } from '@/views/PartnerDetail'

// ── Product labels ──────────────────────────────────────────────

export const PRODUCT_LABELS: Record<string, string> = {
  winteam: 'WinTeam',
  pestpac: 'PestPac',
  realgreen: 'RealGreen',
  service_ceo: 'ServiceCEO',
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
    { path: '/my-requests', label: 'My Requests', icon: ClipboardList },
  ]

  // Reviewer nav items
  const reviewerNav = [
    { path: '/reviewer', label: 'Review Queue', icon: ClipboardList },
    { path: '/reviewer/partners', label: 'Partner Directory', icon: Globe },
  ]

  const navItems = viewMode === 'customer' ? customerNav : reviewerNav

  const customer = activeUser ? store.getCustomer(activeUser.customerId) : undefined
  const allUsers = store.getCustomerUsers()

  return (
    <div className="min-h-screen flex flex-col">
      {/* WorkWave-style header */}
      <header className="bg-ww-navy text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + title */}
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(viewMode === 'reviewer' ? '/reviewer' : '/')} className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <span className="font-display font-semibold text-sm tracking-wide">WorkWave</span>
                  <span className="text-white/60 text-sm font-light ml-1.5">API Access</span>
                </div>
              </button>
            </div>

            {/* Navigation */}
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map(item => {
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <item.icon size={14} />
                    {item.label}
                  </button>
                )
              })}
            </nav>

            {/* Right side controls */}
            <div className="flex items-center gap-3">
              {/* View mode toggle */}
              <button
                onClick={toggleViewMode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-white/10 hover:bg-white/20 text-white"
              >
                {viewMode === 'customer' ? <Eye size={12} /> : <Users size={12} />}
                {viewMode === 'customer' ? 'Customer View' : 'Reviewer View'}
              </button>

              {/* User picker (customer mode only) */}
              {viewMode === 'customer' && activeUser && (
                <div className="relative">
                  <button
                    onClick={() => setUserPickerOpen(!userPickerOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-ww-blue flex items-center justify-center text-[10px] font-bold">
                      {activeUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="text-left hidden md:block">
                      <div className="font-medium text-white">{activeUser.name}</div>
                      <div className="text-white/50 text-[10px]">{customer?.name}</div>
                    </div>
                    <ChevronDown size={12} className="text-white/50" />
                  </button>

                  {userPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserPickerOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl shadow-xl border border-ww-gray-200 z-50 py-2 max-h-96 overflow-y-auto">
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-ww-gray-400 uppercase tracking-wider">Switch Demo User</div>
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
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${u.canRequestApi ? 'bg-ww-blue' : 'bg-ww-gray-400'}`}>
                                {u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-ww-gray-800 truncate">{u.name}</div>
                                <div className="text-[10px] text-ww-gray-500 truncate">{c?.name} · {u.role}</div>
                              </div>
                              {u.canRequestApi ? (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium shrink-0">Can Request</span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-ww-gray-100 text-ww-gray-500 font-medium shrink-0">View Only</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Reset */}
              <button
                onClick={handleReset}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="Reset demo data"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden border-t border-white/10 px-4 py-2 flex gap-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/70'
                }`}
              >
                <item.icon size={12} />
                {item.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Demo banner */}
      {viewMode === 'customer' && activeUser && !activeUser.canRequestApi && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center">
          <p className="text-xs text-amber-800">
            <strong>{activeUser.name}</strong> does not have API request permissions. Contact your administrator to request access.
          </p>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1" key={refreshKey}>
        <Routes>
          {/* Customer routes */}
          <Route path="/" element={<Directory activeUser={activeUser} />} />
          <Route path="/request/:partnerId?" element={<RequestForm activeUser={activeUser} onSubmit={refresh} />} />
          <Route path="/my-requests" element={<MyRequests activeUser={activeUser} onRefresh={refresh} />} />
          <Route path="/my-requests/:requestId" element={<RequestDetail onRefresh={refresh} />} />

          {/* Reviewer routes */}
          <Route path="/reviewer" element={<ReviewerQueue />} />
          <Route path="/reviewer/request/:requestId" element={<ReviewerRequestDetail onRefresh={refresh} />} />
          <Route path="/reviewer/partners" element={<Directory activeUser={activeUser} isReviewerView />} />
          <Route path="/reviewer/partner/:partnerId" element={<PartnerDetail />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-ww-navy text-white/50 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={14} />
            <span className="text-xs font-display">WorkWave API Access Portal</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span>POC Demo</span>
            <button onClick={handleReset} className="flex items-center gap-1 hover:text-white/70 transition-colors">
              <RotateCcw size={10} /> Reset Data
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
