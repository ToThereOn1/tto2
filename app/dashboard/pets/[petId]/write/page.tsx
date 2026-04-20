import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LetterEditor } from '@/components/letters/LetterEditor'
import { checkLetterCooldown } from '@/lib/time-engine-v2'
import { PLAN_LETTER_LIMITS, PlanTier } from '@/lib/constants/plans'

interface PageProps {
    params: Promise<{ petId: string }>
}

// ─── Gate Screens ─────────────────────────────────────────────────────────────

function UpgradeGate({ petName, petId }: { petName: string; petId: string }) {
    return (
        <main className="min-h-screen flex items-center justify-center p-6"
            style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F7FA 100%)' }}>
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto text-4xl">
                    ✉️
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Letters require a subscription</h1>
                <p className="text-slate-500 leading-relaxed">
                    Writing to <strong className="text-slate-700">{petName}</strong> in ToThereOn World
                    is a Basic plan feature.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Link href="/pricing">
                        <button className="w-full sm:w-auto px-8 py-3 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200">
                            View Plans
                        </button>
                    </Link>
                    <Link href={`/dashboard/pets/${petId}/mailbox`}>
                        <button className="w-full sm:w-auto px-8 py-3 bg-slate-100 text-slate-600 rounded-full font-medium hover:bg-slate-200 transition-colors">
                            Back to Mailbox
                        </button>
                    </Link>
                </div>
            </div>
        </main>
    )
}

function CooldownGate({ petName, petId, cooldownUntil }: { petName: string; petId: string; cooldownUntil: string }) {
    const remaining = new Date(cooldownUntil).getTime() - Date.now()
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const timeStr = days > 0 ? `${days}일 ${hours}시간` : `${hours}시간`

    return (
        <main className="min-h-screen flex items-center justify-center p-6"
            style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F7FA 100%)' }}>
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-4xl">
                    ⏳
                </div>
                <h1 className="text-2xl font-bold text-slate-900">편지가 아직 전달 중이에요</h1>
                <p className="text-slate-500 leading-relaxed">
                    <strong className="text-slate-700">{petName}</strong>이(가) 지난 편지를 받고
                    답장을 준비하는 중이에요.<br />
                    다음 편지는 <strong className="text-slate-700">{timeStr} 후</strong>에 쓸 수 있어요.
                </p>
                <Link href={`/dashboard/pets/${petId}/mailbox`}>
                    <button className="px-8 py-3 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors">
                        메일함으로 돌아가기
                    </button>
                </Link>
            </div>
        </main>
    )
}

