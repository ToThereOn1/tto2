'use client'

import { useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface SurveyQuestionCardProps {
    questionText: string
    helpText?: string | null
    currentIndex: number
    totalQuestions: number
    isMulti?: boolean
    children: React.ReactNode
}

const springIn = {
    initial: { opacity: 0, y: 32, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 340, damping: 28, mass: 0.9 } },
    exit: { opacity: 0, y: -16, scale: 0.98, transition: { duration: 0.25, ease: 'easeIn' } },
}

const instantVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
}

export function SurveyQuestionCard({
    questionText,
    helpText,
    currentIndex,
    totalQuestions,
    isMulti = false,
    children,
}: SurveyQuestionCardProps) {
    const shouldReduceMotion = useReducedMotion()
    const variants = shouldReduceMotion ? instantVariants : springIn

    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={currentIndex}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full bg-white/40 backdrop-blur-3xl border border-white/40 rounded-[40px] shadow-2xl shadow-indigo-500/5 p-8 md:p-16 lg:p-20"
                aria-label={`Question ${currentIndex + 1} of ${totalQuestions}`}
            >
                {/* Question header */}
                <div className="w-full text-center mb-12">
                    <motion.span
                        initial={shouldReduceMotion ? {} : { opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="inline-block px-4 py-1.5 rounded-full bg-white/60 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 border border-white/50 backdrop-blur-sm shadow-sm"
                    >
                        Step {currentIndex + 1} of {totalQuestions}{isMulti && ' · Multiple Choice'}
                    </motion.span>

                    <motion.h1
                        initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
                        className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-[-0.02em] leading-snug text-slate-800 mb-6"
                    >
                        {questionText}
                    </motion.h1>

                    {helpText && (
                        <motion.p
                            initial={shouldReduceMotion ? {} : { opacity: 0 }}
                            animate={{ opacity: 0.8 }}
                            transition={{ delay: 0.25, duration: 0.5 }}
                            className="mt-6 text-base md:text-lg text-slate-500 font-normal max-w-2xl mx-auto leading-relaxed"
                        >
                            {helpText}
                        </motion.p>
                    )}
                </div>

                {/* Input area */}
                <motion.div
                    initial={shouldReduceMotion ? {} : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="w-full"
                >
                    {children}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
