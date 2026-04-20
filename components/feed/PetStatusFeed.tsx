'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { RefreshCw, Plus, Heart, Sparkles, MessageCircle, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { getLearningStage } from '@/lib/learning-stage'
import { DiscoveryState } from './DiscoveryState'
import { CommentThread } from './CommentThread'
import { ZoneMilestoneCard } from './ZoneMilestoneCard'
import { FeedTextWithTooltips } from './NpcTooltip'
import { MicroEventCard } from './MicroEventCard'

// Mood styling
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

const ZONE_DISPLAY_NAMES: Record<string, string> = {
    crystal_meadow: 'Crystal Meadow',
    eternity_forest: 'Eternity Forest',
    crystal_lake: 'Crystal Lake',
    sunset_hill: 'Sunset Hill',
}

const STAGE_NAMES = ['First Light', 'Budding Voice', 'Finding Words', 'Growing Fluency', 'Confident Voice', 'Mature Expression', 'Full Bloom']

// ─── Zone Milestone helpers ───────────────────────────────────────────────────
function getCanonicalZoneKey(day: number): string {
    if (day < 3) return 'crystal_meadow'
    if (day < 10) return 'eternity_forest'
    if (day < 30) return 'crystal_lake'
    if (day < 100) return 'sunset_hill'
    return 'all_zones'
}

const ZONE_START_DAYS: Record<string, number> = {
    eternity_forest: 3,
    crystal_lake: 10,
    sunset_hill: 30,
    all_zones: 100,
}

interface MicroEvent {
  id: string
  content: string
  category: string
  time_of_day: string
  npc_involved: string | null
  zone: string
  created_at: string
  tothereon_day: number
  language: string
}

type FeedItem =
    | { kind: 'event'; event: TimelineData['events'][0]; isFirstNpcEncounter: boolean }
    | { kind: 'micro'; micro: MicroEvent }
    | { kind: 'milestone'; zone: string; day: number }
    | { kind: 'time-gap'; daysBetween: number; language: string }

function buildFeedItems(events: TimelineData['events'], microEvents: MicroEvent[] = []): FeedItem[] {
    if (events.length === 0 && microEvents.length === 0) return []
    const items: FeedItem[] = []
    const inserted = new Set<string>()

    // Calculate first-encounter NPC event IDs (events are newest-first)
    const firstEncounterEventIds = new Set<string>()
    const seenNpcs = new Set<string>()
    for (let i = events.length - 1; i >= 0; i--) {
        const npc = events[i].npcInvolved
        if (npc && !seenNpcs.has(npc)) {
            firstEncounterEventIds.add(events[i].id)
            seenNpcs.add(npc)
        }
    }

    // Merge LLM events and micro-events by created_at descending
    type MergedEntry =
        | { kind: 'event'; event: TimelineData['events'][0]; ts: number }
        | { kind: 'micro'; micro: MicroEvent; ts: number }

    const merged: MergedEntry[] = [
        ...events.map(e => ({ kind: 'event' as const, event: e, ts: new Date(e.createdAt).getTime() })),
        ...microEvents.map(m => ({ kind: 'micro' as const, micro: m, ts: new Date(m.created_at).getTime() })),
    ].sort((a, b) => b.ts - a.ts)

    for (let i = 0; i < merged.length; i++) {
        const entry = merged[i]

        if (entry.kind === 'micro') {
            items.push({ kind: 'micro', micro: entry.micro })
            continue
        }

        const ev = entry.event
        items.push({
            kind: 'event',
            event: ev,
            isFirstNpcEncounter: firstEncounterEventIds.has(ev.id),
        })

        // Look ahead to the next LLM event for milestone/time-gap markers
        const nextEventEntry = merged.slice(i + 1).find(e => e.kind === 'event') as
            | { kind: 'event'; event: TimelineData['events'][0]; ts: number }
            | undefined

        if (nextEventEntry) {
            const newerZone = getCanonicalZoneKey(ev.toThereOnDay)
            const olderZone = getCanonicalZoneKey(nextEventEntry.event.toThereOnDay)
            if (newerZone !== olderZone && !inserted.has(newerZone) && ZONE_START_DAYS[newerZone]) {
                items.push({ kind: 'milestone', zone: newerZone, day: ZONE_START_DAYS[newerZone] })
                inserted.add(newerZone)
            }

            const dayGap = ev.toThereOnDay - nextEventEntry.event.toThereOnDay
            if (dayGap >= 2) {
                items.push({
                    kind: 'time-gap',
                    daysBetween: dayGap,
                    language: ev.language || 'English',
                })
            }
        }
    }
    return items
}

