import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/types/database.types'
import { PLAN_PET_LIMITS, PlanTier } from '@/lib/constants/plans'
import { AddPetButton } from '@/components/dashboard/AddPetButton'
import { PetCard } from '@/components/dashboard/PetCard'
import DashboardWhisper from '@/components/notifications/DashboardWhisper'

type Pet = Database['public']['Tables']['pets']['Row']

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: pets, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching pets:', error)
    }

    const hasPets = pets && pets.length > 0
    const currentPetCount = pets?.length || 0

    // Check limits
    const { data: userData } = await supabase
        .from('users')
        .select('subscription_tier, pet_limit, max_pets_allowed')
        .eq('id', user.id)
        .single()

    const tier = (userData?.subscription_tier || 'free').toLowerCase() as PlanTier
    const petLimit = PLAN_PET_LIMITS[tier] || 1

    // Admin bypass: admin_users 테이블에 있으면 펫 추가 항상 허용
    const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

    const canAddPet = !!adminUser || currentPetCount < petLimit

    if (!hasPets) {
        return (
            <div className="text-center py-16">
                <h2 className="text-xl font-semibold text-gray-700 mb-8">Begin your journey</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                    <div className="bg-amber-50 rounded-xl p-6 text-left">
                        <div className="text-2xl mb-3">①</div>
                        <h3 className="font-semibold text-gray-800 mb-2">Register your pet</h3>
                        <p className="text-sm text-gray-600">Tell us about the one you miss. Their name, their spirit.</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-6 text-left">
                        <div className="text-2xl mb-3">②</div>
                        <h3 className="font-semibold text-gray-800 mb-2">Complete Deep Remembrance</h3>
                        <p className="text-sm text-gray-600">Share memories and habits so they can truly live in ToThereOn World.</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-6 text-left">
                        <div className="text-2xl mb-3">③</div>
                        <h3 className="font-semibold text-gray-800 mb-2">Receive updates</h3>
                        <p className="text-sm text-gray-600">Your pet will begin sending news from the other side of the Waterway.</p>
                    </div>
                </div>
                <a href="/dashboard/register" className="mt-8 inline-block bg-amber-600 text-white px-8 py-3 rounded-full font-medium hover:bg-amber-700 transition-colors">
                    Register your first pet →
                </a>
            </div>
        )
    }

    // Fetch last feed date and DR completion status for all pets in parallel
    const petIds = pets.map((p: Pet) => p.id)

    // Fetch today's whisper (daily_whisper 이벤트)
    const today = new Date().toISOString().slice(0, 10)
    const { data: whisperEvent } = await supabase
        .from('pet_status_events')
        .select('content')
        .in('pet_id', petIds)
        .eq('event_type', 'daily_whisper')
        .gte('created_at', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    const [lastEventsResult, drResult] = await Promise.all([
        supabase
            .from('pet_status_events')
            .select('pet_id, created_at')
            .in('pet_id', petIds)
            .order('created_at', { ascending: false }),
        supabase
            .from('deep_remembrance_responses')
            .select('pet_id')
            .in('pet_id', petIds)
            .not('completed_at', 'is', null),
    ])

    // Build pet_id → last feed date map (first occurrence = most recent)
    const lastFeedMap: Record<string, string> = {}
    for (const e of (lastEventsResult.data ?? [])) {
        if (!lastFeedMap[e.pet_id]) {
            lastFeedMap[e.pet_id] = e.created_at
        }
    }

    const drCompletedSet = new Set((drResult.data ?? []).map((r: { pet_id: string }) => r.pet_id))

    return (
        <div className="space-y-8">
            {whisperEvent?.content && (
                <DashboardWhisper message={whisperEvent.content} />
            )}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 tracking-[-0.01em]">My Companions</h2>
                <AddPetButton canAddPet={canAddPet} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pets.map((pet: Pet) => (
                    <PetCard
                        key={pet.id}
                        pet={pet}
                        lastFeedDate={lastFeedMap[pet.id] ?? null}
                        drCompleted={drCompletedSet.has(pet.id)}
                    />
                ))}
            </div>
        </div>
    )
}
