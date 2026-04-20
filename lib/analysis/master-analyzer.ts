/**
 * Deep Persona Master Analyzer
 * Scientifically analyzes 25-question survey responses to generate a complete persona
 */

import { getNLPAnalyzer, type NLPAnalysisResult } from './nlp-analyzer'
import { getMultipleChoiceHandler } from './multiple-choice-handler'
import { normalizeBreedName } from './breed-normalizer'

// ============================================================
// Types
// ============================================================

export interface SurveyResponse {
    question_key: string
    answer_type: 'single_choice' | 'multiple_choice' | 'text' | 'other'

    // Single choice
    selected_choice?: {
        label: string
        value: string
        score?: number
        dimension?: string
    }

    // Multiple selection
    selected_choices?: Array<{
        label: string
        value: string
        score?: number
        dimension?: string
    }>

    // Free-text
    text_answer?: string

    // When "Other" is selected
    other_text?: string
}

export interface PetInfo {
    id: string
    name: string
    species: 'dog' | 'cat'
    breed: string
    birth_year?: number
    passing_year?: number
}

export interface DeepPersonaAnalysis {
    // Layer 1: Base Temperament
    temperament: {
        big_five: {
            energy: number              // 0-100
            sociability: number         // 0-100
            neuroticism: number         // 0-100 (emotional instability)
            agreeableness: number       // 0-100 (friendliness)
            openness: number            // 0-100 (openness to experience)
        }

        behavioral_scores: Record<string, number>
    }

    // Layer 2: Emotional Profile
    emotional_profile: {
        expression_style: 'expressive' | 'moderate' | 'reserved'
        empathy_level: number
        emotional_regulation: number

        joy_map: {
            primary_triggers: string[]
            intensity: number
            social_vs_solitary: number
        }

        fear_map: {
            phobias: string[]
            severity: number
            profile: 'specific' | 'general' | 'resilient'
        }

        stress_signature: {
            manifestations: string[]
            coping_effectiveness: number
            profile: 'externalizer' | 'internalizer' | 'mixed'
        }
    }

    // Layer 3: Relationship Dynamics
    relationship_dynamics: {
        attachment: {
            style: 'secure' | 'anxious' | 'avoidant'
            intensity: number
        }

        communication: {
            unique_signals: string[]
            complexity: number
        }

        family_role: {
            archetype: string
            description: string
        }
    }

    // Layer 4: Uniqueness
    uniqueness: {
        quirks: Array<{
            behavior: string
            frequency: string
            context: string
        }>

        signature_moments: Array<{
            description: string
            emotional_impact: number
            theme: string
        }>

        physical_identifiers: {
            distinctive_features: string[]
            signature_expression: string
        }

        vocal_signature: {
            type: string
            frequency: 'very_vocal' | 'moderate' | 'quiet'
        }

        one_sentence_essence: string
    }

    // Layer 5: Breed Correction
    breed_context: {
        breed_name: string
        breed_baseline: Record<string, number>
        deviation_scores: Record<string, number>
        interpretation: string
    }

    // Layer 6: Healing Context
    grief_context: {
        guilt_points: string[]
        unspoken_words: string
        final_moments: string
        healing_themes: string[]
        closure_level: number
        // v2.2: healing_mission from Q17
        healing_mission?: {
            core_desire: string
            desired_messages: string[]
            healing_direction: string
        }
        guilt_severity?: string
        healing_strategy?: string
    }

    // Meta
    analysis_metadata: {
        confidence_score: number        // Overall analysis confidence
        data_quality: 'high' | 'medium' | 'low'
        completed_questions: number
        nlp_analyzed_count: number
        version: string
    }
}

// ============================================================
// Breed Baseline Database
// ============================================================

