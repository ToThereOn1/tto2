import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPetEvents() {
    const petId = 'e4a80e18-dd99-415b-bd0a-ffb9fb64426d'
    console.log(`Checking events for pet ${petId}...`)

    const { data, error } = await supabase
        .from('pet_events')
        .select('*')
        .eq('pet_id', petId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching events:', error)
        return
    }

    console.log(`Found ${data.length} events.`)
    data.forEach((e: any) => console.log(e.id, e.type, e.created_at))
}

checkPetEvents()
