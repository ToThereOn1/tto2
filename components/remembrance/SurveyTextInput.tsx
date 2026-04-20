'use client'

import { useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface SurveyTextInputProps {
    value: string
    onChange: (value: string) => void
    inputType: 'long_text' | 'short_text' | 'text'
    placeholder?: string
    ariaLabel?: string
}

export function SurveyTextInput({
    value,
    onChange,
    inputType,
    placeholder = 'Share your memories and stories...',
    ariaLabel,
}: SurveyTextInputProps) {
    const [isFocused, setIsFocused] = useState(false)
    const shouldReduceMotion = useReducedMotion()

    const handleFocus = useCallback(() => setIsFocused(true), [])
    const handleBlur = useCallback(() => setIsFocused(false), [])
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        onChange(e.target.value)
    }, [onChange])

    const isLong = inputType === 'long_text' || inputType === 'text'

    return (
        <div className="relative group">
            {/* Warm glow backdrop — animates on focus */}
            <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                animate={shouldReduceMotion ? {} : {
                    boxShadow: isFocused
                        ? '0 0 0 3px rgba(251,191,36,0.15), 0 8px 32px rgba(251,191,36,0.08)'
                        : '0 0 0 0px rgba(251,191,36,0), 0 0 0 rgba(251,191,36,0)',
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
            />

            {/* Center-out border line */}
            <div className="relative overflow-hidden">
                {isLong ? (
                    <textarea
                        autoFocus
                        value={value}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder={placeholder}
                        aria-label={ariaLabel}
                        className="w-full bg-transparent border-b border-slate-200 focus:outline-none rounded-none p-4 min-h-[180px] text-xl font-light leading-relaxed placeholder:text-slate-300 transition-colors duration-300 resize-none"
                        style={{ borderColor: isFocused ? 'rgba(99,102,241,0.4)' : undefined }}
                    />
                ) : (
                    <input
                        autoFocus
                        type="text"
                        value={value}
                        onChange={handleChange}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="Write briefly..."
                        aria-label={ariaLabel}
                        className="w-full bg-transparent border-b border-slate-200 focus:outline-none rounded-none px-4 py-4 text-2xl md:text-3xl font-light placeholder:text-slate-300 transition-colors duration-300 text-center"
                        style={{ borderColor: isFocused ? 'rgba(99,102,241,0.4)' : undefined }}
                    />
                )}

                {/* Center-out animated border line */}
                <div className="absolute bottom-0 left-0 right-0 h-[1px] overflow-hidden">
                    <motion.div
                        className="h-full bg-primary/50"
                        animate={shouldReduceMotion ? { scaleX: isFocused ? 1 : 0 } : {
                            scaleX: isFocused ? 1 : 0,
                        }}
                        initial={{ scaleX: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        style={{ originX: 0.5 }}
                    />
                </div>
            </div>

            {/* "Words of Healing" indicator — appears on focus */}
            {isLong && (
                <motion.div
                    className="absolute bottom-6 right-10 flex items-center gap-2"
                    animate={{ opacity: isFocused ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Words of Healing</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </motion.div>
            )}
        </div>
    )
}
