import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: pets } = await supabase.from('pets').select('id, name, species, user_id').limit(10);
    console.log('Pets:', JSON.stringify(pets, null, 2));

    const { data: personas } = await supabase.from('pet_personas').select('pet_id').limit(10);
    console.log('Personas count:', personas?.length ?? 0);

    const { data: letters } = await supabase.from('letters').select('id, pet_id, sender_type, status, content').limit(5);
    console.log('Letters:', JSON.stringify(letters?.map(l => ({ ...l, content: l.content?.slice(0, 50) })), null, 2));
}

main();
