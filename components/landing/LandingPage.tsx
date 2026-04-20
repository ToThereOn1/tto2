'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Play, Heart, Sparkles, PawPrint, Mail, ChevronDown, Clock } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { AuroraOrb } from '@/components/ui/AuroraOrb'
import { StardustCursor } from '@/components/ui/StardustCursor'
import { PricingSection } from '@/components/pricing/PricingSection'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { cn } from '@/lib/utils'

interface LandingPageProps {
    isLoggedIn: boolean
    userName?: string
    defaultPetId?: string
    canAddPet?: boolean
    canWriteLetter?: boolean
}

const PET_DATA = {
    luna: {
        id: 'luna',
        name: 'Luna',
        status: 'Day 7 in ToThereOn World',
        avatar: '/pet-luna.png',
        color: 'blue',
        timeline: [
            {
                day: 'DAY 7 - MORNING',
                content:
                    'Luna discovered the Crystal Meadow today. After chasing shimmering butterflies for an hour, she came home and settled beneath the sofa where her sister used to lie. Her tail swayed gently as she remembered the snack crumbs her sister would leave behind, watching the fountain sparkle outside the window.',
            },
            {
                day: 'DAY 6 - AFTERNOON',
                content:
                    "Thanks to the letter from her sister yesterday, Luna walked an extra hour today. She returned home with her tail wagging vigorously, full of energy and joy. After her afternoon stroll, Luna sat by the small pond in the garden, gazing at her sister through the Reflection Pool and thinking about what to tell her.",
            },
        ],
    },
    oliver: {
        id: 'oliver',
        name: 'Oliver',
        status: 'Day 14 in ToThereOn World',
        avatar: '/pet-oliver.png',
        color: 'indigo',
        timeline: [
            {
                day: 'DAY 14 - EVENING',
                content:
                    "Oliver sat by the Reflection Pool as the evening light turned golden. He watched Dad through the shimmering water—saw the weariness in his shoulders, the way his hand rested on the table with fingers slightly curled. It was 6:47 PM, the exact moment the news always ended. He pressed his paw against the edge of the pool, wishing his touch could cross the distance between worlds.",
            },
            {
                day: 'DAY 13 - AFTERNOON',
                content:
                    'Oliver walked to the edge of Sunset Hill today, and kept going until he reached the highest point where the whole valley spread beneath him. Dad\'s letter from yesterday still echoed in his chest. Oliver lay down in the tall grass and let the wind move through his fur. He closed his eyes. I hear you, Dad. I hear every word.',
            },
        ],
    },
}

// ── Thin gradient section divider ──
function SectionDivider() {
    return (
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent mx-8 md:mx-32" />
    )
}

