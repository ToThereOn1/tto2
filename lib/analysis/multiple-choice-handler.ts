/**
 * Multiple Choice Response Handler
 * Score aggregation and pattern analysis for multiple-choice responses
 */

// ============================================================
// Types
// ============================================================

interface Choice {
    label: string
    value: string
    score?: number
    dimension?: string
}

interface MultipleSelectionInput {
    question_key: string
    selected_choices: Choice[]
    allow_other: boolean
    other_text?: string
}

interface MultipleSelectionResult {
    aggregated_scores: Record<string, number>
    selection_pattern: 'consistent' | 'mixed' | 'contradictory'
    interpretation: string
    confidence: number
}

interface ScoreAggregationStrategy {
    method: 'average' | 'weighted_average' | 'max' | 'min' | 'contextual'
    weights?: Record<string, number>
}

// ============================================================
// Main Handler Class
// ============================================================

export class MultipleChoiceHandler {

    // ============================================================
    // 1. Multiple Selection Score Aggregation
    // ============================================================

    aggregateScores(
        selections: Choice[],
        strategy: ScoreAggregationStrategy = { method: 'average' }
    ): Record<string, number> {

        if (selections.length === 0) {
            return {}
        }

        // Group scores by dimension
        const dimensionScores: Record<string, number[]> = {}

        selections.forEach(choice => {
            if (choice.dimension && choice.score !== undefined) {
                if (!dimensionScores[choice.dimension]) {
                    dimensionScores[choice.dimension] = []
                }
                dimensionScores[choice.dimension].push(choice.score)
            }
        })

        // Aggregate by strategy
        const aggregated: Record<string, number> = {}

        for (const [dimension, scores] of Object.entries(dimensionScores)) {
            switch (strategy.method) {
                case 'average':
                    aggregated[dimension] = this.calculateAverage(scores)
                    break

                case 'weighted_average':
                    aggregated[dimension] = this.calculateWeightedAverage(
                        scores,
                        strategy.weights?.[dimension] || 1
                    )
                    break

                case 'max':
                    aggregated[dimension] = Math.max(...scores)
                    break

                case 'min':
                    aggregated[dimension] = Math.min(...scores)
                    break

                case 'contextual':
                    aggregated[dimension] = this.contextualAggregation(scores)
                    break
            }
        }

        return aggregated
    }

    // ============================================================
    // 2. Selection Pattern Analysis
    // ============================================================

    analyzeSelectionPattern(
        selections: Choice[],
        questionContext: string
    ): {
        pattern: 'consistent' | 'mixed' | 'contradictory'
        explanation: string
        tags: string[]
    } {

        if (selections.length === 1) {
            return {
                pattern: 'consistent',
                explanation: 'Single selection',
                tags: []
            }
        }

        // Check score range
        const scores = selections
            .filter(s => s.score !== undefined)
            .map(s => s.score!)

        const min = Math.min(...scores)
        const max = Math.max(...scores)
        const range = max - min

        // Determine pattern
        if (range <= 20) {
            return {
                pattern: 'consistent',
                explanation: 'Similar traits selected (high consistency)',
                tags: ['stable', 'predictable']
            }
        } else if (range <= 50) {
            return {
                pattern: 'mixed',
                explanation: 'Multi-faceted personality (situation-dependent)',
                tags: ['versatile', 'situational']
            }
        } else {
            return {
                pattern: 'contradictory',
                explanation: 'Contrasting traits coexist (complex personality)',
                tags: ['complex', 'unpredictable', 'context_dependent']
            }
        }
    }

    // ============================================================
    // 3. Question-Specific Logic
    // ============================================================

    handleQ05_AloneTime(selections: Choice[]): {
        separation_anxiety_score: number
        independence_score: number
        coping_style: string
        interpretation: string
    } {

        const labels = selections.map(s => s.value)

        // Pattern detection
        const hasWaiting = labels.includes('Waited at the door')
        const hasPlaying = labels.includes('Played alone with toys')
        const hasResting = labels.includes('Rested or slept quietly (bed, sofa, etc.)')
        const hasDestructive = labels.includes('Made a mess (destructive behavior)')

        let anxiety = 0
        let independence = 0
        let coping = ''
        let interpretation = ''

        if (hasDestructive) {
            anxiety = 90
            independence = 10
            coping = 'destructive'
            interpretation = 'Very high separation anxiety expressed through destructive behavior'

        } else if (hasWaiting && hasResting) {
            anxiety = 50
            independence = 50
            coping = 'adaptive'
            interpretation = 'Waits at first but calms down over time — adaptive type'

        } else if (hasWaiting && hasPlaying) {
            anxiety = 60
            independence = 55
            coping = 'distraction'
            interpretation = 'Anxious but able to self-soothe through play'

        } else if (hasPlaying && hasResting) {
            anxiety = 20
            independence = 85
            coping = 'self_sufficient'
            interpretation = 'Highly independent, comfortable being alone'

        } else if (hasWaiting) {
            anxiety = 75
            independence = 30
            coping = 'waiting'
            interpretation = 'Strong attachment, waits solely for owner to return'

        } else if (hasResting) {
            anxiety = 15
            independence = 90
            coping = 'calm'
            interpretation = 'Very calm and independent'

        } else if (hasPlaying) {
            anxiety = 25
            independence = 80
            coping = 'playful'
            interpretation = 'Independent and curious'
        }

        return {
            separation_anxiety_score: anxiety,
            independence_score: independence,
            coping_style: coping,
            interpretation
        }
    }

