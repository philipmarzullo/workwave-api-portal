import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { ViewTabs } from '@/components/ViewTabs'
import { AskWaive } from '@/components/AskWaive'
import { ReviewerQueue } from '@/views/ReviewerQueue'
import { ReviewerActiveAccess } from '@/views/ReviewerActiveAccess'

const TABS = [
  { key: 'pending', label: 'Pending Review' },
  { key: 'active', label: 'Active Access' },
]

export function ReviewerRequests() {
  const [activeTab, setActiveTab] = useState('pending')

  return (
    <div className="mx-auto py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-ww-navy flex items-center justify-center">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-ww-gray-900">Requests</h1>
            <p className="text-sm text-ww-gray-500">API access requests and active integrations</p>
          </div>
        </div>
        <AskWaive page="reviewer-requests" placeholder="Ask WAIve about pending requests, priorities..." />
      </div>

      <div className="mb-6">
        <ViewTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {activeTab === 'pending' ? (
        <ReviewerQueue hideHeader />
      ) : (
        <ReviewerActiveAccess hideHeader />
      )}
    </div>
  )
}
