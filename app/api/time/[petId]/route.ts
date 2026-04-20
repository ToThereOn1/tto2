import { createClient } from '@/lib/supabase/server'
import { calculateToThereOnTime } from '@/lib/time-engine-v2'
import { NextResponse } from 'next/server'

interface RouteParams {
    params: Promise<{ petId: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
    try {
        const { petId } = await params
        const supabase = await createClient()

        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Get Pet Info (passed_date or created_at)
        const { data: pet, error } = await supabase
            .from('pets')
            .select('passed_date, created_at, name')
            .eq('id', petId)
            .eq('user_id', user.id) // Ensure ownership
            .single()

        if (error || !pet) {
            return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
        }

        // 3. Determine Start Date
        // Priority: passed_date > created_at
        const startDate = pet.passed_date || pet.created_at

        // 4. Calculate Time
        const timeInfo = calculateToThereOnTime(startDate)

        return NextResponse.json({
            petName: pet.name,
            startDate,
            ...timeInfo
        })

    } catch (error) {
        console.error('Time Engine API Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