// ─── NPC Display Lookup ───────────────────────────────────────────────────────
const NPC_DISPLAY: Record<string, {
    ko: string; jp: string
    species: string; species_ko: string; species_jp: string
    emoji: string
}> = {
    'Granny Shell':     { ko: '느림보 할망', jp: 'グラニー・シェル', species: 'Tortoise',          species_ko: '거북이',         species_jp: 'カメ',           emoji: '🐢' },
    'Professor Clover': { ko: '콩선생',      jp: 'クローバー先生', species: 'Rabbit · Teacher',    species_ko: '토끼 · 선생님',  species_jp: 'ウサギ・先生',   emoji: '🐇' },
    'Pip':              { ko: '달래',         jp: 'ピップ',         species: 'Letter Carrier',      species_ko: '편지 배달꾼',    species_jp: '手紙配達員',     emoji: '📬' },
    'Old Finn':         { ko: '꼬리상인',     jp: 'フィン老人',     species: 'Fox · Storyteller',   species_ko: '여우 · 이야기꾼', species_jp: 'キツネ・語り部', emoji: '🦊' },
    'Bun & Bun':        { ko: '뭉실·몽실',   jp: 'バンとバン',     species: 'Rabbit sisters',      species_ko: '토끼 자매',      species_jp: 'ウサギ姉妹',    emoji: '🥐' },
    'Digby':            { ko: '굴돌이',       jp: 'ディグビー',     species: 'Mole · World Guide',  species_ko: '두더지 · 길잡이', species_jp: 'モグラ・案内人', emoji: '🌱' },
    'Lune':             { ko: '은빛',         jp: 'ルーン',         species: 'White Deer',          species_ko: '흰 사슴',        species_jp: '白い鹿',        emoji: '🦌' },
    'Happy':            { ko: 'Happy',        jp: 'Happy',          species: 'Golden Retriever',    species_ko: '골든 리트리버',  species_jp: 'ゴールデン',     emoji: '🐕' },
    'Choco':            { ko: 'Choco',        jp: 'Choco',          species: 'Poodle',              species_ko: '푸들',           species_jp: 'プードル',      emoji: '🐩' },
    'Tory':             { ko: 'Tory',         jp: 'Tory',           species: 'Corgi',               species_ko: '코기',           species_jp: 'コーギー',      emoji: '🐕' },
    'Cloud':            { ko: 'Cloud',        jp: 'Cloud',          species: 'Samoyed',             species_ko: '사모예드',       species_jp: 'サモエド',      emoji: '🤍' },
    'Lightning':        { ko: 'Lightning',    jp: 'Lightning',      species: 'Beagle',              species_ko: '비글',           species_jp: 'ビーグル',      emoji: '⚡' },
    'Star':             { ko: 'Star',         jp: 'Star',           species: 'Chihuahua',           species_ko: '치와와',         species_jp: 'チワワ',        emoji: '⭐' },
    'Mong':             { ko: 'Mong',         jp: 'Mong',           species: 'Persian Cat',         species_ko: '페르시안 고양이', species_jp: 'ペルシャ猫',   emoji: '🐱' },
    'Ruby':             { ko: 'Ruby',         jp: 'Ruby',           species: 'Russian Blue',        species_ko: '러시안 블루',    species_jp: 'ロシアンブルー', emoji: '🐈' },
    'Wind':             { ko: 'Wind',         jp: 'Wind',           species: 'Shiba Inu',           species_ko: '시바이누',       species_jp: '柴犬',          emoji: '🍃' },
    'Bokshil':          { ko: 'Bokshil',      jp: 'Bokshil',        species: 'Maltese',             species_ko: '말티즈',         species_jp: 'マルチーズ',    emoji: '🌸' },
}

