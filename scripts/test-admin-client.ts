
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env explicitly
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });

async function testAdminClient() {
    console.log('--- Testing Supabase Admin Client (Standalone) ---');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        console.error('❌ NEXT_PUBLIC_SUPABASE_URL is missing');
        return;
    }
    if (!serviceRoleKey) {
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing');
        return;
    }

    console.log('URL:', supabaseUrl);
    console.log('Key:', serviceRoleKey.slice(0, 10) + '...');

    try {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        console.log('✅ Client created. Attempting DB query...');

        const { data, error } = await supabase.from('pets').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Database error:', error.message);
            console.error('Detail:', error);
        } else {
            console.log('✅ Database connection successful.');
            console.log('Count result:', data, '(Should be null or number if count used)');
        }

    } catch (e: any) {
        console.error('❌ Unexpected error:', e.message);
    }
}

testAdminClient();