const BREED_BASELINES: Record<string, Record<string, Record<string, number>>> = {
    dog: {
        'Golden Retriever': { energy: 75, sociability: 90, trainability: 85, stranger_fear: 10 },
        'Labrador Retriever': { energy: 80, sociability: 92, trainability: 90, stranger_fear: 8 },
        'Chihuahua': { energy: 60, sociability: 40, trainability: 50, stranger_fear: 75 },
        'Poodle': { energy: 70, sociability: 75, trainability: 95, stranger_fear: 30 },
        'Border Collie': { energy: 95, sociability: 60, trainability: 98, stranger_fear: 40 },
        'Beagle': { energy: 85, sociability: 80, trainability: 60, stranger_fear: 20 },
        'Bulldog': { energy: 40, sociability: 70, trainability: 50, stranger_fear: 25 },
        'Shiba Inu': { energy: 70, sociability: 50, trainability: 40, stranger_fear: 60 },
        'Maltese': { energy: 55, sociability: 80, trainability: 70, stranger_fear: 50 },
        'Mixed': { energy: 60, sociability: 65, trainability: 65, stranger_fear: 40 }
    },
    cat: {
        'Persian': { energy: 30, sociability: 50, independence: 60, vocalization: 20 },
        'Siamese': { energy: 70, sociability: 85, independence: 40, vocalization: 90 },
        'Bengal': { energy: 90, sociability: 70, independence: 50, vocalization: 60 },
        'British Shorthair': { energy: 40, sociability: 60, independence: 70, vocalization: 30 },
        'Maine Coon': { energy: 60, sociability: 75, independence: 50, vocalization: 40 },
        'Ragdoll': { energy: 35, sociability: 90, independence: 30, vocalization: 25 },
        'Scottish Fold': { energy: 45, sociability: 70, independence: 55, vocalization: 35 },
        'Mixed': { energy: 55, sociability: 60, independence: 60, vocalization: 40 }
    }
}

// ============================================================
// Master Analyzer Class
// ============================================================

export class DeepPersonaMasterAnalyzer {
    private nlpAnalyzer = getNLPAnalyzer()
    private multiChoiceHandler = getMultipleChoiceHandler()

    async analyzeComplete(
        responses: Record<string, SurveyResponse>,
        petInfo: PetInfo,
        version: number = 1
    ): Promise<DeepPersonaAnalysis> {

        console.log('🧬 Deep Persona Analysis started...')
        console.log(`Pet: ${petInfo.name} (${petInfo.species}, ${petInfo.breed})`)

        try {
            // Step 1: Load breed baseline
            const breedBaseline = this.getBreedBaseline(petInfo.species, petInfo.breed)
            console.log('✅ Breed baseline loaded')

            // Step 2: Calculate objective scores
            const objectiveScores = await this.calculateObjectiveScores(responses, petInfo, version)
            console.log('✅ Objective scores calculated')

            // Step 3: Multiple-choice specialized analysis
            const multiChoiceAnalysis = this.analyzeMultipleChoices(responses, version)
            console.log('✅ Multiple-choice analysis complete')

            // Step 4: Subjective NLP analysis
            const subjectiveAnalysis = await this.analyzeSubjectiveResponses(responses, petInfo, version)
            console.log('✅ Subjective NLP analysis complete')

            // Step 5: Apply breed correction
            const adjustedScores = this.applyBreedCorrection(objectiveScores, breedBaseline)
            console.log('✅ Breed correction applied')

            // Step 6: Cross-validation
            const validatedScores = this.crossValidate(adjustedScores, responses)
            console.log('✅ Cross-validation complete')

            // Step 7: Big Five mapping
            const bigFive = this.mapToBigFive(validatedScores)
            console.log('✅ Big Five mapping complete')

            // Step 8: Build emotional profile
            const emotionalProfile = this.buildEmotionalProfile(
                validatedScores,
                multiChoiceAnalysis,
                subjectiveAnalysis
            )
            console.log('✅ Emotional profile built')

            // Step 9: Relationship dynamics analysis
            const relationshipDynamics = this.analyzeRelationshipDynamics(
                responses,
                subjectiveAnalysis
            )
            console.log('✅ Relationship dynamics analyzed')

            // Step 10: Extract uniqueness
            const uniqueness = this.extractUniqueness(subjectiveAnalysis, responses)
            console.log('✅ Uniqueness extracted')

            // Step 11: Healing context
            const griefContext = this.extractGriefContext(subjectiveAnalysis, responses, version)
            console.log('✅ Healing context extracted')

            // Step 12: Final integration
            const finalAnalysis: DeepPersonaAnalysis = {
                temperament: {
                    big_five: bigFive,
                    behavioral_scores: validatedScores
                },
                emotional_profile: emotionalProfile,
                relationship_dynamics: relationshipDynamics,
                uniqueness: uniqueness,
                breed_context: {
                    breed_name: petInfo.breed,
                    breed_baseline: breedBaseline,
                    deviation_scores: this.calculateDeviations(validatedScores, breedBaseline),
                    interpretation: this.interpretBreedDeviation(validatedScores, breedBaseline)
                },
                grief_context: griefContext,
                analysis_metadata: {
                    confidence_score: this.calculateOverallConfidence(validatedScores, subjectiveAnalysis),
                    data_quality: this.assessDataQuality(responses, version),
                    completed_questions: Object.keys(responses).length,
                    nlp_analyzed_count: Object.values(responses).filter(r => r.other_text || r.text_answer).length,
                    version: version === 2 ? '2.2' : '2.0'
                }
            }

            console.log('🎉 Deep Persona Analysis complete!')
            console.log(`Overall confidence: ${finalAnalysis.analysis_metadata.confidence_score}%`)

            return finalAnalysis

        } catch (error: any) {
            console.error('❌ Analysis failed:', error)
            throw new Error(`Persona analysis failed: ${error.message}`)
        }
    }

