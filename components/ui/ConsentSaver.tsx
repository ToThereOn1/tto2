'use client'

import { useEffect } from 'react'

// Runs once when the user first lands on the dashboard after signup.
// Reads pending consent data saved in sessionStorage by ConsentModal,
// persists it to the DB via /api/consent, then clears sessionStorage.
export function ConsentSaver() {
    useEffect(() => {
        const raw = sessionStorage.getItem('consent_pending')
        if (!raw) return

        let payload: unknown
        try {
            payload = JSON.parse(raw)
        } catch {
            sessionStorage.removeItem('consent_pending')
            return
        }

        fetch('/api/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then((res) => {
                if (res.ok) {
                    sessionStorage.removeItem('consent_pending')
                }
            })
            .catch((err) => {
                console.error('[ConsentSaver] Failed to save consent:', err)
            })
    }, [])

    return null
}