function getNpcTag(npcName: string, language?: string) {
    const info = NPC_DISPLAY[npcName]
    if (!info) return null
    const lang = language || 'English'
    return {
        name:    lang === 'Korean' ? info.ko      : lang === 'Japanese' ? info.jp         : npcName,
        species: lang === 'Korean' ? info.species_ko : lang === 'Japanese' ? info.species_jp : info.species,
        emoji:   info.emoji,
        label:   lang === 'Korean' ? '오늘의 이웃' : lang === 'Japanese' ? '今日の仲間' : "Today's neighbor",
    }
}

interface TimelineData {
    pet: {
        id: string
        name: string
        species: string
        breed: string | null
        photos: string[]
        passed_date?: string | null
    }
    timeline: {
        startDate: string
        currentDay: number
        progress: number
        timeUntilNext: string
        currentZone: string
        currentZoneName: string
    }
    events: Array<{
        id: string
        toThereOnDay: number
        type: string
        eventType?: string
        title: string
        description: string
        zone: string
        zoneName: string
        typeName: string
        createdAt: string
        isMock?: boolean
        mood?: string
        language?: string
        metadata?: Record<string, unknown>
        npcInvolved?: string | null
    }>
}

interface PetStatusFeedProps {
    petId: string
    initialData?: TimelineData & { microEvents?: MicroEvent[] }
    canWriteLetter?: boolean
}

