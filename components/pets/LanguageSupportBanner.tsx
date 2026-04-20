'use client'

import { useState, useEffect } from 'react'
import { X, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const BANNER_DISMISSED_KEY = 'tto_lang_banner_dismissed'

export function LanguageSupportBanner() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY)
        if (!dismissed) setVisible(true)
    }, [])

    const dismiss = () => {
        localStorage.setItem(BANNER_DISMISSED_KEY, '1')
        setVisible(false)
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="relative mb-6 rounded-2xl border overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, rgba(74,144,226,0.06) 0%, rgba(107,163,217,0.04) 100%)',
                        borderColor: 'rgba(74,144,226,0.2)',
                    }}
                >
                    <div className="flex items-start gap-3 px-5 py-4">
                        <div
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                            style={{ background: 'rgba(74,144,226,0.12)' }}
                        >
                            <Globe size={16} style={{ color: 'var(--color-primary)' }} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                                You can write in any language
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                ToThereOn supports multiple languages.{' '}
                                <span style={{ color: 'var(--color-text-tertiary)' }}>
                                    한국어, 日本語, English — use whatever feels most natural to you.
                                </span>
                            </p>
                        </div>

                        <button
                            onClick={dismiss}
                            className="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-gray-100 -mt-0.5 -mr-1"
                            aria-label="Dismiss"
                        >
                            <X size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
