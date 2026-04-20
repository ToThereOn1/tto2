'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'tto_cookie_consent'

export function CookieBanner() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
        if (!stored) {
            setVisible(true)
        }
    }, [])

    const handleAccept = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
        setVisible(false)
    }

    const handleDecline = () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'declined')
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
            role="dialog"
            aria-label="Cookie consent"
            aria-live="polite"
        >
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                    <p className="text-sm text-slate-700 leading-relaxed">
                        We use cookies to keep you signed in and to understand how our service is used.
                        Strictly necessary cookies cannot be disabled. Analytics cookies help us improve the experience.
                        See our{' '}
                        <Link href="/privacy" target="_blank" className="underline hover:text-sky-600 transition-colors font-medium">
                            Privacy Policy
                        </Link>{' '}
                        for details.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={handleDecline}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        Decline Analytics
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-5 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                    >
                        Accept All
                    </button>
                </div>
            </div>
        </div>
    )
}