    // ============================================================
    // Private Analysis Methods (Internal)
    // ============================================================

    private async calculateObjectiveScores(
        responses: Record<string, SurveyResponse>,
        petInfo: PetInfo,
        version: number = 1
    ): Promise<Record<string, number>> {

        const scores: Record<string, number> = {}

        for (const [qKey, response] of Object.entries(responses)) {
            // Single choice
            if (response.answer_type === 'single_choice' && response.selected_choice) {
                const choice = response.selected_choice
                if (choice.dimension && choice.score !== undefined) {
                    scores[choice.dimension] = choice.score
                }
            }

            // Multiple choice
            if (response.answer_type === 'multiple_choice' && response.selected_choices) {
                const aggregated = this.multiChoiceHandler.aggregateScores(
                    response.selected_choices,
                    { method: 'average' }
                )
                Object.assign(scores, aggregated)
            }

            // NLP analysis for "Other" selections
            if (response.other_text) {
                const nlpResult = await this.analyzeOtherWithContext(
                    qKey,
                    response.other_text,
                    petInfo
                )
                Object.assign(scores, nlpResult.scores)
            }
        }

        // v2.2: Composite scoring from specific question keys
        if (version === 2) {
            const getScore = (qKey: string): number => {
                const r = responses[qKey]
                if (r?.selected_choice?.score !== undefined) return r.selected_choice.score
                return 50 // fallback neutral
            }

            scores.social_energy = Math.round(getScore('Q02') * 0.6 + getScore('Q03') * 0.4)
            scores.curiosity_drive = getScore('Q05')
            scores.food_motivation = getScore('Q07')
            scores.empathy_sensitivity = getScore('Q09')
            scores.social_preference = getScore('Q10')
            scores.affection_style = Math.round(getScore('Q11') * 0.5)  // other 0.5 from Q12 multi-choice
            scores.energy_level = getScore('Q20')
        }

        return scores
    }

