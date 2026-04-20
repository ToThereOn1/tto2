/**
 * scripts/test-feed-quality.ts
 *
 * 펫피드 품질 종합 시뮬레이션 스크립트 (v4.0)
 *
 * 테스트 시나리오:
 *   1. 일반 피드 (편지 없음)
 *   2. 편지 방금 받은 직후 피드 (just_received)
 *   3. 편지 수신 후 이틀 뒤 피드 (still_carrying)
 *
 * 평가 기준 (LLM-as-Judge, 각 25점 = 총 100점):
 *   - 몰입감 (immersion): 저쪽 세계가 살아있다는 느낌
 *   - 보호자연결 (guardian_connection): 보호자가 '이게 우리 펫이야' 느끼는 정도
 *   - 서사인과 (causality): 어제→오늘 연결, 편지→행동 반영
 *   - 세계관체감 (world_feel): NPC/장소/세계관 요소가 자연스럽게 녹아있는 정도
 *
 * Usage:
 *   npx tsx scripts/test-feed-quality.ts
 *   npx tsx scripts/test-feed-quality.ts <petId>   (단일 펫 테스트)
 *
 * Requires:
 *   CRON_SECRET in .env.local
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   Dev server running at http://localhost:3000 (or BASE_URL env)
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import {
    generateStatusEvent,
    determineEventType,
    calculateIntelligenceScore,
    calculateLearningStage,
} from '../lib/event-generator'
import { getCurrentZone } from '../lib/zone-manager'
import { detectUserLanguage } from '../lib/language-detector'
import type { PersonaProfile, DimensionalScores, HealingMission, NarrativeData } from '../lib/types/database'

// ─── Config ─────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TEST_PET_IDS = [
    'aa238b7b-7d44-4589-9fd9-a70c9b5c0e28', // Biscuit (Golden Retriever)
    '1b47aa18-4612-4335-a3e8-d09fd6f466a6', // Luna (Tabby cat)
    '50a04138-cc47-4f6a-8c4c-9ce2b0ca8d1b', // Mochi (Maltese)
    'c56c216d-a7c9-40e0-a141-248959906ed7', // Rex (German Shepherd)
    '0774cf63-40e6-421a-b2c7-ddf7542f1000', // Coco (Ragdoll cat)
]

const PASS_THRESHOLD = 70

// ─── Styles ─────────────────────────────────────────────────────────────

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const MAGENTA = '\x1b[35m'

function scoreBar(score: number, max = 25): string {
    const pct = score / max
    const filled = Math.round(pct * 10)
    const color = pct >= 0.8 ? GREEN : pct >= 0.6 ? YELLOW : RED
    return `${color}[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}]${RESET}`
}

// ─── Types ───────────────────────────────────────────────────────────────

interface EvalScore {
    immersion: number         // 몰입감 (0-25)
    guardian_connection: number  // 보호자 연결 (0-25)
    causality: number         // 서사 인과 (0-25)
    world_feel: number        // 세계관 체감 (0-25)
    total: number             // 합계 (0-100)
    highlights: string[]
    issues: string[]
    suggestions: string[]
}

interface ScenarioResult {
    petName: string
    petId: string
    scenario: string
    eventType: string
    content: string
    scores: EvalScore
}

// ─── Supabase Admin ──────────────────────────────────────────────────────

function getAdminClient() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
}

// ─── LLM Judge ───────────────────────────────────────────────────────────

interface PetTraits {
    secretHabit?: string
    preciousMemory?: string
    personalitySummary?: string
    joyTriggers?: string
}

async function evaluateFeed(
    content: string,
    petName: string,
    guardianRelationship: string,
    scenario: string,
    healingDirection?: string,
    petTraits?: PetTraits,
): Promise<EvalScore> {
    const anthropic = new Anthropic()

    const petIdentitySection = petTraits ? `
PET IDENTITY MARKERS (what makes ${petName} unique — the guardian knows these intimately):
${petTraits.personalitySummary ? `Personality: ${petTraits.personalitySummary}` : ''}
${petTraits.secretHabit ? `Signature behavior (only ${petName} does this): ${petTraits.secretHabit}` : ''}
${petTraits.preciousMemory ? `Precious shared memory with guardian: ${petTraits.preciousMemory}` : ''}
${petTraits.joyTriggers ? `What gets their attention: ${petTraits.joyTriggers}` : ''}

IMPORTANT: When evaluating GUARDIAN_CONNECTION, check if the content contains echoes of the above identity markers — even implicitly. The guardian KNOWS these traits, so if the content includes them naturally (even without naming them), that IS guardian connection. A high score (20-25) requires the signature behavior or precious memory to surface in the action.` : ''

    const prompt = `You are a quality evaluator for AI-generated pet feed content for the ToThereOn service.

ToThereOn is a service where deceased pets live in a parallel world (ToThereOn World) and send daily journal-style SNS posts to their guardians. The goal is to make guardians feel their pet is truly alive there, make them want to respond, and emotionally connect through the content.

CONTENT TO EVALUATE:
Pet name: ${petName}
Guardian relationship: ${guardianRelationship}
Test scenario: ${scenario}
${healingDirection ? `Healing direction: ${healingDirection}` : ''}
${petIdentitySection}

FEED CONTENT:
---
${content}
---

Evaluate on EXACTLY these 4 dimensions (0-25 points each, total max 100):

1. IMMERSION (몰입감, 0-25): Does this feel like a real place the pet actually lives in? Is the world alive and specific? Are there concrete details that make ToThereOn World feel real, not generic?
   - 20-25: Specific, vivid world details. You can picture the place.
   - 10-19: Some world-building, but could be any fantasy setting
   - 0-9: Generic, no sense of a specific world

2. GUARDIAN_CONNECTION (보호자연결, 0-25): Would the guardian read this and think "That's exactly my pet"? Is there a moment only THIS pet would do? Does the guardian feel seen/connected?
   Use the PET IDENTITY MARKERS above to evaluate accurately — the guardian recognizes these traits.
   - 20-25: The signature behavior or precious memory surfaces naturally in the action. The guardian would immediately think "that's MY ${petName}."
   - 14-19: Pet personality is visible, and identity markers partially surface, but the "only them" moment isn't fully landed.
   - 7-13: Some personality present but too generic — could be any similar pet.
   - 0-6: No recognizable pet behavior. Guardian cannot connect.

3. CAUSALITY (서사인과, 0-25): Is there narrative causality? Something happened because of something else? If a letter scenario, does the letter's emotional impact show in the pet's behavior?
   - 20-25: Clear cause-effect. The day's choices make logical sense from prior context. If letter scenario: letter's impact visible in behavior (not stated).
   - 10-19: Some causality but weak
   - 0-9: Events happen in isolation, no narrative thread

4. WORLD_FEEL (세계관체감, 0-25): Do ToThereOn World elements (NPCs, locations, world rules) feel natural and integrated? Not forced, not absent.
   - 20-25: World elements enrich the story naturally. NPCs feel like real characters.
   - 10-19: Some world elements but feel listed/forced
   - 0-9: World elements absent or feel like a backdrop decoration

Respond in EXACTLY this JSON format:
{
  "immersion": <0-25>,
  "guardian_connection": <0-25>,
  "causality": <0-25>,
  "world_feel": <0-25>,
  "highlights": ["<specific good thing 1>", "<specific good thing 2>"],
  "issues": ["<specific problem 1>"],
  "suggestions": ["<concrete improvement suggestion 1>", "<concrete improvement suggestion 2>"]
}`

    const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
    })

    const text = (response.content[0] as any).text.trim()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in eval response')

    const parsed = JSON.parse(jsonMatch[0])
    return {
        immersion: parsed.immersion ?? 0,
        guardian_connection: parsed.guardian_connection ?? 0,
        causality: parsed.causality ?? 0,
        world_feel: parsed.world_feel ?? 0,
        total: (parsed.immersion ?? 0) + (parsed.guardian_connection ?? 0) +
               (parsed.causality ?? 0) + (parsed.world_feel ?? 0),
        highlights: parsed.highlights ?? [],
        issues: parsed.issues ?? [],
        suggestions: parsed.suggestions ?? [],
    }
}

// ─── Feed Generation via API endpoint ────────────────────────────────────

async function generateFeedViaAPI(
    petId: string,
    letterSimulation?: 'none' | 'just_received' | 'still_carrying',
): Promise<{ petName: string; content: string; eventType: string; relationship: string }> {
    const res = await fetch(`${BASE_URL}/api/admin/test-generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({
            action: 'feed',
            petId,
            simulateLetterPhase: letterSimulation || 'none',
        }),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`API error ${res.status}: ${err}`)
    }

    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Unknown API error')

    return {
        petName: data.result.petName || 'Unknown',
        content: data.result.content,
        eventType: data.result.eventType,
        relationship: data.result.relationship || 'guardian',
    }
}

// ─── Direct generation (when API unavailable) ────────────────────────────

async function generateFeedDirect(
    petId: string,
    letterSimulation: 'none' | 'just_received' | 'still_carrying',
): Promise<{ petName: string; content: string; eventType: string; relationship: string; healingDirection?: string; petTraits?: PetTraits }> {
    const supabase = getAdminClient()

    // Fetch pet data
    const { data: pet, error } = await supabase
        .from('pets')
        .select(`
            id, name, species, breed, relationship, passed_date,
            pet_personas (
                id, persona_profile, dimensional_scores, healing_mission, narrative_data
            )
        `)
        .eq('id', petId)
        .single()

    if (error || !pet) throw new Error(`Pet not found: ${petId}`)

    const persona = Array.isArray(pet.pet_personas) ? pet.pet_personas[0] : pet.pet_personas
    if (!persona) throw new Error(`No persona for pet: ${petId}`)

    const personaProfile = persona.persona_profile as PersonaProfile
    const dimensionalScores = (persona.dimensional_scores || {
        social_energy: 50, curiosity_drive: 50, affection_style: 50,
        emotional_resilience: 50, playfulness_intensity: 50,
        food_motivation: 50, empathy_sensitivity: 50, social_preference: 50,
    }) as DimensionalScores
    const healingMission = (persona as any).healing_mission as HealingMission | null ?? null
    const narrativeData = (persona as any).narrative_data as NarrativeData | null ?? null

    // Calculate day
    const passed = new Date(pet.passed_date)
    const diffDays = Math.ceil(Math.abs(Date.now() - passed.getTime()) / (1000 * 60 * 60 * 24))
    const currentDay = Math.max(1, Math.floor(diffDays / 3) + 1)
    const realDaysElapsed = diffDays

    const currentZone = getCurrentZone(currentDay)
    const intelligenceScore = calculateIntelligenceScore(dimensionalScores)
    const { stage: learningStage, speed: learningSpeed, daysUntilMastery } =
        calculateLearningStage(currentDay, intelligenceScore)

    // Fetch recent events for narrative continuity
    const { data: recentEventData } = await supabase
        .from('pet_status_events')
        .select('tothereon_day, event_type, location, npc_involved, event_description, metadata')
        .eq('pet_id', petId)
        .order('tothereon_day', { ascending: false })
        .limit(3)

    const recentEvents = (recentEventData || []).map((e: any) => ({
        day: e.tothereon_day as number,
        eventType: e.event_type as string,
        locationName: (e.metadata as any)?.location_name || e.location || undefined,
        npcName: e.npc_involved || undefined,
        firstSentence: ((e.event_description || '') as string).split(/[.。!！]/)[0]?.trim() || '',
    }))

    const knownNpcNames = (recentEventData || [])
        .map((e: any) => e.npc_involved)
        .filter(Boolean) as string[]

    // Build letter simulation
    let letterContext = null
    let letterPhase: 'none' | 'just_received' | 'still_carrying' = 'none'
    let letterAgeHours = 0

    if (letterSimulation !== 'none') {
        letterPhase = letterSimulation
        letterAgeHours = letterSimulation === 'just_received' ? 80 : 140
        const mockGuardianName = pet.relationship === 'mom' ? '엄마' :
                                 pet.relationship === 'dad' ? '아빠' : 'Guardian'
        letterContext = {
            content: `${mockGuardianName}, I miss you so much. I hope you're doing well there. I keep thinking about the times we spent together. Are you eating well? Playing? I want you to know I'm okay, just missing you every day.`,
            quotes: [
                `I miss you so much.`,
                `Are you eating well? Playing?`,
                `I want you to know I'm okay, just missing you every day.`,
            ],
            date: new Date(Date.now() - letterAgeHours * 60 * 60 * 1000).toLocaleDateString(),
        }
    }

    const hasRecentLetter = letterSimulation !== 'none'
    const eventType = determineEventType(
        currentDay,
        hasRecentLetter,
        dimensionalScores,
        learningStage,
        learningSpeed,
        false, // letterReplyVisible is false during simulation
    )

    const memoryAnchors: string[] = []
    if (personaProfile.memory_anchors && Array.isArray(personaProfile.memory_anchors)) {
        personaProfile.memory_anchors.forEach((anchor: any) => {
            if (anchor.details) memoryAnchors.push(`${anchor.category}: ${anchor.details}`)
        })
    }

    // Detect language
    const { data: drData } = await supabase
        .from('deep_remembrance_responses')
        .select('responses')
        .eq('pet_id', petId)
        .maybeSingle()

    const drResponsesForLang = drData?.responses
        ? { deep_remembrance_responses: { responses: drData.responses } }
        : null
    const userLanguage = detectUserLanguage(drResponsesForLang || {}, null, null)

    const result = await generateStatusEvent({
        petId: pet.id,
        petName: pet.name,
        species: pet.species,
        breed: pet.breed,
        relationship: pet.relationship,
        personaProfile,
        dimensionalScores,
        currentDay,
        realDaysElapsed,
        currentZone,
        eventType,
        userLanguage,
        languageSource: 'test',
        recentLetter: letterContext,
        memoryAnchors,
        isPremium: false,
        intelligenceScore,
        learningStage,
        learningSpeed,
        daysUntilMastery,
        recentEvents,
        knownNpcNames,
        healingMission,
        narrativeData,
        letterPhase,
        letterAgeHours,
    })

    return {
        petName: pet.name,
        content: result.content,
        eventType: result.eventType,
        relationship: pet.relationship || 'guardian',
        healingDirection: healingMission?.healing_direction,
        petTraits: {
            secretHabit: (narrativeData as any)?.secret_habit || '',
            preciousMemory: (narrativeData as any)?.precious_memory || '',
            personalitySummary: personaProfile.personality_summary || '',
            joyTriggers: (personaProfile.behavioral_patterns as any)?.joy_triggers || '',
        },
    }
}

// ─── Main Loop ───────────────────────────────────────────────────────────

async function runScenarios(petIds: string[]): Promise<ScenarioResult[]> {
    const results: ScenarioResult[] = []
    const scenarios: Array<'none' | 'just_received' | 'still_carrying'> = [
        'none',
        'just_received',
        'still_carrying',
    ]

    for (const petId of petIds) {
        console.log(`\n${CYAN}${BOLD}펫 테스트 중: ${petId}${RESET}`)

        for (const scenario of scenarios) {
            const scenarioLabel =
                scenario === 'none' ? '일반 피드 (편지 없음)' :
                scenario === 'just_received' ? '⚡ 편지 방금 받음 (80h 경과)' :
                '편지 수신 후 이틀 (140h 경과)'

            process.stdout.write(`  ${DIM}시나리오: ${scenarioLabel} ... ${RESET}`)

            try {
                const generated = await generateFeedDirect(petId, scenario)
                const scores = await evaluateFeed(
                    generated.content,
                    generated.petName,
                    generated.relationship,
                    scenarioLabel,
                    generated.healingDirection,
                    generated.petTraits,
                )

                const passLabel = scores.total >= PASS_THRESHOLD
                    ? `${GREEN}PASS${RESET}`
                    : `${RED}FAIL${RESET}`
                console.log(`[${passLabel}] 총점 ${scores.total}/100`)

                results.push({
                    petName: generated.petName,
                    petId,
                    scenario: scenarioLabel,
                    eventType: generated.eventType,
                    content: generated.content,
                    scores,
                })
            } catch (err) {
                console.log(`${RED}ERROR${RESET}: ${err}`)
            }

            // Rate limit pause
            await new Promise(r => setTimeout(r, 1000))
        }
    }

    return results
}

function printDetailedReport(results: ScenarioResult[]) {
    console.log(`\n\n${'═'.repeat(70)}`)
    console.log(`${BOLD}${CYAN}  ToThereOn 펫피드 품질 평가 리포트 v4.0${RESET}`)
    console.log(`${'═'.repeat(70)}\n`)

    // Summary table
    const totalScores = results.map(r => r.scores.total)
    const avgTotal = totalScores.reduce((a, b) => a + b, 0) / totalScores.length
    const passCount = totalScores.filter(s => s >= PASS_THRESHOLD).length

    console.log(`${BOLD}전체 요약${RESET}`)
    console.log(`  테스트 수: ${results.length}개`)
    console.log(`  평균 점수: ${avgTotal.toFixed(1)}/100 ${avgTotal >= PASS_THRESHOLD ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`}`)
    console.log(`  합격률: ${passCount}/${results.length} (${Math.round(passCount / results.length * 100)}%)`)

    // Dimension averages
    const dims = ['immersion', 'guardian_connection', 'causality', 'world_feel'] as const
    const dimLabels = { immersion: '몰입감', guardian_connection: '보호자연결', causality: '서사인과', world_feel: '세계관체감' }
    console.log(`\n${BOLD}차원별 평균${RESET}`)
    for (const dim of dims) {
        const avg = results.reduce((a, r) => a + r.scores[dim], 0) / results.length
        console.log(`  ${dimLabels[dim].padEnd(12)} ${scoreBar(avg)} ${avg.toFixed(1)}/25`)
    }

    // Detailed results per pet
    console.log(`\n${BOLD}상세 결과${RESET}`)
    const byPet = new Map<string, ScenarioResult[]>()
    for (const r of results) {
        const key = `${r.petName} (${r.petId.slice(0, 8)})`
        if (!byPet.has(key)) byPet.set(key, [])
        byPet.get(key)!.push(r)
    }

    for (const [petKey, petResults] of byPet) {
        console.log(`\n  ${BOLD}${MAGENTA}${petKey}${RESET}`)
        for (const r of petResults) {
            const total = r.scores.total
            const passLabel = total >= PASS_THRESHOLD ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`
            console.log(`    ${passLabel} ${r.scenario.padEnd(35)} ${total}/100`)
            console.log(`      이벤트타입: ${r.eventType}`)

            // Show content snippet
            const snippet = r.content.split('\n')[0].slice(0, 100)
            console.log(`      내용: "${snippet}..."`)

            // Dim scores
            console.log(`      ${DIM}몰입${r.scores.immersion} | 보호자${r.scores.guardian_connection} | 인과${r.scores.causality} | 세계관${r.scores.world_feel}${RESET}`)

            // Highlights
            if (r.scores.highlights.length > 0) {
                console.log(`      ${GREEN}✓ ${r.scores.highlights[0]}${RESET}`)
            }
            // Issues
            if (r.scores.issues.length > 0) {
                console.log(`      ${RED}✗ ${r.scores.issues[0]}${RESET}`)
            }
        }
    }

    // Worst performing
    const sorted = [...results].sort((a, b) => a.scores.total - b.scores.total)
    const worst = sorted.slice(0, 3)
    console.log(`\n${BOLD}개선 필요 TOP 3${RESET}`)
    for (const r of worst) {
        console.log(`  ${RED}${r.scores.total}/100${RESET} — ${r.petName} / ${r.scenario}`)
        for (const s of r.scores.suggestions) {
            console.log(`    → ${s}`)
        }
    }

    // Overall verdict
    console.log(`\n${'═'.repeat(70)}`)
    if (avgTotal >= PASS_THRESHOLD) {
        console.log(`${GREEN}${BOLD}  결과: PASS — 평균 ${avgTotal.toFixed(1)}점으로 목표(${PASS_THRESHOLD}점) 달성${RESET}`)
    } else {
        console.log(`${RED}${BOLD}  결과: FAIL — 평균 ${avgTotal.toFixed(1)}점, 목표(${PASS_THRESHOLD}점) 미달${RESET}`)
        console.log(`${YELLOW}  프롬프트/코드 수정 후 재실행 필요${RESET}`)
    }
    console.log(`${'═'.repeat(70)}\n`)

    return avgTotal
}

async function main() {
    const specificPetId = process.argv[2]
    const petIds = specificPetId ? [specificPetId] : TEST_PET_IDS

    console.log(`${BOLD}${CYAN}ToThereOn 펫피드 품질 시뮬레이션 v4.0${RESET}`)
    console.log(`테스트 펫: ${petIds.length}개 × 3 시나리오 = ${petIds.length * 3}회 생성`)
    console.log(`합격 기준: 평균 ${PASS_THRESHOLD}점 이상\n`)

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error(`${RED}ERROR: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락${RESET}`)
        process.exit(1)
    }

    const results = await runScenarios(petIds)
    const avgScore = printDetailedReport(results)

    process.exit(avgScore >= PASS_THRESHOLD ? 0 : 1)
}

main().catch(err => {
    console.error(`${RED}Fatal error:${RESET}`, err)
    process.exit(1)
})
