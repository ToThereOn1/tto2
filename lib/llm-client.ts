/**
 * LLM Client for ToThereOn
 *
 * High (Opus 4.6): 페르소나 생성 (고도의 추론 필요)
 */

import Anthropic from '@anthropic-ai/sdk'
import type { DimensionalScores, NarrativeData, PersonaProfile, Pet } from '@/lib/types/database'
import { AI_CONFIG } from '@/lib/ai-config'

// LLM Tier Configuration
export const LLM_TIERS = {
    PREMIUM: {
        model: AI_CONFIG.REPLY_MODEL, // High tier: Opus 4.6 — 페르소나 생성
        cost_per_1k_input: 0.015,
        cost_per_1k_output: 0.075,
    },
    STANDARD: {
        model: AI_CONFIG.EVENT_MODEL, // Mid tier: Sonnet 4.6
        cost_per_1k_input: 0.003,
        cost_per_1k_output: 0.015,
    }
}

// Pet basic info for persona generation
export interface PetData {
    name: string
    species: string
    breed: string | null
    gender: string | null
    age_at_passing?: number
    relationship: string | null
}

/**
 * Check if Anthropic API is available
 */
function isAnthropicAvailable(): boolean {
    return !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10)
}

/**
 * Create Anthropic client
 */
function getAnthropicClient(): Anthropic {
    if (!isAnthropicAvailable()) {
        throw new Error('Anthropic API key not configured')
    }
    return new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    })
}

/**
 * Generate Expert Behaviorist system prompt
 */
function getPersonaSystemPrompt(): string {
    return `You are an Expert Animal Behaviorist and Creative Writer specializing in creating psychologically accurate pet personas.

Your task is to synthesize specific behavioral data points into a living, breathing character. You must:

1. STRICTLY adhere to the 8-dimensional behavioral scores provided
2. Create consistent personality traits that match the scores
3. Generate unique communication patterns based on the pet's personality
4. Never use generic descriptions - every detail must reflect the specific data

CRITICAL RULES:
- If Social_Energy is low (0-40), the persona MUST be shy, selective, or reserved - NOT "friendly with everyone"
- If Food_Motivation is high (80-100), references to food/treats must be frequent
- If Emotional_Resilience is low (0-40), show anxiety or sensitivity patterns
- If Playfulness_Intensity is high (80-100), letters should have energetic, bouncy tone

You must output ONLY valid JSON matching the exact schema provided. No markdown, no explanations.`
}

/**
 * Generate persona from survey data
 */
export async function generatePersona(
    petData: PetData,
    dimensionalScores: DimensionalScores,
    narrativeData: NarrativeData
): Promise<PersonaProfile> {
    const anthropic = getAnthropicClient()

    const userPrompt = `Generate a complete pet persona for the following pet:

**BASIC INFO:**
- Name: ${petData.name}
- Species: ${petData.species}
- Breed: ${petData.breed || 'Unknown'}
- Gender: ${petData.gender || 'Unknown'}
- Guardian Relationship: ${narrativeData.relationship_type || petData.relationship || 'Guardian'}

**8 DIMENSIONAL SCORES (0-100):**
- Social_Energy: ${dimensionalScores.social_energy} (${dimensionalScores.social_energy > 60 ? 'Extroverted' : dimensionalScores.social_energy > 40 ? 'Balanced' : 'Introverted'})
- Curiosity_Drive: ${dimensionalScores.curiosity_drive} (${dimensionalScores.curiosity_drive > 60 ? 'Explorer' : 'Routine-lover'})
- Affection_Style: ${dimensionalScores.affection_style} (${dimensionalScores.affection_style > 60 ? 'Velcro/Clingy' : 'Independent'})
- Emotional_Resilience: ${dimensionalScores.emotional_resilience} (${dimensionalScores.emotional_resilience > 60 ? 'Stable' : 'Sensitive'})
- Playfulness_Intensity: ${dimensionalScores.playfulness_intensity || 70}
- Food_Motivation: ${dimensionalScores.food_motivation} (${dimensionalScores.food_motivation > 60 ? 'Food-obsessed' : 'Picky'})
- Empathy_Sensitivity: ${dimensionalScores.empathy_sensitivity || 70}
- Social_Preference: ${dimensionalScores.social_preference || 70}

**NARRATIVE DATA FROM GUARDIAN:**
- Secret Nickname: ${narrativeData.nickname || 'None shared'}
- Secret Habit: ${narrativeData.secret_habit || 'None shared'}
- Favorite Snack: ${narrativeData.favorite_snack || 'Treats'}
- Most Precious Memory: ${narrativeData.precious_memory || 'Being together'}
- Voice Tone Preference: ${narrativeData.voice_tone || 'Warm and comforting'}
- Afterlife Landscape: ${narrativeData.afterlife_landscape || 'Sunny meadow'}
- Overall Presence: ${narrativeData.overall_presence || 'Loving companion'}

**OUTPUT JSON SCHEMA:**
{
  "personality_summary": "150-200 word narrative capturing ${petData.name}'s unique spirit based on scores",
  "core_traits": ["Trait 1", "Trait 2", "Trait 3", "Trait 4", "Trait 5"],
  "behavioral_patterns": {
    "daily_routines": "Specific routines matching personality scores",
    "social_interactions": "How they treat strangers vs guardians (match Social_Energy)",
    "stress_responses": "Coping mechanisms (match Emotional_Resilience)",
    "joy_triggers": "List of things that bring joy (include favorite snack)"
  },
  "communication_style": {
    "letter_voice_tone": "Based on Voice Tone Preference and personality",
    "vocabulary_preference": "Simple/Warm or Complex/Witty based on personality",
    "sentence_structure": "Short bursts (high energy) or Long flowing (calm)",
    "emotional_range": "Primary emotions this pet expresses"
  },
  "memory_anchors": [
    {"category": "favorite_activities", "details": "From secret habit"},
    {"category": "favorite_foods", "details": "From favorite snack"},
    {"category": "special_bond", "details": "From precious memory"},
    {"category": "unique_quirks", "details": "Based on personality scores"}
  ],
  "afterlife_setting": {
    "primary_landscape": "From Afterlife Landscape preference",
    "daily_activities": "Activities matching personality scores",
    "emotional_state": "Current peaceful emotional baseline"
  },
  "letter_generation_guidelines": {
    "opening_style": "How letters begin (e.g., 'Hey buddy!' or 'Dear One' based on formality)",
    "content_themes": ["Theme based on personality", "Theme from memories", "Theme from relationship"],
    "closing_style": "Sign-off signature using nickname or special name",
    "forbidden_patterns": ["No clinical language", "No 'I am an AI' disclaimers", "No generic platitudes"]
  },
  "persona_quality_score": {
    "detail_richness": 85,
    "emotional_authenticity": 90,
    "behavioral_consistency": 85,
    "narrative_depth": 80,
    "overall_score": 85
  }
}

Generate the persona JSON now. Remember: every detail must reflect the actual scores and data provided.`

    const response = await anthropic.messages.create({
        model: LLM_TIERS.PREMIUM.model,
        max_tokens: 2500,
        system: getPersonaSystemPrompt(),
        messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
        throw new Error('Unexpected response format from LLM')
    }

    // Parse JSON response
    let jsonText = content.text.trim()
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    }

    try {
        const persona = JSON.parse(jsonText) as PersonaProfile

        // Validate quality score
        if (persona.persona_quality_score.overall_score < 70) {
            console.warn('Generated persona quality below threshold:', persona.persona_quality_score.overall_score)
        }

        return persona
    } catch (parseError) {
        console.error('Failed to parse persona JSON:', parseError)
        console.error('Raw response:', jsonText)
        throw new Error('Failed to parse persona response from LLM')
    }
}

