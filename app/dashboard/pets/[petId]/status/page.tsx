import { PetStatusFeed } from '@/components/feed/PetStatusFeed'
import { createClient } from '@/lib/supabase/server'
import { PLAN_LETTER_LIMITS, PlanTier } from '@/lib/constants/plans'
import type { Metadata } from 'next'

interface PageProps {
    params: Promise<{ petId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { petId } = await params
    const supabase = await createClient()

    const { data: pet } = await supabase
        .from('pets')
        .select('name, species')
        .eq('id', petId)
        .single()

    const petName = pet?.name || 'Your Friend'
    const species = pet?.species || 'companion'
    const ogUrl = `/api/og?pet=${encodeURIComponent(petName)}&species=${encodeURIComponent(species)}`

    return {
        title: `${petName} | ToThereOn`,
        description: `${petName} is waiting for your letter through the Waterway.`,
        openGraph: {
            title: `${petName} | ToThereOn`,
            description: `${petName} is waiting for your letter through the Waterway.`,
            images: [
                {
                    url: ogUrl,
                    width: 1200,
                    height: 630,
                    alt: `${petName} on ToThereOn`,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${petName} | ToThereOn`,
            description: `${petName} is waiting for your letter through the Waterway.`,
            images: [ogUrl],
        },
    }
}

export default async function PetStatusPage({ params }: PageProps) {
    const { petId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let canWriteLetter = false
    if (user) {
        // Check subscriptions table first
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('tier')
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing'])
            .single()

        let tier = sub?.tier || null
        if (!tier) {
            const { data: userData } = await supabase
                .from('users')
                .select('subscription_tier')
                .eq('id', user.id)
                .single()
            tier = userData?.subscription_tier || 'free'
        }
        tier = (tier as string).toLowerCase()
        const letterLimit = PLAN_LETTER_LIMITS[tier as PlanTier] ?? 0
        canWriteLetter = letterLimit > 0
        console.log('[StatusPage] Subscription check:', { tier, letterLimit, canWriteLetter, userId: user.id })
    }

    return (
        <main>
            <PetStatusFeed petId={petId} canWriteLetter={canWriteLetter} />
        </main>
    )
}