    handleQ10_Happiest(selections: Choice[]): {
        primary_joy_triggers: string[]
        joy_diversity: 'focused' | 'varied'
        social_vs_solitary: number
        interpretation: string
    } {

        const triggers = selections.map(s => s.value)

        const socialActivities = [
            'When I came home',
            'During playtime',
            'When being petted or held',
            'Meeting other animal friends'
        ]

        const solitaryActivities = [
            'Going for walks',
            'Getting treats or meals',
            'Going on car trips'
        ]

        const socialCount = triggers.filter(t => socialActivities.includes(t)).length
        const solitaryCount = triggers.filter(t => solitaryActivities.includes(t)).length

        const totalCount = socialCount + solitaryCount
        const socialScore = totalCount > 0 ? (socialCount / totalCount) * 100 : 50

        const diversity = selections.length >= 4 ? 'varied' : 'focused'

        let interpretation = ''

        if (socialScore > 70) {
            interpretation = 'Finds the greatest joy in social interactions'
        } else if (socialScore < 30) {
            interpretation = 'Finds joy in independent activities or rewards'
        } else {
            interpretation = 'A balanced type that enjoys both social interaction and independent activities'
        }

        return {
            primary_joy_triggers: triggers,
            joy_diversity: diversity,
            social_vs_solitary: Math.round(socialScore),
            interpretation
        }
    }

    handleQ11_Fears(selections: Choice[]): {
        fear_categories: string[]
        phobia_severity: number
        fear_profile: 'specific' | 'general' | 'resilient'
        avoidance_strategy: string
    } {

        const fears = selections.map(s => s.value)

        const categories: string[] = []

        if (fears.some(f => f.includes('noise'))) categories.push('noise_sensitive')
        if (fears.some(f => f.includes('places'))) categories.push('place_anxiety')
        if (fears.some(f => f.includes('alone'))) categories.push('separation_anxiety')
        if (fears.some(f => f.includes('Water'))) categories.push('water_phobia')
        if (fears.some(f => f.includes('people') || f.includes('animals'))) categories.push('social_fear')

        const severity = Math.min(fears.length * 20, 100)

        let profile: 'specific' | 'general' | 'resilient'

        if (fears.length === 0) {
            profile = 'resilient'
        } else if (fears.length <= 2) {
            profile = 'specific'
        } else {
            profile = 'general'
        }

        return {
            fear_categories: categories,
            phobia_severity: severity,
            fear_profile: profile,
            avoidance_strategy: profile === 'general' ? 'withdrawal' : 'selective'
        }
    }

    handleQ12_Affection(selections: Choice[]): {
        affection_languages: string[]
        expression_intensity: number
        affection_style: 'verbal' | 'physical' | 'behavioral' | 'mixed'
        interpretation: string
    } {

        const expressions = selections.map(s => s.value)

        const physicalExprs = ['Licking', 'Showing belly', 'Rubbing or kneading']
        const verbalExprs = ['Making special sounds (purring, whining, etc.)']
        const behavioralExprs = ['Tail wagging', 'Following me around', 'Eye contact and gazing', 'Bringing toys or gifts']

        const physicalCount = expressions.filter(e => physicalExprs.includes(e)).length
        const verbalCount = expressions.filter(e => verbalExprs.includes(e)).length
        const behavioralCount = expressions.filter(e => behavioralExprs.includes(e)).length

        let style: 'verbal' | 'physical' | 'behavioral' | 'mixed'

        if (physicalCount > verbalCount && physicalCount > behavioralCount) {
            style = 'physical'
        } else if (verbalCount > physicalCount && verbalCount > behavioralCount) {
            style = 'verbal'
        } else if (behavioralCount > physicalCount && behavioralCount > verbalCount) {
            style = 'behavioral'
        } else {
            style = 'mixed'
        }

        const intensity = Math.min(expressions.length * 15, 100)

        const interpretations = {
            physical: 'Expresses affection through physical touch and closeness',
            verbal: 'Communicates emotions through sounds and vocalizations',
            behavioral: 'Shows love through actions and gestures',
            mixed: 'Expresses affection richly through a variety of ways'
        }

        return {
            affection_languages: expressions,
            expression_intensity: intensity,
            affection_style: style,
            interpretation: interpretations[style]
        }
    }

