'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import RainbowBridgeSearch, { RainbowBridgeErrorBoundary } from '@/components/remembrance/RainbowBridgeSearch'
import { calculateToThereOnTime } from '@/lib/time-engine-v2'
import { getCanonicalZone } from '@/lib/discovery-copy'

interface Pet {
    id: string
    name: string
    user_id: string
    photos?: string[] | null
    passed_date?: string | null
    created_at?: string | null
    time_offset_hours?: number | null
    [key: string]: unknown
}

export default function RemembranceCompletePage() {
    const params = useParams()
    const petId = params?.petId as string
    const router = useRouter()

    const [pet, setPet] = useState<Pet | null>(null)
    const [loading, setLoading] = useState(true)
    const [ceremonyDone, setCeremonyDone] = useState(false)
    const [showInterstitial, setShowInterstitial] = useState(true)

    useEffect(() => {
        async function load() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.replace('/login')
                return
            }
            const { data } = await supabase
                .from('pets')
                .select('*')
                .eq('id', petId)
                .eq('user_id', user.id)
                .single()

            if (!data) {
                router.replace('/dashboard')
                return
            }
            setPet(data as Pet)
            setLoading(false)
        }
        load()
    }, [petId, router])

    useEffect(() => {
        if (ceremonyDone && showInterstitial) {
            const timer = setTimeout(() => setShowInterstitial(false), 2500)
            return () => clearTimeout(timer)
        }
    }, [ceremonyDone, showInterstitial])

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
            </main>
        )
    }

    if (!pet) return null

    const petPhotoUrl = pet.photos?.[0] ?? null

    // Calculate ToThereOn day + canonical zone
    const startDate = (pet.passed_date || pet.created_at) as string
    const { currentDay } = calculateToThereOnTime(startDate, pet.time_offset_hours || 0)
    const canonZone = getCanonicalZone(currentDay)

    // Aurora background — shared between interstitial and main content
    const aurora = (
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
            <div
                className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-40 mix-blend-multiply filter blur-[80px] animate-blob"
                style={{ backgroundColor: '#BAE6FD' }}
            />
            <div
                className="absolute top-[10%] right-[-20%] w-[55%] h-[55%] rounded-full opacity-30 mix-blend-multiply filter blur-[100px] animate-blob animation-delay-2000"
                style={{ backgroundColor: '#E0F2FE' }}
            />
            <div
                className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full opacity-25 mix-blend-multiply filter blur-[80px] animate-blob animation-delay-4000"
                style={{ backgroundColor: '#CFFAFE' }}
            />
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-15"
                style={{ background: 'radial-gradient(circle, #FEF3C7 0%, transparent 65%)', filter: 'blur(60px)' }}
            />
        </div>
    )

    return (
        <>
            {/* Rainbow Bridge Ceremony — shown first, dismissed on complete */}
            {!ceremonyDone && (
                <RainbowBridgeErrorBoundary fallback={null}>
                    <RainbowBridgeSearch
                        petName={pet.name}
                        petPhotoUrl={petPhotoUrl}
                        onComplete={() => setCeremonyDone(true)}
                    />
                </RainbowBridgeErrorBoundary>
            )}

            {/* Interstitial — 2.5s "We found {name}" moment */}
            {ceremonyDone && showInterstitial && (
                <main
                    className="min-h-screen relative overflow-hidden flex items-center justify-center p-6"
                    style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #fafafa 40%, #ecfeff 100%)' }}
                >
                    {aurora}
                    <div className="relative z-10 text-center animate-in fade-in duration-500 motion-reduce:animate-none">
                        <h1 className="font-sans font-bold text-4xl md:text-5xl tracking-[-0.03em] text-slate-900 mb-4">
                            We found {pet.name}.
                        </h1>
                        <p
                            className="text-base text-slate-500 animate-in fade-in duration-300 delay-300 motion-reduce:animate-none"
                            style={{ animationFillMode: 'both' }}
                        >
                            Day {currentDay} · {canonZone.name}
                        </p>
                    </div>
                </main>
            )}

            {/* Main complete content — revealed after interstitial */}
            {ceremonyDone && !showInterstitial && (
                <main
                    className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 md:p-12"
                    style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #fafafa 40%, #ecfeff 100%)' }}
                >
                    {aurora}

                    {/* ── Decorative Star Particles ── */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-[12%] left-[9%]  w-1   h-1   rounded-full bg-sky-300/70 animate-twinkle" style={{ animationDelay: '0s' }} />
                        <div className="absolute top-[22%] right-[13%] w-1.5 h-1.5 rounded-full bg-sky-200/60 animate-twinkle" style={{ animationDelay: '0.7s' }} />
                        <div className="absolute top-[55%] left-[7%]  w-1   h-1   rounded-full bg-cyan-300/60 animate-twinkle" style={{ animationDelay: '1.3s' }} />
                        <div className="absolute top-[70%] right-[10%] w-1.5 h-1.5 rounded-full bg-sky-300/50 animate-twinkle" style={{ animationDelay: '1.9s' }} />
                        <div className="absolute top-[38%] right-[5%]  w-1   h-1   rounded-full bg-blue-200/50 animate-twinkle" style={{ animationDelay: '0.4s' }} />
                        <div className="absolute bottom-[28%] left-[18%] w-1  h-1   rounded-full bg-sky-200/60 animate-twinkle" style={{ animationDelay: '2.2s' }} />
                        <div className="absolute top-[8%]  right-[30%] w-1   h-1   rounded-full bg-cyan-200/50 animate-twinkle" style={{ animationDelay: '1.0s' }} />
                        <div className="absolute bottom-[15%] right-[35%] w-1.5 h-1.5 rounded-full bg-sky-300/40 animate-twinkle" style={{ animationDelay: '0.2s' }} />
                    </div>

                    {/* ── Content ── */}
                    <div className="relative z-10 max-w-lg w-full text-center animate-in fade-in zoom-in-95 duration-1000">

                        {/* Icon — Glow rings + gradient badge */}
                        <div className="mb-12 relative inline-flex items-center justify-center">
                            <div className="absolute w-36 h-36 rounded-full border border-sky-200/40 animate-glow-ring" />
                            <div className="absolute w-28 h-28 rounded-full border border-sky-300/30 animate-pulse" />
                            <div
                                className="relative w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-sky-500/30"
                                style={{ background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)' }}
                            >
                                <Sparkles className="w-9 h-9 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                                <Check size={13} strokeWidth={3} className="text-white" />
                            </div>
                        </div>

                        {/* Title */}
                        <h1
                            className="font-sans font-bold text-4xl md:text-5xl tracking-[-0.03em] mb-5 text-slate-900 leading-tight"
                        >
                            We found {pet.name} <br />
                            <span
                                className="italic text-transparent bg-clip-text"
                                style={{ backgroundImage: 'linear-gradient(135deg, #0284C7, #38BDF8)' }}
                            >
                                in ToThereOn World.
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg font-light text-slate-500 mb-10 leading-relaxed max-w-sm mx-auto">
                            <strong className="text-slate-800 font-semibold">{pet.name}</strong>{' '}
                            has been in ToThereOn World for{' '}
                            <strong className="text-slate-800 font-semibold">{currentDay} day{currentDay !== 1 ? 's' : ''}</strong>
                            {' '}— living, exploring, finding their way. Today, for the first time, the channel opened.
                        </p>

                        {/* Pet Photo */}
                        {pet.photos?.[0] && (
                            <div className="mb-10 relative inline-block">
                                <div className="absolute inset-0 rounded-full blur-2xl scale-110 opacity-40 animate-pulse" style={{ background: 'radial-gradient(circle, #7DD3FC, transparent)' }} />
                                <div className="relative w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-[6px] border-white shadow-2xl shadow-sky-300/25">
                                    <img
                                        src={pet.photos[0]}
                                        alt={pet.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Status card */}
                        <div className="bg-white/50 backdrop-blur-xl border border-white/70 p-7 rounded-[2rem] mb-10 shadow-sm">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-500">
                                    Day {currentDay} · {canonZone.name}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mb-3 italic">
                                {currentDay <= 3
                                    ? 'still finding their footing — but the warmth of this place is already real'
                                    : currentDay <= 14
                                    ? 'familiar corners are forming — there\'s a rhythm now'
                                    : 'this world has become real — they have a life here'}
                            </p>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-800">{pet.name}</span> has been here all along. Now the channel between you is open.
                            </p>
                            <p className="text-xs text-slate-400 mt-1.5">
                                Their first message from this world will arrive soon.
                            </p>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                            <Link
                                href={`/dashboard/pets/${petId}/write`}
                                className="w-full sm:w-auto px-9 py-4 rounded-full text-white text-sm font-semibold shadow-xl shadow-sky-500/25 hover:shadow-2xl hover:shadow-sky-500/35 hover:-translate-y-0.5 transition-all"
                                style={{ background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)' }}
                            >
                                Write to {pet.name}
                            </Link>
                            <Link
                                href={`/dashboard/pets/${petId}/status`}
                                className="w-full sm:w-auto px-9 py-4 rounded-full bg-white/60 border border-white/70 backdrop-blur-md text-slate-600 text-sm font-medium hover:bg-white hover:shadow-lg transition-all"
                            >
                                See {pet.name}&apos;s World
                            </Link>
                        </div>

                        {/* Footer hint */}
                        <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">
                            Exploring ToThereOn World
                        </p>
                    </div>
                </main>
            )}
        </>
    )
}