    private analyzeMultipleChoices(
        responses: Record<string, SurveyResponse>,
        version: number = 1
    ): any {

        const analysis: any = {}

        if (version === 2) {
            // v2.2 question keys

            // Q04: Separation anxiety (multi-choice)
            if (responses.Q04?.selected_choices) {
                analysis.alone_time = this.multiChoiceHandler.handleQ04_SeparationAnxiety(
                    responses.Q04.selected_choices
                )
            }

            // Q06: Play style (multi-choice)
            if (responses.Q06?.selected_choices) {
                analysis.play_style = this.multiChoiceHandler.handleQ06_PlayStyle(
                    responses.Q06.selected_choices
                )
            }

            // Q12: Affection languages (multi-choice, v2 version)
            if (responses.Q12?.selected_choices) {
                analysis.affection = this.multiChoiceHandler.handleQ12v2_AffectionLanguages(
                    responses.Q12.selected_choices
                )
            }

            // Q13: Stress responses (multi-choice)
            if (responses.Q13?.selected_choices) {
                analysis.stress = this.multiChoiceHandler.handleQ13_StressResponses(
                    responses.Q13.selected_choices
                )
            }
        } else {
            // v1 question keys (backward compatible)

            // Q05: When alone
            if (responses.Q05?.selected_choices) {
                analysis.alone_time = this.multiChoiceHandler.handleQ05_AloneTime(
                    responses.Q05.selected_choices
                )
            }

            // Q10: Happiest moments
            if (responses.Q10?.selected_choices) {
                analysis.happiest = this.multiChoiceHandler.handleQ10_Happiest(
                    responses.Q10.selected_choices
                )
            }

            // Q11: Fears
            if (responses.Q11?.selected_choices) {
                analysis.fears = this.multiChoiceHandler.handleQ11_Fears(
                    responses.Q11.selected_choices
                )
            }

            // Q12: Affection expression
            if (responses.Q12?.selected_choices) {
                analysis.affection = this.multiChoiceHandler.handleQ12_Affection(
                    responses.Q12.selected_choices
                )
            }

            // Q14: Stress responses
            if (responses.Q14?.selected_choices) {
                analysis.stress = this.multiChoiceHandler.handleQ14_Stress(
                    responses.Q14.selected_choices
                )
            }
        }

        return analysis
    }

    private async analyzeSubjectiveResponses(
        responses: Record<string, SurveyResponse>,
        petInfo: PetInfo,
        version: number = 1
    ): Promise<any> {

        let textResponses: Record<string, string>

        if (version === 2) {
            // v2.2: NLP targets are Q14 (quirks), Q15 (moments), Q17 (healing_mission),
            // Q18 (guilt) + Q08, Q16 keywords
            textResponses = {
                Q08: responses.Q08?.text_answer || '',   // keyword extraction
                Q14: responses.Q14?.text_answer || '',   // quirks
                Q15: responses.Q15?.text_answer || '',   // moments
                Q16: responses.Q16?.text_answer || '',   // keyword extraction
                Q17: responses.Q17?.text_answer || '',   // healing_mission (star question)
                Q18: responses.Q18?.text_answer || ''    // guilt
            }
        } else {
            // v1 NLP targets
            textResponses = {
                Q17: responses.Q17?.text_answer || '',  // Our special signal
                Q19: responses.Q19?.text_answer || '',  // Proud moment
                Q20: responses.Q20?.text_answer || '',  // Moment of regret
                Q22: responses.Q22?.text_answer || '',  // Unique quirk
                Q25: responses.Q25?.text_answer || ''   // One sentence description
            }
        }

        return await this.nlpAnalyzer.analyzeAllResponses(
            textResponses,
            petInfo,
            version
        )
    }

    private applyBreedCorrection(
        scores: Record<string, number>,
        baseline: Record<string, number>
    ): Record<string, number> {

        const adjusted: Record<string, number> = { ...scores }

        // Calculate deviation from breed average
        for (const [trait, score] of Object.entries(scores)) {
            if (baseline[trait] !== undefined) {
                const deviation = score - baseline[trait]
                // Preserve large deviations as-is (notable case)
                if (Math.abs(deviation) > 30) {
                    adjusted[trait] = score // Keep as-is (outlier case)
                } else {
                    // Slight correction
                    adjusted[trait] = Math.round(score * 0.7 + baseline[trait] * 0.3)
                }
            }
        }

        return adjusted
    }

    private crossValidate(
        scores: Record<string, number>,
        responses: Record<string, SurveyResponse>
    ): Record<string, number> {

        // Cross-validate scores from questions measuring the same trait
        const validated: Record<string, number> = { ...scores }

        // e.g., sociability is measured across Q01, Q02, Q03
        const socialityScores = [
            scores.sociability,
            scores.stranger_fear ? 100 - scores.stranger_fear : null,
            scores.animal_sociability
        ].filter(s => s !== null && s !== undefined) as number[]

        if (socialityScores.length >= 2) {
            // Use median if standard deviation is high
            const std = this.standardDeviation(socialityScores)
            if (std > 25) {
                validated.sociability = this.median(socialityScores)
            } else {
                validated.sociability = this.average(socialityScores)
            }
        }

        return validated
    }

