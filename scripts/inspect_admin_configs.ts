
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectTable() {
    console.log('Inspecting admin_configs columns...');

    console.log('Attempting to insert test row into admin_configs...');

    const { data, error } = await supabase
        .from('admin_configs')
        .insert({
            key: 'test_probe_key',
            type: 'test',
            config_json: { test: true },
            updated_at: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error('Error inserting into admin_configs:', error);
    } else {
        console.log('Successfully inserted into admin_configs:', data);
        // Clean up
        await supabase.from('admin_configs').delete().eq('key', 'test_probe_key');
    }
}

inspectTable();
