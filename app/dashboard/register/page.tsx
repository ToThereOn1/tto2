import { PetRegistrationForm } from '@/components/dashboard/PetRegistrationForm'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft } from 'lucide-react'
import { PLAN_PET_LIMITS, PlanTier } from '@/lib/constants/plans'

export default async function RegisterPetPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check limits
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

    if ((currentPetCount || 0) >= petLimit) {
        return (
            <div className="max-w-xl mx-auto py-20 px-6 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-amber-500" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
                    Pet Limit Reached
                </h1>
                <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                    You have reached the maximum number of companions {`(${petLimit})`} allowed on your current plan. Upgrade to a higher tier to add more loved ones to the sanctuary.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors w-full sm:w-auto"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <Link
                        href="/settings?tab=subscription"
                        className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all w-full sm:w-auto"
                    >
                        Upgrade Plan
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto py-10">
            <PetRegistrationForm />
        </div>
    )
}
