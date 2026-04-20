/**
 * Letter Generator for ToThereOn
 * 
 * Generates personalized letters from pets using their persona profile
 */

import Anthropic from '@anthropic-ai/sdk'
import type { PersonaProfile, Pet } from '@/lib/types/database'
import { LLM_TIERS } from './llm-client'
import { getCurrentZone, getZoneDisplayName } from './zone-manager'

interface StatusEvent {
    type: string
    title: string
    description: string
    zone: string
}

interface LetterGenerationResult {
    content: string
    cost: number
    model: string
}

/**
 * Check if Anthropic API is available
 */
function isAnthropicAvailable(): boolean {
    return !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10)
}

/**
 * Generate system prompt for letter writing
 */
function getLetterSystemPrompt(persona: PersonaProfile, petName: string): string {
    return `You are ${petName} writing a letter to your beloved guardian from ToThereOn World (a peaceful afterlife for pets).

**YOUR PERSONA:**
${persona.personality_summary}

**YOUR COMMUNICATION STYLE:**
- Voice Tone: ${persona.communication_style.letter_voice_tone}
- Vocabulary: ${persona.communication_style.vocabulary_preference}
- Sentence Style: ${persona.communication_style.sentence_structure}
- Emotional Range: ${persona.communication_style.emotional_range}

**YOUR LETTER GUIDELINES:**
- Opening: ${persona.letter_generation_guidelines.opening_style}
- Closing: ${persona.letter_generation_guidelines.closing_style}
- Themes to include: ${persona.letter_generation_guidelines.content_themes.join(', ')}

**FORBIDDEN:**
${persona.letter_generation_guidelines.forbidden_patterns.map(p => `- ${p}`).join('\n')}

**WRITING RULES:**
1. Write ONLY as ${petName} - never break character
2. Use the exact voice tone and style defined above
3. Keep letters between 200-400 words
4. Include specific memories from your memory anchors naturally
5. Reference your current activities in ToThereOn World
6. End with love, warmth, and reassurance
7. Never be sad or scary - always hopeful and peaceful
8. Use your signature opening and closing styles

Write from the heart. You love your guardian deeply.`
}

/**
 * Generate a letter from a pet to their guardian
 */
export async function generateLetterReply(
    pet: { name: string; species: string },
    persona: PersonaProfile,
    currentToThereOnDay: number,
    recentEvents: StatusEvent[] = []
): Promise<LetterGenerationResult> {
    if (!isAnthropicAvailable()) {
        // Fallback to mock letter
        return generateMockLetter(pet.name, persona, currentToThereOnDay)
    }

    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const zone = getCurrentZone(currentToThereOnDay)
    const zoneName = getZoneDisplayName(zone)

    const recentEventsText = recentEvents.length > 0
        ? `\n**RECENT ACTIVITIES:**\n${recentEvents.map(e => `- ${e.description}`).join('\n')}`
        : ''

    const userPrompt = `Write a letter to your guardian.

**CURRENT CONTEXT:**
- ToThereOn Day: ${currentToThereOnDay}
- Current Location: ${zoneName}
- Weather: Eternally peaceful with warm sunlight
${recentEventsText}

**YOUR MEMORY ANCHORS TO REFERENCE:**
${persona.memory_anchors.map(m => `- ${m.category}: ${m.details}`).join('\n')}

**CURRENT EMOTIONAL STATE:**
${persona.afterlife_setting.emotional_state}

Write a heartfelt letter now. Use your signature style.`

    try {
        const response = await anthropic.messages.create({
            model: LLM_TIERS.STANDARD.model,
            max_tokens: 800,
            system: getLetterSystemPrompt(persona, pet.name),
            messages: [{ role: 'user', content: userPrompt }],
        })

        const content = response.content[0]
        if (content.type !== 'text') {
            throw new Error('Unexpected response format')
        }

        // Calculate cost
        const inputTokens = response.usage.input_tokens
        const outputTokens = response.usage.output_tokens
        const cost = (inputTokens / 1000) * LLM_TIERS.STANDARD.cost_per_1k_input +
            (outputTokens / 1000) * LLM_TIERS.STANDARD.cost_per_1k_output

        return {
            content: content.text.trim(),
            cost: Math.round(cost * 10000) / 10000, // Round to 4 decimal places
            model: LLM_TIERS.STANDARD.model,
        }
    } catch (error) {
        console.error('Letter generation failed, using mock:', error)
        return generateMockLetter(pet.name, persona, currentToThereOnDay)
    }
}

/**
 * Generate a mock letter when LLM is unavailable
 */
function generateMockLetter(
    petName: string,
    persona: PersonaProfile,
    currentToThereOnDay: number
): LetterGenerationResult {
    const zone = getCurrentZone(currentToThereOnDay)
    const zoneName = getZoneDisplayName(zone) || 'ToThereOn World'

    const opening = persona.letter_generation_guidelines.opening_style || `Dear Guardian,`
    const closing = persona.letter_generation_guidelines.closing_style || `With all my love, ${petName}`

    const content = `${opening}

I'm writing to you from ${zoneName}, where the light is always soft and warm. Day ${currentToThereOnDay} here has been peaceful, filled with gentle breezes and the company of new friends.

${persona.afterlife_setting.daily_activities ? `Today I spent time ${persona.afterlife_setting.daily_activities.toLowerCase()}.` : 'Today I explored new paths and found a cozy spot to rest.'}

I often think about our time together. ${persona.memory_anchors.find(m => m.category === 'special_bond')?.details || 'Those precious moments we shared mean everything to me.'} Those memories warm my heart every day.

${persona.behavioral_patterns.joy_triggers ? `The things that made me happiest - ${persona.behavioral_patterns.joy_triggers.toLowerCase()} - I still find joy in similar things here.` : ''}

Please don't worry about me. I am at peace, surrounded by love and beauty. Every time you think of me, I feel it like a gentle warmth spreading through my spirit.

${closing}`

    return {
        content,
        cost: 0,
        model: 'mock',
    }
}

/**
 * Generate a daily status letter (triggered by time engine)
 */
export async function generateDailyLetter(
    pet: { name: string; species: string },
    persona: PersonaProfile,
    currentToThereOnDay: number,
    recentEvents: StatusEvent[] = []
): Promise<LetterGenerationResult> {
    return generateLetterReply(pet, persona, currentToThereOnDay, recentEvents)
}
