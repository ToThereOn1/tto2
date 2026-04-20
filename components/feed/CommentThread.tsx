'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageCircle, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ──────────────────────────────────────────────────────────────

interface CommentData {
    id: string
    content: string
    createdAt: string
    reply: {
        content: string | null
        delivered_at: string | null
        status?: 'thinking'
    } | null
}

interface CommentThreadProps {
    eventId: string
    petId: string
    petName: string
}

// ─── Time formatting ────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

// ─── Component ──────────────────────────────────────────────────────────

export function CommentThread({ eventId, petId, petName }: CommentThreadProps) {
    const [comments, setComments] = useState<CommentData[]>([])
    const [expanded, setExpanded] = useState(false)
    const [inputValue, setInputValue] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [remainingReplies, setRemainingReplies] = useState<number | null>(null)

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetch(`/api/feed-comments/${eventId}`)
            if (!res.ok) return
            const data = await res.json()
            setComments(data.comments || [])
        } catch {
            // Silent fail — comments are non-critical
        }
    }, [eventId])

    useEffect(() => {
        if (expanded) {
            fetchComments()
            // Poll every 30s for reply updates when expanded
            const interval = setInterval(fetchComments, 30000)
            return () => clearInterval(interval)
        }
    }, [expanded, fetchComments])

    // Supabase Realtime for instant reply updates
    useEffect(() => {
        if (!expanded) return

        const supabase = createClient()
        const channel = supabase
            .channel(`comment-replies-${eventId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'comment_replies',
                filter: `pet_id=eq.${petId}`,
            }, () => {
                fetchComments()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [expanded, eventId, petId, fetchComments])

    const handleSubmit = async () => {
        if (!inputValue.trim() || submitting) return
        setSubmitting(true)
        setError(null)

        try {
            const res = await fetch('/api/feed-comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventId,
                    petId,
                    content: inputValue.trim(),
                    language: document.documentElement.lang || 'en',
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Failed to send')
                return
            }

            // Optimistic update
            const newComment: CommentData = {
                id: data.commentId,
                content: inputValue.trim(),
                createdAt: new Date().toISOString(),
                reply: data.replyScheduled
                    ? { content: null, delivered_at: null, status: 'thinking' }
                    : null,
            }
            setComments(prev => [...prev, newComment])
            setInputValue('')
            setRemainingReplies(data.remainingReplies ?? null)
        } catch {
            setError('Network error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const commentCount = comments.length
    const hasThinking = comments.some(c => c.reply?.status === 'thinking')

    return (
        <div className="mt-6 border-t border-slate-100 pt-4">
            {/* Toggle button */}
            <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:text-primary transition-colors"
            >
                <MessageCircle size={14} />
                <span>
                    {commentCount > 0 ? `Notes (${commentCount})` : 'Leave a Note'}
                    {hasThinking && ' · thinking...'}
                </span>
            </button>

            {expanded && (
                <div className="mt-4 space-y-3 animate-in fade-in duration-300">
                    {/* Comment list */}
                    {comments.map(c => (
                        <div key={c.id} className="space-y-2">
                            {/* Guardian comment */}
                            <div className="flex gap-3">
                                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs shrink-0">
                                    👤
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 leading-relaxed">{c.content}</p>
                                    <span className="text-[10px] text-slate-300 mt-0.5 block">{timeAgo(c.createdAt)}</span>
                                </div>
                            </div>

                            {/* Pet reply */}
                            {c.reply && (
                                <div className="flex gap-3 ml-6">
                                    <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-xs shrink-0">
                                        🐾
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {c.reply.content ? (
                                            <>
                                                <p className="text-sm text-amber-800 leading-relaxed font-medium">
                                                    {c.reply.content}
                                                </p>
                                                {c.reply.delivered_at && (
                                                    <span className="text-[10px] text-amber-400 mt-0.5 block">{timeAgo(c.reply.delivered_at)}</span>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-sm text-amber-400 italic flex items-center gap-1.5">
                                                <Loader2 size={12} className="animate-spin" />
                                                {petName} is thinking...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Read-only marker (no reply scheduled) */}
                            {!c.reply && (
                                <div className="ml-10 text-[10px] text-slate-300">
                                    {petName} read this 🐾
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Input */}
                    <div className="flex gap-2 items-end mt-3">
                        <div className="flex-1 relative">
                            <textarea
                                value={inputValue}
                                onChange={e => {
                                    if (e.target.value.length <= 500) setInputValue(e.target.value)
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder={`Leave a note for ${petName}...`}
                                rows={1}
                                className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                            />
                            {inputValue.length > 0 && (
                                <span className={`absolute right-3 bottom-2 text-[10px] ${inputValue.length > 450 ? 'text-red-400' : 'text-slate-300'}`}>
                                    {inputValue.length}/500
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={!inputValue.trim() || submitting}
                            className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>

                    {/* Status messages */}
                    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
                    {remainingReplies !== null && remainingReplies <= 1 && (
                        <p className="text-[10px] text-slate-400 mt-1">
                            {remainingReplies === 0
                                ? `${petName} can read your notes, but replies are full for this cycle.`
                                : `${remainingReplies} reply left this cycle.`}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
