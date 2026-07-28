import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Lock,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Building2,
  Settings2,
  ClipboardCheck,
  Send,
  Globe,
  Mail,
  AlertTriangle,
  ExternalLink,
  Info,
} from 'lucide-react'
import type {
  CustomerUser,
  WorkWaveProduct,
  BuilderType,
  UseCase,
  DataCategory,
  Environment,
} from '@/data/types'
import { store } from '@/data/store'
import {
  PRODUCT_LABELS,
  TIER_LABELS,
  USE_CASE_LABELS,
  DATA_CATEGORY_LABELS,
} from '@/App'

interface RequestFormProps {
  activeUser?: CustomerUser
  onSubmit: () => void
}

const BUILDER_TYPE_LABELS: Record<BuilderType, string> = {
  partner: 'Partner',
  internal_team: 'Internal Team',
  contractor: 'Contractor',
}

const ALL_USE_CASES: UseCase[] = [
  'sync_customer_data',
  'automate_scheduling',
  'financial_reporting',
  'payment_processing',
  'fleet_tracking',
  'marketing_automation',
  'hr_integration',
  'custom_reporting',
  'mobile_app',
  'other',
]

const ALL_DATA_CATEGORIES: DataCategory[] = [
  'customers',
  'appointments',
  'invoices',
  'payments',
  'employees',
  'routes',
  'inventory',
  'service_history',
  'estimates',
  'documents',
]

const ALL_BUILDER_TYPES: BuilderType[] = ['partner', 'internal_team', 'contractor']

const STEPS = [
  { label: 'Partner & Product', icon: Building2 },
  { label: 'Integration Details', icon: Settings2 },
  { label: 'Environment & Review', icon: ClipboardCheck },
]

