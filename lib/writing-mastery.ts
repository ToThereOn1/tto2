// =============================================================
// ToThereOn Writing Mastery — DB 연동 헬퍼 v2.0
// 7단계 시스템: ToThereOn Day 기준 고정 임계값 (breed 무관)
// =============================================================

import { createAdminClient } from '@/lib/supabase/server'
import { getLearningStage, getLearningParams, type LearningStage } from '@/lib/learning-stage'
import { calculateToThereOnTime } from '@/lib/time-engine'

interface PetMasteryData {
    stage: LearningStage
    typo_rate: number
    vocab_richness: number
    current_day: number
    stage_name: string
}

/**
 * 펫의 현재 학습 단계 조회.
 * ToThereOn Day만으로 결정 — breed, trainability 불필요.
 */
export async function getPetMastery(petId: string): Promise<PetMasteryData> {
    const supabase = createAdminClient()

    const { data: pet } = await supabase
        .from('pets')
        .select('passed_date, created_at')
        .eq('id', petId)
        .single()

    if (!pet) {
        return getLearningParams(1) // Day 1 default
    }

    const startDate = pet.passed_date || pet.created_at
    const { currentDay } = calculateToThereOnTime(startDate)

    return getLearningParams(currentDay)
}
