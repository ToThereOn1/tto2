'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function RefreshTrigger() {
    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        // If coming back from Lemon Squeezy checkout
        if (searchParams.get('checkout') === 'success') {
            console.log('[QA] Payment successful, force refreshing state to sync quotas and tier')

            // 1. Show success toast
            toast.success('Welcome to Basic! 🎉', {
                description: 'Your subscription is now active. You can now write letters to your beloved companion.',
                duration: 6000,
            })

            // 2. Force router refresh (Invalidate Next.js Server Components cache)
            router.refresh()

            // 3. Clear query param so it doesn't infinite loop
            const newUrl = window.location.pathname
            window.history.replaceState({}, '', newUrl)
        }
    }, [searchParams, router])

    return null
}
