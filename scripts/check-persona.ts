import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
    console.log('🔍 Checking Persona Data...')

    // 1. Find the pet again
    const { data: pets } = await supabase
        .from('pets')
        .select('id, name')
        .eq('name', '슬이') // or allow any pet
        .limit(1)

    if (!pets || pets.length === 0) {
        console.log('No pet found')
        return
    }

    const petId = pets[0].id
    console.log(`Pet ID: ${petId}`)

    // 2. Check pet_personas table
    const { data: personas, error } = await supabase
        .from('pet_personas')
        .select('*')
        .eq('pet_id', petId)

    if (error) {
        console.error('Error fetching personas:', error)
    } else {
        console.log('Personas found:', personas)
    }
}

main()
