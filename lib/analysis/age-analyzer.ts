/**
 * Age Analyzer
 * Classifies pet life stages and generates emotional context based on age
 */

export interface AgeProfile {
    age_years: number
    life_stage: 'puppy' | 'young' | 'adult' | 'senior' | 'geriatric'
    life_stage_kr: string
    is_early_departure: boolean
    departure_context: 'expected' | 'premature' | 'very_premature'
    years_together_context: string
    grief_amplifier: number
    persona_tone_modifier: string
}

// Average lifespan by species
const SPECIES_LIFESPAN: Record<string, { average: number; by_size?: Record<string, number>; indoor?: number; outdoor?: number }> = {
    dog: {
        average: 12,
        by_size: {
            small: 14,
            medium: 12,
            large: 10,
            giant: 8
        }
    },
    cat: {
        average: 15,
        indoor: 17,
        outdoor: 12
    }
}

export function analyzeAge(
    ageAtPassing: number,
    species: 'dog' | 'cat',
    _breed?: string
): AgeProfile {

    // Determine life stage
    let life_stage: AgeProfile['life_stage']
    let life_stage_kr: string

    if (species === 'dog') {
        if (ageAtPassing < 2) {
            life_stage = 'puppy'
            life_stage_kr = 'Puppy years'
        } else if (ageAtPassing < 4) {
            life_stage = 'young'
            life_stage_kr = 'Young adult'
        } else if (ageAtPassing < 8) {
            life_stage = 'adult'
            life_stage_kr = 'Prime adult'
        } else if (ageAtPassing < 12) {
            life_stage = 'senior'
            life_stage_kr = 'Senior years'
        } else {
            life_stage = 'geriatric'
            life_stage_kr = 'Golden years'
        }
    } else {
        // cat
        if (ageAtPassing < 3) {
            life_stage = 'puppy'
            life_stage_kr = 'Kitten years'
        } else if (ageAtPassing < 7) {
            life_stage = 'young'
            life_stage_kr = 'Young adult'
        } else if (ageAtPassing < 11) {
            life_stage = 'adult'
            life_stage_kr = 'Prime adult'
        } else if (ageAtPassing < 15) {
            life_stage = 'senior'
            life_stage_kr = 'Senior years'
        } else {
            life_stage = 'geriatric'
            life_stage_kr = 'Golden years'
        }
    }

    // Early departure relative to average lifespan
    const averageLifespan = SPECIES_LIFESPAN[species]?.average ?? 12
    const departureDiff = ageAtPassing - averageLifespan

    let departure_context: AgeProfile['departure_context']
    let is_early_departure = false

    if (departureDiff >= -2) {
        departure_context = 'expected'
    } else if (departureDiff >= -5) {
        departure_context = 'premature'
        is_early_departure = true
    } else {
        departure_context = 'very_premature'
        is_early_departure = true
    }

    // Depth of shared memories
    let years_together_context: string
    if (ageAtPassing >= 15) {
        years_together_context = `A lifelong companion of ${ageAtPassing} years. They shared every moment of life together.`
    } else if (ageAtPassing >= 10) {
        years_together_context = `A precious bond of ${ageAtPassing} years. Countless memories were built together.`
    } else if (ageAtPassing >= 5) {
        years_together_context = `A deep connection spanning ${ageAtPassing} years. They became woven into each other's lives.`
    } else {
        years_together_context = `A brief but intense bond of ${ageAtPassing} years. The farewell came before they were ready.`
    }

    // Grief intensity multiplier
    let grief_amplifier: number
    if (departure_context === 'very_premature') {
        grief_amplifier = 95
    } else if (departure_context === 'premature') {
        grief_amplifier = 75
    } else if (life_stage === 'geriatric') {
        grief_amplifier = 60
    } else {
        grief_amplifier = 70
    }

    // LLM tone guide
    let persona_tone_modifier: string

    if (departure_context === 'very_premature') {
        persona_tone_modifier = `I left when I was only ${ageAtPassing}. I still wanted more time with you.
You weren't ready for it either. It must have been so sudden and so hard.
I'm sorry, and I'm grateful for every moment.`
    } else if (life_stage === 'geriatric' || life_stage === 'senior') {
        persona_tone_modifier = `I was by your side until I was ${ageAtPassing}. I was truly happy.
I know my later years were hard to watch... but you stayed with me until the very end.
I know how difficult that was. Thank you, truly.`
    } else {
        persona_tone_modifier = `We shared so much over those ${ageAtPassing} years together.
That time meant everything to me.`
    }

    return {
        age_years: ageAtPassing,
        life_stage,
        life_stage_kr,
        is_early_departure,
        departure_context,
        years_together_context,
        grief_amplifier,
        persona_tone_modifier
    }
}