export function PetStatusFeed({ petId, initialData, canWriteLetter: serverCanWriteLetter = false }: PetStatusFeedProps) {
    const router = useRouter()
    const [data, setData] = useState<(TimelineData & { microEvents?: MicroEvent[] }) | null>(initialData || null)
    const [loading, setLoading] = useState(!initialData)
    const [simulating, setSimulating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [simulateError, setSimulateError] = useState<string | null>(null)
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
    // Independent client-side subscription check (don't rely solely on server prop)
    const [clientCanWriteLetter, setClientCanWriteLetter] = useState<boolean | null>(null)

    const fetchTimeline = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/timeline/${petId}`)
            if (!response.ok) throw new Error('Failed to fetch timeline')
            const result = await response.json()
            setData(result)
            setError(null)
        } catch (err) {
            console.error('Fetch error:', err)
            setError('Failed to load timeline')
        } finally {
            setLoading(false)
        }
    }, [petId])

    useEffect(() => {
        if (!initialData) {
            fetchTimeline()
        }
    }, [fetchTimeline, initialData])

    const [isAdmin, setIsAdmin] = useState(false)
    const [remembranceCompleted, setRemembranceCompleted] = useState(false)
    const [hasLetterSent, setHasLetterSent] = useState(false)

    useEffect(() => {
        import('@/lib/supabase/client').then(async ({ createClient }) => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            if (process.env.NEXT_PUBLIC_ADMIN_EMAIL && user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
                setIsAdmin(true)
            }

            // Independent subscription check (client-side, overrides server prop)
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
                setClientCanWriteLetter(paid)
            } catch (err) {
                console.error('[PetStatusFeed] Subscription check error:', err)
                setClientCanWriteLetter(false)
            }

            // Check if Deep Remembrance is completed for this pet
            const { data } = await supabase
                .from('deep_remembrance_responses')
                .select('completed_at')
                .eq('pet_id', petId)
                .not('completed_at', 'is', null)
                .limit(1)
                .single()
            if (data?.completed_at) {
                setRemembranceCompleted(true)
            }

            // Check if user has ever sent a letter to this pet
            const { count } = await supabase
                .from('letters')
                .select('*', { count: 'exact', head: true })
                .eq('pet_id', petId)
                .eq('sender_type', 'user')
            if ((count ?? 0) > 0) {
                setHasLetterSent(true)
            }
        })
    }, [petId])

    // Use client-side check result when available, otherwise default to false (safe)
    // This ensures free users are ALWAYS blocked regardless of server prop
    const canWriteLetter = clientCanWriteLetter !== null ? clientCanWriteLetter : false

    const handleSimulateDay = async () => {
        try {
            setSimulating(true)
            setSimulateError(null)
            // Pass force=true if admin
            const url = `/api/pets/${petId}/generate-event?force=${isAdmin}`
            const response = await fetch(url, { method: 'POST' })
            const body = await response.json()
            if (!response.ok) {
                throw new Error(body.error || `HTTP ${response.status}`)
            }
            await fetchTimeline()
        } catch (err) {
            console.error('[handleSimulateDay] Error:', err)
            setSimulateError(err instanceof Error ? err.message : 'Failed to generate event')
        } finally {
            setSimulating(false)
        }
    }

    if (loading) return <FeedSkeleton />

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-8">
                <div className="glass p-12 rounded-[40px] text-center max-w-md shadow-2xl">
                    <div className="text-4xl mb-6">😕</div>
                    <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed opacity-60">The Waterway is quiet for now. Please try again in a moment.</p>
                    <button onClick={fetchTimeline} className="button-primary px-10 py-4 rounded-2xl w-full">Try Again</button>
                </div>
            </div>
        )
    }

    const { pet, timeline, events } = data

    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-32 relative overflow-hidden">
            {/* Ethereal Glow Background */}
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/20 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b border-white/40 px-6 py-6 md:px-12 backdrop-blur-3xl animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-3 rounded-2xl bg-white/50 border border-white hover:bg-white transition-all text-slate-400 hover:text-primary"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="text-center">
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-sans)' }}>
                            Moments of {pet.name}
                        </h1>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Exploring ToThereOn World</span>
                    </div>
                    <button
                        onClick={fetchTimeline}
                        className="p-3 rounded-2xl bg-white/50 border border-white hover:bg-white transition-all text-slate-400 hover:text-primary"
                    >
                        <RefreshCw size={20} className={loading || simulating ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
                {/* Profile Section */}
                <section className="text-center animate-in fade-in zoom-in-95 duration-1000">
                    <div className="relative inline-block mb-8 group">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {pet.photos?.[0] ? (
                            <div className="relative w-32 h-32 md:w-40 md:h-40">
                                <Image
                                    src={pet.photos[0]}
                                    alt={pet.name}
                                    fill
                                    className="rounded-[2.5rem] object-cover border-[6px] border-white shadow-2xl relative z-10 transition-transform group-hover:scale-105"
                                    sizes="(max-width: 768px) 128px, 160px"
                                />
                            </div>
                        ) : (
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-gradient-to-br from-primary to-indigo-400 flex items-center justify-center text-5xl border-[6px] border-white shadow-2xl relative z-10">
                                🐾
                            </div>
                        )}
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-white shadow-lg z-20 flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full animate-ping" />
                        </div>
                    </div>

                    <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">{pet.name}</h2>
                    {events.length > 0 && (
                        <div className="mt-2 mb-2 inline-flex items-center gap-1.5 bg-white/60 border border-slate-100 rounded-full px-3 py-1 text-[11px] text-slate-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            {events[0].language === 'Korean'
                                ? `${events[0].zoneName || ZONE_DISPLAY_NAMES[events[0].zone] || events[0].zone}에서 ${getMoodKo(events[0].mood || '')} 중`
                                : `Exploring ${events[0].zoneName || ZONE_DISPLAY_NAMES[events[0].zone] || events[0].zone}`}
                        </div>
                    )}
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center justify-center gap-2">
                        <span>{pet.species}</span>
                        {pet.breed && (
                            <>
                                <span className="opacity-30">•</span>
                                <span>{pet.breed}</span>
                            </>
                        )}
                    </p>

                    {/* Learning Stage Indicator (US-B3) */}
                    {(() => {
                        const stageKey = getLearningStage(timeline.currentDay)
                        const stageNum = parseInt(stageKey.replace('stage', ''), 10)
                        const currentStage = isNaN(stageNum) ? 1 : stageNum
                        return (
                            <div className="flex items-center justify-center gap-1 mb-6">
                                {STAGE_NAMES.map((name, i) => (
                                    <div
                                        key={i}
                                        className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                            i < currentStage - 1
                                                ? 'bg-amber-500'
                                                : i === currentStage - 1
                                                ? 'bg-amber-600 ring-2 ring-amber-300'
                                                : 'bg-gray-200'
                                        }`}
                                        title={name}
                                    />
                                ))}
                                <span className="ml-2 text-xs text-gray-500">{STAGE_NAMES[currentStage - 1] ?? 'First Light'}</span>
                            </div>
                        )
                    })()}

                    {/* Message to My Dear / Deep Remembrance Button */}
                    <div className="flex justify-center mb-8">
                        {remembranceCompleted ? (
                            canWriteLetter ? (
                                <Link href={`/dashboard/pets/${pet.id}/write`}>
                                    <button className="relative group overflow-hidden px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:-translate-y-1 transition-all active:scale-95">
                                        <span className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out skew-x-12" />
                                        <div className="relative flex items-center gap-2">
                                            <MessageCircle className="w-5 h-5" />
                                            <span>Message to My Dear</span>
                                        </div>
                                    </button>
                                </Link>
                            ) : (
                                <button
                                    onClick={() => setUpgradeModalOpen(true)}
                                    className="relative group overflow-hidden px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:-translate-y-1 transition-all active:scale-95"
                                >
                                    <span className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out skew-x-12" />
                                    <div className="relative flex items-center gap-2">
                                        <MessageCircle className="w-5 h-5" />
                                        <span>Message to My Dear</span>
                                    </div>
                                </button>
                            )
                        ) : (
                            <Link href="/dashboard/remembrance">
                                <button className="relative group overflow-hidden px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-lg shadow-amber-400/30 hover:shadow-amber-400/40 hover:-translate-y-1 transition-all active:scale-95">
                                    <span className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out skew-x-12" />
                                    <div className="relative flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" />
                                        <span>Deep Remembrance</span>
                                    </div>
                                </button>
                            </Link>
                        )}
                    </div>

                    <div className="inline-flex flex-col items-center gap-4 bg-white/40 backdrop-blur-xl border border-white/60 p-6 rounded-[32px] shadow-sm">
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">ToThereOn Time</div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold text-slate-900 tracking-tighter">Day {timeline.currentDay}</span>
                        </div>
                        <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary/40 animate-pulse" style={{ width: `${timeline.progress}%` }} />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                            Next sunrise in {timeline.timeUntilNext}
                        </p>
                    </div>
                </section>

                {/* Simulation Button (Dev Only - Admin Restricted) */}
                {isAdmin && (
                    <div className="space-y-2">
                        <button
                            onClick={handleSimulateDay}
                            disabled={simulating}
                            className="w-full py-4 px-6 rounded-2xl bg-white/50 border border-dashed border-primary/20 text-primary hover:bg-white transition-all text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            <Plus size={16} />
                            {simulating ? 'Weaving Memories...' : 'Seek a Whisper (Test)'}
                        </button>
                        {simulateError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 text-center font-medium">
                                ❌ {simulateError}
                            </div>
                        )}
                    </div>
                )}

                {/* Location + NPC widget — always shown when DR complete and day known */}
                {remembranceCompleted && data?.timeline?.currentDay != null && events.length > 0 && (
                    <div className="mb-2">
                        <DiscoveryState
                            petName={data.pet.name}
                            currentDay={data.timeline.currentDay}
                            petId={petId}
                            compact
                            letterCount={events.filter(e => e.type === 'letter_reply' || e.eventType === 'letter_reply').length}
                            friendCount={new Set(events.map(e => e.npcInvolved).filter(Boolean)).size}
                        />
                    </div>
                )}

                {/* Feed Posts */}
                <div className="space-y-8">
                    {events.length > 0 || (data?.microEvents?.length ?? 0) > 0 ? (
                        (() => {
                            const feedItems = buildFeedItems(events, data?.microEvents ?? [])
                            return feedItems.map((item, index) => {
                                const prevIsMicro = index > 0 && feedItems[index - 1].kind === 'micro'
                                if (item.kind === 'milestone') return (
                                    <ZoneMilestoneCard
                                        key={`milestone-${item.zone}`}
                                        zone={item.zone}
                                        day={item.day}
                                    />
                                )
                                if (item.kind === 'time-gap') return (
                                    <div key={`gap-${index}`} className="flex items-center gap-3 py-2 px-4">
                                        <div className="flex-1 h-px bg-slate-200" />
                                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                            {item.language === 'Korean'
                                                ? `${item.daysBetween}일이 조용히 흘렀어요`
                                                : `${item.daysBetween} quiet days passed`}
                                        </span>
                                        <div className="flex-1 h-px bg-slate-200" />
                                    </div>
                                )
                                if (item.kind === 'micro') return (
                                    <div key={item.micro.id} className={prevIsMicro ? 'mt-1' : ''}>
                                        <MicroEventCard
                                            content={item.micro.content}
                                            category={item.micro.category}
                                            timeOfDay={item.micro.time_of_day}
                                            npcInvolved={item.micro.npc_involved}
                                            createdAt={item.micro.created_at}
                                            zone={item.micro.zone}
                                            language={item.micro.language}
                                        />
                                    </div>
                                )
                                return (
                                    <EventCard
                                        key={item.event.id}
                                        event={item.event}
                                        petName={pet.name}
                                        petPhoto={pet.photos?.[0]}
                                        petId={pet.id}
                                        petPassedDate={pet.passed_date}
                                        isFirstNpcEncounter={item.isFirstNpcEncounter}
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    />
                                )
                            })
                        })()
                    ) : (
                        <div className="glass p-10 rounded-[40px] shadow-xl border-white animate-in zoom-in-95 duration-1000">
                            {remembranceCompleted && data?.timeline?.currentDay != null ? (
                                <DiscoveryState
                                    petName={data.pet.name}
                                    currentDay={data.timeline.currentDay}
                                    petId={petId}
                                    letterCount={events.filter(e => e.type === 'letter_reply' || e.eventType === 'letter_reply').length}
                                    friendCount={new Set(events.map(e => e.npcInvolved).filter(Boolean)).size}
                                />
                            ) : (
                                <EmptyFeedState drCompleted={remembranceCompleted} hasLetterSent={hasLetterSent} petId={petId} />
                            )}
                        </div>
                    )}
                </div>

                <div className="text-center pt-12 pb-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-300">
                        ✨ Memories are timeless here ✨
                    </p>
                </div>
            </main>

            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={upgradeModalOpen}
                onClose={() => setUpgradeModalOpen(false)}
                title="Subscription Required"
                message="Writing letters to your beloved pet is a premium feature. Subscribe to a plan to send heartfelt messages through the Waterway to ToThereOn World."
                redirectUrl="/pricing"
                redirectText="View Plans"
            />
        </div>
    )
}

