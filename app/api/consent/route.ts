import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { REQUIRED_CONSENT_ITEMS } from '@/lib/constants/terms'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { terms_version, consented_at, consent_items } = body

        if (!terms_version || !consent_items || !Array.isArray(consent_items)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Verify all required items were consented to
        const missingItems = REQUIRED_CONSENT_ITEMS.filter(
            (item) => !consent_items.includes(item)
        )
        if (missingItems.length > 0) {
            return NextResponse.json(
                { error: `Missing consent for: ${missingItems.join(', ')}` },
                { status: 400 }
            )
        }

        // Check if consent for this version already recorded
        const { data: existing } = await supabase
            .from('user_consents')
            .select('id')
            .eq('user_id', user.id)
            .eq('terms_version', terms_version)
            .single()

        if (existing) {
            // Already recorded — idempotent success
            return NextResponse.json({ success: true, already_recorded: true })
        }

        // Save consent record
        const { error: insertError } = await supabase
            .from('user_consents')
            .insert({
                user_id: user.id,
                terms_version,
                consented_at: consented_at ?? new Date().toISOString(),
                consent_items,
            })

        if (insertError) {
            console.error('[consent] Insert error:', insertError)
            return NextResponse.json({ error: 'Failed to save consent' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[consent] Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
