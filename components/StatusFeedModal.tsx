'use client'

import { useState, useEffect } from 'react'
import { X, Heart, MessageCircle, Loader2, Sparkles } from 'lucide-react'

interface StatusEvent {
    id: string
    pet_id: string
    tothereon_day: number
    event_type: string
    event_title: string
    event_description: string
    mood?: string
    zone?: string
    metadata?: Record<string, unknown>
    created_at: string
}

interface StatusFeedModalProps {
    isOpen: boolean
    onClose: () => void
    petId: string
    petName: string
    petImage?: string
}

const MOOD_COLORS: Record<string, string> = {
    longing: 'bg-blue-100 text-blue-700',
    joyful: 'bg-yellow-100 text-yellow-700',
    peaceful: 'bg-green-100 text-green-700',
    playful: 'bg-pink-100 text-pink-700',
    nostalgic: 'bg-purple-100 text-purple-700',
    curious: 'bg-orange-100 text-orange-700',
    dreamy: 'bg-indigo-100 text-indigo-700'
}

const MOOD_LABELS: Record<string, string> = {
    longing: 'Longing',
    joyful: 'Joyful',
    peaceful: 'Peaceful',
    playful: 'Playful',
    nostalgic: 'Nostalgic',
    curious: 'Curious',
    dreamy: 'Dreamy'
}

export function StatusFeedModal({ isOpen, onClose, petId, petName, petImage }: StatusFeedModalProps) {
    const [events, setEvents] = useState<StatusEvent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchEvents()
        }
    }, [isOpen, petId])

    const fetchEvents = async () => {
        setIsLoading(true)
        try {
            const res = await fetch(`/api/pets/${petId}/generate-event`)
            const data = await res.json()
            if (res.ok) {
                setEvents(data.events || [])
            }
        } catch (error) {
            console.error('Failed to fetch events:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleGenerateEvent = async () => {
        setIsGenerating(true)
        try {
            const res = await fetch(`/api/pets/${petId}/generate-event`, {
                method: 'POST'
            })
            const data = await res.json()
            if (res.ok && data.event) {
                setEvents(prev => [data.event, ...prev])
            }
        } catch (error) {
            console.error('Failed to generate event:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const formatTime = (date: string) => {
        const d = new Date(date)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-xl glass rounded-[40px] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-500 border-white/60">
                {/* Header */}
                <div className="p-8 border-b border-white/40 bg-white/40 backdrop-blur-xl relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="relative group">
                            {petImage ? (
                                <img
                                    src={petImage}
                                    alt={petName}
                                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-lg transition-transform group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border-2 border-white shadow-lg">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-sm" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: 'var(--font-sans)' }}>{petName}'s Journey</h2>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Sanctuary Live Feed</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-slate-100/50 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-900"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Timeline Feed */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white/20">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20 mb-4" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Searching the bridge...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-20 px-8">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                                <Sparkles className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">The bridge is quiet</h3>
                            <p className="text-slate-500 font-medium text-sm mb-10 leading-relaxed opacity-60">
                                {petName} is currently resting in the Cloud Meadows. <br />
                                Updates will manifest as whispers soon.
                            </p>
                            <button
                                onClick={handleGenerateEvent}
                                disabled={isGenerating}
                                className="button-primary px-10 py-4 rounded-full w-full shadow-lg shadow-primary/20"
                            >
                                {isGenerating ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Weaving Whispers...</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-3">
                                        <Sparkles size={16} />
                                        <span>Seek First Whisper</span>
                                    </span>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {events.map((event, idx) => (
                                <div
                                    key={event.id}
                                    className="p-6 bg-white/60 backdrop-blur-md rounded-[32px] border border-white shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-bottom-4"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className="flex flex-col gap-4">
                                        {/* Meta */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">Day {event.tothereon_day}</span>
                                                <span className="text-slate-200">•</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {formatTime(event.created_at)}
                                                </span>
                                            </div>
                                            {event.mood && (
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${MOOD_COLORS[event.mood] || 'bg-slate-100 text-slate-500'}`}>
                                                    {MOOD_LABELS[event.mood] || event.mood}
                                                </span>
                                            )}
                                        </div>

                                        {/* Event Content */}
                                        <p className="text-slate-700 leading-relaxed font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                            {event.event_description}
                                        </p>

                                        {/* Interaction Bar */}
                                        <div className="flex items-center gap-6 mt-2 pt-4 border-t border-slate-100/50">
                                            <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-pink-500 transition-colors">
                                                <Heart className="w-4 h-4" />
                                                <span>Love</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* CTA Footer */}
                <div className="p-8 border-t border-white/40 bg-white/40 backdrop-blur-xl relative z-10">
                    <a
                        href={`/dashboard/pets/${petId}/mailbox`}
                        className="flex items-center justify-center gap-3 w-full py-5 bg-slate-900 text-white rounded-full font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-900/20 hover:-translate-y-1 hover:bg-slate-800 transition-all active:scale-95 group"
                    >
                        <MessageCircle size={16} className="group-hover:scale-125 transition-transform" />
                        <span>Send a Whisper to {petName}</span>
                    </a>
                </div>
            </div>
        </div>
    )
}

