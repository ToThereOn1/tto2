const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Service Role Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrationRPC() {
    console.log('Attempting migration via RPC...');

    const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260214_subscription_logic.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error('SQL file not found:', sqlPath);
        process.exit(1);
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Try to call a common utility RPC function if exists
    // Often projects add 'exec_sql' or similar for migrations
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('RPC Error (exec_sql might not exist):', error.message);
        console.log('---------------------------------------------------');
        console.log('FALLBACK: Please run the SQL manually in Supabase SQL Editor:');
        console.log(sql);
        console.log('---------------------------------------------------');
        process.exit(1);
    } else {
        console.log('Migration succeeded via RPC:', data);
        process.exit(0);
    }
}

runMigrationRPC();