    handleQ14_Stress(selections: Choice[]): {
        stress_manifestations: string[]
        coping_effectiveness: number
        stress_profile: 'externalizer' | 'internalizer' | 'mixed'
        needs_intervention: boolean
    } {

        const behaviors = selections.map(s => s.value)

        const externalizing = [
            'Destructive behavior (chewing, scratching)',
            'Excessive barking or crying'
        ]

        const internalizing = [
            'Appetite changes (overeating or not eating)',
            'Hiding or avoiding',
            'Excessive grooming (licking fur, washing)',
            'Sleeping a lot'
        ]

        const seeking = ['Seeking me more and being clingy']

        const extCount = behaviors.filter(b => externalizing.includes(b)).length
        const intCount = behaviors.filter(b => internalizing.includes(b)).length
        const seekCount = behaviors.filter(b => seeking.includes(b)).length

        let profile: 'externalizer' | 'internalizer' | 'mixed'

        if (extCount > intCount) {
            profile = 'externalizer'
        } else if (intCount > extCount) {
            profile = 'internalizer'
        } else {
            profile = 'mixed'
        }

        let effectiveness = 50

        if (seekCount > 0) {
            effectiveness += 30
        }

        if (behaviors.includes('Hiding or avoiding')) {
            effectiveness -= 20
        }

        if (behaviors.includes('Destructive behavior (chewing, scratching)')) {
            effectiveness -= 30
        }

        effectiveness = Math.max(0, Math.min(100, effectiveness))

        const needsIntervention = behaviors.length >= 4 ||
            behaviors.includes('Destructive behavior (chewing, scratching)')

        return {
            stress_manifestations: behaviors,
            coping_effectiveness: effectiveness,
            stress_profile: profile,
            needs_intervention: needsIntervention
        }
    }

    // ============================================================
    // 4. v2.2 Question-Specific Handlers
    // ============================================================

    /**
     * Q04 (v2.2): Separation Anxiety multi-choice analysis
     * Categorizes selections into anxiety vs independence behaviors.
     */
    handleQ04_SeparationAnxiety(selections: Choice[]): {
        separation_anxiety_score: number
        independence_score: number
        coping_style: string
    } {
        const values = selections.map(s => s.value)

        const anxietyItems = ['followed', 'waited_door', 'barked_cried', 'stopped_eating']
        const independenceItems = ['slept_quietly', 'played_alone']

        const anxietyCount = values.filter(v => anxietyItems.includes(v)).length
        const independentCount = values.filter(v => independenceItems.includes(v)).length
        const totalMeaningful = anxietyCount + independentCount

        const anxietyScore = totalMeaningful > 0
            ? Math.round((anxietyCount / totalMeaningful) * 100)
            : 0
        const independenceScore = totalMeaningful > 0
            ? Math.round((independentCount / totalMeaningful) * 100)
            : 0

        let copingStyle: string
        if (anxietyScore >= 70) {
            copingStyle = 'anxious_attachment'
        } else if (independenceScore >= 70) {
            copingStyle = 'self_sufficient'
        } else if (anxietyCount > 0 && independentCount > 0) {
            copingStyle = 'adaptive'
        } else {
            copingStyle = 'neutral'
        }

        return {
            separation_anxiety_score: anxietyScore,
            independence_score: independenceScore,
            coping_style: copingStyle
        }
    }

    /**
     * Q06 (v2.2): Play style multi-choice analysis
     * Measures playfulness intensity and determines play style.
     */
    handleQ06_PlayStyle(selections: Choice[]): {
        playfulness_intensity: number
        play_style: string
    } {
        const values = selections.map(s => s.value)

        const activePlayItems = ['fetching', 'chasing', 'hide_seek', 'destroying', 'wrestling', 'exploring']
        const lowPlayItems = ['next_to_me']

        const activeCount = values.filter(v => activePlayItems.includes(v)).length
        const hasLowOnly = values.length > 0 && values.every(v => lowPlayItems.includes(v))

        let intensity: number
        let playStyle: string

        if (activeCount >= 3) {
            intensity = 85
            playStyle = 'high_energy_diverse'
        } else if (activeCount >= 2) {
            intensity = 65
            playStyle = 'moderate_active'
        } else if (activeCount === 1) {
            intensity = 45
            playStyle = 'selective_player'
        } else if (hasLowOnly) {
            intensity = 20
            playStyle = 'companionship_oriented'
        } else {
            intensity = 30
            playStyle = 'low_key'
        }

        return {
            playfulness_intensity: intensity,
            play_style: playStyle
        }
    }

