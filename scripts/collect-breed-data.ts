/**
 * 품종 데이터 수집 스크립트
 * The Dog API + The Cat API에서 품종 데이터를 수집하여 Supabase에 저장합니다.
 *
 * 실행 방법:
 *   npx tsx scripts/collect-breed-data.ts
 *
 * 필요 환경변수:
 *   DOG_API_KEY, CAT_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (또는 NEXT_PUBLIC_SUPABASE_ANON_KEY)
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
    process.exit(1)
}

const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

// ─────────────────────────────────────────
// STEP 1: The Dog API에서 모든 품종 수집
// ─────────────────────────────────────────

async function collectDogBreeds(): Promise<number> {
    console.log('🐕 The Dog API에서 품종 데이터 수집 시작...')

    const apiKey = process.env.DOG_API_KEY
    const headers: Record<string, string> = {}
    if (apiKey) headers['x-api-key'] = apiKey

    const response = await fetch('https://api.thedogapi.com/v1/breeds', { headers })

    if (!response.ok) {
        console.error(`❌ Dog API 요청 실패: ${response.status} ${response.statusText}`)
        return 0
    }

    const breeds = await response.json()
    console.log(`✅ ${breeds.length}개 강아지 품종 수집 완료`)

    let insertedCount = 0

    for (const breed of breeds) {
        // 사이즈 카테고리 판단
        const weight = breed.weight?.metric?.split(' - ').map(Number) || [0, 0]
        const avgWeight = (weight[0] + weight[1]) / 2

        let size_category = 'medium'
        if (avgWeight < 10) size_category = 'small'
        else if (avgWeight < 25) size_category = 'medium'
        else if (avgWeight < 45) size_category = 'large'
        else size_category = 'giant'

        // 수명 파싱
        const lifespan = breed.life_span?.replace(' years', '').split(' - ').map(Number) || [10, 15]

        const { error } = await supabase
            .from('breed_characteristics')
            .upsert({
                species: 'dog',
                breed_name_en: breed.name,
                breed_group: breed.breed_group || null,
                temperament_keywords: breed.temperament
                    ? breed.temperament.split(', ')
                    : [],
                description_en: breed.temperament || '',
                size_category,
                weight_kg_min: weight[0] || null,
                weight_kg_max: weight[1] || null,
                lifespan_min: lifespan[0] || 10,
                lifespan_max: lifespan[1] || 15,
                source_dog_api_id: breed.id,
                traits_numeric: {}
            }, {
                onConflict: 'species,breed_name_en'
            })

        if (!error) {
            insertedCount++
        } else {
            console.error(`❌ ${breed.name} 삽입 실패:`, error.message)
        }

        // Rate limit 방지
        await new Promise(r => setTimeout(r, 50))
    }

    console.log(`✅ 강아지 품종 ${insertedCount}개 DB 저장 완료`)
    return breeds.length
}

// ─────────────────────────────────────────
// STEP 2: The Cat API에서 모든 품종 수집
// ─────────────────────────────────────────

async function collectCatBreeds(): Promise<number> {
    console.log('🐈 The Cat API에서 품종 데이터 수집 시작...')

    const apiKey = process.env.CAT_API_KEY
    const headers: Record<string, string> = {}
    if (apiKey) headers['x-api-key'] = apiKey

    const response = await fetch('https://api.thecatapi.com/v1/breeds', { headers })

    if (!response.ok) {
        console.error(`❌ Cat API 요청 실패: ${response.status} ${response.statusText}`)
        return 0
    }

    const breeds = await response.json()
    console.log(`✅ ${breeds.length}개 고양이 품종 수집 완료`)

    let insertedCount = 0

    for (const breed of breeds) {
        // Cat API는 수치형 데이터 직접 제공
        const traitsNumeric: Record<string, number | null> = {
            adaptability: breed.adaptability || null,
            affection_level: breed.affection_level || null,
            child_friendly: breed.child_friendly || null,
            dog_friendly: breed.dog_friendly || null,
            energy_level: breed.energy_level || null,
            grooming: breed.grooming || null,
            health_issues: breed.health_issues || null,
            intelligence: breed.intelligence || null,
            shedding_level: breed.shedding_level || null,
            social_needs: breed.social_needs || null,
            stranger_friendly: breed.stranger_friendly || null,
            vocalisation: breed.vocalisation || null
        }

        // 사이즈
        let size_category = 'medium'
        if (breed.weight?.metric) {
            const weights = breed.weight.metric.split(' - ').map(Number)
            const avg = (weights[0] + weights[1]) / 2
            if (avg < 4) size_category = 'small'
            else if (avg < 7) size_category = 'medium'
            else size_category = 'large'
        }

        // 수명
        const lifespan = breed.life_span?.split(' - ').map(Number) || [10, 15]

        const { error } = await supabase
            .from('breed_characteristics')
            .upsert({
                species: 'cat',
                breed_name_en: breed.name,
                breed_group: breed.origin || null,
                temperament_keywords: breed.temperament
                    ? breed.temperament.split(', ')
                    : [],
                description_en: breed.description || '',
                size_category,
                lifespan_min: lifespan[0] || 12,
                lifespan_max: lifespan[1] || 18,
                source_cat_api_id: typeof breed.id === 'number' ? breed.id : null,
                traits_numeric: traitsNumeric,
                source_kaggle_matched: false
            }, {
                onConflict: 'species,breed_name_en'
            })

        if (!error) {
            insertedCount++
        } else {
            console.error(`❌ ${breed.name} 삽입 실패:`, error.message)
        }

        // Rate limit 방지
        await new Promise(r => setTimeout(r, 50))
    }

    console.log(`✅ 고양이 품종 ${insertedCount}개 DB 저장 완료`)
    return breeds.length
}

// ─────────────────────────────────────────
// STEP 3: LLM 참조용 서술 텍스트 자동 생성
// ─────────────────────────────────────────

async function generatePersonaReferenceText() {
    console.log('✍️ LLM 참조용 서술 텍스트 생성 시작...')

    const { data: breeds } = await supabase
        .from('breed_characteristics')
        .select('*')
        .is('persona_reference_text', null)

    if (!breeds || breeds.length === 0) {
        console.log('ℹ️ 서술 텍스트가 필요한 품종이 없습니다.')
        return
    }

    const describe = (score: number, trait: string): string => {
        if (!score) return ''
        const levels: Record<number, string> = {
            1: '매우 낮은', 2: '낮은', 3: '보통의', 4: '높은', 5: '매우 높은'
        }
        return `${levels[score] || '보통의'} ${trait}(${score}/5점)`
    }

    for (const breed of breeds) {
        const traits = breed.traits_numeric as Record<string, number> || {}
        const keywords = breed.temperament_keywords || []

        let referenceText = `
[품종 기준 정보: ${breed.breed_name_en} / ${breed.species === 'dog' ? '강아지' : '고양이'}]

성격 키워드: ${keywords.join(', ')}

수치형 특성:
`
        if (traits.energy_level) {
            referenceText += `- 에너지: ${describe(traits.energy_level, '에너지 수준')} - `
            referenceText += traits.energy_level >= 4 ? '활동적이고 운동을 즐김\n' : '차분하고 조용한 편\n'
        }

        if (traits.affection_with_family || traits.affection_level) {
            const score = traits.affection_with_family || traits.affection_level
            referenceText += `- 애정 표현: ${describe(score, '가족 친화도')} - `
            referenceText += score >= 4 ? '가족에게 매우 애정이 깊음\n' : '독립적인 편\n'
        }

        if (traits.trainability) {
            referenceText += `- 훈련성: ${describe(traits.trainability, '훈련 용이성')} - `
            referenceText += traits.trainability >= 4 ? '영리하고 말을 잘 들음\n' : '고집이 있는 편\n'
        }

        if (traits.openness_to_strangers || traits.stranger_friendly) {
            const score = traits.openness_to_strangers || traits.stranger_friendly
            referenceText += `- 낯선 사람: ${describe(score, '낯선 사람 친화도')} - `
            referenceText += score >= 4 ? '낯선 사람에게도 잘 다가감\n' : '낯선 사람을 경계하는 편\n'
        }

        if (traits.vocalisation || traits.barking_level) {
            const score = traits.vocalisation || traits.barking_level
            referenceText += `- 발성: ${describe(score, '발성 수준')} - `
            referenceText += score >= 4 ? '표현이 많고 자주 소리를 냄\n' : '조용한 편\n'
        }

        referenceText += `
수명 기준: 일반적으로 ${breed.lifespan_min}-${breed.lifespan_max}세
체형: ${breed.size_category || '정보 없음'}

⚠️ 이 데이터는 품종 평균입니다.
설문 응답에서 드러난 개별 특성이 이 수치와 다를 경우,
개별 특성을 우선시하고 이 수치는 참고값으로만 사용하세요.
`

        await supabase
            .from('breed_characteristics')
            .update({ persona_reference_text: referenceText })
            .eq('id', breed.id)
    }

    console.log(`✅ ${breeds.length}개 품종의 서술 텍스트 생성 완료`)
}

// ─────────────────────────────────────────
// MAIN: 전체 실행
// ─────────────────────────────────────────

async function main() {
    console.log('🚀 품종 데이터베이스 구축 시작')
    console.log('='.repeat(50))

    const dogCount = await collectDogBreeds()
    const catCount = await collectCatBreeds()
    await generatePersonaReferenceText()

    console.log('='.repeat(50))
    console.log('🎉 품종 데이터베이스 구축 완료!')
    console.log(`📊 최종 결과:`)
    console.log(`   - 강아지 품종: ${dogCount}개`)
    console.log(`   - 고양이 품종: ${catCount}개`)
}

main().catch(console.error)
