interface ViewTab {
  key: string
  label: string
}

interface ViewTabsProps {
  tabs: ViewTab[]
  activeTab: string
  onTabChange: (key: string) => void
}

export function ViewTabs({ tabs, activeTab, onTabChange }: ViewTabsProps) {
  return (
    <div className="flex items-center gap-1 bg-ww-gray-100 rounded-lg p-1">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? 'bg-white text-ww-navy shadow-sm'
              : 'text-ww-gray-500 hover:text-ww-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
