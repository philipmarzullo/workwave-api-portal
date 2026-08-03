import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageSquarePlus, X, Send, Trash2, ChevronDown, ChevronUp, MessageCircle, Lock, Reply } from 'lucide-react'
import { store } from '@/data/store'
import type { FeedbackItem, ViewMode } from '@/data/types'

const FEEDBACK_DELETE_PASSWORD = '3125508501'

// ── Route → friendly page name ────────────────────────────────
function pageName(path: string): string {
  const map: Record<string, string> = {
    '/': 'Partners',
    '/my-integrations': 'My Integrations',
    '/check-status': 'Check Status',
    '/reviewer': 'Requests',
    '/reviewer/partners': 'Partners (Reviewer)',
    '/reviewer/risk-profiles': 'Risk Profiles',
    '/reviewer/applications': 'Applications',
    '/reviewer/usage-intelligence': 'Usage Intelligence',
    '/reviewer/api-catalog': 'API Catalog',
  }
  if (map[path]) return map[path]
  if (path.startsWith('/reviewer/request/')) return 'Request Detail (Reviewer)'
  if (path.startsWith('/reviewer/partner/')) return 'Partner Detail (Reviewer)'
  if (path.startsWith('/request/')) return 'Request Form'
  if (path.startsWith('/confirmation/')) return 'Confirmation'
  return path
}

interface FeedbackWidgetProps {
  viewMode: ViewMode
}

