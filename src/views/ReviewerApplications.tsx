import { useState } from 'react'
import { FileText } from 'lucide-react'
import { ViewTabs } from '@/components/ViewTabs'
import { ApplicationsDashboard } from '@/views/ApplicationsDashboard'
import { HistoricalApplications } from '@/views/HistoricalApplications'

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'detail', label: 'Detail' },
]

export function ReviewerApplications() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-md bg-ww-navy flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-ww-gray-900">Applications</h1>
          <p className="text-sm text-ww-gray-500">Analytics dashboard and historical application data</p>
        </div>
      </div>

      <div className="mb-6">
        <ViewTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {activeTab === 'dashboard' ? (
        <ApplicationsDashboard hideHeader />
      ) : (
        <HistoricalApplications hideHeader />
      )}
    </div>
  )
}
