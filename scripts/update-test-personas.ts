/**
 * scripts/update-test-personas.ts
 *
 * 테스트 펫 5마리의 pet_personas 레코드에 healing_mission + narrative_data 주입.
 * 이 데이터가 없으면 prompt-builder.ts의 핵심 섹션들이 전혀 작동하지 않음:
 *   - buildHealingBehaviorSection() (행동 지침)
 *   - secretHabit (보호자만 아는 비밀 습관)
 *   - precious_memory (공유 기억)
 *   - special_superpower (고유 능력)
 *   - voice_tone (나레이터 목소리 지침)
 *
 * Usage: npx tsx scripts/update-test-personas.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Test Pet Persona Updates ─────────────────────────────────────────────────

const PERSONA_UPDATES = [
    {
        petId: 'aa238b7b-7d44-4589-9fd9-a70c9b5c0e28',
        name: 'Biscuit',
        healing_mission: {
            healing_direction: 'love_affirmation',
            core_desire: 'I want Biscuit to know his love made every day better — that it was mutual',
            desired_messages: [
                'You were loved completely, every single day',
                'Every adventure was worth it because of you',
                'You made every room feel like home just by being in it',
            ],
        },
        narrative_data: {
            secret_habit: 'Checks every corner of a new space first — nose down, one full sweep, corner to corner — before allowing himself to settle anywhere else',
            voice_tone: 'Warm, immediate, sensory-obsessed. Every discovery lands like the best one yet. Short excited bursts for action ("Water. Cold. Perfect."), longer sentences when following a scent trail.',
            precious_memory: 'After-dinner walks when the neighborhood was quiet — just the two of us and every smell worth knowing in the whole street',
            special_superpower: 'Can detect peanut butter from the other end of any building. Has never been wrong. Will find it.',
        },
    },
    {
        petId: '1b47aa18-4612-4335-a3e8-d09fd6f466a6',
        name: 'Luna',
        healing_mission: {
            healing_direction: 'closure',
            core_desire: 'I want to know Luna found peace — that she had enough, and gave enough',
            desired_messages: [
                'She is settled. She chose this.',
                'The trust she gave was the highest thing she had',
                'She was always okay — on her own terms',
            ],
        },
        narrative_data: {
            secret_habit: 'Always positions with back to the wall, full view of the room ahead — never sits where she cannot see everything at once',
            voice_tone: 'Measured, dry, precise. Observations delivered as plain fact. Warmth expressed through what she notices, never through what she says about it. The pause is part of every sentence.',
            precious_memory: 'The night she stayed on guardian\'s chest for hours when guardian was sick — she did not move once the entire night',
            special_superpower: 'Can evaluate an entire room from the doorway and already know the single best spot before taking one step inside',
        },
    },
    {
        petId: '50a04138-cc47-4f6a-8c4c-9ce2b0ca8d1b',
        name: 'Mochi',
        healing_mission: {
            healing_direction: 'grief_comfort',
            core_desire: 'I need to know Mochi is finally safe and no longer afraid of anything',
            desired_messages: [
                'She is safe now. Completely safe.',
                'She found her soft place to land',
                'The bravery was always there — she just needed time',
            ],
        },
        narrative_data: {
            secret_habit: 'One paw touches before the whole body commits — tests every surface, every threshold, every new patch of ground before arriving fully. Always.',
            voice_tone: 'Soft, careful, moves through sentences slowly. Bravery appears in small specific actions — never declarations. When something delights her, she describes it like a whisper.',
            precious_memory: 'Blanket mornings — guardian\'s warmth through the fabric, nose to collarbone, one paw on wrist — when there was nothing to be careful about',
            special_superpower: 'Can feel when a space is truly safe before anyone else knows. First to relax. First to know.',
        },
    },
    {
        petId: 'c56c216d-a7c9-40e0-a141-248959906ed7',
        name: 'Rex',
        healing_mission: {
            healing_direction: 'guilt_relief',
            core_desire: 'I want to know Rex was fulfilled — that I gave him enough, and that he knew',
            desired_messages: [
                'He was complete. He always was.',
                'He knew exactly what he was doing and it was enough',
                'The job was his. He chose it.',
            ],
        },
        narrative_data: {
            secret_habit: 'When settling anywhere new, faces the entrance first — always locates the door before anything else, then takes his position. Every single time.',
            voice_tone: 'Direct, economical, certain. No qualifiers. What happened and what followed. Authority without needing to announce it. Warmth in what he notices, never in how he talks about it.',
            precious_memory: 'Morning perimeter walks — full route, nose down, methodical, before the day was allowed to start. Just the two of them.',
            special_superpower: 'Can assess the security of any space in a single pass and already know the one thing worth watching. Never wrong.',
        },
    },
    {
        petId: '0774cf63-40e6-421a-b2c7-ddf7542f1000',
        name: 'Coco',
        healing_mission: {
            healing_direction: 'love_affirmation',
            core_desire: 'I want to know Coco knew she was seen and studied back — that the attention was mutual',
            desired_messages: [
                'She knew she was loved and deeply seen',
                'The study was mutual — always',
                'She made you feel like the most interesting thing that ever existed. That was her gift.',
            ],
        },
        narrative_data: {
            secret_habit: 'Head tilts slowly left — always left, never right — when something has been found genuinely interesting. It means she has decided to study it properly.',
            voice_tone: 'Contemplative, precise, time-stretched. Describes things as if she has been watching longer than she has. Dry conclusions delivered mid-sentence, without announcement.',
            precious_memory: 'Reading evenings — exactly three feet away, arranged just so, close enough to be in the same world, far enough to be entirely in her own',
            special_superpower: 'Can watch running water for hours and find something new in it every single time. Has never seen the same water twice.',
        },
    },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('ERROR: Missing Supabase env vars in .env.local')
        process.exit(1)
    }

    console.log('Updating test pet personas with healing_mission + narrative_data...\n')

    let allSuccess = true

    for (const update of PERSONA_UPDATES) {
        process.stdout.write(`  ${update.name} (${update.petId.slice(0, 8)}...)  `)

        const { error } = await supabase
            .from('pet_personas')
            .update({
                healing_mission: update.healing_mission,
                narrative_data: update.narrative_data,
            })
            .eq('pet_id', update.petId)

        if (error) {
            console.log(`ERROR: ${error.message}`)
            allSuccess = false
        } else {
            console.log('OK')
        }
    }

    // Verify
    console.log('\nVerifying...')
    for (const update of PERSONA_UPDATES) {
        const { data, error } = await supabase
            .from('pet_personas')
            .select('healing_mission, narrative_data')
            .eq('pet_id', update.petId)
            .single()

        if (error || !data) {
            console.log(`  ${update.name}: VERIFY FAILED — ${error?.message}`)
            allSuccess = false
            continue
        }

        const hm = (data as any).healing_mission
        const nd = (data as any).narrative_data
        const hmOk = hm?.healing_direction && hm?.core_desire
        const ndOk = nd?.secret_habit && nd?.precious_memory
        console.log(`  ${update.name}: healing_mission=${hmOk ? 'OK' : 'MISSING'}, narrative_data=${ndOk ? 'OK' : 'MISSING'}`)
        if (!hmOk || !ndOk) allSuccess = false
    }

    console.log(allSuccess ? '\nAll updates verified OK.' : '\nSome updates failed — check above.')
    process.exit(allSuccess ? 0 : 1)
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