/**
 * Extract dimensional scores from survey responses
 */
export function calculateDimensionalScores(
    responses: Record<string, string | string[]>,
    questions: Array<{ question_key: string; scoring_dimension: string | null; scoring_map: Record<string, number> | null }>
): DimensionalScores {
    const scores: Record<string, number[]> = {
        social_energy: [],
        curiosity_drive: [],
        affection_style: [],
        emotional_resilience: [],
        playfulness_intensity: [],
        food_motivation: [],
        empathy_sensitivity: [],
        social_preference: [],
    }

    // Process each question
    for (const question of questions) {
        if (!question.scoring_dimension || !question.scoring_map) continue

        const responseValue = responses[question.question_key]
        if (!responseValue) continue

        const responseStr = Array.isArray(responseValue) ? responseValue[0] : responseValue
        const score = question.scoring_map[responseStr]

        if (typeof score === 'number' && scores[question.scoring_dimension]) {
            scores[question.scoring_dimension].push(score)
        }
    }

    // Calculate average for each dimension, default to 50 if no data
    const calculateAverage = (arr: number[]) =>
        arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 50

    return {
        social_energy: calculateAverage(scores.social_energy),
        curiosity_drive: calculateAverage(scores.curiosity_drive),
        affection_style: calculateAverage(scores.affection_style),
        emotional_resilience: calculateAverage(scores.emotional_resilience),
        playfulness_intensity: calculateAverage(scores.playfulness_intensity),
        food_motivation: calculateAverage(scores.food_motivation),
        empathy_sensitivity: calculateAverage(scores.empathy_sensitivity),
        social_preference: calculateAverage(scores.social_preference),
    }
}

/**
 * Extract narrative data from survey responses
 */
export function extractNarrativeData(
    responses: Record<string, string | string[]>,
    pet: { relationship?: string | null }
): NarrativeData {
    const getResponse = (key: string): string => {
        const value = responses[key]
        if (!value) return ''
        return Array.isArray(value) ? value[0] : value
    }

    return {
        nickname: getResponse('Q05'), // Secret nickname
        secret_habit: getResponse('Q11'), // Secret habit
        favorite_snack: getResponse('Q09'), // Favorite snack
        precious_memory: getResponse('Q21'), // Most unforgettable moment
        special_superpower: getResponse('Q22'), // Special talent/superpower
        joyful_treasure: getResponse('Q23'), // Most treasured bond
        unsaid_message: getResponse('Q24'), // Unsaid message
        relationship_type: pet.relationship || 'guardian',
        voice_tone: getResponse('Q13'), // Voice tone preference
        afterlife_landscape: getResponse('Q14'), // Afterlife landscape
        overall_presence: getResponse('Q12'), // Overall vibe
    }
}
