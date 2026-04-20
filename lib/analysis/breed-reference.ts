/**
 * Breed Reference
 * Queries breed data from the breed_characteristics table
 * for persona generation reference.
 * Supports multilingual breed names (Korean, Japanese, English).
 */

import { createClient } from '@/lib/supabase/server'
import { normalizeBreedName } from './breed-normalizer'

export interface BreedReference {
    breed_name: string
    persona_reference_text: string
    traits_numeric: Record<string, number>
    temperament_keywords: string[]
    lifespan_range: { min: number; max: number }
    size_category: string
}

export async function getBreedReference(
    species: 'dog' | 'cat',
    breedName: string
): Promise<BreedReference | null> {

    const supabase = await createClient()

    // Normalize breed name: translate Korean/Japanese to English if needed
    const normalizedBreed = normalizeBreedName(breedName)

    // 1. Try exact name match (use normalized name)
    let { data } = await supabase
        .from('breed_characteristics')
        .select('*')
        .eq('species', species)
        .ilike('breed_name_en', normalizedBreed)
        .single()

    // 2. Fallback to fuzzy match (try normalized first, then original)
    if (!data) {
        const { data: fuzzyData } = await supabase
            .from('breed_characteristics')
            .select('*')
            .eq('species', species)
            .ilike('breed_name_en', `%${normalizedBreed}%`)
            .limit(1)
            .single()

        data = fuzzyData
    }

    // 3. Last resort: return 'Mixed' breed data
    if (!data) {
        const { data: mixed } = await supabase
            .from('breed_characteristics')
            .select('*')
            .eq('species', species)
            .ilike('breed_name_en', '%mix%')
            .limit(1)
            .single()

        data = mixed
    }

    if (!data) return null

    return {
        breed_name: data.breed_name_en,
        persona_reference_text: data.persona_reference_text || '',
        traits_numeric: (data.traits_numeric as Record<string, number>) || {},
        temperament_keywords: data.temperament_keywords || [],
        lifespan_range: {
            min: data.lifespan_min || 10,
            max: data.lifespan_max || 15
        },
        size_category: data.size_category || 'medium'
    }
}
