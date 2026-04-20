'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowRight, Heart } from 'lucide-react'

export type BreatherType = 'climax' | 'landing'

interface EmotionalBreatherProps {
    type: BreatherType
    onReady: () => void
}

const CONTENT: Record<BreatherType, { heading: string; body: string; buttonText: string; delay: number }> = {
    climax: {
        heading: 'Take a breath.',
        body: 'This next question is the most important one. There are no right answers — only yours.',
        buttonText: "I'm ready",
        delay: 3000,
    },
    landing: {
        heading: 'You did it.',
        body: "That was the hardest part. Take a moment before we continue — you've just done something meaningful.",
        buttonText: 'Continue',
        delay: 2000,
    },
}

export function EmotionalBreather({ type, onReady }: EmotionalBreatherProps) {
    const shouldReduceMotion = useReducedMotion()
    const content = CONTENT[type]
    const [buttonEnabled, setButtonEnabled] = useState(shouldReduceMotion ?? false)
    const [secondsLeft, setSecondsLeft] = useState(Math.ceil(content.delay / 1000))

    useEffect(() => {
        if (shouldReduceMotion) {
            setButtonEnabled(true)
            return
        }
        const countdown = setInterval(() => {
            setSecondsLeft(s => Math.max(0, s - 1))
        }, 1000)
        const enableTimer = setTimeout(() => {
            setButtonEnabled(true)
            clearInterval(countdown)
        }, content.delay)
        return () => {
            clearTimeout(enableTimer)
            clearInterval(countdown)
        }
    }, [content.delay, shouldReduceMotion])

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 z-[200] flex items-center justify-center px-6"
                initial={shouldReduceMotion ? undefined : { opacity: 0 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Amber background overlay */}
                <div className="absolute inset-0 bg-amber-50/95 backdrop-blur-sm" />

                {/* Soft ambient glow */}
                {!shouldReduceMotion && (
                    <motion.div
                        className="absolute inset-0 pointer-events-none"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-amber-200/40 filter blur-[80px]" />
                    </motion.div>
                )}

                {/* Card */}
                <motion.div
                    className="relative z-10 max-w-lg w-full text-center"
                    initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 24 }}
                    animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98, y: -12 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
                >
                    {/* Heart icon */}
                    <motion.div
                        className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 border border-amber-200 mb-8"
                        animate={shouldReduceMotion ? {} : { scale: [1, 1.05, 1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Heart className="w-7 h-7 text-amber-500" fill="currentColor" />
                    </motion.div>

                    {/* Heading */}
                    <h2 className="text-3xl md:text-4xl font-semibold text-amber-900 tracking-tight mb-4">
                        {content.heading}
                    </h2>

                    {/* Body */}
                    <p className="text-base md:text-lg text-amber-800/80 font-light leading-relaxed max-w-sm mx-auto mb-12">
                        {content.body}
                    </p>

                    {/* CTA button */}
                    <motion.button
                        onClick={buttonEnabled ? onReady : undefined}
                        disabled={!buttonEnabled}
                        whileHover={buttonEnabled && !shouldReduceMotion ? { scale: 1.02 } : {}}
                        whileTap={buttonEnabled && !shouldReduceMotion ? { scale: 0.98 } : {}}
                        className={`inline-flex items-center gap-3 px-10 py-4 rounded-full font-bold uppercase tracking-[0.2em] text-sm transition-all duration-500 ${
                            buttonEnabled
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 cursor-pointer'
                                : 'bg-amber-200 text-amber-400 cursor-not-allowed'
                        }`}
                    >
                        <span>{content.buttonText}</span>
                        {buttonEnabled
                            ? <ArrowRight size={16} className={!shouldReduceMotion ? 'transition-transform group-hover:translate-x-1' : ''} />
                            : <span className="text-amber-400 text-xs font-normal normal-case tracking-normal">{secondsLeft}s</span>
                        }
                    </motion.button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