// ─── US-009 helpers ───────────────────────────────────────────────────────────
function getLetterCta(mood: string, language: string): string {
    if (language === 'Korean') {
        const KR_MOOD_CTA: Record<string, string> = {
            longing: '그리워하고 있어요...',
            joyful: '함께 기뻐해줘요 ✨',
            nostalgic: '추억을 나눠줘요',
            peaceful: '편지를 써줘요',
            curious: '답해줄게요 🐾',
            playful: '같이 놀아요!',
        }
        return KR_MOOD_CTA[mood] || '편지 쓰기'
    }
    const EN_MOOD_CTA: Record<string, string> = {
        longing: 'They miss you...',
        joyful: 'Share in their joy ✨',
        nostalgic: 'Share a memory',
        peaceful: 'Write a letter',
        curious: "They'd love to hear from you",
        playful: 'Join the fun!',
    }
    return EN_MOOD_CTA[mood] || 'Write a Letter'
}

function getMoodKo(mood: string): string {
    const map: Record<string, string> = {
        curious: '탐험',
        peaceful: '휴식',
        joyful: '신나게 놀기',
        longing: '그리워하기',
        nostalgic: '추억 속',
        playful: '장난',
        dreamy: '꿈꾸기',
    }
    return map[mood] || '하루를 보내기'
}

