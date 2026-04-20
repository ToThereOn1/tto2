'use client'

import { useState, useRef } from 'react'
import { getStarters } from '@/lib/conversation-starters'

interface LetterComposeProps {
    petName: string
    lang?: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export function LetterCompose({
    petName,
    lang,
    value,
    onChange,
    placeholder,
}: LetterComposeProps) {
    const detectedLang = lang ?? (typeof navigator !== 'undefined' ? navigator.language : 'en')
    const starters = getStarters(detectedLang).slice(0, 3)

    const [showStarters, setShowStarters] = useState(true)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const handleStarterClick = (starter: string) => {
        onChange(starter)
        setShowStarters(false)
        setTimeout(() => {
            const el = textareaRef.current
            if (el) {
                el.focus()
                el.setSelectionRange(starter.length, starter.length)
            }
        }, 0)
    }

    return (
        <div className="flex flex-col gap-3">
            {/* Conversation Starters */}
            {showStarters && !value && (
                <div className="flex flex-wrap gap-2">
                    {starters.map((starter, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleStarterClick(starter)}
                            className="px-3 py-1.5 text-xs rounded-full bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition-colors"
                        >
                            {starter}
                        </button>
                    ))}
                </div>
            )}

            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value)
                    if (e.target.value && showStarters) setShowStarters(false)
                }}
                placeholder={placeholder ?? `Write a letter to ${petName}...`}
                className="w-full min-h-[200px] bg-transparent border-none resize-none focus:ring-0 text-slate-700 text-lg leading-relaxed placeholder:text-slate-300 outline-none"
            />
        </div>
    )
}
