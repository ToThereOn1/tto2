// POST /api/auth/delete
// 유저 탈퇴 (Account Deletion)
// 1. 활성 구독이 있다면 Lemon Squeezy API를 통해 먼저 즉시 취소,
// 2. Supabase Admin API를 통해 유저 계정 삭제 (연관된 pets, letters, letters_quota도 ON DELETE CASCADE로 모두 삭제됨)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Cancel Lemon Squeezy Subscription immediately if exists
        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('lemon_squeezy_subscription_id, status')
            .eq('user_id', user.id)
            .single()

        if (subscription && subscription.lemon_squeezy_subscription_id && subscription.status === 'active') {
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
                console.warn('[Account Deletion] Failed to cancel LS Subscription, proceeding anyway. ID:', subscription.lemon_squeezy_subscription_id)
            }
        }

        // 2. Delete Supabase User using Admin API (which safely cascades DB deletes due to RLS & Schema FK rules)
        const { error: deletionError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

        if (deletionError) {
            throw deletionError;
        }

        return NextResponse.json({ success: true, message: 'Account successfully deleted' })

    } catch (error: any) {
        console.error('[Account Deletion] Error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
