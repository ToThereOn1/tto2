// POST /api/cancel-subscription
// Lemon Squeezy API를 통해 구독 취소
// 취소 즉시 종료가 아닌, 현재 구독 기간 만료 시 종료됨

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('lemon_squeezy_subscription_id')
            .eq('user_id', user.id)
            .single()

        if (!subscription?.lemon_squeezy_subscription_id) {
            return NextResponse.json({ error: 'No active subscription' }, { status: 404 })
        }

        const response = await fetch(
            `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemon_squeezy_subscription_id}`,
            {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${process.env.LEMON_SQUEEZY_API_KEY}`,
                    Accept: 'application/vnd.api+json',
                },
            }
        )

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('[CancelSub] LS API error:', errorData)
            throw new Error('Failed to cancel subscription')
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[CancelSub] Error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
