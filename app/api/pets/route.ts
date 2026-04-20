// POST /api/pets
// Pet 등록 API — pet_limit 초과 시 403 PET_LIMIT_REACHED 반환
// GET /api/pets — 유저의 활성 Pet 목록 반환

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLAN_PET_LIMITS, PlanTier } from '@/lib/constants/plans'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: pets, error } = await supabase
            .from('pets')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) throw error
        return NextResponse.json({ pets })
    } catch (error: any) {
        console.error('[Pets GET] Error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // 유저 pet_limit 조회 (pet_limit 없으면 max_pets_allowed fallback)
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('pet_limit, max_pets_allowed, subscription_tier')
            .eq('id', user.id)
            .single()

        if (userError || !userData) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Admin bypass: admin_users 테이블에 있으면 펫 한도 무제한
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()

        const tier = (userData?.subscription_tier || 'free').toLowerCase() as PlanTier
        const petLimit = PLAN_PET_LIMITS[tier] || 1

        // 현재 등록된 Pet 수 조회
        const { count: currentPetCount, error: countError } = await supabase
            .from('pets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if (countError) throw countError

        if (!adminUser && (currentPetCount ?? 0) >= petLimit) {
            return NextResponse.json(
                {
                    error: 'PET_LIMIT_REACHED',
                    message: 'Upgrade to Plus to register a 2nd pet',
                    current: currentPetCount,
                    limit: petLimit,
                    upgrade_cta: {
                        en: 'Bring your other companion to ToThereOn World',
                        ko: '두 번째 반려동물도 ToThereOn 세계로 데려오세요',
                    },
                },
                { status: 403 }
            )
        }

        const petData = await request.json()

        const { data: newPet, error: insertError } = await supabase
            .from('pets')
            .insert({
                user_id: user.id,
                name: petData.name,
                species: petData.species,
                breed: petData.breed || null,
                birth_date: petData.birth_date || null,
                passed_date: petData.passed_date,
                gender: petData.gender || null,
                relationship: petData.relationship || null,
                photos: petData.photos || null,
                weight_kg: petData.weight_kg || null,
            })
            .select()
            .single()

        if (insertError) throw insertError

        return NextResponse.json({ pet: newPet })

    } catch (error: any) {
        console.error('[Pets POST] Error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
