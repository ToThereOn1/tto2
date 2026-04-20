import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * DELETE /api/pets/[id]
 * 사용자의 Pet을 삭제합니다. 관련 데이터(설문, 페르소나, 편지 등)도 함께 삭제됩니다.
 * - createClient: 인증 확인용 (사용자 세션)
 * - createAdminClient: 데이터 삭제용 (RLS 우회)
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: petId } = await params
        const supabase = await createClient()

        // 1. 인증 확인
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Admin 클라이언트로 Pet 소유권 확인 (RLS 우회)
        const adminClient = createAdminClient()

        const { data: pet, error: petError } = await adminClient
            .from('pets')
            .select('id, user_id, name')
            .eq('id', petId)
            .eq('user_id', user.id)
            .single()

        if (petError || !pet) {
            return NextResponse.json({ error: 'Pet not found or access denied' }, { status: 404 })
        }

        // 3. 관련 데이터 삭제 (순서 중요: FK 의존성)
        // 3a. 상태 이벤트 삭제
        await adminClient
            .from('pet_status_events')
            .delete()
            .eq('pet_id', petId)

        // 3b. 편지 답장 삭제 (letters의 하위)
        const { data: letters } = await adminClient
            .from('letters')
            .select('id')
            .eq('pet_id', petId)

        if (letters && letters.length > 0) {
            const letterIds = letters.map(l => l.id)
            await adminClient
                .from('letter_replies')
                .delete()
                .in('letter_id', letterIds)
        }

        // 3c. 편지 삭제
        await adminClient
            .from('letters')
            .delete()
            .eq('pet_id', petId)

        // 3d. 페르소나 삭제
        await adminClient
            .from('pet_personas')
            .delete()
            .eq('pet_id', petId)

        // 3e. 설문 응답 삭제
        await adminClient
            .from('deep_remembrance_responses')
            .delete()
            .eq('pet_id', petId)

        // 3f. Pet 메모리 삭제
        await adminClient
            .from('pet_memories')
            .delete()
            .eq('pet_id', petId)

        // 3g. Visual DNA 삭제
        await adminClient
            .from('visual_dna')
            .delete()
            .eq('pet_id', petId)

        // 4. Pet 삭제
        const { error: deleteError } = await adminClient
            .from('pets')
            .delete()
            .eq('id', petId)
            .eq('user_id', user.id)

        if (deleteError) {
            console.error('Pet delete error:', deleteError)
            return NextResponse.json({ error: 'Failed to delete pet' }, { status: 500 })
        }

        console.log(`🗑️ Pet "${pet.name}" (${petId}) deleted by user ${user.id}`)

        return NextResponse.json({ success: true, deletedPet: pet.name })

    } catch (error) {
        console.error('Pet delete error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