export function FeedbackWidget({ viewMode }: FeedbackWidgetProps) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [author, setAuthor] = useState(() => localStorage.getItem('ww-hackathon:feedback-author') || '')
  const [items, setItems] = useState<FeedbackItem[]>(() => store.getFeedback())
  const [showAll, setShowAll] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Refresh items when panel opens
  useEffect(() => {
    if (open) setItems(store.getFeedback())
  }, [open])

  const currentPage = pageName(location.pathname)
  const pageItems = items.filter(f => f.page === location.pathname)
  const otherItems = items.filter(f => f.page !== location.pathname)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return
    const name = author.trim() || 'Anonymous'
    localStorage.setItem('ww-hackathon:feedback-author', name)
    store.addFeedback({
      page: location.pathname,
      viewMode,
      author: name,
      comment: comment.trim(),
    })
    setComment('')
    setItems(store.getFeedback())
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 2000)
  }

  const handleDelete = (id: string) => {
    const pw = prompt('Enter admin password to delete:')
    if (pw !== FEEDBACK_DELETE_PASSWORD) return
    store.deleteFeedback(id)
    setItems(store.getFeedback())
  }

  const handleReply = (feedbackId: string, replyComment: string) => {
    const name = author.trim() || 'Anonymous'
    localStorage.setItem('ww-hackathon:feedback-author', name)
    store.addReply(feedbackId, { author: name, comment: replyComment })
    setItems(store.getFeedback())
  }

  const handleClearAll = () => {
    const pw = prompt('Enter admin password to clear all feedback:')
    if (pw !== FEEDBACK_DELETE_PASSWORD) return
    store.clearFeedback()
    setItems([])
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-5 right-5 z-[60] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 ${
          open ? 'bg-ww-gray-700 text-white' : 'bg-amber-500 text-white hover:bg-amber-600'
        }`}
        title="Leave feedback"
      >
        {open ? <X size={20} /> : <MessageSquarePlus size={20} />}
        {!open && items.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {items.length}
          </span>
        )}
      </button>

      {/* Slide-out panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-[55] bg-black/20" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-[58] w-[380px] max-w-[90vw] bg-white shadow-2xl flex flex-col border-l border-ww-gray-200">
            {/* Header */}
            <div className="bg-amber-500 text-white px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle size={18} />
                  <span className="font-display font-bold text-sm">Hackathon Feedback</span>
                </div>
                <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded p-1 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <p className="text-amber-100 text-[11px] mt-1">
                Share thoughts on this page. All feedback is stored locally.
              </p>
            </div>

            {/* Current page context */}
            <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
              <p className="text-[10px] font-mono text-amber-600 uppercase tracking-wider">Current page</p>
              <p className="text-sm font-medium text-amber-900 mt-0.5">{currentPage}</p>
              <p className="text-[11px] text-amber-600 font-mono mt-0.5">{viewMode} view</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-ww-gray-100 space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ww-gray-500 mb-1">Your name</label>
                <input
                  type="text"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="Anonymous"
                  className="w-full px-3 py-1.5 text-sm border border-ww-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ww-gray-500 mb-1">Comment</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="What do you think about this page? Ideas, issues, suggestions..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-ww-gray-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!comment.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={14} />
                {submitted ? 'Submitted!' : 'Submit Feedback'}
              </button>
            </form>

            {/* Feedback list */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-5 py-8 text-center text-ww-gray-400">
                  <MessageCircle size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No feedback yet</p>
                  <p className="text-[11px] mt-1">Be the first to share your thoughts</p>
                </div>
              ) : (
                <>
                  {/* This page's feedback */}
                  {pageItems.length > 0 && (
                    <div className="px-5 pt-4">
                      <p className="text-[10px] font-mono text-ww-gray-400 uppercase tracking-wider mb-2">
                        This page ({pageItems.length})
                      </p>
                      <div className="space-y-2">
                        {pageItems.map(item => (
                          <FeedbackCard key={item.id} item={item} onDelete={handleDelete} onReply={handleReply} formatTime={formatTime} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other pages */}
                  {otherItems.length > 0 && (
                    <div className="px-5 pt-4 pb-4">
                      <button
                        onClick={() => setShowAll(!showAll)}
                        className="flex items-center gap-1 text-[10px] font-mono text-ww-gray-400 uppercase tracking-wider hover:text-ww-gray-600 transition-colors mb-2"
                      >
                        Other pages ({otherItems.length})
                        {showAll ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      </button>
                      {showAll && (
                        <div className="space-y-2">
                          {otherItems.map(item => (
                            <FeedbackCard key={item.id} item={item} onDelete={handleDelete} onReply={handleReply} formatTime={formatTime} showPage />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-5 py-3 border-t border-ww-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-ww-gray-400 font-mono">{items.length} total</span>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  <Lock size={9} /> Clear all
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

// ── Feedback card ────────────────────────────────────────────

function FeedbackCard({
  item,
  onDelete,
  onReply,
  formatTime,
  showPage,
}: {
  item: FeedbackItem
  onDelete: (id: string) => void
  onReply: (feedbackId: string, comment: string) => void
  formatTime: (iso: string) => string
  showPage?: boolean
}) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')

  const handleSubmitReply = () => {
    if (!replyText.trim()) return
    onReply(item.id, replyText.trim())
    setReplyText('')
    setReplyOpen(false)
  }

  const replies = item.replies ?? []

  return (
    <div className="bg-ww-gray-50 rounded-lg px-3 py-2.5 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ww-navy">{item.author}</span>
            <span className="text-[10px] text-ww-gray-400 font-mono">{formatTime(item.createdAt)}</span>
          </div>
          {showPage && (
            <p className="text-[10px] text-amber-600 font-mono mt-0.5">{pageName(item.page)} &middot; {item.viewMode}</p>
          )}
          <p className="text-sm text-ww-gray-700 mt-1 whitespace-pre-wrap">{item.comment}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setReplyOpen(!replyOpen)}
            className="opacity-0 group-hover:opacity-100 text-ww-gray-400 hover:text-amber-600 transition-all p-0.5"
            title="Reply"
          >
            <Reply size={12} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="opacity-0 group-hover:opacity-100 text-ww-gray-400 hover:text-red-500 transition-all p-0.5 flex items-center gap-0.5"
            title="Delete (password required)"
          >
            <Lock size={8} />
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2 ml-3 border-l-2 border-amber-200 pl-2.5 space-y-1.5">
          {replies.map(reply => (
            <div key={reply.id}>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-ww-navy">{reply.author}</span>
                <span className="text-[9px] text-ww-gray-400 font-mono">{formatTime(reply.createdAt)}</span>
              </div>
              <p className="text-[13px] text-ww-gray-600 whitespace-pre-wrap">{reply.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      {replyOpen && (
        <div className="mt-2 flex gap-1.5">
          <input
            type="text"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmitReply() }}
            placeholder="Reply..."
            autoFocus
            className="flex-1 px-2 py-1 text-[12px] border border-ww-gray-200 rounded focus:ring-1 focus:ring-amber-300 focus:border-amber-400 outline-none"
          />
          <button
            onClick={handleSubmitReply}
            disabled={!replyText.trim()}
            className="px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={10} />
          </button>
        </div>
      )}
    </div>
  )
}
