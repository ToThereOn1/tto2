
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    // 1. Find Pet '슬이'
    const { data: pets, error: petError } = await supabase
        .from('pets')
        .select('id, name, user_id, persona_generated')
        .eq('name', '슬이');

    if (petError) {
        console.error('Pet Error:', petError);
        return;
    }

    console.log('Pets found:', pets);

    if (pets && pets.length > 0) {
        const pet = pets[0];
        // 2. Find Response
        const { data: responses, error: resError } = await supabase
            .from('deep_remembrance_responses')
            .select('id, completed_at, completion_percentage')
            .eq('pet_id', pet.id);

        if (resError) {
            console.error('Response Error:', resError);
        } else {
            console.log('Responses found:', responses);
        }
    }
}

main();
