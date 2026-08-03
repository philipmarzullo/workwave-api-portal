import { useState } from 'react'
import { Globe } from 'lucide-react'
import { ViewTabs } from '@/components/ViewTabs'
import { AskWaive } from '@/components/AskWaive'
import { Directory } from '@/views/Directory'
import { TrustedIntegrators } from '@/views/TrustedIntegrators'
import type { CustomerUser } from '@/data/types'

const TABS = [
  { key: 'directory', label: 'Integration Partners' },
  { key: 'integrators', label: 'Trusted Integrators' },
]

export function CustomerPartners({ activeUser }: { activeUser?: CustomerUser }) {
  const [activeTab, setActiveTab] = useState('directory')

  return (
    <div className="py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-ww-navy flex items-center justify-center">
            <Globe size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-ww-gray-900">Partners</h1>
            <p className="text-sm text-ww-gray-500">Integration partners and trusted integrators</p>
          </div>
        </div>
        <AskWaive page="customer-partners" placeholder="Ask WAIve about partners, integrations..." />
      </div>

      <div className="mb-6">
        <ViewTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {activeTab === 'directory' ? (
        <Directory activeUser={activeUser} hideHeader />
      ) : (
        <TrustedIntegrators hideHeader />
      )}
    </div>
  )
}
