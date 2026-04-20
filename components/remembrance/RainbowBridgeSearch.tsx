'use client'

import React, { useEffect, useRef, useState, Component, ErrorInfo, ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'

interface RainbowBridgeSearchProps {
    petName: string
    petPhotoUrl?: string | null
    onComplete: () => void
}

interface ErrorBoundaryProps {
    children: ReactNode
    fallback?: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
}

export class RainbowBridgeErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(_: Error): ErrorBoundaryState {
        return { hasError: true }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('RainbowBridgeSearch error:', error, info)
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? null
        }
        return this.props.children
    }
}

const STARS = Array.from({ length: 60 }, (_, i) => ({
    id: i, x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 2 + 1, delay: Math.random() * 2,
}))

const STAGE_TIMES = [0, 2000, 4000, 7000, 10000, 12000, 15000] as const
const SKIP_UNLOCK_MS = 8000

export default function RainbowBridgeSearch({
    petName,
    petPhotoUrl,
    onComplete,
}: RainbowBridgeSearchProps) {
    const prefersReduced = useReducedMotion()
    const [stage, setStage] = useState(0)
    const [skipVisible, setSkipVisible] = useState(false)
    const [photoError, setPhotoError] = useState(false)
    const [typedText, setTypedText] = useState('')
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

    const searchText = `Searching for ${petName} through the Waterway...`

    // ── Reduced-motion path: 3-second compressed sequence ─────────────────
    useEffect(() => {
        if (!prefersReduced) return

        const stages = [0, 1, 2, 3, 4, 5]
        const interval = 500
        stages.forEach((s, i) => {
            const t = setTimeout(() => setStage(s), i * interval)
            timeoutsRef.current.push(t)
        })
        const skipT = setTimeout(() => setSkipVisible(true), 1500)
        timeoutsRef.current.push(skipT)
        const doneT = setTimeout(() => onComplete(), 3000)
        timeoutsRef.current.push(doneT)

        return () => timeoutsRef.current.forEach(clearTimeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefersReduced])

    // ── Full animation path ────────────────────────────────────────────────
    useEffect(() => {
        if (prefersReduced) return

        STAGE_TIMES.slice(1).forEach((ms, i) => {
            const t = setTimeout(() => setStage(i + 1), ms)
            timeoutsRef.current.push(t)
        })

        const skipT = setTimeout(() => setSkipVisible(true), SKIP_UNLOCK_MS)
        timeoutsRef.current.push(skipT)

        const doneT = setTimeout(() => onComplete(), 15000) // auto-complete at 15s
        timeoutsRef.current.push(doneT)

        return () => timeoutsRef.current.forEach(clearTimeout)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefersReduced])

    // ── Typewriter for stage 2 ─────────────────────────────────────────────
    useEffect(() => {
        if (stage !== 2) return
        setTypedText('')
        let i = 0
        const tick = setInterval(() => {
            i++
            setTypedText(searchText.slice(0, i))
            if (i >= searchText.length) clearInterval(tick)
        }, 50)
        return () => clearInterval(tick)
    }, [stage, searchText])

    // ── Mobile haptics on stage 5 ──────────────────────────────────────────
    useEffect(() => {
        if (stage === 5) {
            try {
                navigator.vibrate?.([100, 50, 100])
            } catch {
                // vibration not supported
            }
        }
    }, [stage])

    // ── Background gradient per stage ─────────────────────────────────────
    const BG = ['linear-gradient(180deg,#0a0e1a,#050810)','linear-gradient(180deg,#0a0e1a,#050810)','linear-gradient(180deg,#0d1226,#070b18)','linear-gradient(180deg,#0d1226,#2d1b4e 50%,#1a1a2e)','linear-gradient(180deg,#2d1b4e,#7c3f00 50%,#f59e0b22)','linear-gradient(180deg,#fbbf24,#f59e0b 40%,#fed7aa)','linear-gradient(180deg,#fef3c7,#fde68a 40%,#fef9ee)']
    const bgStyle = { background: BG[Math.min(stage, 6)] }

    const showPhoto = stage >= 5 && petPhotoUrl && !photoError

    if (prefersReduced) {
        return <ReducedMotionView stage={stage} petName={petName} petPhotoUrl={petPhotoUrl} photoError={photoError} setPhotoError={setPhotoError} onSkip={onComplete} skipVisible={skipVisible} />
    }

    return (
        <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
            style={bgStyle}
            animate={bgStyle}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
        >
            {/* Skip button */}
            <AnimatePresence>
                {skipVisible && (
                    <motion.button
                        key="skip"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ duration: 0.4 }}
                        onClick={onComplete}
                        className="absolute top-5 right-5 z-50 w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white/80 hover:bg-white/30 transition-colors"
                        aria-label="Skip ceremony"
                    >
                        <X size={16} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Stage 1: Stars appearing */}
            <AnimatePresence>
                {stage >= 1 && stage <= 3 && (
                    <motion.div
                        key="stars"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        className="absolute inset-0 pointer-events-none"
                    >
                        {STARS.map((star) => (
                            <motion.div
                                key={star.id}
                                className="absolute rounded-full bg-white"
                                style={{
                                    left: `${star.x}%`,
                                    top: `${star.y}%`,
                                    width: star.size,
                                    height: star.size,
                                }}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: [0, 1, 0.6, 1], scale: 1 }}
                                transition={{ delay: star.delay, duration: 0.6 }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stage 1: Connecting text */}
            <AnimatePresence>
                {stage === 1 && (
                    <motion.div
                        key="connecting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center px-8"
                    >
                        <p className="text-white/40 text-xs md:text-sm font-light tracking-[0.25em] uppercase text-center">
                            Connecting to ToThereOn World
                            <span className="animate-pulse">...</span>
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stage 2: Typewriter text */}
            <AnimatePresence>
                {stage === 2 && (
                    <motion.div
                        key="typewriter"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 flex items-center justify-center px-8"
                    >
                        <p className="text-white/90 text-lg md:text-2xl font-light text-center leading-relaxed tracking-wide">
                            {typedText}
                            <span className="animate-pulse">|</span>
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stage 3: Waterway sonar ripple */}
            <AnimatePresence>
                {stage >= 3 && stage <= 4 && (
                    <motion.div
                        key="ripple"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                        {[0, 1, 2, 3].map((i) => (
                            <motion.div
                                key={i}
                                className="absolute rounded-full border border-amber-400/30"
                                initial={{ width: 48, height: 48, opacity: 0.7 }}
                                animate={{ width: 320 + i * 80, height: 320 + i * 80, opacity: 0 }}
                                transition={{
                                    duration: 2.6,
                                    delay: i * 0.65,
                                    repeat: Infinity,
                                    ease: 'easeOut',
                                }}
                            />
                        ))}
                        <motion.div
                            className="w-3 h-3 rounded-full bg-amber-300/70"
                            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.6, repeat: Infinity }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stage 3: Signal text */}
            <AnimatePresence>
                {stage === 3 && (
                    <motion.div
                        key="signal-text"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="absolute flex justify-center px-8"
                        style={{ bottom: '30%' }}
                    >
                        <p className="text-amber-200/60 text-sm md:text-base font-light tracking-wider text-center">
                            A signal — faint, but unmistakable.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stage 4: Connection text */}
            <AnimatePresence>
                {stage === 4 && (
                    <motion.div
                        key="connection"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center px-8"
                    >
                        <p className="text-amber-100 text-lg md:text-2xl font-light text-center leading-relaxed max-w-md">
                            The waterways are vast...
                            <br />
                            <span className="text-amber-200 font-medium">
                                but we can feel <em>{petName}</em>&apos;s warmth.
                            </span>
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stage 5: Pet revealed */}
            <AnimatePresence>
                {stage === 5 && (
                    <motion.div
                        key="pet-reveal"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="flex flex-col items-center gap-6 px-8"
                    >
                        <div className="relative flex items-center justify-center">
                            <motion.div
                                className="absolute w-48 h-48 rounded-full"
                                style={{ background: 'radial-gradient(circle, #fbbf2480 0%, transparent 70%)' }}
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                            />
                            {showPhoto ? (
                                <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-amber-300/60 shadow-2xl">
                                    <img
                                        src={petPhotoUrl as string}
                                        alt={petName}
                                        className="w-full h-full object-cover"
                                        onError={() => setPhotoError(true)}
                                    />
                                </div>
                            ) : (
                                <div className="w-36 h-36 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center shadow-2xl border-4 border-amber-200/60">
                                    <span className="text-5xl" role="img" aria-label="pet">
                                        🐾
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="text-amber-100 text-xl md:text-2xl font-semibold text-center">
                            {petName} has been found.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stage 6: Warm landing */}
            <AnimatePresence>
                {stage >= 6 && (
                    <motion.div
                        key="landing"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="flex flex-col items-center gap-4 px-8 text-center max-w-md"
                    >
                        <p className="text-amber-900 text-xl md:text-2xl font-light leading-relaxed">
                            <strong className="font-semibold">{petName}</strong> is safe.
                            <br />
                            <strong className="font-semibold">{petName}</strong> has been there — all this time.
                            <br />
                            And now, the channel between you is open.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

interface ReducedProps {
    stage: number
    petName: string
    petPhotoUrl?: string | null
    photoError: boolean
    setPhotoError: (v: boolean) => void
    onSkip: () => void
    skipVisible: boolean
}

function ReducedMotionView({ stage, petName, petPhotoUrl, photoError, setPhotoError, onSkip, skipVisible }: ReducedProps) {
    const showPhoto = stage >= 5 && petPhotoUrl && !photoError

    const message = (() => {
        if (stage <= 1) return 'A moment for you and ' + petName + '...'
        if (stage === 2) return `Searching for ${petName} through the Waterway...`
        if (stage === 3) return 'A signal — faint, but unmistakable...'
        if (stage === 4) return `We can feel ${petName}'s warmth...`
        if (stage === 5) return `${petName} has been found.`
        return `${petName} is safe. ${petName} has been there — all this time. And now, the channel between you is open.`
    })()

    return (
        <div className="fixed inset-0 z-50 bg-amber-50 flex flex-col items-center justify-center gap-8 px-8 transition-colors duration-500">
            {skipVisible && (
                <button
                    onClick={onSkip}
                    className="absolute top-5 right-5 w-9 h-9 rounded-full bg-amber-200/60 border border-amber-300 flex items-center justify-center text-amber-800 hover:bg-amber-200 transition-colors"
                    aria-label="Skip ceremony"
                >
                    <X size={16} />
                </button>
            )}
            {showPhoto ? (
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-amber-300 shadow-lg">
                    <img
                        src={petPhotoUrl as string}
                        alt={petName}
                        className="w-full h-full object-cover"
                        onError={() => setPhotoError(true)}
                    />
                </div>
            ) : stage >= 5 ? (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center shadow-lg">
                    <span className="text-5xl" role="img" aria-label="pet">🐾</span>
                </div>
            ) : null}
            <p className="text-amber-900 text-lg md:text-xl font-light text-center leading-relaxed max-w-sm">
                {message}
            </p>
        </div>
    )
}
