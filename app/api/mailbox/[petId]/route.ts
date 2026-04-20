import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
    params: Promise<{ petId: string }>
}

/**
 * GET /api/mailbox/[petId]
 * Fetch letters for a pet's mailbox
 * - User letters: all sent letters
 * - Pet letters: only 'approved' status (went through admin review)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { petId } = await params
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify pet ownership
        const { data: pet, error: petError } = await supabase
            .from('pets')
            .select('id, name, species, photos')
            .eq('id', petId)
            .eq('user_id', user.id)
            .single()

        if (petError || !pet) {
            return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
        }

        // Get user's sent letters (all statuses are fine for sent)
        const { data: sentLetters, error: sentError } = await supabase
            .from('letters')
            .select('*')
            .eq('pet_id', petId)
            .eq('sender_type', 'user')
            .order('created_at', { ascending: false })

        if (sentError) {
            console.error('Error fetching sent letters:', sentError)
        }

        // Get pet's approved replies only
        const { data: receivedLetters, error: receivedError } = await supabase
            .from('letters')
            .select('*')
            .eq('pet_id', petId)
            .eq('sender_type', 'pet')
            .eq('status', 'approved')  // Only show approved letters
            .order('created_at', { ascending: false })

        if (receivedError) {
            console.error('Error fetching received letters:', receivedError)
        }

        // Get pending/in-progress letters count for display
        const { count: pendingCount } = await supabase
            .from('letters')
            .select('*', { count: 'exact', head: true })
            .eq('pet_id', petId)
            .eq('sender_type', 'pet')
            .neq('status', 'approved')

        return NextResponse.json({
            pet,
            sent: sentLetters || [],
            received: receivedLetters || [],
            pendingReplies: pendingCount || 0
        })

    } catch (error) {
        console.error('Mailbox fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
