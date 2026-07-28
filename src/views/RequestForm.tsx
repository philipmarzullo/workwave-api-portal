import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Lock, ChevronRight, ChevronLeft, CheckCircle2,
  Building2, Settings2, Server, FileCheck,
  Send, Globe, Mail, AlertTriangle, ExternalLink, Info, Phone,
} from 'lucide-react'
import type { CustomerUser, WorkWaveProduct, BuilderType, UseCase, DataCategory, Environment } from '@/data/types'
import { store } from '@/data/store'
import { PRODUCT_LABELS, TIER_LABELS, USE_CASE_LABELS, DATA_CATEGORY_LABELS } from '@/App'

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

const ALL_PRODUCTS: WorkWaveProduct[] = [
  'pestpac', 'realgreen', 'winteam', 'lighthouse',
  'timegate_plus', 'route_manager', 'hire',
]

const ALL_BUILDER_TYPES: BuilderType[] = ['partner', 'internal_team', 'contractor']

const STEPS = [
  { label: 'Partner & Product', icon: Building2 },
  { label: 'Integration Details', icon: Settings2 },
  { label: 'Environment & Data', icon: Server },
  { label: 'Terms & Confirmation', icon: FileCheck },
]

const TIMELINE_OPTIONS: { value: string; label: string }[] = [
  { value: 'asap', label: 'As soon as possible' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'next_quarter', label: 'Next quarter' },
  { value: 'exploring', label: 'Just exploring' },
]

// ── Touched state type ─────────────────────────────────────────
type TouchedFields = {
  partnerName: boolean
  partnerWebsite: boolean
  partnerContact: boolean
  partnerContactName: boolean
  selectedProduct: boolean
  builderType: boolean
  connectingSystem: boolean
  useCase: boolean
  useCaseDetail: boolean
  dataRead: boolean
  dataLeavesEnvironment: boolean
  environment: boolean
  termsAccepted: boolean
  techContactName: boolean
  techContactEmail: boolean
  techContactPhone: boolean
  targetTimeline: boolean
  listedPartnerContactName: boolean
  listedPartnerContactEmail: boolean
}

const initialTouched: TouchedFields = {
  partnerName: false,
  partnerWebsite: false,
  partnerContact: false,
  partnerContactName: false,
  selectedProduct: false,
  builderType: false,
  connectingSystem: false,
  useCase: false,
  useCaseDetail: false,
  dataRead: false,
  dataLeavesEnvironment: false,
  environment: false,
  termsAccepted: false,
  techContactName: false,
  techContactEmail: false,
  techContactPhone: false,
  targetTimeline: false,
  listedPartnerContactName: false,
  listedPartnerContactEmail: false,
}

