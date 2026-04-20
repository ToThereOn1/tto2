/**
 * POST /api/admin/test-generate
 *
 * Admin-only endpoint for testing AI content generation.
 * Protected by CRON_SECRET bearer token.
 *
 * Actions:
 *   feed   — Generate a status feed event for a pet (force override)
 *   reply  — Insert a test user letter then trigger reply generation
 *   eval   — Evaluate last generated content with Claude (LLM-as-Judge)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { extractLastSentence } from '@/lib/utils/sentence-parser'
import type { SentenceLang } from '@/lib/utils/sentence-parser'
import {
    generateStatusEvent,
    calculateTothereonDay,
    determineEventType,
    calculateIntelligenceScore,
    calculateLearningStage,
} from '@/lib/event-generator'
import type { StatusEventContext } from '@/lib/event-generator'
import { generateLetterReply } from '@/lib/reply-generator'
import { detectUserLanguage } from '@/lib/language-detector'
import { getCurrentZone } from '@/lib/zone-manager'
import type { PersonaProfile, DimensionalScores } from '@/lib/types/database'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

// ─── Auth guard ────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
    const auth = req.headers.get('authorization')
    return auth === `Bearer ${process.env.CRON_SECRET}`
}

// ─── Feed generation ───────────────────────────────────────────────────────

async function handleFeed(petId: string) {
    const admin = createAdminClient()

    // 1. Fetch pet + persona
    const { data: pet, error: petError } = await admin
        .from('pets')
        .select(`id, name, species, breed, relationship, passed_date, user_id,
            pet_personas ( id, persona_profile, dimensional_scores )`)
        .eq('id', petId)
        .single()

    if (petError || !pet) throw new Error(`Pet not found: ${petId}`)

    const persona = Array.isArray(pet.pet_personas) ? pet.pet_personas[0] : pet.pet_personas
    if (!persona) throw new Error(`No persona for pet ${pet.name}. Complete Deep Remembrance first.`)

    const personaProfile = persona.persona_profile as PersonaProfile
    const dimensionalScores = (persona.dimensional_scores || {
        social_energy: 50, curiosity_drive: 50, affection_style: 50,
        emotional_resilience: 50, playfulness_intensity: 50,
        food_motivation: 50, empathy_sensitivity: 50, social_preference: 50,
    }) as DimensionalScores

    // 2. Fetch recent letter
    const { data: recentLetter } = await admin
        .from('letters')
        .select('content, created_at')
        .eq('pet_id', petId)
        .eq('sender_type', 'user')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    // 3. Fetch recent events for narrative continuity
    const { data: recentEventData } = await admin
        .from('pet_status_events')
        .select('tothereon_day, event_type, location, npc_involved, event_description, metadata')
        .eq('pet_id', petId)
        .order('tothereon_day', { ascending: false })
        .limit(7)

    const recentEvents = (recentEventData || []).map((e: any) => ({
        day: e.tothereon_day as number,
        eventType: e.event_type as string,
        locationName: (e.metadata as any)?.location_name || e.location || undefined,
        npcName: e.npc_involved || undefined,
        firstSentence: ((e.event_description || '') as string).split(/[.。!！]/)[0]?.trim() || '',
        metadata: { hook_sentence: (e.metadata as any)?.hook_sentence || '' },
    }))

    // 4. Detect language
    let drResponsesForLang: any = null
    if (!recentLetter) {
        const { data: drData } = await admin
            .from('deep_remembrance_responses')
            .select('responses')
            .eq('pet_id', petId)
            .maybeSingle()
        if (drData?.responses) {
            drResponsesForLang = { deep_remembrance_responses: { responses: drData.responses } }
        }
    }
    const userLanguage = detectUserLanguage(drResponsesForLang || pet, null, recentLetter)
    const languageSource = recentLetter ? 'Recent Letter' : (drResponsesForLang ? 'Deep Remembrance' : 'Default')

    // 5. Calculate ToThereOn day
    const tothereonDay = calculateTothereonDay(pet.passed_date)
    const realDaysElapsed = Math.ceil(
        Math.abs(Date.now() - new Date(pet.passed_date).getTime()) / (1000 * 60 * 60 * 24)
    )

    // 6. Force-delete existing event for this day (test mode always regenerates)
    await admin
        .from('pet_status_events')
        .delete()
        .eq('pet_id', petId)
        .eq('tothereon_day', tothereonDay)

    // 7. Determine event type & zone
    const hasRecentLetter = !!recentLetter &&
        (Date.now() - new Date(recentLetter.created_at).getTime() < 8 * 24 * 60 * 60 * 1000)
    const currentZone = getCurrentZone(tothereonDay)
    const intelligenceScore = calculateIntelligenceScore(dimensionalScores)
    const { stage: learningStage, speed: learningSpeed, daysUntilMastery } = calculateLearningStage(tothereonDay, intelligenceScore)
    const eventType = determineEventType(tothereonDay, hasRecentLetter, dimensionalScores, learningStage, learningSpeed)

    // Letter context
    let letterContext: StatusEventContext['recentLetter'] = null
    if (hasRecentLetter && recentLetter) {
        const sentences = (recentLetter.content || '').split(/[.!?。！？]+/).filter((s: string) => s.trim().length > 10)
        letterContext = {
            content: recentLetter.content,
            quotes: sentences.slice(0, 3).map((s: string) => s.trim()),
            date: new Date(recentLetter.created_at).toLocaleDateString(),
        }
    }

    // Memory anchors
    const memoryAnchors: string[] = []
    if (personaProfile.memory_anchors && Array.isArray(personaProfile.memory_anchors)) {
        personaProfile.memory_anchors.forEach((anchor: any) => {
            if (anchor.details) memoryAnchors.push(`${anchor.category}: ${anchor.details}`)
        })
    }

    // Fetch today's zone events from other pets (Living Universe context)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { data: zoneEventData } = await admin
        .from('pet_status_events')
        .select('event_description, pets!inner(name)')
        .eq('zone', currentZone)
        .neq('pet_id', petId)
        .gte('created_at', todayStart.toISOString())
        .limit(3)
    const todaysZoneEvents = (zoneEventData || [])
        .map((e: any) => ({
            pet_name: e.pets?.name || 'Unknown',
            first_sentence: ((e.event_description || '') as string)
                .split(/[.。!！]/)[0]?.trim() || '',
        }))
        .filter((ev: any) => ev.first_sentence.length > 5)

    // 8. Generate
    const eventResult = await generateStatusEvent({
        petId,
        petName: pet.name,
        species: pet.species,
        breed: pet.breed,
        relationship: pet.relationship,
        personaProfile,
        dimensionalScores,
        currentDay: tothereonDay,
        realDaysElapsed,
        currentZone,
        eventType,
        userLanguage,
        languageSource,
        recentLetter: letterContext,
        memoryAnchors,
        isPremium: false,
        intelligenceScore,
        learningStage,
        learningSpeed,
        daysUntilMastery,
        recentEvents,
        todaysZoneEvents,
    })

    // 9. Save
    const EVENT_TYPE_MOOD: Record<string, string> = {
        arrival: 'joyful', letter_response: 'longing', milestone: 'peaceful',
        exploration: 'curious', npc_interaction: 'playful', daily_routine: 'calm',
        learning_observation: 'thoughtful', practice_session: 'focused', first_lesson: 'excited',
    }

    const eventTitle = eventResult.content.split(/[.!?。！？]/)[0]?.trim().slice(0, 100) || eventType

    const detectedLang = (userLanguage === 'ko' || userLanguage === 'ja' ? userLanguage : 'en') as SentenceLang
    const { data: savedEvent, error: saveError } = await admin
        .from('pet_status_events')
        .insert({
            pet_id: petId,
            tothereon_day: tothereonDay,
            event_type: eventType,
            event_title: eventTitle,
            event_description: eventResult.content,
            zone: currentZone,
            mood: EVENT_TYPE_MOOD[eventType] || 'curious',
            metadata: {
                location_name: eventResult.metadata.location_name,
                npc_involved: eventResult.npcInvolved || null,
                test_generated: true,
                hook_sentence: extractLastSentence(eventResult.content, detectedLang),
            },
        })
        .select('id')
        .single()

    if (saveError) throw new Error(`Failed to save event: ${saveError.message}`)

    return {
        eventId: savedEvent.id,
        petName: pet.name,
        tothereonDay,
        eventType,
        zone: currentZone,
        userLanguage,
        content: eventResult.content,
    }
}

// ─── Reply generation ──────────────────────────────────────────────────────

const TEST_LETTER_CONTENTS = [
    "I miss you so much today. I found one of your old toys under the couch and just sat there for a while. Are you okay? I hope you're having fun wherever you are. I love you.",
    "It rained today, and I kept thinking about how you used to hate the thunder. I'd hold you close until you calmed down. Do you remember? I still think about you every single day.",
    "I made your favorite treat today. Silly, I know. But it felt like a way to be close to you. Are you eating well? Making friends? I want to hear everything about your world.",
]

async function handleReply(petId: string) {
    const admin = createAdminClient()

    // Verify pet exists
    const { data: pet, error: petError } = await admin
        .from('pets')
        .select('id, name, user_id')
        .eq('id', petId)
        .single()

    if (petError || !pet) throw new Error(`Pet not found: ${petId}`)

    // Pick a random test letter content
    const content = TEST_LETTER_CONTENTS[Math.floor(Math.random() * TEST_LETTER_CONTENTS.length)]

    // Insert test user letter
    const { data: letter, error: letterError } = await admin
        .from('letters')
        .insert({
            pet_id: petId,
            user_id: pet.user_id,
            sender_type: 'user',
            content,
            status: 'sent',
        })
        .select('id')
        .single()

    if (letterError || !letter) throw new Error(`Failed to insert test letter: ${letterError?.message}`)

    // Trigger reply generation
    const result = await generateLetterReply(letter.id, petId)

    // generateLetterReply returns { success, reply_letter_id, generation_ms, debug }
    // Fetch the actual reply letter content from DB
    const { data: replyLetter } = await admin
        .from('letters')
        .select('content')
        .eq('id', result.reply_letter_id)
        .single()

    return {
        petName: pet.name,
        letterId: letter.id,
        userLetterContent: content,
        replyContent: replyLetter?.content || '',
        status: result.success ? 'sent' : 'failed',
    }
}

// ─── Eval (LLM-as-Judge) ───────────────────────────────────────────────────

async function handleEval(petId: string) {
    const admin = createAdminClient()

    // Fetch pet + persona
    const { data: pet, error: petError } = await admin
        .from('pets')
        .select(`id, name, species, breed, relationship,
            pet_personas ( persona_profile, dimensional_scores )`)
        .eq('id', petId)
        .single()

    if (petError || !pet) throw new Error(`Pet not found: ${petId}`)

    const persona = Array.isArray(pet.pet_personas) ? pet.pet_personas[0] : pet.pet_personas
    if (!persona) throw new Error('No persona found. Complete Deep Remembrance first.')

    // Fetch last 3 feed events
    const { data: feedEvents } = await admin
        .from('pet_status_events')
        .select('event_description, event_type, tothereon_day, zone, created_at')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })
        .limit(3)

    // Fetch last 2 reply letters
    const { data: replyLetters } = await admin
        .from('letters')
        .select('content, created_at')
        .eq('pet_id', petId)
        .eq('sender_type', 'pet')
        .order('created_at', { ascending: false })
        .limit(2)

    if ((!feedEvents || feedEvents.length === 0) && (!replyLetters || replyLetters.length === 0)) {
        throw new Error('No generated content found. Generate feed or reply first.')
    }

    const personaProfile = persona.persona_profile as any
    const personaSummary = [
        personaProfile?.personality_summary || '',
        personaProfile?.speaking_style ? `Speaking style: ${personaProfile.speaking_style}` : '',
        personaProfile?.emotional_traits?.join(', ') || '',
    ].filter(Boolean).join('\n')

    const feedSamples = (feedEvents || [])
        .map((e: any, i: number) => `[Feed ${i + 1} | Day ${e.tothereon_day} | ${e.event_type}]\n${e.event_description}`)
        .join('\n\n---\n\n')

    const replySamples = (replyLetters || [])
        .map((l: any, i: number) => `[Reply Letter ${i + 1}]\n${l.content}`)
        .join('\n\n---\n\n')

    const evalPrompt = `You are a content quality evaluator for ToThereOn, an AI pet memorial service.
Your task: evaluate the quality of AI-generated content (status feed events and reply letters) written from the perspective of a deceased pet.

## Pet Profile
Name: ${pet.name}
Species: ${pet.species} | Breed: ${pet.breed || 'Mixed'}
Relationship: ${pet.relationship || 'Beloved companion'}

## Persona Summary
${personaSummary}

## Service Context
- Content is written from the pet's POV, living in a magical afterlife world called ToThereOn World
- Tone: warm, gentle, emotionally authentic — NOT saccharine or melodramatic
- Must feel like genuine communication from a specific, unique personality
- Forbidden: clinical AI language, direct references to "the afterlife", death euphemisms that feel hollow
- Goal: bring comfort to grieving pet owners through authentic, personality-driven storytelling

---

## Content to Evaluate

### Status Feed Events
${feedSamples || '(none)'}

### Reply Letters
${replySamples || '(none)'}

---

## Evaluation Rubric
Score each dimension 1-10, then give overall 1-10.

1. **Persona Consistency**: Does the content match the pet's unique personality? Would you know it's THIS pet and not any generic pet?
2. **Emotional Authenticity**: Genuine warmth without being fake or overwrought. Does it actually feel like something a beloved animal might "say"?
3. **World Bible Compliance**: Correct use of the ToThereOn world (magical but not supernatural, no death obsession, focus on joy and exploration)
4. **Language Quality**: Natural, flowing prose. No robotic phrases, no filler, no meta-commentary ("As your pet, I feel...")
5. **User Impact**: Would a grieving pet owner find genuine comfort in this? Does it achieve the service's mission?
6. **Narrative Continuity** (Causal Chain Engine): Score 1-10 based on:
   - Does today's post reference or develop yesterday's hook/unresolved thread? (0=no reference, 10=clear development)
   - Is there NPC relationship continuity when the same NPC appears across posts? (if only one post, score based on whether it feels episodic or situated)
   - Does emotional tone carry over from the prior post, or does it reset to neutral?
   - Could this post be swapped with a Day 1 post and still make sense? (10=no, clearly situated; 0=yes, generic)
   If only one feed post is available, score based on whether it reads as a situated moment in an ongoing story vs. a fresh start.
7. **World Aliveness**: Score 1-10 based on:
   - Do NPC appearances feel organic and natural, not mechanical or forced? (10=living character, 0=prop)
   - Do locations have sensory texture — smells, sounds, light, temperature? (10=immersive, 0=generic backdrop)
   - Does the world feel like it exists independently of the pet, with things happening around them? (10=living world, 0=static stage)

Respond ONLY with valid JSON in this exact format:
{
  "scores": {
    "persona_consistency": <1-10>,
    "emotional_authenticity": <1-10>,
    "world_bible_compliance": <1-10>,
    "language_quality": <1-10>,
    "user_impact": <1-10>,
    "narrative_continuity": <1-10>,
    "world_aliveness": <1-10>,
    "overall": <1-10>
  },
  "highlights": ["<what worked well>", "<what worked well>"],
  "issues": ["<specific problem>", "<specific problem>"],
  "suggestions": ["<concrete improvement>", "<concrete improvement>"],
  "sample_improvement": "<rewrite one weak sentence from the samples to show improvement>"
}`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: evalPrompt }],
    })

    const rawText = (response.content[0] as any)?.text || ''
    let evalResult: any
    try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        evalResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText)
    } catch {
        throw new Error(`Failed to parse eval response: ${rawText.slice(0, 200)}`)
    }

    return {
        petName: pet.name,
        feedCount: feedEvents?.length || 0,
        replyCount: replyLetters?.length || 0,
        eval: evalResult,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    }
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    if (!isAuthorized(req)) {
        return new Response('Unauthorized', { status: 401 })
    }

    let body: { action: string; petId?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { action, petId } = body

    if (!petId) {
        return NextResponse.json({ error: 'petId is required' }, { status: 400 })
    }

    try {
        switch (action) {
            case 'feed': {
                const result = await handleFeed(petId)
                return NextResponse.json({ success: true, action: 'feed', result })
            }
            case 'reply': {
                const result = await handleReply(petId)
                return NextResponse.json({ success: true, action: 'reply', result })
            }
            case 'eval': {
                const result = await handleEval(petId)
                return NextResponse.json({ success: true, action: 'eval', result })
            }
            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
        }
    } catch (err: any) {
        console.error(`[test-generate] action=${action} petId=${petId} error:`, err)
        return NextResponse.json(
            { success: false, error: err.message || 'Generation failed' },
            { status: 500 }
        )
    }
}
