
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const { data: pets, error } = await supabase
        .from('pets')
        .select('id, name, user_id, users(email)')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Test Targets:', JSON.stringify(pets, null, 2));
}

main();
