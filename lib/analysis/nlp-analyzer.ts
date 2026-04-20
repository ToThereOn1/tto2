/**
 * NLP Response Analyzer
 * Analyzes "Other" selections and free-text responses via Claude API
 * to extract scores and personality traits
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_CONFIG } from '@/lib/ai-config'

// ============================================================
// Types
// ============================================================

interface QuestionContext {
    question_key: string
    question_text_kr: string
    question_text_en: string
    measures: string[]              // ["sociability", "fear_level"]
    category: 'personality' | 'emotional' | 'relationship' | 'uniqueness'
}

interface OtherResponseInput {
    question_context: QuestionContext
    user_text: string
    pet_species: 'dog' | 'cat'
    pet_breed?: string
}

export interface NLPAnalysisResult {
    scores: Record<string, number>  // { "sociability": 85, "fear_level": 20 }
    quirk_detected: boolean
    quirk_description?: string
    emotional_tone: 'positive' | 'negative' | 'neutral' | 'bittersweet'
    key_phrases: string[]           // Important keywords
    confidence: number              // 0-100
    raw_interpretation: string      // Claude's interpretation
}

interface QuirkData {
    behavior: string
    frequency: 'always' | 'often' | 'sometimes' | 'rare'
    context: string
    emotional_valence: 'positive' | 'negative' | 'neutral'
}

interface LongTextAnalysis {
    personality_traits: string[]    // ["brave", "curious"]
    signature_moments: Array<{
        description: string
        emotional_impact: number    // 0-100
        theme: string               // "bonding", "play", "comfort"
    }>
    quirks: QuirkData[]
    relationship_essence: string    // Core of the relationship
    healing_insights: string[]      // Insights for healing
}

// ============================================================
// v2 Types (Deep Remembrance v2.2)
// ============================================================

export interface HealingMissionResult {
    healing_mission: {
        core_desire: string
        desired_messages: string[]
        healing_direction: 'guilt_relief' | 'grief_comfort' | 'love_affirmation' | 'closure'
    }
    guilt_points: string[]
    unspoken_words: string
    closure_level: number
    guilt_severity: 'mild' | 'moderate' | 'severe'
}

interface V2QuirkExtraction {
    behavior: string
    frequency: string
    context: string
}

interface V2SignatureMoment {
    description: string
    emotional_impact: number
    theme: string
}

interface V2AllResponsesResult {
    comprehensive_traits: Record<string, number>
    quirks: QuirkData[]
    personality_summary: string
    unique_characteristics: string[]
    healing_themes: string[]
    joy_triggers?: string[]
    v2_quirks?: V2QuirkExtraction[]
    v2_signature_moments?: V2SignatureMoment[]
    relationship_essence?: string
    unique_talent?: string
    healing_mission?: HealingMissionResult['healing_mission']
    guilt_points?: string[]
    unspoken_words?: string
    closure_level?: number
    guilt_severity?: 'mild' | 'moderate' | 'severe'
}

// ============================================================
// Main Analyzer Class
// ============================================================

export class NLPResponseAnalyzer {
    private anthropic: Anthropic
    private cache: Map<string, NLPAnalysisResult>

    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        })
        this.cache = new Map()
    }

    // ============================================================
    // 1. "Other" Option Response Analysis
    // ============================================================

    async analyzeOtherResponse(input: OtherResponseInput): Promise<NLPAnalysisResult> {
        const cacheKey = `${input.question_context.question_key}_${input.user_text}`

        // Check cache
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!
        }

        console.log(`🔬 NLP analysis started: ${input.question_context.question_key}`)

        const prompt = this.buildOtherResponsePrompt(input)

        try {
            const message = await this.anthropic.messages.create({
                model: AI_CONFIG.EVENT_MODEL,
                max_tokens: 1500,
                temperature: 0.2, // Low for consistency
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })

            const responseText = message.content[0].type === 'text'
                ? message.content[0].text
                : '{}'

            // Parse JSON (strip ```json markers)
            const cleanJson = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            const result: NLPAnalysisResult = JSON.parse(cleanJson)

            // Validate scores
            this.validateScores(result.scores)

            // Save to cache
            this.cache.set(cacheKey, result)

            console.log(`✅ NLP analysis complete: confidence ${result.confidence}%`)

            return result

        } catch (error: any) {
            console.error('❌ NLP analysis failed:', error)

            // Fallback: return median values
            return this.getFallbackScores(input.question_context.measures)
        }
    }

    // ============================================================
    // 2. Long-Text Response Analysis (Q17, Q19, Q20, Q22, Q25)
    // ============================================================

    async analyzeLongTextResponse(
        questionKey: string,
        userText: string,
        allResponses: Record<string, string>
    ): Promise<LongTextAnalysis> {

        console.log(`📖 Long-text analysis started: ${questionKey}`)

        const prompt = this.buildLongTextPrompt(questionKey, userText, allResponses)

        try {
            const message = await this.anthropic.messages.create({
                model: AI_CONFIG.EVENT_MODEL,
                max_tokens: 2000,
                temperature: 0.3,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })

            const responseText = message.content[0].type === 'text'
                ? message.content[0].text
                : '{}'

            const cleanJson = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            const result: LongTextAnalysis = JSON.parse(cleanJson)

            console.log(`✅ Long-text analysis complete: ${result.personality_traits.length} traits found`)

            return result

        } catch (error: any) {
            console.error('❌ Long-text analysis failed:', error)

            return {
                personality_traits: [],
                signature_moments: [],
                quirks: [],
                relationship_essence: '',
                healing_insights: []
            }
        }
    }

    // ============================================================
    // 3. Full Survey Integrated Analysis
    // ============================================================

    async analyzeAllResponses(
        responses: Record<string, any>,
        petInfo: {
            species: 'dog' | 'cat'
            breed: string
            name: string
        },
        version: number = 1
    ): Promise<V2AllResponsesResult> {

        console.log(`🧬 Full integrated analysis started (v${version})...`)

        // ============================================================
        // v2 path: Deep Remembrance v2.2 question targeting
        // ============================================================
        if (version === 2) {
            return this.analyzeAllResponsesV2(responses, petInfo)
        }

        // ============================================================
        // v1 path: Original analysis (unchanged)
        // ============================================================

        // Collect all free-text responses
        const longTexts = {
            special_signal: responses.Q17 || '',
            proud_moment: responses.Q19 || '',
            regret_moment: responses.Q20 || '',
            unique_quirk: responses.Q22 || '',
            one_sentence: responses.Q25 || ''
        }

        // Collect all "Other" responses
        const otherResponses = Object.entries(responses)
            .filter(([key, val]) => typeof val === 'object' && val.other_text)
            .map(([key, val]) => ({
                question: key,
                text: val.other_text
            }))

        const prompt = `
You are a world-class animal behavior analysis expert.
Below are survey responses written by a pet owner about their companion.

## Pet Information
- Name: ${petInfo.name}
- Species: ${petInfo.species === 'dog' ? 'Dog' : 'Cat'}
- Breed: ${petInfo.breed}

## Free-Text Responses
${Object.entries(longTexts).map(([key, text]) => `
**${key}**: ${text || '(No answer)'}
`).join('\n')}

## "Other" Responses
${otherResponses.map(r => `
- ${r.question}: ${r.text}
`).join('\n')}

## Analysis Request

Synthesize all responses and extract the following as JSON:

\`\`\`json
{
  "comprehensive_traits": {
    "sociability": 0-100,
    "energy_level": 0-100,
    "anxiety_level": 0-100,
    "independence": 0-100,
    "playfulness": 0-100,
    "intelligence": 0-100,
    "loyalty": 0-100,
    "empathy": 0-100
  },
  "quirks": [
    {
      "behavior": "Specific behavior description",
      "frequency": "always/often/sometimes/rare",
      "context": "In what situation",
      "emotional_valence": "positive/negative/neutral"
    }
  ],
  "personality_summary": "Summarize this pet's personality in 2-3 sentences",
  "unique_characteristics": [
    "Distinguishing trait 1",
    "Distinguishing trait 2",
    "..."
  ],
  "healing_themes": [
    "A theme that could comfort the owner 1",
    "A theme that could comfort the owner 2"
  ]
}
\`\`\`

Return only valid JSON.
        `

        try {
            const message = await this.anthropic.messages.create({
                model: AI_CONFIG.EVENT_MODEL,
                max_tokens: 2500,
                temperature: 0.25,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })

            const responseText = message.content[0].type === 'text'
                ? message.content[0].text
                : '{}'

            const cleanJson = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            const result = JSON.parse(cleanJson)

            console.log('✅ Full integrated analysis complete (v1)')

            return result

        } catch (error: any) {
            console.error('❌ Integrated analysis failed (v1):', error)
            throw error
        }
    }

    // ============================================================
    // 3b. v2 Full Survey Analysis (Deep Remembrance v2.2)
    // ============================================================

    private async analyzeAllResponsesV2(
        responses: Record<string, any>,
        petInfo: { species: 'dog' | 'cat'; breed: string; name: string }
    ): Promise<V2AllResponsesResult> {

        // --- Extract v2 target question texts ---
        const q01OtherText = (typeof responses.Q01 === 'object' && responses.Q01?.other_text)
            ? responses.Q01.other_text
            : ''
        const q08Text = typeof responses.Q08 === 'string' ? responses.Q08 : ''
        const q14Text = typeof responses.Q14 === 'string' ? responses.Q14 : ''
        const q15Text = typeof responses.Q15 === 'string' ? responses.Q15 : ''
        const q16Text = typeof responses.Q16 === 'string' ? responses.Q16 : ''
        const q17Text = typeof responses.Q17 === 'string' ? responses.Q17 : ''
        const q18Text = typeof responses.Q18 === 'string' ? responses.Q18 : ''

        // Collect all "Other" responses (same as v1)
        const otherResponses = Object.entries(responses)
            .filter(([key, val]) => typeof val === 'object' && val.other_text)
            .map(([key, val]) => ({
                question: key,
                text: val.other_text
            }))

        // --- Run healing mission analysis (Q17+Q18) in parallel with main analysis ---
        const [healingResult, mainResult] = await Promise.all([
            (q17Text || q18Text)
                ? this.analyzeHealingMission(q17Text, q18Text, petInfo.name)
                : Promise.resolve(null),
            this.runV2MainAnalysis(
                { q01OtherText, q08Text, q14Text, q15Text, q16Text },
                otherResponses,
                petInfo
            )
        ])

        // --- Merge results ---
        const merged: V2AllResponsesResult = {
            ...mainResult,
            ...(healingResult ? {
                healing_mission: healingResult.healing_mission,
                guilt_points: healingResult.guilt_points,
                unspoken_words: healingResult.unspoken_words,
                closure_level: healingResult.closure_level,
                guilt_severity: healingResult.guilt_severity,
            } : {})
        }

        console.log('✅ Full integrated analysis complete (v2)')
        return merged
    }

    private async runV2MainAnalysis(
        texts: {
            q01OtherText: string
            q08Text: string
            q14Text: string
            q15Text: string
            q16Text: string
        },
        otherResponses: Array<{ question: string; text: string }>,
        petInfo: { species: 'dog' | 'cat'; breed: string; name: string }
    ): Promise<V2AllResponsesResult> {

        const prompt = `
You are a world-class animal behavior and pet psychology expert.
Below are survey responses written by a pet guardian about their departed companion.

## Pet Information
- Name: ${petInfo.name}
- Species: ${petInfo.species === 'dog' ? 'Dog' : 'Cat'}
- Breed: ${petInfo.breed}

## Target Responses for Analysis

**Q01 — Origin Story (Other)**: ${texts.q01OtherText || '(No answer)'}

**Q08 — Favorite Thing (short text)**: ${texts.q08Text || '(No answer)'}

**Q14 — Quirks & Habits (long text)**: ${texts.q14Text || '(No answer)'}

**Q15 — Signature Moments (long text)**: ${texts.q15Text || '(No answer)'}

**Q16 — Superpower (short text)**: ${texts.q16Text || '(No answer)'}

## Other Responses
${otherResponses.map(r => `- ${r.question}: ${r.text}`).join('\n')}

## Analysis Request

Synthesize all responses and extract the following as JSON:

\`\`\`json
{
  "comprehensive_traits": {
    "sociability": 0-100,
    "energy_level": 0-100,
    "anxiety_level": 0-100,
    "independence": 0-100,
    "playfulness": 0-100,
    "intelligence": 0-100,
    "loyalty": 0-100,
    "empathy": 0-100
  },
  "quirks": [
    {
      "behavior": "Specific behavior description",
      "frequency": "always/often/sometimes/rare",
      "context": "In what situation",
      "emotional_valence": "positive/negative/neutral"
    }
  ],
  "personality_summary": "Summarize this pet's personality in 2-3 sentences",
  "unique_characteristics": ["Distinguishing trait 1", "..."],
  "healing_themes": ["A theme that could comfort the guardian 1", "..."],
  "joy_triggers": ["keyword1", "keyword2"],
  "v2_quirks": [
    {
      "behavior": "extracted from Q14",
      "frequency": "always/often/sometimes/rare",
      "context": "situation context"
    }
  ],
  "v2_signature_moments": [
    {
      "description": "moment description from Q15",
      "emotional_impact": 0-100,
      "theme": "bonding/play/comfort/farewell/..."
    }
  ],
  "relationship_essence": "Core of the guardian-pet relationship from Q15",
  "unique_talent": "One keyword from Q16 superpower"
}
\`\`\`

### Extraction Guide
- **joy_triggers**: From Q08 favorite thing, extract keywords that trigger joy (e.g., "walks", "treats", "belly rubs")
- **v2_quirks**: From Q14 quirks/habits text, extract structured { behavior, frequency, context } entries
- **v2_signature_moments**: From Q15 signature moments, extract { description, emotional_impact, theme } entries
- **relationship_essence**: From Q15, distill the core essence of the relationship
- **unique_talent**: From Q16 superpower, extract a single keyword capturing their unique talent

Return only valid JSON.
        `

        try {
            const message = await this.anthropic.messages.create({
                model: AI_CONFIG.EVENT_MODEL,
                max_tokens: 3000,
                temperature: 0.25,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })

            const responseText = message.content[0].type === 'text'
                ? message.content[0].text
                : '{}'

            const cleanJson = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            return JSON.parse(cleanJson)

        } catch (error: any) {
            console.error('❌ v2 main analysis failed:', error)
            throw error
        }
    }

    // ============================================================
    // 4. Healing Mission Analysis (Q17 + Q18) — Deep Remembrance v2.2
    // ============================================================

    async analyzeHealingMission(
        q17Text: string,
        q18Text: string,
        petName: string
    ): Promise<HealingMissionResult> {

        console.log('💜 Healing mission analysis started (Q17+Q18)...')

        const prompt = `
You are analyzing a pet guardian's survey responses for their departed pet named ${petName}.

[Q17 — Words They Want to Hear] ⭐ HIGHEST PRIORITY
Guardian wrote: "${q17Text}"
Extract:
- core_desire: The fundamental emotional need (one sentence)
- desired_messages: Array of specific messages the pet should convey
- healing_direction: 'guilt_relief' | 'grief_comfort' | 'love_affirmation' | 'closure'

[Q18 — Words They Want to Say]
Guardian wrote: "${q18Text}"
Extract:
- guilt_points: Array of specific guilt sources (detect "sorry", "should have", "wish I", "wasn't there")
- unspoken_words: The core unsaid message
- closure_level: 0-100 (0=needs much closure, 100=at peace)
- guilt_severity: 'mild' | 'moderate' | 'severe'

Respond ONLY in JSON.
\`\`\`json
{
  "healing_mission": {
    "core_desire": "...",
    "desired_messages": ["...", "..."],
    "healing_direction": "guilt_relief|grief_comfort|love_affirmation|closure"
  },
  "guilt_points": ["...", "..."],
  "unspoken_words": "...",
  "closure_level": 0-100,
  "guilt_severity": "mild|moderate|severe"
}
\`\`\`
        `

        try {
            const message = await this.anthropic.messages.create({
                model: AI_CONFIG.EVENT_MODEL,
                max_tokens: 1500,
                temperature: 0.2,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })

            const responseText = message.content[0].type === 'text'
                ? message.content[0].text
                : '{}'

            const cleanJson = responseText
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim()

            const result: HealingMissionResult = JSON.parse(cleanJson)

            console.log(`✅ Healing mission analysis complete: direction=${result.healing_mission.healing_direction}, guilt=${result.guilt_severity}`)

            return result

        } catch (error: any) {
            console.error('❌ Healing mission analysis failed:', error)

            // Fallback with safe defaults
            return {
                healing_mission: {
                    core_desire: '',
                    desired_messages: [],
                    healing_direction: 'grief_comfort'
                },
                guilt_points: [],
                unspoken_words: '',
                closure_level: 50,
                guilt_severity: 'mild'
            }
        }
    }

    // ============================================================
    // Private Helper Methods
    // ============================================================

    private buildOtherResponsePrompt(input: OtherResponseInput): string {
        const speciesContext = input.pet_species === 'dog'
            ? 'dog behavioral traits'
            : 'cat behavioral traits'

        const breedContext = input.pet_breed
            ? `Breed: ${input.pet_breed} (consider typical breed characteristics)`
            : ''

        return `
You are an animal behavior expert.

## Context
- Question: "${input.question_context.question_text_en || input.question_context.question_text_kr}"
- Measured traits: ${input.question_context.measures.join(', ')}
- ${speciesContext}
- ${breedContext}

## User Response
"${input.user_text}"

## Analysis Request

Analyze this response and generate the following JSON:

\`\`\`json
{
  "scores": {
    ${input.question_context.measures.map(m => `"${m}": 0-100 // score`).join(',\n    ')}
  },
  "quirk_detected": true/false,
  "quirk_description": "Description of any unique quirk detected",
  "emotional_tone": "positive/negative/neutral/bittersweet",
  "key_phrases": ["key phrase 1", "key phrase 2"],
  "confidence": 0-100, // analysis confidence
  "raw_interpretation": "What this response indicates in 1-2 sentences"
}
\`\`\`

### Scoring Guide
- 0-20: Very low
- 21-40: Low
- 41-60: Average
- 61-80: High
- 81-100: Very high

### Example
Input: "He licked my face non-stop"
Output:
{
  "scores": {
    "sociability": 95,
    "affection": 100,
    "initial_comfort": 90
  },
  "quirk_detected": true,
  "quirk_description": "Shows affection through face-licking from first meeting",
  "emotional_tone": "positive",
  "key_phrases": ["face licking", "immediate affection"],
  "confidence": 92,
  "raw_interpretation": "Highly sociable with very direct affection expression"
}

Return only valid JSON.
        `
    }

    private buildLongTextPrompt(
        questionKey: string,
        userText: string,
        allResponses: Record<string, string>
    ): string {

        const questionTypes: Record<string, string> = {
            Q17: 'Our special signal',
            Q19: 'A proud moment',
            Q20: 'A moment of regret',
            Q22: 'Unique quirk',
            Q25: 'One sentence description'
        }

        return `
You are a pet psychology analysis expert.

## Question Type: ${questionTypes[questionKey] || questionKey}

## User Response
"${userText}"

## Analysis Request

\`\`\`json
{
  "personality_traits": ["trait 1", "trait 2", ...], // Up to 5
  "signature_moments": [
    {
      "description": "Describe this moment in one sentence",
      "emotional_impact": 0-100,
      "theme": "bonding/play/comfort/achievement/..."
    }
  ],
  "quirks": [
    {
      "behavior": "Specific behavior",
      "frequency": "always/often/sometimes/rare",
      "context": "Situation",
      "emotional_valence": "positive/negative/neutral"
    }
  ],
  "relationship_essence": "The core of what this response reveals about the relationship",
  "healing_insights": [
    "A comforting message for the owner 1",
    "A comforting message for the owner 2"
  ]
}
\`\`\`

Return only valid JSON.
        `
    }

    private validateScores(scores: Record<string, number>): void {
        for (const [key, value] of Object.entries(scores)) {
            if (value < 0 || value > 100) {
                throw new Error(`Invalid score for ${key}: ${value} (must be 0-100)`)
            }
        }
    }

    private getFallbackScores(measures: string[]): NLPAnalysisResult {
        const scores: Record<string, number> = {}
        measures.forEach(m => {
            scores[m] = 50 // Median value
        })

        return {
            scores,
            quirk_detected: false,
            emotional_tone: 'neutral',
            key_phrases: [],
            confidence: 30, // Low confidence
            raw_interpretation: 'Analysis failed, using default values'
        }
    }
}

// ============================================================
// Singleton Export
// ============================================================

let analyzerInstance: NLPResponseAnalyzer | null = null

export function getNLPAnalyzer(): NLPResponseAnalyzer {
    if (!analyzerInstance) {
        analyzerInstance = new NLPResponseAnalyzer()
    }
    return analyzerInstance
}
