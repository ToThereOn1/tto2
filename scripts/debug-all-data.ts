import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    console.log('📊 Dumping All Data...')
    console.log(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)

    const { data: pets } = await supabase.from('pets').select('id, name')
    const { data: personas } = await supabase.from('pet_personas').select('id, pet_id')

    console.log('\n--- PETS ---')
    console.table(pets)

    console.log('\n--- PERSONAS ---')
    console.table(personas)

    // Check if any pet matches the persona's pet_id
    if (personas) {
        for (const persona of personas) {
            const pet = pets?.find(p => p.id === persona.pet_id)
            if (pet) {
                console.log(`✅ Persona ${persona.id} belongs to pet: ${pet.name} (${pet.id})`)
            } else {
                console.log(`❌ Persona ${persona.id} belongs to a pet that is NOT in the pets list: ${persona.pet_id}`)
            }
        }
    }
}

main()
