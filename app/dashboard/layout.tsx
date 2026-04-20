import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { redirect } from 'next/navigation'
import RefreshTrigger from '@/components/dashboard/RefreshTrigger'
import { PLAN_PET_LIMITS, PlanTier } from '@/lib/constants/plans'
import { ConsentSaver } from '@/components/ui/ConsentSaver'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check limits
    let canAddPet = true;
    try {
        const { data: userData } = await supabase
            .from('users')
            .select('subscription_tier, pet_limit, max_pets_allowed')
            .eq('id', user.id)
            .single()

        const tier = (userData?.subscription_tier || 'free').toLowerCase() as PlanTier
        const petLimit = PLAN_PET_LIMITS[tier] || 1

        const { count: currentPetCount } = await supabase
            .from('pets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        canAddPet = (currentPetCount || 0) < petLimit
    } catch (e) {
        console.error('Failed to resolve pet limits in layout:', e)
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <ConsentSaver />
            <RefreshTrigger />
            <Sidebar canAddPet={canAddPet} />

            <main className="md:ml-64 min-h-screen transition-all pt-16 md:pt-0">
                <div className="p-6 md:p-8 max-w-7xl mx-auto">
                    {/* Top Bar Area */}
                    <div className="mb-8 flex items-end justify-between">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                                Welcome, {user.user_metadata?.full_name?.split(' ')[0] || 'Friend'}
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Your digital sanctuary is waiting.
                            </p>
                        </div>
                        <div className="hidden md:block text-sm text-gray-400">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                    </div>

                    {children}
                </div>
            </main>
        </div>
    )
}
