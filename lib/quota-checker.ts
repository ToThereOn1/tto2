// lib/quota-checker.ts
// 편지 월별 Quota 확인 및 증가
// petId 지원: 신규 (petId 포함), 레거시 (userId만)

import { createAdminClient } from '@/lib/supabase/server'
import { PLAN_LETTER_LIMITS } from '@/lib/constants/plans'

// [HOTFIX] 마스터 계정은 무제한
const MASTER_EMAIL = process.env.ADMIN_EMAIL ?? ''

export async function checkLetterQuota(
    userId: string,
    petId?: string
): Promise<{ canSend: boolean; remaining: number; resetDate: Date }> {
    const supabase = createAdminClient()
    const month = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

    // 마스터 계정 override
    const { data: userRow } = await supabase
        .from('users')
        .select('email, subscription_tier')
        .eq('id', userId)
        .single()

    if (userRow?.email === MASTER_EMAIL) {
        return { canSend: true, remaining: 9999, resetDate: nextMonthDate(month) }
    }

    const tier = (userRow?.subscription_tier as string) || 'free'

    // quota 레코드 조회 (petId 있으면 pet 별, 없으면 user 전체)
    let query = supabase
        .from('letter_quota')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)

    if (petId) query = query.eq('pet_id', petId)
    else query = query.is('pet_id', null)

    const { data: quota } = await query.single()

    if (!quota) {
        // 이달 quota 레코드 없으면 생성
        const allowed = PLAN_LETTER_LIMITS[tier as keyof typeof PLAN_LETTER_LIMITS] ?? 0
        const insertData: Record<string, unknown> = {
            user_id: userId,
            month,
            letters_sent: 0,
            letters_allowed: allowed,
        }
        if (petId) insertData.pet_id = petId

        const { data: newQuota } = await supabase
            .from('letter_quota')
            .insert(insertData)
            .select()
            .single()

        return {
            canSend: (newQuota?.letters_allowed ?? 0) > 0,
            remaining: newQuota?.letters_allowed ?? 0,
            resetDate: nextMonthDate(month),
        }
    }

    return {
        canSend: quota.letters_sent < quota.letters_allowed,
        remaining: quota.letters_allowed - quota.letters_sent,
        resetDate: nextMonthDate(month),
    }
}

export async function incrementLetterQuota(userId: string, petId?: string) {
    const supabase = createAdminClient()
    const month = new Date().toISOString().slice(0, 7)

    // petId 가 있으면 pet별 quota, 없으면 기존 RPC 사용
    if (petId) {
        const { error } = await supabase.rpc('increment_letters_sent_by_pet', {
            p_user_id: userId,
            p_pet_id: petId,
            p_month: month,
        })
        if (error) {
            // RPC 없으면 직접 UPDATE fallback
            await supabase
                .from('letter_quota')
                .update({ updated_at: new Date().toISOString() })
                .eq('user_id', userId)
                .eq('pet_id', petId)
                .eq('month', month)
        }
    } else {
        await supabase.rpc('increment_letters_sent', {
            p_user_id: userId,
            p_month: month,
        })
    }
}

function nextMonthDate(month: string): Date {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() + 1)
    return d
}
