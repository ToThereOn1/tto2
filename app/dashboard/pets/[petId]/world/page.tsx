import { WorldDashboard } from '@/components/world-dashboard/WorldDashboard'
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

    return {
        title: `${petName}'s World | ToThereOn`,
        description: `${petName} is living in ToThereOn World.`,
    }
}

export default async function WorldPage({ params }: PageProps) {
    const { petId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let canWriteLetter = false
    if (user) {
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
    }

    return (
        <main>
            <WorldDashboard petId={petId} canWriteLetter={canWriteLetter} />
        </main>
    )
}
