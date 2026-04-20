// GET /api/cron/reset-monthly-quotas
// 매월 1일 00:00 UTC 실행
// 모든 유료 구독자의 이달 letter_quota 레코드 생성
// Vercel Cron: schedule "0 0 1 * *"

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { PLAN_LETTER_LIMITS } from '@/lib/constants/plans'

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    try {
        const supabase = createAdminClient()
        const runDate = new Date().toISOString().slice(0, 10)

        // 유료 구독 유저만 조회 (free는 'lifetime' quota 사용 — cron 불필요)
        const { data: subscriptions, error: usersError } = await supabase
            .from('subscriptions')
            .select('user_id, tier, current_period_start')
            .in('status', ['active', 'trialing'])
            .not('tier', 'eq', 'free')

        if (usersError) throw usersError
        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ success: true, reset_count: 0 })
        }

        let resetCount = 0

        for (const sub of subscriptions) {
            const tier = sub.tier as keyof typeof PLAN_LETTER_LIMITS
            const allowed = PLAN_LETTER_LIMITS[tier] ?? 0
            if (allowed === 0) continue

            // 빌링 주기 키: current_period_start (YYYY-MM-DD)
            // current_period_start가 없으면 해당 구독 건너뜀 (webhook이 설정해야 함)
            if (!sub.current_period_start) continue
            const billingPeriodKey = new Date(sub.current_period_start).toISOString().slice(0, 10)

            const { data: pets } = await supabase
                .from('pets')
                .select('id')
                .eq('user_id', sub.user_id)

            if (!pets || pets.length === 0) continue

            for (const pet of pets) {
                // 이미 해당 빌링 주기 레코드가 있으면 skip
                const { error } = await supabase
                    .from('letter_quota')
                    .insert({
                        user_id: sub.user_id,
                        pet_id: pet.id,
                        month: billingPeriodKey,
                        letters_sent: 0,
                        letters_allowed: allowed,
                    })
                    .select()
                    .single()

                if (!error) resetCount++
            }
        }

        console.log(`[Cron] Monthly quota reset: ${resetCount} records (run date: ${runDate})`)
        return NextResponse.json({ success: true, reset_count: resetCount, run_date: runDate })

    } catch (error: any) {
        console.error('[Cron] Quota reset error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
