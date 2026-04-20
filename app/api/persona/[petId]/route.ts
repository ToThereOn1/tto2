import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
    params: Promise<{ petId: string }>
}

/**
 * GET /api/persona/[petId]
 * Fetch persona for a specific pet
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { petId } = await params
        const supabase = await createClient()

        // 1. Get authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Fetch persona with user verification (via pet relationship)
        const { data: persona, error } = await supabase
            .from('pet_personas')
            .select(`
                *,
                pet:pets!inner(user_id)
            `)
            .eq('pet_id', petId)
            .eq('pet.user_id', user.id)
            .single()

        if (error || !persona) {
            return NextResponse.json({ error: 'Persona not found' }, { status: 404 })
        }

        return NextResponse.json({ persona })

    } catch (error) {
        console.error('Fetch persona error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
