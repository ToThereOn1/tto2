import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Letter Status Workflow:
 * sent → arrived_tothereon → delivered → writing_reply → pending_review
 */
const STATUS_TRANSITIONS: Record<string, { nextStatus: string }> = {
    'sent': { nextStatus: 'arrived_tothereon' },
    'arrived_tothereon': { nextStatus: 'delivered' },
    'delivered': { nextStatus: 'writing_reply' },
    'writing_reply': { nextStatus: 'pending_review' },
}

export async function POST() {
    try {
        // Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle()
        if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        // Use admin client (bypasses RLS)
        const adminClient = createAdminClient()

        // Get all in-progress PET letters
        const { data: letters, error: fetchError } = await adminClient
            .from('letters')
            .select('id, status, pet_id, pets(name)')
            .eq('sender_type', 'pet')
            .in('status', ['sent', 'arrived_tothereon', 'delivered', 'writing_reply'])

        if (fetchError) {
            return NextResponse.json({
                success: false,
                error: fetchError.message,
                transitions: []
            }, { status: 500 })
        }

        if (!letters || letters.length === 0) {
            return NextResponse.json({
                success: true,
                transitions: [],
                message: 'No letters in progress'
            })
        }

        const transitions: Array<{
            letterId: string
            petName: string
            from: string
            to: string
        }> = []

        // Process each letter
        for (const letter of letters) {
            const transition = STATUS_TRANSITIONS[letter.status]
            if (!transition) continue

            const petData = letter.pets as any
            const petName = petData?.name || petData?.[0]?.name || 'Unknown'

            // Update status ONLY (no updated_at - column doesn't exist)
            const { error: updateError } = await adminClient
                .from('letters')
                .update({ status: transition.nextStatus })
                .eq('id', letter.id)

            if (!updateError) {
                transitions.push({
                    letterId: letter.id,
                    petName,
                    from: letter.status,
                    to: transition.nextStatus
                })
            }
        }

        return NextResponse.json({
            success: true,
            transitions,
            message: `${transitions.length} letter(s) advanced`
        })

    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            transitions: []
        }, { status: 500 })
    }
}