    private mapToBigFive(scores: Record<string, number>): DeepPersonaAnalysis['temperament']['big_five'] {
        return {
            energy: scores.energy_level || 50,
            sociability: scores.sociability || 50,
            neuroticism: Math.round(((scores.separation_anxiety || 50) + (scores.noise_sensitivity || 50)) / 2),
            agreeableness: Math.round(((scores.animal_sociability || 50) + (100 - (scores.stranger_fear || 50))) / 2),
            openness: scores.novelty_seeking || 50
        }
    }

    private buildEmotionalProfile(
        scores: Record<string, number>,
        multiChoice: any,
        nlpAnalysis: any
    ): DeepPersonaAnalysis['emotional_profile'] {

        // Determine expression style
        let expressionStyle: 'expressive' | 'moderate' | 'reserved'

        const affectionIntensity = multiChoice.affection?.expression_intensity || 50

        if (affectionIntensity > 70) {
            expressionStyle = 'expressive'
        } else if (affectionIntensity > 40) {
            expressionStyle = 'moderate'
        } else {
            expressionStyle = 'reserved'
        }

        return {
            expression_style: expressionStyle,
            empathy_level: scores.empathy_sensitivity || 50,
            emotional_regulation: 100 - (scores.neuroticism || 50),

            joy_map: {
                primary_triggers: multiChoice.happiest?.primary_joy_triggers || [],
                intensity: affectionIntensity,
                social_vs_solitary: multiChoice.happiest?.social_vs_solitary || 50
            },

            fear_map: {
                phobias: multiChoice.fears?.fear_categories || [],
                severity: multiChoice.fears?.phobia_severity || 0,
                profile: multiChoice.fears?.fear_profile || 'resilient'
            },

            stress_signature: {
                manifestations: multiChoice.stress?.stress_manifestations || [],
                coping_effectiveness: multiChoice.stress?.coping_effectiveness || 50,
                profile: multiChoice.stress?.stress_profile || 'mixed'
            }
        }
    }

    private analyzeRelationshipDynamics(
        responses: Record<string, SurveyResponse>,
        nlpAnalysis: any
    ): DeepPersonaAnalysis['relationship_dynamics'] {

        // Q18: Family role
        const roleResponse = responses.Q18?.selected_choice?.value || 'Baby (being cared for)'

        return {
            attachment: {
                style: this.determineAttachmentStyle(responses),
                intensity: responses.Q05 ? 80 : 50  // Based on separation anxiety
            },

            communication: {
                unique_signals: nlpAnalysis.unique_characteristics || [],
                complexity: nlpAnalysis.comprehensive_traits?.intelligence || 50
            },

            family_role: {
                archetype: roleResponse,
                description: this.getRoleDescription(roleResponse)
            }
        }
    }

    private extractUniqueness(nlpAnalysis: any, responses: Record<string, SurveyResponse>): DeepPersonaAnalysis['uniqueness'] {
        return {
            quirks: nlpAnalysis.quirks || [],
            signature_moments: nlpAnalysis.signature_moments || [],

            physical_identifiers: {
                distinctive_features: this.extractPhysicalFeatures(responses.Q23),
                signature_expression: responses.Q23?.selected_choice?.value || ''
            },

            vocal_signature: {
                type: responses.Q24?.selected_choice?.value || '',
                frequency: this.determineVocalFrequency(responses.Q24)
            },

            one_sentence_essence: responses.Q25?.text_answer || nlpAnalysis.personality_summary || ''
        }
    }

