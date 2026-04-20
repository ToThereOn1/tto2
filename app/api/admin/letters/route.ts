import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/letters
 * Fetch letters pending review (uses admin client to bypass RLS)
 */
export async function GET() {
    try {
        // Auth check with regular client
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle()
        if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        // Use admin client to bypass RLS
        const adminClient = createAdminClient()

        // Get pending review letters with pet info
        // NOTE: Only select columns that exist in actual DB
        const { data: pendingLetters, error } = await adminClient
            .from('letters')
            .select(`
                id,
                pet_id,
                user_id,
                sender_type,
                content,
                status,
                created_at,
                pets(id, name, species, photos, relationship)
            `)
            .in('status', ['pending_review', 'borderline_review'])
            .eq('sender_type', 'pet')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[Admin Letters] Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log(`[Admin Letters] Found ${pendingLetters?.length || 0} pending letters`)

        // For each pending letter, get the original user letter
        const lettersWithContext = await Promise.all(
            (pendingLetters || []).map(async (letter: { pet_id: string; created_at: string } & Record<string, unknown>) => {
                const { data: userLetter } = await adminClient
                    .from('letters')
                    .select('id, content, created_at')
                    .eq('pet_id', letter.pet_id)
                    .eq('sender_type', 'user')
                    .lt('created_at', letter.created_at)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                return {
                    ...letter,
                    originalUserLetter: userLetter || null
                }
            })
        )

        return NextResponse.json({ letters: lettersWithContext })

    } catch (error) {
        console.error('[Admin Letters] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