    /**
     * Q12 (v2.2): Affection languages multi-choice analysis
     * Measures expression intensity and catalogues affection languages.
     */
    handleQ12v2_AffectionLanguages(selections: Choice[]): {
        expression_intensity: number
        affection_languages: string[]
        affection_style: string
    } {
        const values = selections.map(s => s.value)

        // All items except 'reserved' are expressive
        const expressiveItems = values.filter(v => v !== 'reserved')
        const expCount = expressiveItems.length
        const hasReserved = values.includes('reserved')

        let intensity: number
        let affectionStyle: string

        if (expCount >= 4) {
            intensity = 90
            affectionStyle = 'highly_expressive'
        } else if (expCount >= 2) {
            intensity = 60
            affectionStyle = 'moderately_expressive'
        } else {
            intensity = 30
            affectionStyle = hasReserved ? 'reserved' : 'subtly_expressive'
        }

        return {
            expression_intensity: intensity,
            affection_languages: values,
            affection_style: affectionStyle
        }
    }

    /**
     * Q13 (v2.2): Stress responses multi-choice analysis
     * Categorizes stress coping into resilient, externalizer, or internalizer profiles.
     */
    handleQ13_StressResponses(selections: Choice[]): {
        emotional_resilience: number
        stress_profile: string
        coping_effectiveness: number
    } {
        const values = selections.map(s => s.value)

        const resilientItems = ['calm']
        const externalizerItems = ['barked_cried', 'chewed']
        const internalizerItems = ['found_corner', 'stopped_eating', 'slept_more']

        const resilientCount = values.filter(v => resilientItems.includes(v)).length
        const extCount = values.filter(v => externalizerItems.includes(v)).length
        const intCount = values.filter(v => internalizerItems.includes(v)).length

        let resilience: number
        let profile: string
        let effectiveness: number

        if (resilientCount > 0 && extCount === 0 && intCount === 0) {
            // Pure calm response
            resilience = 90
            profile = 'resilient'
            effectiveness = 85
        } else if (extCount > intCount) {
            resilience = Math.max(10, 50 - extCount * 15)
            profile = 'externalizer'
            effectiveness = Math.max(10, 40 - extCount * 10)
        } else if (intCount > extCount) {
            resilience = Math.max(15, 50 - intCount * 12)
            profile = 'internalizer'
            effectiveness = Math.max(15, 45 - intCount * 8)
        } else if (extCount > 0 && intCount > 0) {
            resilience = 30
            profile = 'mixed'
            effectiveness = 30
        } else {
            // No strong indicators
            resilience = 50
            profile = 'neutral'
            effectiveness = 50
        }

        // Bonus if calm is present alongside other responses
        if (resilientCount > 0 && (extCount > 0 || intCount > 0)) {
            resilience = Math.min(100, resilience + 15)
            effectiveness = Math.min(100, effectiveness + 10)
        }

        return {
            emotional_resilience: resilience,
            stress_profile: profile,
            coping_effectiveness: effectiveness
        }
    }

    // ============================================================
    // Private Helpers
    // ============================================================

    private calculateAverage(scores: number[]): number {
        const sum = scores.reduce((a, b) => a + b, 0)
        return Math.round(sum / scores.length)
    }

    private calculateWeightedAverage(scores: number[], weight: number): number {
        const weighted = scores.map(s => s * weight)
        return this.calculateAverage(weighted)
    }

    private contextualAggregation(scores: number[]): number {
        const sorted = [...scores].sort((a, b) => a - b)

        if (sorted.length <= 2) {
            return this.calculateAverage(sorted)
        }

        const trimmed = sorted.slice(1, -1)
        return this.calculateAverage(trimmed)
    }
}

// ============================================================
// Singleton Export
// ============================================================

let handlerInstance: MultipleChoiceHandler | null = null

export function getMultipleChoiceHandler(): MultipleChoiceHandler {
    if (!handlerInstance) {
        handlerInstance = new MultipleChoiceHandler()
    }
    return handlerInstance
}
