import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

// Lazy-initialized OpenAI client (avoids crash when env var missing at build time)
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return _openai;
}

const SYSTEM_PROMPT_SYNTHESIZER = `
You are an expert Character Concept Artist.
Synthesize the provided photos into a single "Visual Description Prompt".
**RULES:**
1. Prioritize Adult appearance and True Fur Color.
2. Focus on: Breed, Body Shape (e.g., short legs), Fur Pattern (spots/socks), Eye Color.
3. IGNORE: Backgrounds, humans, clothes.
4. Output: A single string starting with "A soft watercolor illustration of a [breed]..." (Max 60 words).
`

const SYSTEM_PROMPT_GATEKEEPER = (currentDescription: string) => `
You are a Visual Data Verifier.
Compare the "New Photo" with the "Current Description" of the pet.

**INPUTS:**
- Current Description: "${currentDescription}"
- New Photo: [Image]

**TASK:**
1. **Verification (The Gatekeeper):**
   - Is the image clearly a HUMAN, OBJECT (toy, food), LANDSCAPE, or a DIFFERENT ANIMAL? -> **Return "SKIP"**.
   - Is it the SAME pet? -> Proceed to step 2.
2. **Refinement:**
   - Look for new details visible in the photo that are missing from the description (e.g., a specific spot on the tail, side profile shape).
   - Merge these new details into the Current Description.

**OUTPUT:**
- If Mismatch: "SKIP"
- If Match: Return the REFINED full description string.
`

/**
 * Analyze pet photos and save the initial Visual DNA
 * Workflow A: Initial Creation
 */
export async function analyzeAndSaveVisualDNA(petId: string, imageUrls: string[]) {
    if (!imageUrls || imageUrls.length === 0) {
        console.log('Visual DNA: No images to analyze')
        return
    }

    try {
        console.log(`Visual DNA: Analyzing ${imageUrls.length} images for pet ${petId}...`)

        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o', // Use GPT-4o for vision capabilities
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT_SYNTHESIZER
                },
                {
                    role: 'user',
                    content: imageUrls.map(url => ({
                        type: 'image_url',
                        image_url: { url }
                    })) as any
                }
            ],
            max_tokens: 150,
        })

        const visualDescription = response.choices[0].message.content

        if (!visualDescription) {
            console.error('Visual DNA: Failed to generate description')
            return
        }

        console.log('Visual DNA: Generated description:', visualDescription)

        // Save to Database
        const supabase = await createClient()
        const { error } = await supabase
            .from('pets')
            .update({ visual_description: visualDescription })
            .eq('id', petId)

        if (error) {
            console.error('Visual DNA: Failed to save to DB:', error)
        } else {
            console.log('Visual DNA: Successfully saved to DB')
        }

    } catch (error) {
        console.error('Visual DNA: Analysis failed:', error)
    }
}

/**
 * Smartly update Visual DNA with new photo evidence
 * Workflow B: Smart Update
 */
export async function smartUpdateVisualDNA(petId: string, currentDescription: string, newImageUrl: string) {
    if (!newImageUrl) return

    try {
        console.log(`Visual DNA: Smart Update check for pet ${petId}...`)

        const response = await getOpenAI().chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT_GATEKEEPER(currentDescription)
                },
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: { url: newImageUrl }
                        }
                    ]
                }
            ],
            max_tokens: 200,
        })

        const result = response.choices[0].message.content?.trim()

        if (!result || result === 'SKIP') {
            console.log('Visual DNA: Update skipped (Mismatch or Irrelevant)')
            return
        }

        console.log('Visual DNA: Updating description with new details...')

        // Save updated description
        const supabase = await createClient()
        const { error } = await supabase
            .from('pets')
            .update({ visual_description: result })
            .eq('id', petId)

        if (error) {
            console.error('Visual DNA: Failed to update DB:', error)
        } else {
            console.log('Visual DNA: Successfully updated description')
        }

    } catch (error) {
        console.error('Visual DNA: Smart Update failed:', error)
    }
}