    private extractGriefContext(
        nlpAnalysis: any,
        responses: Record<string, SurveyResponse>,
        version: number = 1
    ): DeepPersonaAnalysis['grief_context'] {

        const baseContext: DeepPersonaAnalysis['grief_context'] = {
            guilt_points: nlpAnalysis.healing_themes || [],
            unspoken_words: responses.Q20?.text_answer || '',
            final_moments: responses.Q21?.selected_choice?.value || '',
            healing_themes: nlpAnalysis.healing_themes || [],
            closure_level: this.calculateClosureLevel(responses.Q21, responses.Q20)
        }

        // v2.2: Extract healing_mission from NLP results (Q17 star question)
        if (version === 2) {
            baseContext.healing_mission = nlpAnalysis?.healing_mission || undefined
            baseContext.guilt_severity = nlpAnalysis?.guilt_severity || undefined

            // Derive healing_strategy from healing_direction + guilt_severity
            const healingDirection = nlpAnalysis?.healing_mission?.healing_direction || 'comfort'
            const guiltSeverity = nlpAnalysis?.guilt_severity || 'mild'

            if (guiltSeverity === 'severe' && healingDirection === 'forgiveness') {
                baseContext.healing_strategy = 'gentle_reassurance_with_forgiveness'
            } else if (guiltSeverity === 'severe') {
                baseContext.healing_strategy = 'gradual_guilt_release'
            } else if (healingDirection === 'celebration') {
                baseContext.healing_strategy = 'joyful_memory_focus'
            } else if (healingDirection === 'forgiveness') {
                baseContext.healing_strategy = 'compassionate_closure'
            } else {
                baseContext.healing_strategy = 'warm_comfort_and_presence'
            }
        }

        return baseContext
    }

    // ============================================================
    // Helper Methods
    // ============================================================

    private getBreedBaseline(species: 'dog' | 'cat', breed: string): Record<string, number> {
        const baselines = BREED_BASELINES[species] || BREED_BASELINES.dog
        const normalizedBreed = normalizeBreedName(breed)
        return baselines[normalizedBreed] || baselines[breed] || baselines['Mixed']
    }

    private async analyzeOtherWithContext(
        questionKey: string,
        otherText: string,
        petInfo: PetInfo
    ): Promise<NLPAnalysisResult> {

        // Load question context
        const questionContext = {
            question_key: questionKey,
            question_text_kr: '',
            question_text_en: '',
            measures: this.getMeasuresForQuestion(questionKey),
            category: 'personality' as const
        }

        return await this.nlpAnalyzer.analyzeOtherResponse({
            question_context: questionContext,
            user_text: otherText,
            pet_species: petInfo.species,
            pet_breed: petInfo.breed
        })
    }

    private getMeasuresForQuestion(questionKey: string): string[] {
        const measureMap: Record<string, string[]> = {
            Q01: ['sociability', 'initial_temperament', 'confidence'],
            Q02: ['sociability', 'stranger_fear', 'territorial_behavior'],
            Q03: ['animal_sociability', 'playfulness'],
            Q04: ['responsiveness', 'independence'],
            Q05: ['separation_anxiety', 'independence'],
            Q06: ['playfulness', 'energy_level'],
            Q07: ['noise_sensitivity', 'resilience'],
            Q08: ['novelty_seeking', 'fear_level'],
            Q09: ['emotional_expressiveness', 'attachment'],
            Q10: ['joy_triggers'],
            Q11: ['fear_level'],
            Q12: ['affection_style'],
            Q13: ['jealousy', 'possessiveness'],
            Q14: ['stress_response'],
            Q15: ['routine_dependency', 'flexibility'],
            Q16: ['energy_level', 'circadian'],
            Q17: ['communication', 'bonding'],
            Q18: ['family_role'],
            Q19: ['achievement', 'pride'],
            Q20: ['guilt', 'regret'],
            Q21: ['closure', 'final_moments'],
            Q22: ['uniqueness', 'quirks'],
            Q23: ['physical_features'],
            Q24: ['vocalization'],
            Q25: ['essence', 'personality_summary'],
        }
        return measureMap[questionKey] || ['general']
    }

    private calculateDeviations(
        scores: Record<string, number>,
        baseline: Record<string, number>
    ): Record<string, number> {

        const deviations: Record<string, number> = {}

        for (const [trait, baseValue] of Object.entries(baseline)) {
            if (scores[trait] !== undefined) {
                deviations[trait] = scores[trait] - baseValue
            }
        }

        return deviations
    }

    private interpretBreedDeviation(
        scores: Record<string, number>,
        baseline: Record<string, number>
    ): string {

        const deviations = this.calculateDeviations(scores, baseline)
        const significantDevs = Object.entries(deviations)
            .filter(([_, dev]) => Math.abs(dev) > 25)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

        if (significantDevs.length === 0) {
            return 'Consistent with typical breed characteristics'
        }

        const descriptions = significantDevs.map(([trait, dev]) => {
            const direction = dev > 0 ? 'much higher' : 'lower'
            return `${trait} is ${direction} by ${Math.abs(dev)} points`
        })

        return `Notable deviations from breed average: ${descriptions.join(', ')}`
    }