function QuotaGate({ petName, petId }: { petName: string; petId: string }) {
    const now = new Date()
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const daysUntilReset = Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return (
        <main className="min-h-screen flex items-center justify-center p-6"
            style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F7FA 100%)' }}>
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-4xl">
                    📭
                </div>
                <h1 className="text-2xl font-bold text-slate-900">이번 달 편지를 모두 보냈어요</h1>
                <p className="text-slate-500 leading-relaxed">
                    <strong className="text-slate-700">{petName}</strong>에게 보낼 수 있는
                    이번 달 편지를 모두 사용했어요.<br />
                    <strong className="text-slate-700">{daysUntilReset}일 후</strong> 새 편지를 쓸 수 있어요.
                </p>
                <Link href={`/dashboard/pets/${petId}/mailbox`}>
                    <button className="px-8 py-3 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors">
                        메일함으로 돌아가기
                    </button>
                </Link>
            </div>
        </main>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WriteLetterPage({ params }: PageProps) {
    const { petId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Get Pet & Ownership
    const { data: pet, error: petError } = await supabase
        .from('pets')
        .select('name, created_at, passed_date')
        .eq('id', petId)
        .eq('user_id', user.id)
        .single()

    if (petError || !pet) {
        redirect('/dashboard')
    }

    // 2. Admin bypass: admin_users 테이블에 있으면 모든 한도 없이 에디터 표시
    const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

    if (adminUser) {
        return (
            <LetterEditor
                petId={petId}
                petName={pet.name}
                userId={user.id}
                quotaRemaining={999}
            />
        )
    }

    // 2. Get Subscription Tier
    let tier = 'free'

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .single()

    if (subscription?.tier) {
        tier = subscription.tier
    } else {
        const { data: userData } = await supabase
            .from('users')
            .select('subscription_tier')
            .eq('id', user.id)
            .single()
        if (userData?.subscription_tier) {
            tier = userData.subscription_tier
        }
    }

    tier = tier.toLowerCase()

    // 3. Gate: no letter access for this tier
    const letterLimit = PLAN_LETTER_LIMITS[tier as PlanTier] ?? 0
    if (letterLimit === 0) {
        return <UpgradeGate petName={pet.name} petId={petId} />
    }

    // 4. Check 7-day cooldown
    const { data: lastLetter } = await supabase
        .from('letters')
        .select('created_at')
        .eq('pet_id', petId)
        .eq('sender_type', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    const onCooldown = !checkLetterCooldown(lastLetter?.created_at ?? null)
    const cooldownUntil = onCooldown && lastLetter?.created_at
        ? new Date(new Date(lastLetter.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined

    if (onCooldown && cooldownUntil) {
        return <CooldownGate petName={pet.name} petId={petId} cooldownUntil={cooldownUntil} />
    }

    // 5. Determine quota
    // NOTE: Free users use 'YYYY-MM' calendar month key (matches migration_fix_cooldown_and_free_quota.sql)
    let quotaKey: string | null = null
    if (tier === 'free') {
        quotaKey = new Date().toISOString().slice(0, 7)
    } else {
        const { data: activeSub } = await supabase
            .from('subscriptions')
            .select('current_period_start')
            .eq('user_id', user.id)
            .in('status', ['active', 'trialing'])
            .single()
        quotaKey = activeSub?.current_period_start
            ? new Date(activeSub.current_period_start).toISOString().slice(0, 10)
            : null
    }

    let remaining = 0

    if (!quotaKey) {
        remaining = 0
    } else {
        const { data: quotaData } = await supabase
            .from('letter_quota')
            .select('letters_allowed, letters_sent')
            .eq('user_id', user.id)
            .eq('pet_id', petId)
            .eq('month', quotaKey)
            .single()

        if (quotaData) {
            remaining = Math.max(0, quotaData.letters_allowed - (quotaData.letters_sent || 0))
        } else {
            const allowed = PLAN_LETTER_LIMITS[tier as PlanTier] || 0

            let used = 0
            if (tier === 'free') {
                // Free tier: calendar month quota (matches migration_fix_cooldown_and_free_quota.sql YYYY-MM key)
                const monthStart = new Date()
                monthStart.setDate(1)
                monthStart.setHours(0, 0, 0, 0)
                const { count } = await supabase
                    .from('letters')
                    .select('*', { count: 'exact', head: true })
                    .eq('pet_id', petId)
                    .eq('sender_type', 'user')
                    .gte('created_at', monthStart.toISOString())
                used = count || 0
            } else {
                const periodStart = new Date(quotaKey).toISOString()
                const { count } = await supabase
                    .from('letters')
                    .select('*', { count: 'exact', head: true })
                    .eq('pet_id', petId)
                    .eq('status', 'sent')
                    .gte('created_at', periodStart)
                used = count || 0
            }

            remaining = Math.max(0, allowed - used)

            if (allowed > 0) {
                await supabase.from('letter_quota').upsert({
                    user_id: user.id,
                    pet_id: petId,
                    month: quotaKey,
                    letters_allowed: allowed,
                    letters_sent: used,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, pet_id, month' })
            }
        }
    }

    // 6. Gate: quota exhausted
    if (remaining <= 0) {
        return <QuotaGate petName={pet.name} petId={petId} />
    }

    // 7. Check if this is the first letter ever sent to this pet
    const { count: totalLetterCount } = await supabase
        .from('letters')
        .select('*', { count: 'exact', head: true })
        .eq('pet_id', petId)
        .eq('sender_type', 'user')
    const isFirstLetter = (totalLetterCount ?? 0) === 0

    // 8. All clear — render editor
    return (
        <main className="min-h-screen bg-slate-50"
            style={{ background: 'linear-gradient(135deg, #FDFBF7 0%, #F5F7FA 100%)' }}>
            {isFirstLetter && (
                <div className="max-w-2xl mx-auto px-6 pt-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                        <p className="text-sm text-amber-800 font-medium mb-1">Your first letter to ToThereOn World</p>
                        <p className="text-xs text-amber-700">
                            Your words will travel through the Waterway and reach them within a few days.
                            Write freely — they remember everything you shared about yourself.
                        </p>
                    </div>
                </div>
            )}
            <LetterEditor
                petId={petId}
                petName={pet.name}
                userId={user.id}
                quotaRemaining={remaining}
            />
        </main>
    )
}
