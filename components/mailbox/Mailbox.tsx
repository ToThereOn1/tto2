'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Mail, RefreshCw, Clock, Inbox, Check } from 'lucide-react'
import { UpgradeModal } from '@/components/ui/UpgradeModal'

interface MailboxProps {
    petId: string
}

interface Letter {
    id: string
    content: string
    sender_type: 'user' | 'pet'
    status: string
    created_at: string
    updated_at: string
}

interface Pet {
    id: string
    name: string
    species: string
    photos: string[]
}

export function Mailbox({ petId }: MailboxProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received')
    const [sentLetters, setSentLetters] = useState<Letter[]>([])
    const [receivedLetters, setReceivedLetters] = useState<Letter[]>([])
    const [pendingCount, setPendingCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [pet, setPet] = useState<Pet | null>(null)
    const [canWriteLetter, setCanWriteLetter] = useState(false)
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

    const fetchLetters = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/mailbox/${petId}`)
            if (!res.ok) throw new Error('Failed to fetch letters')
            const data = await res.json()

            setPet(data.pet)
            setSentLetters(data.sent || [])
            setReceivedLetters(data.received || [])
            setPendingCount(data.pendingReplies || 0)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLetters()

        // Subscription check
        import('@/lib/supabase/client').then(async ({ createClient }) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            try {
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('tier')
                    .eq('user_id', user.id)
                    .in('status', ['active', 'trialing'])
                    .single()

                let tier = sub?.tier || null
                if (!tier) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('subscription_tier')
                        .eq('id', user.id)
                        .single()
                    tier = userData?.subscription_tier || 'free'
                }
                tier = (tier as string).toLowerCase()
                const paid = ['basic', 'plus', 'pro'].includes(tier)
                setCanWriteLetter(paid)
            } catch (err) {
                console.error('[Mailbox] Subscription check error:', err)
                setCanWriteLetter(false)
            }
        })
    }, [petId])

    const handleWriteClick = () => {
        if (!canWriteLetter) {
            setUpgradeModalOpen(true)
        }
    }

    const displayLetters = activeTab === 'received' ? receivedLetters : sentLetters

    return (
        <div className="max-w-6xl mx-auto space-y-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
                <div className="animate-in fade-in slide-in-from-left-4 duration-700">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 transition-opacity mb-6"
                    >
                        <ArrowLeft size={14} />
                        <span>Return to Sanctuary</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                            <Mail size={28} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-sans)' }}>
                                The Mailbox
                            </h1>
                            <p className="text-sm font-medium text-slate-500 opacity-60">
                                Whispers across the bridge with <span className="text-slate-900 font-bold">{pet?.name || 'your pet'}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-700">
                    <button
                        onClick={fetchLetters}
                        className="p-4 rounded-2xl bg-white/50 border border-white/60 backdrop-blur-md hover:bg-white transition-all text-slate-400 hover:text-primary"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {canWriteLetter ? (
                        <Link href={`/dashboard/pets/${petId}/write`} className="group">
                            <button className="button-primary px-8 py-4 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:-translate-y-1">
                                <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                <span>Write Letter</span>
                            </button>
                        </Link>
                    ) : (
                        <button
                            onClick={handleWriteClick}
                            className="button-primary px-8 py-4 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:-translate-y-1"
                        >
                            <Send size={16} />
                            <span>Write Letter</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Timeline View (Only show if there are sent letters) */}
            {sentLetters.length > 0 && activeTab === 'sent' && (
                <section className="glass rounded-[40px] p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-1000">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                            <Clock size={16} />
                        </div>
                        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Delivery Status</h2>
                    </div>

                    <div className="relative py-8">
                        <div className="flex justify-between items-start relative z-10">
                            {[
                                { id: 'sent', label: 'Sent', icon: <Send size={20} />, date: new Date(sentLetters[0].created_at).toLocaleDateString() },
                                { id: 'arrived', label: 'Arrived', icon: <Inbox size={20} />, date: 'ToThereOn' },
                                { id: 'delivered', label: 'Delivered', icon: <Check size={20} />, date: 'Today', active: true },
                                { id: 'writing', label: 'Writing Reply', icon: <Clock size={20} />, date: 'Soon', opacity: 0.4 },
                                { id: 'replied', label: 'Reply Sent', icon: <Mail size={20} />, opacity: 0.4 },
                            ].map((step, idx) => (
                                <div key={step.id} className={`flex flex-col items-center text-center w-1/5 transition-all duration-500 ${step.opacity ? 'opacity-40' : 'opacity-100'}`}>
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-xl transition-all ${step.active ? 'bg-primary text-white scale-125 shadow-primary/20' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {step.icon}
                                    </div>
                                    <p className={`text-xs font-bold uppercase tracking-widest ${step.active ? 'text-primary' : 'text-slate-400'}`}>{step.label}</p>
                                    {step.date && <p className="text-[9px] text-slate-400 mt-1 font-bold">{step.date}</p>}
                                </div>
                            ))}
                        </div>
                        {/* Progress Line */}
                        <div className="absolute top-[28px] left-[10%] right-[10%] h-1.5 bg-slate-100 rounded-full overflow-hidden -z-0">
                            <div className="h-full bg-primary/50 w-[50%] animate-pulse" />
                        </div>
                    </div>
                </section>
            )}

            {/* Letters Section */}
            <section className="glass rounded-[40px] overflow-hidden min-h-[500px] border shadow-2xl border-white/40">
                <div className="flex p-2 bg-slate-100/50 backdrop-blur-md">
                    <button
                        onClick={() => setActiveTab('received')}
                        className={`flex-1 py-4 px-6 rounded-[28px] font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${activeTab === 'received' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Inbox size={16} />
                        <span>Received</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'received' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-500'}`}>
                            {receivedLetters.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('sent')}
                        className={`flex-1 py-4 px-6 rounded-[28px] font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${activeTab === 'sent' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Send size={16} />
                        <span>Sent</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'sent' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-500'}`}>
                            {sentLetters.length}
                        </span>
                    </button>
                </div>

                <div className="p-0">
                    {loading ? (
                        <div className="p-20 text-center">
                            <RefreshCw size={32} className="mx-auto text-primary/20 animate-spin mb-4" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Searching the bridge...</p>
                        </div>
                    ) : displayLetters.length === 0 ? (
                        <div className="p-20 text-center animate-in fade-in zoom-in-95 duration-700">
                            <div className="w-24 h-24 bg-slate-100/50 rounded-full mx-auto flex items-center justify-center mb-8 text-4xl shadow-inner">
                                {activeTab === 'received' ? '📭' : '📝'}
                            </div>
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-4 tracking-tight">
                                No letters {activeTab === 'received' ? 'received' : 'sent'} yet
                            </h3>
                            <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10 leading-relaxed opacity-60">
                                {activeTab === 'received'
                                    ? `When ${pet?.name} writes to you, it will appear here as a magical whisper.`
                                    : "You haven't sent any letters yet. Your words travel through the Waterway and reach them within a few days."
                                }
                            </p>
                            {activeTab === 'sent' && (
                                canWriteLetter ? (
                                    <Link href={`/dashboard/pets/${petId}/write`}>
                                        <button className="button-primary px-10 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary/20">
                                            Write First Letter
                                        </button>
                                    </Link>
                                ) : (
                                    <button
                                        onClick={handleWriteClick}
                                        className="button-primary px-10 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary/20"
                                    >
                                        Write First Letter
                                    </button>
                                )
                            )}
                        </div>
                    ) : (
                        <div className="max-h-[700px] overflow-y-auto custom-scrollbar">
                            {displayLetters.map((letter, idx) => (
                                <article
                                    key={letter.id}
                                    className="p-10 md:p-12 hover:bg-white/50 transition-all duration-500 border-b border-white/20 group animate-in fade-in slide-in-from-bottom-4"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary/20">
                                                <img
                                                    src={activeTab === 'received' ? (pet?.photos[0] || '/placeholder.jpg') : '/user-placeholder.jpg'}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                                                    {activeTab === 'received' ? `Whisper from ${pet?.name}` : `Message to ${pet?.name}`}
                                                </h3>
                                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                                                    {new Date(letter.created_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${activeTab === 'received' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {activeTab === 'received' ? 'Ethereal' : 'Earthly'}
                                        </div>
                                    </div>
                                    <div className="prose prose-slate max-w-none text-slate-600 text-lg md:text-xl leading-[1.8] font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                                        <div className="whitespace-pre-line" style={{ fontFamily: 'var(--font-sans)' }}>
                                            {letter.content}
                                        </div>
                                    </div>

                                    {/* Action Reveal */}
                                    <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                        <button className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">Read Detail</button>
                                        <button className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Archive</button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={upgradeModalOpen}
                onClose={() => setUpgradeModalOpen(false)}
                title="Subscription Required"
                message="Writing heartfelt letters to your beloved pet in ToThereOn World is a premium feature. Subscribe to begin your correspondence through the Waterway."
                redirectUrl="/pricing"
                redirectText="View Plans"
            />
        </div>
    )
}