export function RequestForm({ activeUser, onSubmit }: RequestFormProps) {
  const navigate = useNavigate()
  const { partnerId } = useParams<{ partnerId?: string }>()

  const partner = partnerId ? store.getPartner(partnerId) : undefined

  // Step state
  const [currentStep, setCurrentStep] = useState(0)

  // Touched state
  const [touched, setTouched] = useState<TouchedFields>({ ...initialTouched })

  function touch(field: keyof TouchedFields) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  // Step 1: Partner & Product
  const [partnerName, setPartnerName] = useState('')
  const [partnerWebsite, setPartnerWebsite] = useState('')
  const [partnerContact, setPartnerContact] = useState('')
  const [partnerContactName, setPartnerContactName] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<WorkWaveProduct | ''>('')
  const [builderType, setBuilderType] = useState<BuilderType | ''>('')

  // Step 2: Integration Details
  const [connectingSystem, setConnectingSystem] = useState(partner?.name ?? '')
  const [useCase, setUseCase] = useState<UseCase | ''>('')
  const [useCaseDetail, setUseCaseDetail] = useState('')
  const [endpointsRequested, setEndpointsRequested] = useState('')
  const [thirdPartyTool, setThirdPartyTool] = useState('')
  const [thirdPartyToolUrl, setThirdPartyToolUrl] = useState('')
  const [dataRead, setDataRead] = useState<DataCategory[]>([])
  const [dataWrite, setDataWrite] = useState<DataCategory[]>([])
  const [dataLeavesEnvironment, setDataLeavesEnvironment] = useState<boolean | null>(null)

  // Contact Information (Step 2)
  const [techContactSameAsRequester, setTechContactSameAsRequester] = useState(true)
  const [techContactName, setTechContactName] = useState('')
  const [techContactEmail, setTechContactEmail] = useState('')
  const [techContactPhone, setTechContactPhone] = useState('')
  const [targetTimeline, setTargetTimeline] = useState('')

  // Listed partner contact (optional, for listed partners)
  const [listedPartnerContactName, setListedPartnerContactName] = useState('')
  const [listedPartnerContactEmail, setListedPartnerContactEmail] = useState('')

  // Step 3: Environment
  const [environment, setEnvironment] = useState<Environment | ''>('')

  // Step 4: Terms
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reserved for future auto-selection logic

  // ── Locked state ──────────────────────────────────────────────
  if (!activeUser || !activeUser.canRequestApi) {
    return (
      <div className="max-w-[720px] mx-auto py-10">
        <div className="bg-white rounded-md border border-ww-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-md bg-ww-gray-100 flex items-center justify-center mx-auto mb-6">
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

  // ── Dirty check ─────────────────────────────────────────────────

  function isDirty(): boolean {
    if (partnerName.trim()) return true
    if (partnerWebsite.trim()) return true
    if (partnerContact.trim()) return true
    if (partnerContactName.trim()) return true
    if (selectedProduct) return true
    if (builderType) return true
    if (connectingSystem.trim()) return true
    if (useCase) return true
    if (useCaseDetail.trim()) return true
    if (endpointsRequested.trim()) return true
    if (thirdPartyTool.trim()) return true
    if (thirdPartyToolUrl.trim()) return true
    if (dataRead.length > 0) return true
    if (dataWrite.length > 0) return true
    if (dataLeavesEnvironment !== null) return true
    if (!techContactSameAsRequester) return true
    if (techContactName.trim()) return true
    if (techContactEmail.trim()) return true
    if (techContactPhone.trim()) return true
    if (targetTimeline) return true
    if (listedPartnerContactName.trim()) return true
    if (listedPartnerContactEmail.trim()) return true
    if (environment) return true
    if (termsAccepted) return true
    return false
  }

  // ── Validation per step ───────────────────────────────────────

  function isStep1Valid(): boolean {
    if (!partner) {
      if (!partnerName.trim() || !partnerWebsite.trim() || !partnerContact.trim() || !partnerContactName.trim()) return false
    }
    if (!selectedProduct || !builderType) return false
    return true
  }

  function isStep2Valid(): boolean {
    if (!connectingSystem.trim()) return false
    if (!useCase) return false
    if (!useCaseDetail.trim()) return false
    if (dataRead.length === 0) return false
    if (dataLeavesEnvironment === null) return false
    if (!techContactSameAsRequester) {
      if (!techContactName.trim() || !techContactEmail.trim()) return false
    }
    if (!targetTimeline) return false
    return true
  }

  function isStep3Valid(): boolean {
    if (!environment) return false
    return true
  }

  function isStep4Valid(): boolean {
    if (!termsAccepted) return false
    return true
  }

  function isStepValid(step: number): boolean {
    if (step === 0) return isStep1Valid()
    if (step === 1) return isStep2Valid()
    if (step === 2) return isStep3Valid()
    if (step === 3) return isStep4Valid()
    return false
  }

  function canProceed(): boolean {
    return isStepValid(currentStep)
  }

  // ── Checkbox toggle helpers ───────────────────────────────────

  function toggleDataRead(cat: DataCategory) {
    setDataRead(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
    touch('dataRead')
  }

  function toggleDataWrite(cat: DataCategory) {
    setDataWrite(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  // ── Cancel handler ────────────────────────────────────────────

  function handleCancel() {
    if (isDirty()) {
      if (!window.confirm('Discard this request?')) return
    }
    navigate('/')
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
        endpointsRequested: endpointsRequested.trim(),
        thirdPartyTool: thirdPartyTool.trim() || null,
        thirdPartyToolUrl: thirdPartyToolUrl.trim() || null,
        technicalContactName: techContactSameAsRequester ? null : (techContactName.trim() || null),
        technicalContactEmail: techContactSameAsRequester ? null : (techContactEmail.trim() || null),
        technicalContactPhone: techContactSameAsRequester ? null : (techContactPhone.trim() || null),
        targetTimeline: targetTimeline || null,
        environment: environment as Environment,
      })

      store.signAgreement(newRequest.id)
      navigate(`/confirmation/${newRequest.id}`)
      onSubmit()
    } catch {
      setIsSubmitting(false)
    }
  }

  // ── Inline error helper ───────────────────────────────────────

  function fieldError(field: keyof TouchedFields, isValid: boolean): string | null {
    if (!touched[field]) return null
    if (isValid) return null
    return 'This field is required'
  }

  function renderError(msg: string | null) {
    if (!msg) return null
    return <p className="text-xs text-red-500 mt-1">{msg}</p>
  }

  // ── Reusable radio dot ────────────────────────────────────────

  function RadioDot({ selected }: { selected: boolean }) {
    return (
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
          selected ? 'border-ww-primary' : 'border-ww-gray-300'
        }`}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-ww-primary" />}
      </div>
    )
  }

  // ── Reusable checkbox box ─────────────────────────────────────

  function CheckBox({ checked }: { checked: boolean }) {
    return (
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked ? 'bg-ww-primary border-ww-primary' : 'border-ww-gray-300 bg-white'
        }`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-white">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    )
  }

  // ── Step indicator ────────────────────────────────────────────

  function renderStepIndicator() {
    return (
      <div className="flex items-start justify-center gap-0 mb-10">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep
          const isComplete = idx < currentStep
          const StepIcon = step.icon
          const isClickable = isComplete

          return (
            <div key={idx} className="flex items-start">
              {idx > 0 && (
                <div
                  className={`w-10 sm:w-16 h-0.5 mt-4 ${
                    isComplete ? 'bg-ww-green' : 'bg-ww-gray-200'
                  }`}
                />
              )}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && setCurrentStep(idx)}
                className={`flex flex-col items-center gap-2 ${
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isActive
                      ? 'bg-ww-primary text-white'
                      : isComplete
                        ? 'bg-ww-green text-white'
                        : 'bg-ww-gray-200 text-ww-gray-400'
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <StepIcon size={16} />
                  )}
                </div>
                <span
                  className={`text-[11px] font-medium whitespace-nowrap ${
                    isActive
                      ? 'text-ww-primary'
                      : isComplete
                        ? 'text-ww-green'
                        : 'text-ww-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </button>
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
            <div className="bg-ww-gray-50 rounded-md border border-ww-gray-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-md bg-white border border-ww-gray-200 flex items-center justify-center text-2xl shrink-0">
                  {partner.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <h3 className="font-display font-semibold text-ww-gray-800">
                      {partner.name}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold font-mono ${
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
                      className="inline-flex items-center gap-1 text-xs text-ww-primary hover:underline mt-2"
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
            {/* Amber warning callout */}
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-6">
              <div className="flex gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-1">
                    Unlisted Partner Request
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    You are requesting API access for a partner not currently listed in our
                    directory. Please provide their details below. Note that unlisted partner
                    requests require additional review and may take longer to process.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                  Partner Name <span className="text-ww-red">*</span>
                </label>
                <input
                  type="text"
                  value={partnerName}
                  onChange={e => setPartnerName(e.target.value)}
                  onBlur={() => touch('partnerName')}
                  placeholder="e.g. Acme Software Inc."
                  className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                />
                {renderError(fieldError('partnerName', !!partnerName.trim()))}
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
                  onBlur={() => touch('partnerWebsite')}
                  placeholder="https://www.example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                />
                {renderError(fieldError('partnerWebsite', !!partnerWebsite.trim()))}
              </div>
              <div>
                <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                  Partner Contact Name <span className="text-ww-red">*</span>
                </label>
                <input
                  type="text"
                  value={partnerContactName}
                  onChange={e => setPartnerContactName(e.target.value)}
                  onBlur={() => touch('partnerContactName')}
                  placeholder="e.g. Jane Smith"
                  className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                />
                {renderError(fieldError('partnerContactName', !!partnerContactName.trim()))}
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
                  onBlur={() => touch('partnerContact')}
                  placeholder="contact@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                />
                {renderError(fieldError('partnerContact', !!partnerContact.trim()))}
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
            Which WorkWave product does this integration connect to?
          </p>

          <div className="grid grid-cols-2 gap-2">
            {ALL_PRODUCTS.map(product => (
              <label
                key={product}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-md border-2 cursor-pointer transition-all ${
                  selectedProduct === product
                    ? 'border-ww-primary bg-ww-sky/30'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="product"
                  value={product}
                  checked={selectedProduct === product}
                  onChange={() => {
                    setSelectedProduct(product)
                    touch('selectedProduct')
                  }}
                  className="sr-only"
                />
                <RadioDot selected={selectedProduct === product} />
                <span
                  className={`text-sm font-medium ${
                    selectedProduct === product ? 'text-ww-gray-800' : 'text-ww-gray-700'
                  }`}
                >
                  {PRODUCT_LABELS[product] ?? product}
                </span>
              </label>
            ))}
          </div>

          {touched.selectedProduct && !selectedProduct && renderError('This field is required')}
        </div>

        {/* Builder type */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-3">
            Who is building this integration? <span className="text-ww-red">*</span>
          </label>
          <div className="space-y-2.5">
            {ALL_BUILDER_TYPES.map(bt => (
              <label
                key={bt}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-md border-2 cursor-pointer transition-all ${
                  builderType === bt
                    ? 'border-ww-primary bg-ww-sky/30'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="builderType"
                  value={bt}
                  checked={builderType === bt}
                  onChange={() => {
                    setBuilderType(bt)
                    touch('builderType')
                  }}
                  className="sr-only"
                />
                <RadioDot selected={builderType === bt} />
                <span
                  className={`text-sm font-medium ${
                    builderType === bt ? 'text-ww-gray-800' : 'text-ww-gray-700'
                  }`}
                >
                  {BUILDER_TYPE_LABELS[bt]}
                </span>
              </label>
            ))}
          </div>
          {touched.builderType && !builderType && renderError('This field is required')}
        </div>
      </div>
    )
  }

  // ── Step 2: Integration Details ───────────────────────────────

  function renderStep2() {
    return (
      <div className="space-y-8">
        {/* Connecting system — only shown for unlisted partners */}
        {!partner && (
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
              onBlur={() => touch('connectingSystem')}
              placeholder="e.g. Salesforce, QuickBooks, Custom CRM"
              className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
            />
            {renderError(fieldError('connectingSystem', !!connectingSystem.trim()))}
          </div>
        )}

        {/* Use case */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-3">
            Primary Use Case <span className="text-ww-red">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ALL_USE_CASES.map(uc => (
              <label
                key={uc}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-md border-2 cursor-pointer transition-all ${
                  useCase === uc
                    ? 'border-ww-primary bg-ww-sky/30'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="useCase"
                  value={uc}
                  checked={useCase === uc}
                  onChange={() => {
                    setUseCase(uc)
                    touch('useCase')
                  }}
                  className="sr-only"
                />
                <RadioDot selected={useCase === uc} />
                <span
                  className={`text-sm font-medium ${
                    useCase === uc ? 'text-ww-gray-800' : 'text-ww-gray-700'
                  }`}
                >
                  {USE_CASE_LABELS[uc] ?? uc}
                </span>
              </label>
            ))}
          </div>
          {touched.useCase && !useCase && renderError('This field is required')}
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
            onBlur={() => touch('useCaseDetail')}
            placeholder="Describe how you plan to use the API, what data flows you need, and the business problem you are solving..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow resize-none"
          />
          {renderError(fieldError('useCaseDetail', !!useCaseDetail.trim()))}
        </div>

        {/* API Endpoints Requested */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-1.5">
            API Endpoints Requested
          </label>
          <p className="text-xs text-ww-gray-500 mb-3">
            If you know which specific API endpoints you need, list them here (one per line).
          </p>
          <textarea
            value={endpointsRequested}
            onChange={e => setEndpointsRequested(e.target.value)}
            placeholder="e.g. WinTeam.employees-V2 GET, WinTeam.timesheets-V3 GET/POST..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow resize-none font-mono"
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
                    ? 'border-ww-primary bg-ww-sky/30'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dataRead.includes(cat)}
                  onChange={() => toggleDataRead(cat)}
                  className="sr-only"
                />
                <CheckBox checked={dataRead.includes(cat)} />
                <span
                  className={`text-sm ${
                    dataRead.includes(cat) ? 'text-ww-gray-800 font-medium' : 'text-ww-gray-700'
                  }`}
                >
                  {DATA_CATEGORY_LABELS[cat] ?? cat}
                </span>
              </label>
            ))}
          </div>
          {touched.dataRead && dataRead.length === 0 && renderError('Select at least one data category to read')}
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
                    ? 'border-ww-primary bg-ww-sky/30'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dataWrite.includes(cat)}
                  onChange={() => toggleDataWrite(cat)}
                  className="sr-only"
                />
                <CheckBox checked={dataWrite.includes(cat)} />
                <span
                  className={`text-sm ${
                    dataWrite.includes(cat) ? 'text-ww-gray-800 font-medium' : 'text-ww-gray-700'
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
                className={`flex items-center gap-3 px-5 py-3.5 rounded-md border-2 cursor-pointer transition-all ${
                  dataLeavesEnvironment === opt.value
                    ? 'border-ww-primary bg-ww-sky/30'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="dataLeavesEnvironment"
                  checked={dataLeavesEnvironment === opt.value}
                  onChange={() => {
                    setDataLeavesEnvironment(opt.value)
                    touch('dataLeavesEnvironment')
                  }}
                  className="sr-only"
                />
                <RadioDot selected={dataLeavesEnvironment === opt.value} />
                <span
                  className={`text-sm font-medium ${
                    dataLeavesEnvironment === opt.value ? 'text-ww-gray-800' : 'text-ww-gray-700'
                  }`}
                >
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
          {touched.dataLeavesEnvironment && dataLeavesEnvironment === null && renderError('This field is required')}
        </div>

        {/* Third-Party Tool (only for partner builder type) */}
        {builderType === 'partner' && (
          <div>
            <label className="block text-sm font-semibold text-ww-gray-700 mb-1.5">
              Third-Party Tool or Middleware
            </label>
            <p className="text-xs text-ww-gray-500 mb-3">
              If a third-party tool (other than the partner above) is involved in this integration, provide its details.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                  Tool Name
                </label>
                <input
                  type="text"
                  value={thirdPartyTool}
                  onChange={e => setThirdPartyTool(e.target.value)}
                  placeholder="e.g. Lumera, Workato, MuleSoft"
                  className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Globe size={14} />
                    Tool Website
                  </span>
                </label>
                <input
                  type="text"
                  value={thirdPartyToolUrl}
                  onChange={e => setThirdPartyToolUrl(e.target.value)}
                  placeholder="https://www.example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Contact Information ─────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-4">
            Contact Information
          </label>

          {/* Requester (read-only) */}
          <div className="bg-ww-gray-50 border border-ww-gray-200 rounded-lg p-4 mb-5">
            <p className="text-sm text-ww-gray-700">
              Requesting as <span className="font-medium text-ww-gray-800">{activeUser!.name}</span>{' '}
              ({activeUser!.email}) — {store.getCustomer(activeUser!.customerId)?.name ?? 'Unknown Company'}
            </p>
          </div>

          {/* Technical contact */}
          <div className="mb-5">
            <p className="text-sm font-medium text-ww-gray-700 mb-3">Technical Contact</p>
            <label className="flex items-center gap-2.5 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={techContactSameAsRequester}
                onChange={e => setTechContactSameAsRequester(e.target.checked)}
                className="sr-only"
              />
              <CheckBox checked={techContactSameAsRequester} />
              <span className="text-sm text-ww-gray-700">Same as requester</span>
            </label>
            {!techContactSameAsRequester && (
              <div className="space-y-3 pl-0">
                <div>
                  <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                    Name <span className="text-ww-red">*</span>
                  </label>
                  <input
                    type="text"
                    value={techContactName}
                    onChange={e => setTechContactName(e.target.value)}
                    onBlur={() => touch('techContactName')}
                    placeholder="Technical contact name"
                    className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                  />
                  {renderError(fieldError('techContactName', !!techContactName.trim()))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} />
                      Email <span className="text-ww-red">*</span>
                    </span>
                  </label>
                  <input
                    type="email"
                    value={techContactEmail}
                    onChange={e => setTechContactEmail(e.target.value)}
                    onBlur={() => touch('techContactEmail')}
                    placeholder="tech@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                  />
                  {renderError(fieldError('techContactEmail', !!techContactEmail.trim()))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Phone size={14} />
                      Phone
                    </span>
                  </label>
                  <input
                    type="text"
                    value={techContactPhone}
                    onChange={e => setTechContactPhone(e.target.value)}
                    onBlur={() => touch('techContactPhone')}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Partner contact for listed partner (optional) */}
          {partner && (
            <div className="mb-5">
              <p className="text-sm font-medium text-ww-gray-700 mb-3">
                Partner contact for this integration (optional)
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={listedPartnerContactName}
                    onChange={e => setListedPartnerContactName(e.target.value)}
                    onBlur={() => touch('listedPartnerContactName')}
                    placeholder="Partner contact name"
                    className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ww-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} />
                      Email
                    </span>
                  </label>
                  <input
                    type="email"
                    value={listedPartnerContactEmail}
                    onChange={e => setListedPartnerContactEmail(e.target.value)}
                    onBlur={() => touch('listedPartnerContactEmail')}
                    placeholder="partner@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 placeholder:text-ww-gray-400 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Target Timeline */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-1.5">
            Target Timeline <span className="text-ww-red">*</span>
          </label>
          <select
            value={targetTimeline}
            onChange={e => {
              setTargetTimeline(e.target.value)
              touch('targetTimeline')
            }}
            onBlur={() => touch('targetTimeline')}
            className="w-full px-4 py-2.5 rounded-lg border border-ww-gray-300 text-sm text-ww-gray-800 focus:outline-none focus:ring-2 focus:ring-ww-primary focus:border-transparent transition-shadow bg-white"
          >
            <option value="">Select a timeline...</option>
            {TIMELINE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {renderError(fieldError('targetTimeline', !!targetTimeline))}
        </div>
      </div>
    )
  }

  // ── Step 3: Environment & Data ────────────────────────────────

  function renderStep3() {
    return (
      <div className="space-y-8">
        {/* Environment */}
        <div>
          <label className="block text-sm font-semibold text-ww-gray-700 mb-3">
            Target Environment <span className="text-ww-red">*</span>
          </label>

          {/* Info callout */}
          <div className="flex items-start gap-2.5 mb-5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Info size={16} className="text-ww-primary mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Sandbox approval is required before production access can be granted. We recommend
              starting with Sandbox to validate your integration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                value: 'sandbox' as Environment,
                label: 'Sandbox',
                desc: 'Test environment with sample data. Ideal for development and validation.',
              },
              {
                value: 'production' as Environment,
                label: 'Production',
                desc: 'Live environment with real customer data. Requires prior sandbox approval.',
              },
            ].map(env => (
              <label
                key={env.value}
                className={`relative flex flex-col gap-1 px-5 py-4 rounded-md border-2 cursor-pointer transition-all ${
                  environment === env.value
                    ? 'border-ww-primary bg-ww-sky/30'
                    : 'border-ww-gray-200 bg-white hover:border-ww-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="environment"
                  value={env.value}
                  checked={environment === env.value}
                  onChange={() => {
                    setEnvironment(env.value)
                    touch('environment')
                  }}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <RadioDot selected={environment === env.value} />
                  <span
                    className={`text-sm font-semibold ${
                      environment === env.value ? 'text-ww-gray-800' : 'text-ww-gray-700'
                    }`}
                  >
                    {env.label}
                  </span>
                </div>
                <p className="text-xs text-ww-gray-500 ml-7 leading-relaxed">{env.desc}</p>
              </label>
            ))}
          </div>
          {touched.environment && !environment && renderError('This field is required')}
        </div>
      </div>
    )
  }

  // ── Step 4: Terms & Confirmation ──────────────────────────────

  function renderStep4() {
    const timelineLabel = TIMELINE_OPTIONS.find(o => o.value === targetTimeline)?.label ?? targetTimeline

    return (
      <div className="space-y-6">
        {/* ── Section: Partner & Product ──────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm text-ww-gray-800">Partner & Product</h3>
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="text-xs text-ww-primary hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div className="space-y-0">
            <div className="flex py-2">
              <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Partner</span>
              <span className="text-sm text-ww-gray-800">{partner ? partner.name : (partnerName || '--')}</span>
            </div>
            <div className="flex py-2">
              <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Product</span>
              <span className="text-sm text-ww-gray-800 font-mono">{selectedProduct ? (PRODUCT_LABELS[selectedProduct] ?? selectedProduct) : '--'}</span>
            </div>
            <div className="flex py-2">
              <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Builder Type</span>
              <span className="text-sm text-ww-gray-800">{builderType ? BUILDER_TYPE_LABELS[builderType] : '--'}</span>
            </div>
          </div>
        </div>

        {/* ── Section: Integration Details ────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm text-ww-gray-800">Integration Details</h3>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-ww-primary hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div className="space-y-0">
            <div className="flex py-2">
              <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Connecting System</span>
              <span className="text-sm text-ww-gray-800">{connectingSystem || '--'}</span>
            </div>
            <div className="flex py-2">
              <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Use Case</span>
              <span className="text-sm text-ww-gray-800">{useCase ? (USE_CASE_LABELS[useCase] ?? useCase) : '--'}</span>
            </div>
            <div className="py-2">
              <div className="flex">
                <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Use Case Details</span>
                {useCaseDetail && useCaseDetail.length <= 80 && (
                  <span className="text-sm text-ww-gray-800">{useCaseDetail}</span>
                )}
              </div>
              {useCaseDetail && useCaseDetail.length > 80 && (
                <div className="border border-ww-gray-200 rounded-lg p-3 mt-1 text-sm text-ww-gray-700 leading-relaxed">
                  {useCaseDetail}
                </div>
              )}
              {!useCaseDetail && (
                <span className="text-sm text-ww-gray-800">--</span>
              )}
            </div>
            <div className="py-2">
              <div className="flex">
                <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Data to Read</span>
                <div className="flex flex-wrap gap-1.5">
                  {dataRead.length > 0
                    ? dataRead.map(cat => (
                        <span
                          key={cat}
                          className="bg-ww-gray-100 text-ww-gray-700 text-xs px-2 py-0.5 rounded font-mono"
                        >
                          {DATA_CATEGORY_LABELS[cat] ?? cat}
                        </span>
                      ))
                    : <span className="text-sm text-ww-gray-400">None selected</span>}
                </div>
              </div>
            </div>
            <div className="py-2">
              <div className="flex">
                <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Data to Write</span>
                <div className="flex flex-wrap gap-1.5">
                  {dataWrite.length > 0
                    ? dataWrite.map(cat => (
                        <span
                          key={cat}
                          className="bg-ww-gray-100 text-ww-gray-700 text-xs px-2 py-0.5 rounded font-mono"
                        >
                          {DATA_CATEGORY_LABELS[cat] ?? cat}
                        </span>
                      ))
                    : <span className="text-sm text-ww-gray-400">None selected</span>}
                </div>
              </div>
            </div>
            {endpointsRequested.trim() && (
              <div className="py-2">
                <div className="flex">
                  <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Endpoints Requested</span>
                </div>
                <div className="border border-ww-gray-200 rounded-lg p-3 mt-1 text-xs text-ww-gray-700 leading-relaxed font-mono whitespace-pre-wrap">
                  {endpointsRequested}
                </div>
              </div>
            )}
            <div className="flex py-2">
              <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Data Leaves Environment</span>
              {dataLeavesEnvironment === true ? (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-medium">
                  Yes — data leaves environment
                </span>
              ) : dataLeavesEnvironment === false ? (
                <span className="bg-ww-gray-100 text-ww-gray-700 text-xs px-2 py-0.5 rounded font-mono">No</span>
              ) : (
                <span className="text-sm text-ww-gray-400">--</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Section: Contact Information ────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm text-ww-gray-800">Contact Information</h3>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-ww-primary hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div className="space-y-0">
            <div className="flex py-2">
              <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Requester</span>
              <span className="text-sm text-ww-gray-800">{activeUser!.name} ({activeUser!.email})</span>
            </div>
            <div className="flex py-2">
              <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Technical Contact</span>
              <span className="text-sm text-ww-gray-800">
                {techContactSameAsRequester
                  ? 'Same as requester'
                  : `${techContactName || '--'} (${techContactEmail || '--'})`}
              </span>
            </div>
            {/* Partner contact info */}
            {partner ? (
              (listedPartnerContactName || listedPartnerContactEmail) && (
                <div className="flex py-2">
                  <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Partner Contact</span>
                  <span className="text-sm text-ww-gray-800">
                    {listedPartnerContactName}{listedPartnerContactName && listedPartnerContactEmail ? ' ' : ''}{listedPartnerContactEmail ? `(${listedPartnerContactEmail})` : ''}
                  </span>
                </div>
              )
            ) : (
              (partnerContactName || partnerContact) && (
                <div className="flex py-2">
                  <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Partner Contact</span>
                  <span className="text-sm text-ww-gray-800">
                    {partnerContactName}{partnerContactName && partnerContact ? ' ' : ''}{partnerContact ? `(${partnerContact})` : ''}
                  </span>
                </div>
              )
            )}
            {thirdPartyTool.trim() && (
              <div className="flex py-2">
                <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Third-Party Tool</span>
                <span className="text-sm text-ww-gray-800">
                  {thirdPartyTool}{thirdPartyToolUrl.trim() ? ` (${thirdPartyToolUrl})` : ''}
                </span>
              </div>
            )}
            <div className="flex py-2">
              <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Target Timeline</span>
              <span className="text-sm text-ww-gray-800">{timelineLabel || '--'}</span>
            </div>
          </div>
        </div>

        {/* ── Section: Environment ────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-sm text-ww-gray-800">Environment</h3>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-ww-primary hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>
          <div className="space-y-0">
            <div className="flex py-2">
              <span className="text-[13px] text-ww-gray-500 w-44 shrink-0">Environment</span>
              <span className="text-sm text-ww-gray-800 font-mono">
                {environment === 'sandbox'
                  ? 'Sandbox'
                  : environment === 'production'
                    ? 'Production'
                    : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Terms checkbox ─────────────────────────────────── */}
        <div className="bg-ww-gray-50 border border-ww-gray-200 rounded-md p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => {
                setTermsAccepted(e.target.checked)
                touch('termsAccepted')
              }}
              className="sr-only"
            />
            <div
              className={`w-[18px] h-[18px] rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                termsAccepted
                  ? 'bg-ww-primary border-ww-primary'
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
              I acknowledge that API access is subject to WorkWave's API Terms of Service and
              Integration Partner Agreement. Access granted through this portal is void if used
              in connection with an unapproved integration partner. I confirm the information
              provided above is accurate.
            </span>
          </label>
          {touched.termsAccepted && !termsAccepted && (
            <p className="text-xs text-red-500 mt-2 ml-8">You must accept the terms to continue</p>
          )}
        </div>
      </div>
    )
  }

  // ── Navigation buttons ────────────────────────────────────────

  function renderFooter() {
    const isLastStep = currentStep === STEPS.length - 1

    return (
      <div className="border-t border-ww-gray-100 px-8 py-5 flex items-center justify-between bg-ww-gray-50/50">
        {/* Left side: Cancel + Back */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="text-sm text-ww-gray-500 hover:text-ww-gray-700 transition-colors"
          >
            Cancel
          </button>
          {currentStep > 0 && (
            <button
              type="button"
              onClick={() => setCurrentStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-ww-gray-600 bg-white border border-ww-gray-300 hover:bg-ww-gray-50 transition-colors"
            >
              <ChevronLeft size={16} />
              Back
            </button>
          )}
        </div>

        {/* Right side: Next or Submit */}
        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed() || isSubmitting}
            title={!termsAccepted ? 'Accept the terms to submit' : undefined}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-ww-primary hover:bg-ww-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentStep(s => s + 1)}
            disabled={!canProceed()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-ww-primary hover:bg-ww-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    <div className="max-w-[720px] mx-auto py-10">
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
      <div className="bg-white rounded-md border border-ww-gray-200 overflow-hidden">
        {/* Form content area */}
        <div className="px-8 py-6">
          {/* Step title */}
          <h2 className="font-display text-lg font-semibold text-ww-gray-800 mb-6">
            {STEPS[currentStep].label}
          </h2>

          {/* Step content */}
          {currentStep === 0 && renderStep1()}
          {currentStep === 1 && renderStep2()}
          {currentStep === 2 && renderStep3()}
          {currentStep === 3 && renderStep4()}
        </div>

        {/* Footer bar with navigation */}
        {renderFooter()}
      </div>
    </div>
  )
}
