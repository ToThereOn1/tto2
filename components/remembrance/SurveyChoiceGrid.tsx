'use client'

import { useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, MessageSquare } from 'lucide-react'
import type { ChoiceOption } from './SurveyBody'
import type { SurveyQuestion } from './hooks/useSurveyNavigation'

interface SurveyChoiceGridProps {
    question: SurveyQuestion
    regularOptions: ChoiceOption[]
    otherOption?: ChoiceOption
    isMulti: boolean
    responses: Record<string, any>
    otherTexts: Record<string, string>
    onSingleChoice: (choice: ChoiceOption) => void
    onMultipleChoice: (choice: ChoiceOption, checked: boolean) => void
    onOtherTextChange: (text: string) => void
}

function isChoiceSelected(choice: ChoiceOption, question: SurveyQuestion, responses: Record<string, any>): boolean {
    const resp = responses[question.question_key]
    if (!resp) return false
    if (typeof resp === 'string') return resp === choice.value || resp === choice.label
    if (resp.selected_choice) return resp.selected_choice.value === choice.value
    if (resp.selected_choices) return resp.selected_choices.some((c: any) => c.value === choice.value)
    return false
}

function isOtherSelected(question: SurveyQuestion, responses: Record<string, any>): boolean {
    const resp = responses[question.question_key]
    if (!resp) return false
    return resp.answer_type === 'other' || (resp.other_text !== undefined && resp.other_text !== null)
}

// Pulse ring — expands outward on select
function PulseRing({ active }: { active: boolean }) {
    const shouldReduceMotion = useReducedMotion()
    if (!active || shouldReduceMotion) return null
    return (
        <motion.span
            className="absolute inset-0 rounded-2xl border-2 border-primary/40"
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.08 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            key={Date.now()}
        />
    )
}

export function SurveyChoiceGrid({
    question,
    regularOptions,
    otherOption,
    isMulti,
    responses,
    otherTexts,
    onSingleChoice,
    onMultipleChoice,
    onOtherTextChange,
}: SurveyChoiceGridProps) {
    const shouldReduceMotion = useReducedMotion()
    const qKey = question.question_key
    const otherActive = isOtherSelected(question, responses)

    const handleChoice = useCallback((choice: ChoiceOption) => {
        const selected = isChoiceSelected(choice, question, responses)
        if (isMulti) onMultipleChoice(choice, !selected)
        else onSingleChoice(choice)
    }, [question, responses, isMulti, onSingleChoice, onMultipleChoice])

    const handleOtherToggle = useCallback(() => {
        if (!otherOption) return
        if (isMulti) onMultipleChoice(otherOption, !otherActive)
        else onSingleChoice(otherOption)
    }, [otherOption, otherActive, isMulti, onSingleChoice, onMultipleChoice])

    return (
        <div role={isMulti ? 'group' : 'radiogroup'} aria-label={question.question_text_en || question.question_en || ''} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {regularOptions.map((choice, idx) => {
                    const selected = isChoiceSelected(choice, question, responses)
                    return (
                        <motion.button
                            key={choice.value}
                            role={isMulti ? 'checkbox' : 'radio'}
                            aria-pressed={selected}
                            aria-checked={selected}
                            onClick={() => handleChoice(choice)}
                            whileHover={shouldReduceMotion ? {} : { y: -2, boxShadow: '0 8px 24px rgba(99,102,241,0.12)' }}
                            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className={`relative group p-6 rounded-2xl text-left transition-colors duration-300 border ${
                                selected
                                    ? 'bg-white/80 border-primary/30 shadow-lg shadow-primary/5'
                                    : 'bg-white/30 border-white/40 hover:bg-white/50 hover:border-white/60'
                            } backdrop-blur-md overflow-hidden`}
                        >
                            <PulseRing active={selected} />
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
                                    selected ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-400'
                                }`}>
                                    {isMulti
                                        ? <span className="text-lg font-bold">{selected ? '✓' : (idx + 1)}</span>
                                        : <span className="text-xl" suppressHydrationWarning>&#10022;</span>
                                    }
                                </div>
                                {selected && (
                                    <motion.div
                                        initial={shouldReduceMotion ? {} : { scale: 0, rotate: -10 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white"
                                    >
                                        <Check size={14} strokeWidth={3} />
                                    </motion.div>
                                )}
                            </div>
                            <h3 className={`text-xl font-bold tracking-tight ${selected ? 'text-primary' : 'text-slate-900'}`}>
                                {choice.label}
                            </h3>
                        </motion.button>
                    )
                })}
            </div>

            {otherOption && (
                <div className="mt-6">
                    <motion.button
                        onClick={handleOtherToggle}
                        aria-pressed={otherActive}
                        whileHover={shouldReduceMotion ? {} : { y: -1 }}
                        whileTap={shouldReduceMotion ? {} : { scale: 0.99 }}
                        className={`w-full group relative p-6 rounded-2xl text-left transition-colors duration-300 border ${
                            otherActive
                                ? 'bg-amber-50/80 border-amber-300/50 shadow-lg shadow-amber-500/5'
                                : 'bg-white/20 border-dashed border-slate-300 hover:bg-white/40 hover:border-primary/30'
                        } backdrop-blur-md`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 ${
                                otherActive ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                            }`}>
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <h3 className={`text-lg font-bold ${otherActive ? 'text-amber-700' : 'text-slate-600'}`}>Other (Write your own)</h3>
                                <p className="text-sm text-slate-400">Tell us your pet&apos;s unique story</p>
                            </div>
                        </div>
                    </motion.button>

                    {otherActive && (
                        <motion.div
                            initial={shouldReduceMotion ? {} : { opacity: 0, y: -8, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={shouldReduceMotion ? {} : { opacity: 0, y: -8, height: 0 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="mt-4 overflow-hidden"
                        >
                            <textarea
                                autoFocus
                                value={otherTexts[qKey] || ''}
                                onChange={(e) => onOtherTextChange(e.target.value)}
                                placeholder="Please describe in detail..."
                                aria-label="Other answer"
                                className="w-full bg-white/60 border border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 rounded-2xl p-5 min-h-[120px] text-lg font-light leading-relaxed placeholder:text-slate-300 transition-all resize-none backdrop-blur-sm"
                            />
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    )
}