    private determineAttachmentStyle(responses: Record<string, SurveyResponse>): 'secure' | 'anxious' | 'avoidant' {
        // Based on Q05
        const aloneResponse = responses.Q05?.selected_choices

        if (!aloneResponse) return 'secure'

        const hasDestructive = aloneResponse.some(c => c.value.includes('mess'))
        const hasWaiting = aloneResponse.some(c => c.value.includes('door'))
        const hasIndependent = aloneResponse.some(c => c.value.includes('toys') || c.value.includes('slept'))

        if (hasDestructive || hasWaiting) return 'anxious'
        if (hasIndependent) return 'secure'
        return 'avoidant'
    }

    private getRoleDescription(roleValue: string): string {
        const descriptions: Record<string, string> = {
            'Protector (instinct to guard family)': 'The guardian who protects the family',
            'Comforter (emotional support)': 'The comforter who provides emotional support',
            'Comedian (bringing laughter)': 'The comedian who brings laughter',
            'Baby (being cared for)': 'The baby who is cared for',
            'Follower (obedient)': 'The obedient follower',
            'Leader (taking initiative)': 'The proactive leader',
            'Observer (watching quietly)': 'The quiet observer',
        }
        return descriptions[roleValue] || roleValue
    }

    private extractPhysicalFeatures(response?: SurveyResponse): string[] {
        if (!response?.selected_choice) return []
        return [response.selected_choice.value]
    }

    private determineVocalFrequency(response?: SurveyResponse): 'very_vocal' | 'moderate' | 'quiet' {
        const value = response?.selected_choice?.value || ''

        if (value.includes('Rarely')) return 'quiet'
        if (value.includes('Low') || value.includes('short')) return 'moderate'
        return 'very_vocal'
    }

    private calculateClosureLevel(q21?: SurveyResponse, q20?: SurveyResponse): number {
        let closure = 50

        if (q21?.selected_choice?.value?.includes('Kept looking at me')) {
            closure += 30
        }
        if (q21?.selected_choice?.value?.includes('Fell asleep beside me')) {
            closure += 20
        }
        if (q21?.selected_choice?.value?.includes("I wasn't there")) {
            closure -= 40
        }

        if (q20?.text_answer && q20.text_answer.length > 50) {
            closure -= 10  // Has a lot of regrets
        }

        return Math.max(0, Math.min(100, closure))
    }

    private calculateOverallConfidence(
        scores: Record<string, number>,
        nlpAnalysis: any
    ): number {
        // Higher with more objective responses
        const objectiveConfidence = Math.min(Object.keys(scores).length * 4, 70)

        // NLP analysis confidence
        const nlpConfidence = nlpAnalysis?.confidence || 50

        return Math.round((objectiveConfidence + nlpConfidence) / 2)
    }

    private assessDataQuality(
        responses: Record<string, SurveyResponse>,
        version: number = 1
    ): 'high' | 'medium' | 'low' {
        const totalQuestions = version === 2 ? 21 : 25
        const completed = Object.keys(responses).length

        const completionRate = completed / totalQuestions

        if (completionRate >= 0.9) return 'high'
        if (completionRate >= 0.7) return 'medium'
        return 'low'
    }

    // Math helpers
    private average(numbers: number[]): number {
        if (numbers.length === 0) return 50
        return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length)
    }

    private median(numbers: number[]): number {
        if (numbers.length === 0) return 50
        const sorted = [...numbers].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }

    private standardDeviation(numbers: number[]): number {
        if (numbers.length === 0) return 0
        const avg = this.average(numbers)
        const squareDiffs = numbers.map(n => Math.pow(n - avg, 2))
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length
        return Math.sqrt(avgSquareDiff)
    }
}

// ============================================================
// Singleton Export
// ============================================================

let masterAnalyzerInstance: DeepPersonaMasterAnalyzer | null = null

export function getMasterAnalyzer(): DeepPersonaMasterAnalyzer {
    if (!masterAnalyzerInstance) {
        masterAnalyzerInstance = new DeepPersonaMasterAnalyzer()
    }
    return masterAnalyzerInstance
}
