// POST /api/waitlist
// Plus/Pro 출시 대기자 이메일 수집
// waitlist 테이블에 upsert (email + plan unique)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const { email, plan } = await request.json()

        if (!email || typeof email !== 'string' || !email.includes('@')) {
            return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
        }

        if (!plan || !['plus', 'pro'].includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }

        const supabase = createAdminClient()

        const { error } = await supabase
            .from('waitlist')
            .upsert(
                { email: email.toLowerCase().trim(), plan, plan_interest: plan },
                { onConflict: 'email,plan', ignoreDuplicates: true }
            )

        if (error) {
            console.error('[Waitlist] DB error:', error)
            // Duplicate entry (already joined) = success for UX
            if (error.code === '23505') {
                return NextResponse.json({ success: true })
            }
            throw error
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('[Waitlist] Error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