interface EventCardProps {
    event: TimelineData['events'][0]
    petName: string
    petPhoto: string | undefined
    petId: string
    petPassedDate?: string | null
    isFirstNpcEncounter?: boolean
    style?: React.CSSProperties
}

function DiscoveryHeader({ petName, passedDate, toThereOnDay, isArrival }: {
    petName: string
    passedDate: string
    toThereOnDay: number
    language?: string
    isArrival?: boolean
}) {
    const passed = new Date(passedDate)
    const now = new Date()
    const realDays = Math.floor((now.getTime() - passed.getTime()) / (1000 * 60 * 60 * 24))

    // ——— ARRIVAL: Discovery banner (first post) ———
    if (isArrival) {
        return (
            <div className="mb-8 rounded-[28px] bg-gradient-to-br from-primary/8 to-indigo-100/40 border border-primary/15 p-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60 mb-3">✶ Found</div>
                <p className="text-xl font-extrabold text-slate-900 mb-3 leading-snug">
                    We found {petName}<br />in ToThereOn World.
                </p>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                    {petName} left on {passed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.<br />
                    On Earth, <span className="font-bold text-slate-700">{realDays} days</span> have passed —<br />
                    in ToThereOn World, they had already lived <span className="font-bold text-primary">Day {toThereOnDay}</span>.
                </p>
            </div>
        )
    }

    // ——— Regular events: compact English badge ———
    return (
        <div className="mb-6 rounded-[20px] bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-primary/30 px-5 py-4">
            <p className="text-sm font-bold text-slate-700 leading-relaxed">
                {petName} is on <span className="text-primary font-extrabold">Day {toThereOnDay}</span> in ToThereOn World.
            </p>
            <p className="text-[11px] text-slate-400 font-medium mt-1">
                <span className="font-bold text-slate-500">{realDays} days</span> have passed on Earth since {petName} left.
            </p>
        </div>
    )
}

function EventCard({ event, petName, petPhoto, petId, petPassedDate, isFirstNpcEncounter, style }: EventCardProps) {
    const isArrival = event.eventType === 'arrival'

    // FIX 2: 텍스트를 단락으로 분리
    // LLM이 \n 또는 '. '로 구분한 텍스트를 각 <p>로 렬더링
    const paragraphs = (event.description || '')
        .split(/\n{1,}/)
        .map(s => s.trim())
        .filter(Boolean)

    return (
        <article
            className="glass rounded-[40px] p-8 md:p-10 shadow-2xl border-white hover:border-primary/20 transition-all duration-500 group animate-in slide-in-from-bottom-12"
            style={style}
        >
            {/* FIX 1: Discovery Header — 모든 이벤트에 표시, isArrival에 따라 스타일 다름 */}
            {petPassedDate && (
                <DiscoveryHeader
                    petName={petName}
                    passedDate={petPassedDate}
                    toThereOnDay={event.toThereOnDay}
                    language={event.language}
                    isArrival={isArrival}
                />
            )}

            {/* Post Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-md relative">
                        {petPhoto ? (
                            <Image src={petPhoto} alt={petName} fill className="object-cover" sizes="48px" />
                        ) : (
                            <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-2xl">🐾</div>
                        )}
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-slate-900 tracking-tight">{petName}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-slate-400">
                            DAY +{event.toThereOnDay} · {ZONE_DISPLAY_NAMES[event.zone] ?? event.zoneName ?? event.zone} ({format(new Date(event.createdAt), 'yyyy.MM.dd')})
                        </span>
                    </div>
                </div>
                {event.mood && (
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white shadow-sm border border-slate-100 ${MOOD_COLORS[event.mood]?.replace('bg-', 'text-').replace('text-', '') || 'text-slate-500'}`}>
                        {MOOD_LABELS[event.mood] || event.mood}
                    </span>
                )}
            </div>

            {/* Post Content — FIX 2: 단락 d84리로 가독성 향상 */}
            <div className="prose prose-slate max-w-none mb-8 space-y-4">
                {paragraphs.map((para, i) => (
                    <p
                        key={i}
                        className="text-lg md:text-xl text-slate-600 leading-[1.85] font-medium opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                        <FeedTextWithTooltips text={para} />
                    </p>
                ))}
            </div>

            {/* NPC Tag — shown only when an NPC was involved */}
            {event.npcInvolved && (() => {
                const tag = getNpcTag(event.npcInvolved, event.language)
                if (!tag) return null
                return (
                    <div className="flex items-center gap-2 px-4 py-2.5 mb-6 bg-slate-50/80 rounded-2xl border border-slate-100 w-fit">
                        <span className="text-base leading-none">{tag.emoji}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{tag.label}</span>
                        <span className="text-slate-200 text-[11px]">·</span>
                        <span className="text-[11px] font-bold text-slate-600">{tag.name}</span>
                        <span className="text-slate-200 text-[11px]">·</span>
                        <span className="text-[11px] text-slate-400">{tag.species}</span>
                        {isFirstNpcEncounter && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 ml-2">
                                ✨ 첫 만남
                            </span>
                        )}
                    </div>
                )
            })()}

            {/* Interaction Bar */}
            <div className="flex items-center justify-between pt-8 border-t border-slate-100">
                <div className="flex items-center gap-6">
                    <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-pink-500 transition-colors">
                        <Heart size={16} />
                        <span>Send Love</span>
                    </button>
                    <Link
                        href={`/dashboard/pets/${petId}/mailbox`}
                        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors"
                    >
                        <MessageCircle size={16} />
                        <span>{getLetterCta(event.mood || '', event.language || 'English')}</span>
                    </Link>
                </div>
                <div className="hidden md:block">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-200">Whispered through the Waterway</span>
                </div>
            </div>

            {/* Comment Thread — SNS-style guardian notes + pet replies */}
            <CommentThread eventId={event.id} petId={petId} petName={petName} />
        </article>
    )
}

