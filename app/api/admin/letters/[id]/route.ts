import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateLetterReply } from '@/lib/letter-generator'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * PATCH /api/admin/letters/[id]
 * Update letter content and/or status (uses admin client to bypass RLS)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle()
        if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        // Use admin client for operations
        const adminClient = createAdminClient()
        const body = await request.json()
        const { action, content } = body

        // Get the letter
        const { data: letter, error: fetchError } = await adminClient
            .from('letters')
            .select('*, pets(id, name, species)')
            .eq('id', id)
            .single()

        if (fetchError || !letter) {
            return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
        }

        switch (action) {
            case 'approve': {
                // Approve - change status (no updated_at column)
                console.log(`[Admin] Approving letter ${id}...`);
                const { error: updateError } = await adminClient
                    .from('letters')
                    .update({
                        status: 'approved',
                        content: content || letter.content
                    })
                    .eq('id', id)

                if (updateError) {
                    console.error('[Admin] Approve Error:', updateError);
                    return NextResponse.json({ error: updateError.message }, { status: 500 })
                }
                console.log(`[Admin] Letter ${id} approved successfully.`)

                // Create feed event for the pet - watching the letter arrive
                const petName = letter.pets?.name || 'Pet'
                await adminClient.from('pet_status_events').insert({
                    pet_id: letter.pet_id,
                    tothereon_day: 0,
                    event_type: 'letter_received',
                    event_title: `A new letter arrived for ${petName}!`,
                    event_description: `${petName} received a letter and began wagging their tail as they read it. The paper seemed to carry a familiar, comforting scent.`,
                    mood: 'joyful',
                    zone: 'memory_village'
                })

                // 🔔 Send notification to the guardian
                try {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
                    await fetch(`${baseUrl}/api/notifications/send`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
                        body: JSON.stringify({
                            userId: letter.user_id,
                            type: 'letter_status',
                            title: `A letter from ${petName} has arrived!`,
                            message: `${petName} has sent you a reply from ToThereOn World. Check your Mailbox to read it.`,
                            linkUrl: `/dashboard/pets/${letter.pet_id}/mailbox`,
                            metadata: { letterId: id, petId: letter.pet_id }
                        })
                    })
                } catch (notifErr) {
                    console.error('[Admin] Notification send failed (non-critical):', notifErr)
                }

                return NextResponse.json({ success: true, status: 'approved' })
            }

            case 'edit': {
                // Update content only
                const { error: updateError } = await adminClient
                    .from('letters')
                    .update({ content })
                    .eq('id', id)

                if (updateError) {
                    return NextResponse.json({ error: updateError.message }, { status: 500 })
                }

                return NextResponse.json({ success: true, status: 'edited' })
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

    } catch (error) {
        console.error('Letter update error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/admin/letters/[id]
 * Regenerate AI reply
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params

        // Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle()
        if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        // Use admin client
        const adminClient = createAdminClient()

        // Get letter with pet info
        const { data: letter, error: fetchError } = await adminClient
            .from('letters')
            .select('*, pets(id, name, species)')
            .eq('id', id)
            .single()

        if (fetchError || !letter) {
            return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
        }

        // Get persona
        const { data: persona, error: personaError } = await adminClient
            .from('pet_personas')
            .select('persona_profile')
            .eq('pet_id', letter.pet_id)
            .single()

        if (personaError || !persona) {
            return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
        }

        // Regenerate letter
        const result = await generateLetterReply(
            { name: letter.pets?.name || 'Pet', species: letter.pets?.species || 'pet' },
            persona.persona_profile,
            0,
            []
        )

        // Update letter (no updated_at column)
        const { error: updateError } = await adminClient
            .from('letters')
            .update({
                content: result.content,
                metadata: {
                    ...(letter.metadata || {}),
                    regenerated_at: new Date().toISOString(),
                    regeneration_cost: result.cost
                }
            })
            .eq('id', id)

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            newContent: result.content,
            cost: result.cost
        })

    } catch (error) {
        console.error('Letter regenerate error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