export function RequestForm({ activeUser, onSubmit }: RequestFormProps) {
  const navigate = useNavigate()
  const { partnerId } = useParams<{ partnerId?: string }>()

  const partner = partnerId ? store.getPartner(partnerId) : undefined
  const customer = activeUser ? store.getCustomer(activeUser.customerId) : undefined
  const customerProducts = customer?.products ?? []

  // Step state
  const [currentStep, setCurrentStep] = useState(0)

  // Step 1: Partner & Product
  const [partnerName, setPartnerName] = useState('')
  const [partnerWebsite, setPartnerWebsite] = useState('')
  const [partnerContact, setPartnerContact] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<WorkWaveProduct | ''>('')
  const [builderType, setBuilderType] = useState<BuilderType | ''>('')

  // Step 2: Integration Details
  const [connectingSystem, setConnectingSystem] = useState('')
  const [useCase, setUseCase] = useState<UseCase | ''>('')
  const [useCaseDetail, setUseCaseDetail] = useState('')
  const [dataRead, setDataRead] = useState<DataCategory[]>([])
  const [dataWrite, setDataWrite] = useState<DataCategory[]>([])
  const [dataLeavesEnvironment, setDataLeavesEnvironment] = useState<boolean | null>(null)

  // Step 3: Environment & Review
  const [environment, setEnvironment] = useState<Environment | ''>('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Locked state ──────────────────────────────────────────────
  if (!activeUser || !activeUser.canRequestApi) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl border border-ww-gray-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-ww-gray-100 flex items-center justify-center mx-auto mb-6">
            <Lock size={28} className="text-ww-gray-400" />
          </div>
          <h2 className="font-display text-xl font-semibold text-ww-gray-800 mb-3">
            API Access Request Unavailable
          </h2>
          <p className="text-sm text-ww-gray-500 max-w-md mx-auto leading-relaxed">
            Contact your admin to request API access permissions. Your current account does
            not have the required role to submit API access requests.
          </p>
        </div>
      </div>
    )
  }

  // ── Validation per step ───────────────────────────────────────

  function isStep1Valid(): boolean {
    if (!partner) {
      if (!partnerName.trim() || !partnerWebsite.trim() || !partnerContact.trim()) return false
    }
    if (!selectedProduct || !builderType) return false
    return true
  }

  function isStep2Valid(): boolean {
    if (!connectingSystem.trim()) return false
    if (!useCase) return false
    if (!useCaseDetail.trim()) return false
    if (dataRead.length === 0 && dataWrite.length === 0) return false
    if (dataLeavesEnvironment === null) return false
    return true
  }

  function isStep3Valid(): boolean {
    if (!environment) return false
    if (!termsAccepted) return false
    return true
  }

  function canProceed(): boolean {
    if (currentStep === 0) return isStep1Valid()
    if (currentStep === 1) return isStep2Valid()
    if (currentStep === 2) return isStep3Valid()
    return false
  }

  // ── Checkbox toggle helpers ───────────────────────────────────

  function toggleDataRead(cat: DataCategory) {
    setDataRead(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  function toggleDataWrite(cat: DataCategory) {
    setDataWrite(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  // ── Submit ────────────────────────────────────────────────────

  function handleSubmit() {
    if (!activeUser || !canProceed() || isSubmitting) return
    setIsSubmitting(true)

    try {
      const newRequest = store.createRequest({
        customerId: activeUser.customerId,
        requestedBy: activeUser.id,
        partnerId: partner?.id ?? null,
        partnerNameFreetext: partner ? null : partnerName.trim(),
        partnerWebsite: partner ? null : partnerWebsite.trim(),
        partnerContact: partner ? null : partnerContact.trim(),
        product: selectedProduct as WorkWaveProduct,
        builderType: builderType as BuilderType,
        connectingSystem: connectingSystem.trim(),
        useCase: useCase as UseCase,
        useCaseDetail: useCaseDetail.trim(),
        dataRead,
        dataWrite,
        dataLeavesEnvironment: dataLeavesEnvironment as boolean,
        environment: environment as Environment,
      })

      store.signAgreement(newRequest.id)
      navigate(`/my-requests/${newRequest.id}`)
      onSubmit()
    } catch {
      setIsSubmitting(false)
    }
  }

  // ── Step indicator ────────────────────────────────────────────

  function renderStepIndicator() {
    return (
      <div className="flex items-center justify-center gap-0 mb-10">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep
          const isComplete = idx < currentStep
          const StepIcon = step.icon

          return (
            <div key={idx} className="flex items-center">
              {idx > 0 && (
                <div
                  className={`w-12 sm:w-20 h-0.5 ${
                    isComplete ? 'bg-ww-navy' : 'bg-ww-gray-200'
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-ww-navy text-white'
                      : isComplete
                        ? 'bg-ww-navy text-white'
                        : 'bg-ww-gray-100 text-ww-gray-400'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <StepIcon size={18} />
                  )}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isActive
                      ? 'text-ww-navy'
                      : isComplete
                        ? 'text-ww-navy'
                        : 'text-ww-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Step 1: Partner & Product ─────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-8">
        {/* Partner info */}
        {partner ? (
          <div>
            <label className="block text-sm font-semibold text-ww-gray-700 mb-3">
              Integration Partner
            </label>
            <div className="bg-ww-gray-50 rounded-xl border border-ww-gray-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border border-ww-gray-200 flex items-center justify-center text-2xl shrink-0">
                  {partner.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="font-display font-semibold text-ww-gray-800">
                      {partner.name}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        TIER_LABELS[partner.tier]?.color ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {TIER_LABELS[partner.tier]?.label ?? partner.tier}
                    </span>
                  </div>
                  <p className="text-sm text-ww-gray-500 leading-relaxed">
                    {partner.description}
                  </p>
                  {partner.website && (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-ww-blue hover:underline mt-2"
                    >
                      <ExternalLink size={11} />
                      {partner.website}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-ww-amber" />
              <span className="text-sm font-medium text-ww-gray-700">
                Unlisted Partner Request
              </span>
            </div>
            <p className="text-xs text-ww-gray-500 mb-5 leading-relaxed">
              You are requesting API access for a partner not currently listed in our
              directory. Please provide their details below. Note that unlisted partner
              requests may take longer to review.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                  Partner Name <span className="text-ww-red">*</span>
                </label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={e => setPartnerName(e.target.value)}
                  placeholder="e.g. Acme Software Inc."
                  className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-blue focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Globe size={14} />
                    Partner Website <span className="text-ww-red">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={partnerWebsite}
                  onChange={e => setPartnerWebsite(e.target.value)}
                  placeholder="https://www.example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-blue focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} />
                    Partner Contact Email <span className="text-ww-red">*</span>
                  </span>
                </label>
                <input
                  type="email"
                  value={partnerContact}
                  onChange={e => setPartnerContact(e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-blue focus:border-transparent transition-shadow"
                />
              </div>
            </div>
          </div>
        )}

        {/* Product selector */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-3">
            WorkWave Product <span className="text-ww-red">*</span>
          </label>
          <p className="text-xs text-ww-gray-500 mb-3">
            Select the WorkWave product you want to integrate with.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customerProducts.map(product => (
              <label
                key={product}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedProduct === product
                    ? 'border-ww-navy bg-ww-sky'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="product"
                  value={product}
                  checked={selectedProduct === product}
                  onChange={() => setSelectedProduct(product)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedProduct === product
                      ? 'border-ww-navy'
                      : 'border-ww-gray-300'
                  }`}
                >
                  {selectedProduct === product && (
                    <div className="w-2 h-2 rounded-full bg-ww-navy" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    selectedProduct === product ? 'text-ww-navy' : 'text-ww-gray-700'
                  }`}
                >
                  {PRODUCT_LABELS[product] ?? product}
                </span>
              </label>
            ))}
          </div>
          {customerProducts.length === 0 && (
            <p className="text-xs text-ww-gray-400 italic mt-2">
              No products found for your account.
            </p>
          )}
        </div>

        {/* Builder type */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-3">
            Who is building this integration? <span className="text-ww-red">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ALL_BUILDER_TYPES.map(bt => (
              <label
                key={bt}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  builderType === bt
                    ? 'border-ww-navy bg-ww-sky'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="builderType"
                  value={bt}
                  checked={builderType === bt}
                  onChange={() => setBuilderType(bt)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    builderType === bt ? 'border-ww-navy' : 'border-ww-gray-300'
                  }`}
                >
                  {builderType === bt && (
                    <div className="w-2 h-2 rounded-full bg-ww-navy" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    builderType === bt ? 'text-ww-navy' : 'text-ww-gray-700'
                  }`}
                >
                  {BUILDER_TYPE_LABELS[bt]}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 2: Integration Details ───────────────────────────────

  function renderStep2() {
    return (
      <div className="space-y-8">
        {/* Connecting system */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-1.5">
            What system are you connecting WorkWave to? <span className="text-ww-red">*</span>
          </label>
          <p className="text-xs text-ww-gray-500 mb-3">
            Name of the external system, application, or platform.
          </p>
          <input
            type="text"
            value={connectingSystem}
            onChange={e => setConnectingSystem(e.target.value)}
            placeholder="e.g. Salesforce, QuickBooks, Custom CRM"
            className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-blue focus:border-transparent transition-shadow"
          />
        </div>

        {/* Use case */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-3">
            Primary Use Case <span className="text-ww-red">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ALL_USE_CASES.map(uc => (
              <label
                key={uc}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                  useCase === uc
                    ? 'border-ww-navy bg-ww-sky'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="useCase"
                  value={uc}
                  checked={useCase === uc}
                  onChange={() => setUseCase(uc)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    useCase === uc ? 'border-ww-navy' : 'border-ww-gray-300'
                  }`}
                >
                  {useCase === uc && (
                    <div className="w-2 h-2 rounded-full bg-ww-navy" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    useCase === uc ? 'text-ww-navy' : 'text-ww-gray-700'
                  }`}
                >
                  {USE_CASE_LABELS[uc] ?? uc}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Use case detail */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-1.5">
            Describe your integration use case <span className="text-ww-red">*</span>
          </label>
          <p className="text-xs text-ww-gray-500 mb-3">
            Please provide 2-3 sentences about what you are building and why.
          </p>
          <textarea
            value={useCaseDetail}
            onChange={e => setUseCaseDetail(e.target.value)}
            placeholder="Describe how you plan to use the API, what data flows you need, and the business problem you are solving..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-blue focus:border-transparent transition-shadow resize-none"
          />
        </div>

        {/* Data to READ */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-1.5">
            Data to READ <span className="text-ww-red">*</span>
          </label>
          <p className="text-xs text-ww-gray-500 mb-3">
            Select all data categories this integration will need to read from WorkWave.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ALL_DATA_CATEGORIES.map(cat => (
              <label
                key={`read-${cat}`}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-all ${
                  dataRead.includes(cat)
                    ? 'border-ww-navy bg-ww-sky'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dataRead.includes(cat)}
                  onChange={() => toggleDataRead(cat)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    dataRead.includes(cat)
                      ? 'bg-ww-navy border-ww-navy'
                      : 'border-ww-gray-300 bg-white'
                  }`}
                >
                  {dataRead.includes(cat) && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    dataRead.includes(cat) ? 'text-ww-navy font-medium' : 'text-ww-gray-700'
                  }`}
                >
                  {DATA_CATEGORY_LABELS[cat] ?? cat}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Data to WRITE */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-1.5">
            Data to WRITE
          </label>
          <p className="text-xs text-ww-gray-500 mb-3">
            Select all data categories this integration will need to write or update in WorkWave.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ALL_DATA_CATEGORIES.map(cat => (
              <label
                key={`write-${cat}`}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-all ${
                  dataWrite.includes(cat)
                    ? 'border-ww-navy bg-ww-sky'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dataWrite.includes(cat)}
                  onChange={() => toggleDataWrite(cat)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    dataWrite.includes(cat)
                      ? 'bg-ww-navy border-ww-navy'
                      : 'border-ww-gray-300 bg-white'
                  }`}
                >
                  {dataWrite.includes(cat) && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    dataWrite.includes(cat) ? 'text-ww-navy font-medium' : 'text-ww-gray-700'
                  }`}
                >
                  {DATA_CATEGORY_LABELS[cat] ?? cat}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Data leaves environment */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-1.5">
            Will data leave your environment or be stored by a third party? <span className="text-ww-red">*</span>
          </label>
          <p className="text-xs text-ww-gray-500 mb-3">
            This includes any scenario where WorkWave data is sent to or stored on external servers.
          </p>
          <div className="flex gap-3">
            {[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
            ].map(opt => (
              <label
                key={String(opt.value)}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                  dataLeavesEnvironment === opt.value
                    ? 'border-ww-navy bg-ww-sky'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="dataLeavesEnvironment"
                  checked={dataLeavesEnvironment === opt.value}
                  onChange={() => setDataLeavesEnvironment(opt.value)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    dataLeavesEnvironment === opt.value
                      ? 'border-ww-navy'
                      : 'border-ww-gray-300'
                  }`}
                >
                  {dataLeavesEnvironment === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-ww-navy" />
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    dataLeavesEnvironment === opt.value
                      ? 'text-ww-navy'
                      : 'text-ww-gray-700'
                  }`}
                >
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Step 3: Environment & Review ──────────────────────────────

  function renderStep3() {
    return (
      <div className="space-y-8">
        {/* Environment */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-1.5">
            Target Environment <span className="text-ww-red">*</span>
          </label>
          <div className="flex items-start gap-2 mb-4">
            <Info size={14} className="text-ww-blue mt-0.5 shrink-0" />
            <p className="text-xs text-ww-gray-500 leading-relaxed">
              Sandbox approval is required before production access can be granted. We
              recommend starting with Sandbox to validate your integration.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                value: 'sandbox' as Environment,
                label: 'Sandbox',
                desc: 'Test environment with sample data',
              },
              {
                value: 'production' as Environment,
                label: 'Production',
                desc: 'Live environment with real data',
              },
            ].map(env => (
              <label
                key={env.value}
                className={`relative flex flex-col gap-1 px-5 py-4 rounded-xl border-2 cursor-pointer transition-all ${
                  environment === env.value
                    ? 'border-ww-navy bg-ww-sky'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="environment"
                  value={env.value}
                  checked={environment === env.value}
                  onChange={() => setEnvironment(env.value)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      environment === env.value
                        ? 'border-ww-navy'
                        : 'border-ww-gray-300'
                    }`}
                  >
                    {environment === env.value && (
                      <div className="w-2 h-2 rounded-full bg-ww-navy" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      environment === env.value ? 'text-ww-navy' : 'text-ww-gray-700'
                    }`}
                  >
                    {env.label}
                  </span>
                </div>
                <p className="text-xs text-ww-gray-500 ml-7">{env.desc}</p>
              </label>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-3">
            Request Summary
          </label>
          <div className="bg-ww-gray-50 rounded-xl border border-ww-gray-200 divide-y divide-ww-gray-200">
            {/* Partner */}
            <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0">
                Partner
              </span>
              <span className="text-sm text-ww-gray-800 font-medium">
                {partner ? partner.name : partnerName || '--'}
              </span>
            </div>
            {!partner && (
              <>
                <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0">
                    Partner Website
                  </span>
                  <span className="text-sm text-ww-gray-800">
                    {partnerWebsite || '--'}
                  </span>
                </div>
                <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0">
                    Partner Contact
                  </span>
                  <span className="text-sm text-ww-gray-800">
                    {partnerContact || '--'}
                  </span>
                </div>
              </>
            )}
            <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0">
                Product
              </span>
              <span className="text-sm text-ww-gray-800 font-medium">
                {selectedProduct ? (PRODUCT_LABELS[selectedProduct] ?? selectedProduct) : '--'}
              </span>
            </div>
            <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0">
                Builder Type
              </span>
              <span className="text-sm text-ww-gray-800">
                {builderType ? BUILDER_TYPE_LABELS[builderType] : '--'}
              </span>
            </div>
            <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0">
                Connecting System
              </span>
              <span className="text-sm text-ww-gray-800">
                {connectingSystem || '--'}
              </span>
            </div>
            <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0">
                Use Case
              </span>
              <span className="text-sm text-ww-gray-800">
                {useCase ? (USE_CASE_LABELS[useCase] ?? useCase) : '--'}
              </span>
            </div>
            <div className="px-5 py-3.5 flex flex-col sm:flex-row gap-1 sm:gap-4">
              <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0 sm:pt-0.5">
                Use Case Details
              </span>
              <span className="text-sm text-ww-gray-800 leading-relaxed">
                {useCaseDetail || '--'}
              </span>
            </div>
            <div className="px-5 py-3.5 flex flex-col sm:flex-row gap-1 sm:gap-4">
              <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0 sm:pt-0.5">
                Data to Read
              </span>
              <div className="flex flex-wrap gap-1.5">
                {dataRead.length > 0
                  ? dataRead.map(cat => (
                      <span
                        key={cat}
                        className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium"
                      >
                        {DATA_CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    ))
                  : <span className="text-sm text-ww-gray-400">None selected</span>}
              </div>
            </div>
            <div className="px-5 py-3.5 flex flex-col sm:flex-row gap-1 sm:gap-4">
              <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0 sm:pt-0.5">
                Data to Write
              </span>
              <div className="flex flex-wrap gap-1.5">
                {dataWrite.length > 0
                  ? dataWrite.map(cat => (
                      <span
                        key={cat}
                        className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium"
                      >
                        {DATA_CATEGORY_LABELS[cat] ?? cat}
                      </span>
                    ))
                  : <span className="text-sm text-ww-gray-400">None selected</span>}
              </div>
            </div>
            <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0">
                Data Leaves Environment
              </span>
              <span className="text-sm text-ww-gray-800">
                {dataLeavesEnvironment === true
                  ? 'Yes'
                  : dataLeavesEnvironment === false
                    ? 'No'
                    : '--'}
              </span>
            </div>
            <div className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <span className="text-xs font-medium text-ww-gray-500 sm:w-40 shrink-0">
                Environment
              </span>
              <span className="text-sm text-ww-gray-800 font-medium">
                {environment === 'sandbox'
                  ? 'Sandbox'
                  : environment === 'production'
                    ? 'Production'
                    : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Terms acceptance */}
        <div className="bg-ww-gray-50 rounded-xl border border-ww-gray-200 p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                termsAccepted
                  ? 'bg-ww-navy border-ww-navy'
                  : 'border-ww-gray-300 bg-white'
              }`}
            >
              {termsAccepted && (
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none" className="text-white">
                  <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-sm text-ww-gray-700 leading-relaxed">
              I acknowledge that API access is subject to WorkWave's API Terms of Service.
              Access granted through this portal is void if used with an unapproved
              integration partner.
            </span>
          </label>
        </div>
      </div>
    )
  }

  // ── Navigation buttons ────────────────────────────────────────

  function renderNavButtons() {
    const isLastStep = currentStep === STEPS.length - 1

    return (
      <div className="flex items-center justify-between pt-8 border-t border-ww-gray-200 mt-8">
        {currentStep > 0 ? (
          <button
            onClick={() => setCurrentStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-ww-gray-600 bg-white border border-ww-gray-300 hover:bg-ww-gray-50 transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        ) : (
          <div />
        )}

        {isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={!canProceed() || isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-ww-navy hover:bg-ww-navy-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        ) : (
          <button
            onClick={() => setCurrentStep(s => s + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-ww-navy hover:bg-ww-navy-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-ww-gray-800 mb-2">
          Request API Access
        </h1>
        <p className="text-sm text-ww-gray-500">
          {partner
            ? `Set up an integration with ${partner.name}`
            : 'Request access for an unlisted integration partner'}
        </p>
      </div>

      {renderStepIndicator()}

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-ww-gray-200 shadow-sm p-6 sm:p-8">
        {/* Step title */}
        <h2 className="font-display text-lg font-semibold text-ww-gray-800 mb-6">
          {STEPS[currentStep].label}
        </h2>

        {/* Step content */}
        {currentStep === 0 && renderStep1()}
        {currentStep === 1 && renderStep2()}
        {currentStep === 2 && renderStep3()}

        {/* Navigation */}
        {renderNavButtons()}
      </div>
    </div>
  )
}