export function LandingPage({ isLoggedIn, userName, defaultPetId, canAddPet = true, canWriteLetter = false }: LandingPageProps) {
    const [selectedPet, setSelectedPet] = useState<keyof typeof PET_DATA>('luna')
    const [upgradeModalType, setUpgradeModalType] = useState<'pet' | 'letter' | null>(null)
    const currentPet = PET_DATA[selectedPet]
    const ctaLink = isLoggedIn ? '/dashboard' : '/login'

    const staggerContainer = {
        animate: { transition: { staggerChildren: 0.1 } },
    }

    const fadeInUp = {
        initial: { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: { type: 'spring' as const, stiffness: 80, damping: 18 },
    }

    return (
        <main className="min-h-screen overflow-x-hidden" style={{ background: 'var(--color-background)' }}>
            <StardustCursor />

            {/* ══════════════════════════════════════════
                HERO SECTION
            ══════════════════════════════════════════ */}
            <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
                {/* Layered ambient glow — sets the sky/ethereal mood */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-12%] left-[12%] w-[650px] h-[650px] rounded-full bg-sky-300/[0.11] blur-[130px]" />
                    <div className="absolute top-[25%] right-[-6%] w-[500px] h-[500px] rounded-full bg-cyan-200/[0.09] blur-[110px]" />
                    <div className="absolute bottom-[-8%] left-[3%] w-[600px] h-[600px] rounded-full bg-sky-100/[0.10] blur-[140px]" />
                    <div className="absolute top-[55%] left-[42%] w-[450px] h-[450px] rounded-full bg-indigo-100/[0.07] blur-[100px]" />
                </div>

                {/* Scattered AuroraOrbs — decorative depth */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[8%] left-[4%] opacity-50">
                        <AuroraOrb size={88} />
                    </div>
                    <div className="absolute top-[10%] right-[4%] opacity-35">
                        <AuroraOrb size={64} />
                    </div>
                    <div className="absolute bottom-[16%] left-[6%] opacity-40">
                        <AuroraOrb size={112} />
                    </div>
                    <div className="absolute bottom-[20%] right-[5%] opacity-[0.28]">
                        <AuroraOrb size={76} />
                    </div>
                    <div className="absolute top-[48%] right-[1.5%] opacity-[0.20]">
                        <AuroraOrb size={52} />
                    </div>
                </div>

                {/* Hero copy */}
                <motion.div
                    className="relative z-10 text-center max-w-3xl mx-auto w-full pt-24"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                >
                    {/* Glass pill badge */}
                    <motion.div
                        variants={fadeInUp}
                        className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/70 backdrop-blur-md border border-white/60 text-sm font-semibold text-sky-600 shadow-sm"
                    >
                        <Sparkles className="w-4 h-4" />
                        Into ToThereOn World
                    </motion.div>

                    <motion.h1
                        variants={fadeInUp}
                        className="font-sans font-bold tracking-[-0.03em] text-slate-900 text-5xl md:text-6xl lg:text-7xl leading-[1.08] mb-8"
                    >
                        Your Pet Lives On —
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-blue-500 to-cyan-400">
                            A Digital Memorial
                        </span>
                        <br />
                        A Place in ToThereOn World
                    </motion.h1>

                    <motion.p
                        variants={fadeInUp}
                        className="text-lg md:text-xl text-slate-500/90 mb-12 max-w-xl mx-auto leading-relaxed"
                    >
                        Receive heartfelt AI-generated letters from your beloved pet — personalized for pet loss healing and crafted from your shared memories.
                    </motion.p>

                    {/* CTA buttons */}
                    <motion.div
                        variants={fadeInUp}
                        className="flex flex-wrap items-center justify-center gap-4 mb-10"
                    >
                        <motion.button
                            onClick={(e) => {
                                if (isLoggedIn && !canAddPet) {
                                    e.preventDefault();
                                    setUpgradeModalType('pet');
                                } else if (!isLoggedIn) {
                                    window.location.href = '/login';
                                } else {
                                    window.location.href = '/dashboard/register';
                                }
                            }}
                            whileHover={{ scale: 1.03, boxShadow: '0 20px 40px -12px rgba(14,165,233,0.42)' }}
                            whileTap={{ scale: 0.97 }}
                            className="button-primary px-8 py-4 rounded-full flex items-center gap-2 font-semibold text-base cursor-pointer"
                        >
                            Register Your Pet (Free) <ArrowRight className="w-5 h-5" />
                        </motion.button>
                        <Link href="#explore">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                className="px-8 py-4 rounded-full bg-white/70 backdrop-blur-md border border-white/60 hover:bg-white/90 transition-all flex items-center gap-2 font-medium text-base text-slate-600 shadow-sm cursor-pointer"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                See How It Works
                            </motion.button>
                        </Link>
                    </motion.div>

                    {/* Trust indicators */}
                    <motion.div
                        variants={fadeInUp}
                        className="flex items-center justify-center gap-5 flex-wrap"
                    >
                        {[
                            { dot: 'bg-green-400', label: 'Free to start' },
                            { dot: 'bg-sky-400', label: 'Letters every 3 days' },
                            { dot: 'bg-violet-400', label: 'AI-powered persona' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                {i > 0 && <div className="w-px h-3.5 bg-slate-200 mr-1" />}
                                <div className={cn('w-1.5 h-1.5 rounded-full', item.dot)} />
                                {item.label}
                            </div>
                        ))}
                    </motion.div>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4 }}
                >
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-300">
                        Scroll
                    </span>
                    <motion.div
                        animate={{ y: [0, 6, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <ChevronDown className="w-4 h-4 text-slate-300" />
                    </motion.div>
                </motion.div>
            </section>

            <SectionDivider />

            {/* ══════════════════════════════════════════
                TIME RATIO — "7 = 1"
            ══════════════════════════════════════════ */}
            <section className="py-40 relative overflow-hidden">
                {/* Centered ambient glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-sky-300/[0.08] blur-[140px]" />
                </div>

                <div className="container relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.8 }}
                        className="text-center"
                    >
                        {/* Glass section pill */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/70 backdrop-blur-md border border-white/60 text-sm font-semibold text-sky-600 shadow-sm">
                            <Clock className="w-4 h-4" />
                            Their Time Is Now
                        </div>

                        <h2 className="font-sans font-bold tracking-[-0.03em] text-slate-900 text-4xl md:text-5xl lg:text-6xl leading-[1.08] mb-6 max-w-2xl mx-auto">
                            A Living Time-Flow Simulation —{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
                                Built for Pet Loss Healing
                            </span>
                        </h2>

                        <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed mb-16">
                            Every 3 days in our world equals 1 day in theirs. Powered by an AI-driven persona engine trained on your pet&apos;s unique traits, habits, and memories, ToThereOn creates a continuously evolving digital afterlife — not a static tribute, but a living sanctuary.
                        </p>

                        {/* Large glass pill ratio display */}
                        <div className="inline-flex items-center rounded-[36px] bg-white/65 backdrop-blur-2xl border border-white/50 shadow-2xl shadow-black/[0.06] overflow-hidden">
                            <div className="text-center px-14 py-10 md:px-20">
                                <div className="text-8xl md:text-9xl font-black text-sky-500 tracking-tighter font-sans leading-none mb-4">
                                    3
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-400">
                                    Your Days
                                </div>
                            </div>
                            <div className="self-stretch w-px bg-slate-100/80" />
                            <div className="px-10 md:px-14 py-10 text-center">
                                <div className="text-4xl font-black text-slate-200 leading-none">=</div>
                            </div>
                            <div className="self-stretch w-px bg-slate-100/80" />
                            <div className="text-center px-14 py-10 md:px-20">
                                <div className="text-8xl md:text-9xl font-black text-slate-800 tracking-tighter font-sans leading-none mb-4">
                                    1
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-slate-400">
                                    Their Day
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <SectionDivider />

            {/* ══════════════════════════════════════════
                FEATURE CARDS — How It Works
            ══════════════════════════════════════════ */}
            <section className="py-40 relative overflow-hidden">
                {/* Ambient — violet top-left, sky bottom-right */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[-5%] left-[15%] w-[550px] h-[550px] rounded-full bg-violet-100/[0.10] blur-[130px]" />
                    <div className="absolute bottom-[-5%] right-[10%] w-[450px] h-[450px] rounded-full bg-sky-200/[0.09] blur-[110px]" />
                </div>

                <div className="container relative z-10">
                    {/* Section header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-20"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/70 backdrop-blur-md border border-white/60 text-sm font-semibold text-sky-600 shadow-sm">
                            <Sparkles className="w-4 h-4" />
                            How It Works
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                            Three steps to reconnect
                        </h2>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-7 items-end"
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-80px' }}
                    >
                        {/* Card 1 — sky */}
                        <motion.div
                            variants={fadeInUp}
                            className="group relative flex flex-col rounded-[28px] bg-white/65 backdrop-blur-xl border border-white/50 p-10 shadow-lg shadow-black/[0.04] hover:shadow-xl hover:shadow-sky-500/[0.08] hover:-translate-y-2 transition-all duration-300 cursor-pointer"
                            onClick={(e) => {
                                if (isLoggedIn && !canAddPet) {
                                    e.preventDefault();
                                    setUpgradeModalType('pet');
                                } else if (!isLoggedIn) {
                                    window.location.href = '/signup';
                                } else {
                                    window.location.href = '/dashboard/register';
                                }
                            }}
                        >
                            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-sky-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            <div className="relative">
                                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-sky-400 mb-5">
                                    Step 01
                                </div>
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-7 bg-sky-50/80 backdrop-blur-sm border border-sky-100/60 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                    <PawPrint className="w-7 h-7 text-sky-500" />
                                </div>
                                <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-4">
                                    Register Pet
                                </h3>
                                <p className="text-slate-500 leading-relaxed text-[15px] mb-8">
                                    Start your pet&apos;s AI memorial journey. Add their name, breed, and photos to begin.
                                </p>
                                <div className="text-sky-600 font-bold text-sm flex items-center gap-1.5 group-hover:gap-3 transition-all duration-200 cursor-pointer relative z-10">
                                    Start Registration <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </motion.div>

                        {/* Card 2 — violet, elevated for visual rhythm */}
                        <motion.div
                            variants={fadeInUp}
                            className="group relative flex flex-col rounded-[28px] bg-white/70 backdrop-blur-xl border border-white/60 p-10 shadow-xl shadow-violet-500/[0.08] hover:shadow-2xl hover:shadow-violet-500/[0.12] hover:-translate-y-2 transition-all duration-300 cursor-pointer md:-translate-y-5 md:mb-[-20px]"
                        >
                            {/* Slightly stronger glow for center card */}
                            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-violet-50/60 to-transparent opacity-60" />
                            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-violet-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative">
                                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-400 mb-5">
                                    Step 02
                                </div>
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-7 bg-violet-50/80 backdrop-blur-sm border border-violet-100/60 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                    <Heart className="w-7 h-7 text-violet-500" />
                                </div>
                                <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-4">
                                    Deep Remembrance
                                </h3>
                                <p className="text-slate-500 leading-relaxed text-[15px] mb-8">
                                    Share your pet&apos;s personality and memories. Our AI uses these to build a deeply personalized pet persona — so every letter truly sounds like them.
                                </p>
                                <Link href={isLoggedIn ? '/dashboard/remembrance' : '/signup'}>
                                    <div className="text-violet-600 font-bold text-sm flex items-center gap-1.5 group-hover:gap-3 transition-all duration-200 cursor-pointer">
                                        Recall Memories <ArrowRight className="w-4 h-4" />
                                    </div>
                                </Link>
                            </div>
                        </motion.div>

                        {/* Card 3 — slate/locked */}
                        <motion.div
                            variants={fadeInUp}
                            className="group relative flex flex-col rounded-[28px] bg-white/65 backdrop-blur-xl border border-white/50 p-10 shadow-lg shadow-black/[0.04] hover:shadow-xl hover:shadow-black/[0.07] hover:-translate-y-2 transition-all duration-300 cursor-pointer"
                            onClick={() => {
                                if (!isLoggedIn) {
                                    window.location.href = '/pricing';
                                } else {
                                    window.location.href = '/dashboard/letters';
                                }
                            }}
                        >
                            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            <div className="relative">
                                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-5">
                                    Step 03
                                </div>
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-7 bg-slate-50/80 backdrop-blur-sm border border-slate-100/60 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                    <Mail className="w-7 h-7 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-extrabold tracking-tight text-slate-900 mb-4">
                                    Write a Letter
                                </h3>
                                <p className="text-slate-500 leading-relaxed text-[15px] mb-8">
                                    Send a message and receive a heartfelt reply from your pet&apos;s digital self. A meaningful way to cope with pet loss, one letter at a time.
                                </p>
                                <div className="text-slate-700 font-bold text-sm flex items-center gap-1.5 group-hover:gap-3 transition-all duration-200 cursor-pointer relative z-10">
                                    Message to My Dear
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            <SectionDivider />

            {/* ══════════════════════════════════════════
                WORLD PREVIEW BANNER
            ══════════════════════════════════════════ */}
            <section className="py-40 relative overflow-hidden">
                {/* Ambient — sky right, amber left */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-sky-200/[0.11] blur-[130px]" />
                    <div className="absolute bottom-[5%] left-[5%] w-[450px] h-[450px] rounded-full bg-amber-100/[0.09] blur-[110px]" />
                </div>

                <div className="container relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.8 }}
                        className="relative overflow-hidden rounded-[40px] bg-white/65 backdrop-blur-2xl border border-white/50 shadow-2xl shadow-black/[0.07]"
                    >
                        {/* Inner gradient layers for depth */}
                        <div className="absolute inset-0 pointer-events-none -z-10">
                            <div className="absolute top-0 right-0 w-[65%] h-full bg-gradient-to-l from-sky-50/50 to-transparent" />
                            <div className="absolute bottom-0 left-0 w-[40%] h-[60%] bg-gradient-to-tr from-amber-50/30 to-transparent" />
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-12 px-10 md:px-16 lg:px-24 py-20">
                            <div className="flex-1 space-y-7 relative z-10">
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-md border border-white/60 text-sm font-semibold text-sky-600 shadow-sm">
                                    <Mail className="w-4 h-4" />
                                    Letters Waiting
                                </div>
                                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                                    Heartfelt Pet Memorial Letters —{' '}
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-cyan-400">
                                        Arriving Every Week
                                    </span>
                                </h2>
                                <p className="text-lg text-slate-500 leading-relaxed max-w-md">
                                    They&apos;re watching you. Waiting to hear from you.
                                    <br /><br />
                                    Every week, a new letter arrives — filled with stories of their days, memories of you, and the love that never fades. ToThereOn&apos;s AI-driven simulation builds on your pet&apos;s unique personality profile, ensuring every message reflects the companion you knew and loved.
                                    <br /><br />
                                    This is pet loss support unlike anything else: a living, breathing digital memorial that grows alongside your grief — and your healing.
                                </p>
                                <Link href="/dashboard" className="inline-flex items-center gap-2 font-bold text-sky-600 group text-base">
                                    Explore the Sanctuary
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>

                            {/* Stacked glass feature pills */}
                            <div className="flex-shrink-0 w-full md:w-72 flex flex-col gap-3">
                                {[
                                    { icon: Clock, label: 'Time-flowing world', desc: 'Unique timeline per pet' },
                                    { icon: Mail, label: 'Weekly letters', desc: 'Handcrafted by AI persona' },
                                    { icon: Heart, label: 'Deep persona', desc: 'Built from your memories' },
                                ].map((item, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: 24 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 + 0.3, duration: 0.5 }}
                                        className="flex items-center gap-4 bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl px-5 py-4 shadow-sm"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-sky-50/80 border border-sky-100/50 flex items-center justify-center flex-shrink-0">
                                            <item.icon className="w-5 h-5 text-sky-500" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{item.label}</div>
                                            <div className="text-xs text-slate-400 font-medium">{item.desc}</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            <SectionDivider />

            {/* ══════════════════════════════════════════
                INTERACTIVE DEMO
            ══════════════════════════════════════════ */}
            <section className="py-40 container relative z-10" id="explore">
                {/* Ambient — indigo/purple */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                    <div className="absolute top-[0%] left-[25%] w-[500px] h-[500px] rounded-full bg-indigo-100/[0.08] blur-[120px]" />
                    <div className="absolute bottom-[0%] right-[20%] w-[400px] h-[400px] rounded-full bg-sky-200/[0.07] blur-[100px]" />
                </div>

                {/* Section header */}
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-80px' }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase mb-6 bg-white/70 backdrop-blur-md border border-white/60 text-sky-600 tracking-wider shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 bg-sky-500 animate-ping" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                            </span>
                            See It In Action
                        </div>
                        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
                            See How AI Pet Memorial Letters Are Created
                        </h2>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                            Watch how their story unfolds week by week in ToThereOn World — a personalized digital sanctuary for pet loss healing. Every 3 days in our world equals 1 day in theirs.
                        </p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Pet selector sidebar */}
                    <div className="lg:col-span-4 space-y-3">
                        {Object.values(PET_DATA).map((pet) => (
                            <button
                                key={pet.id}
                                onClick={() => setSelectedPet(pet.id as keyof typeof PET_DATA)}
                                className={cn(
                                    'w-full text-left p-4 rounded-[24px] transition-all duration-300 cursor-pointer',
                                    selectedPet === pet.id
                                        ? 'bg-white/80 backdrop-blur-xl border-2 border-sky-400/60 shadow-xl shadow-sky-500/[0.10] scale-[1.02]'
                                        : 'bg-white/50 backdrop-blur-md border border-white/50 opacity-60 hover:opacity-90 hover:bg-white/65'
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={cn(
                                            'w-14 h-14 rounded-2xl overflow-hidden transition-all duration-500 relative flex-shrink-0',
                                            selectedPet === pet.id
                                                ? 'scale-110 shadow-md shadow-sky-500/20 ring-2 ring-sky-400/40'
                                                : 'grayscale opacity-70'
                                        )}
                                    >
                                        <Image
                                            src={pet.avatar}
                                            alt={pet.name}
                                            fill
                                            className="object-cover object-center"
                                            sizes="56px"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-extrabold tracking-tight text-base text-slate-900">
                                            {pet.name}
                                        </h4>
                                        <p className="text-xs font-semibold text-slate-400 tracking-wide">
                                            {pet.status}
                                        </p>
                                    </div>
                                    {selectedPet === pet.id && (
                                        <ArrowRight className="w-4 h-4 text-sky-500" />
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Timeline feed */}
                    <div className="lg:col-span-8">
                        <div className="bg-white/65 backdrop-blur-2xl rounded-[36px] p-8 md:p-10 min-h-[500px] border border-white/50 shadow-xl shadow-black/[0.05] relative overflow-hidden">
                            {/* Inner gradient */}
                            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-sky-50/30 to-transparent pointer-events-none" />

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedPet}
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -16 }}
                                    transition={{ duration: 0.35 }}
                                >
                                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100/80">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                                            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">
                                                {currentPet.name}&apos;s Pet Memorial Timeline — Day-by-Day in ToThereOn World
                                            </h3>
                                        </div>
                                        <button className="px-4 py-1.5 rounded-full border border-slate-200 text-sm font-semibold hover:bg-white/80 transition-colors text-slate-500 cursor-pointer">
                                            See All
                                        </button>
                                    </div>

                                    <motion.div
                                        variants={staggerContainer}
                                        initial="initial"
                                        animate="animate"
                                        className="space-y-10 relative pl-10"
                                    >
                                        <div className="absolute top-2 bottom-2 left-[18px] w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
                                        {currentPet.timeline.map((item, idx) => (
                                            <motion.div
                                                key={`${selectedPet}-${idx}`}
                                                variants={fadeInUp}
                                                className="relative"
                                            >
                                                <div
                                                    className={cn(
                                                        'absolute -left-[40px] top-[6px] w-5 h-5 rounded-full bg-white border-[3px] shadow-md z-10',
                                                        currentPet.color === 'blue'
                                                            ? 'border-sky-500 shadow-sky-500/20'
                                                            : 'border-indigo-500 shadow-indigo-500/20'
                                                    )}
                                                />
                                                <div className="flex flex-col gap-2">
                                                    <span
                                                        className={cn(
                                                            'text-[10px] font-bold uppercase tracking-[0.2em]',
                                                            currentPet.color === 'blue' ? 'text-sky-500' : 'text-indigo-500'
                                                        )}
                                                    >
                                                        {item.day}
                                                    </span>
                                                    <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm border border-white/70">
                                                        <p className="text-slate-600 leading-relaxed text-[15px]">
                                                            {item.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </section>

            <SectionDivider />

            {/* ══════════════════════════════════════════
                FAQ
            ══════════════════════════════════════════ */}
            <section className="py-40 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-violet-100/[0.08] blur-[130px]" />
                </div>
                <div className="container relative z-10 max-w-3xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/70 backdrop-blur-md border border-white/60 text-sm font-semibold text-sky-600 shadow-sm">
                            <Sparkles className="w-4 h-4" />
                            How It Works
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                            How ToThereOn Works — Your Questions Answered
                        </h2>
                    </motion.div>
                    <FaqAccordion />
                </div>
            </section>

            <SectionDivider />

            {/* ══════════════════════════════════════════
                PRICING
            ══════════════════════════════════════════ */}
            <section id="pricing" className="py-40 container relative z-10">
                <PricingSection
                    isLoggedIn={isLoggedIn}
                    showTitle={true}
                    className="bg-white/50 backdrop-blur-xl rounded-[64px] border border-white/40 shadow-xl shadow-black/[0.04]"
                />
            </section>

            {/* ══════════════════════════════════════════
                FOOTER
            ══════════════════════════════════════════ */}
            <footer className="border-t border-slate-100 py-16">
                <div className="container">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center">
                            <Image
                                src="/logo-ci.svg"
                                alt="ToThereOn"
                                width={150}
                                height={40}
                                className="flex-shrink-0 h-8 w-auto"
                            />
                        </div>
                        <div className="flex flex-wrap gap-8 text-sm font-medium text-slate-400">
                            <Link href="/privacy" className="hover:text-sky-600 transition-colors">
                                Privacy Policy
                            </Link>
                            <Link href="/terms" className="hover:text-sky-600 transition-colors">
                                Terms of Service
                            </Link>
                            <Link href="/faq" className="hover:text-sky-600 transition-colors">
                                FAQ
                            </Link>
                            <Link href="mailto:support@tothereon.world" className="hover:text-sky-600 transition-colors">
                                Support
                            </Link>
                        </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200/60 to-transparent my-10" />
                    <p className="text-center text-xs text-slate-400">
                        © 2026 ToThereOn World. A Digital Sanctuary for Pet Loss Healing — Where Love Lives Forever.
                    </p>
                </div>
            </footer>
            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={upgradeModalType !== null}
                onClose={() => setUpgradeModalType(null)}
                title={upgradeModalType === 'pet' ? "Pet Limit Reached" : "Letter Quota Reached"}
                message={
                    upgradeModalType === 'pet'
                        ? "You have reached the pet limit for your current plan. Upgrade to a higher tier to add another companion to ToThereOn World."
                        : "You have used all your letters for this period. Upgrade to a higher tier to send more messages to your beloved pets."
                }
                redirectUrl={upgradeModalType === 'pet' ? "/settings?tab=subscription" : "/pricing"}
                redirectText="Upgrade Plan"
            />
        </main >
    )
}

const FAQ_ITEMS = [
    {
        q: 'What is ToThereOn?',
        a: "ToThereOn is an AI-powered digital pet memorial and sanctuary. After registering your pet, our AI builds a personalized persona based on their unique traits and your shared memories — then sends you weekly letters written from their perspective, helping you navigate pet loss grief.",
    },
    {
        q: 'How are the letters personalized?',
        a: "Using an AI-driven persona engine, we analyze your pet's personality, habits, and memories you've shared through our Deep Remembrance process. Every letter is uniquely crafted — not a generic template, but a message that sounds like the companion you knew.",
    },
    {
        q: 'What does "3 days = 1 day" mean?',
        a: "In ToThereOn World, time flows differently. Every 3 real-world days equals 1 day in your pet's digital afterlife. This means you'll receive a new letter every 3 days — each one continuing the evolving story of their life through the Waterway.",
    },
    {
        q: 'Is this a pet loss grief support service?',
        a: "Yes, in a meaningful sense. ToThereOn is designed for those experiencing the pain of losing a beloved pet. Our service provides a gentle, ongoing way to reconnect, remember, and heal — at your own pace.",
    },
    {
        q: 'Can I try it for free?',
        a: "Absolutely. Register your pet and watch their journey unfold in ToThereOn World — no payment required. Upgrade anytime to send and receive personalized letters.",
    },
]

function FaqAccordion() {
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <div className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, duration: 0.5 }}
                    className="rounded-[20px] bg-white/65 backdrop-blur-xl border border-white/50 shadow-sm overflow-hidden"
                >
                    <button
                        onClick={() => setOpenIndex(openIndex === i ? null : i)}
                        className="w-full text-left px-7 py-5 flex items-center justify-between gap-4 cursor-pointer"
                        aria-expanded={openIndex === i}
                    >
                        <span className="font-bold text-slate-900 text-base leading-snug">{item.q}</span>
                        <motion.div
                            animate={{ rotate: openIndex === i ? 180 : 0 }}
                            transition={{ duration: 0.25 }}
                            className="flex-shrink-0"
                        >
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                        </motion.div>
                    </button>
                    <AnimatePresence initial={false}>
                        {openIndex === i && (
                            <motion.div
                                key="content"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <p className="px-7 pb-6 text-slate-500 leading-relaxed text-[15px]">{item.a}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            ))}
        </div>
    )
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    )
}