// Empty Feed State — 3-way branching based on onboarding progress
function EmptyFeedState({ drCompleted, hasLetterSent, petId }: { drCompleted?: boolean; hasLetterSent?: boolean; petId: string }) {
    if (!drCompleted) {
        return (
            <div className="text-center py-12 px-6">
                <p className="text-gray-600 mb-4">Your pet is waiting to truly arrive in ToThereOn World.</p>
                <p className="text-sm text-gray-500 mb-6">Complete Deep Remembrance so they can begin their life on the other side of the Waterway.</p>
                <a href={`/dashboard/pets/${petId}/remembrance`} className="inline-block bg-amber-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-amber-700 transition-colors">
                    Begin Deep Remembrance →
                </a>
            </div>
        )
    }
    if (!hasLetterSent) {
        return (
            <div className="space-y-4">
                <p className="text-center text-gray-500 text-sm">Your pet has just arrived. Their first news is being written.</p>
                <div className="grid grid-cols-1 gap-3">
                    {[
                        { title: 'Crystal Meadow', desc: 'Where new arrivals first open their eyes to the world.' },
                        { title: 'Eternity Forest', desc: 'Ancient trees that remember everything.' },
                        { title: 'Crystal Lake', desc: 'The still water where memories surface.' },
                    ].map(place => (
                        <div key={place.title} className="bg-amber-50 rounded-lg p-4">
                            <h4 className="font-medium text-gray-800 text-sm">{place.title}</h4>
                            <p className="text-xs text-gray-500 mt-1">{place.desc}</p>
                        </div>
                    ))}
                </div>
                <p className="text-center text-xs text-gray-400">First news expected within 24 hours of Deep Remembrance.</p>
            </div>
        )
    }
    return (
        <div className="text-center py-12 px-6">
            <p className="text-gray-600 mb-2">Your pet has been sharing their days.</p>
            <p className="text-sm text-gray-500 mb-6">They are waiting to hear from you too.</p>
            <a href={`/dashboard/pets/${petId}/write`} className="inline-block bg-amber-600 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-amber-700 transition-colors">
                Write them a letter →
            </a>
        </div>
    )
}

// Skeleton Loader
function FeedSkeleton() {
    return (
        <div className="pet-feed-page">
            <header className="feed-header">
                <div className="skeleton-avatar" style={{ width: 40, height: 40 }} />
                <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="skeleton-line skeleton-line--medium" />
                    <div className="skeleton-line skeleton-line--short" />
                </div>
                <div className="skeleton-avatar" style={{ width: 40, height: 40 }} />
            </header>

            <div className="pet-feed-container">
                <div className="feed-skeleton">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="feed-skeleton-item">
                            <div className="skeleton-header">
                                <div className="skeleton-avatar" />
                                <div className="skeleton-info">
                                    <div className="skeleton-line skeleton-line--medium" />
                                    <div className="skeleton-line skeleton-line--short" />
                                </div>
                            </div>
                            <div className="skeleton-content">
                                <div className="skeleton-line skeleton-line--long" />
                                <div className="skeleton-line skeleton-line--medium" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
