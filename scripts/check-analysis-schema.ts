
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const { data } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'letters')
        .eq('table_schema', 'public');

    const columns = data?.map(c => c.column_name) || [];
    console.log('Has analysis_result:', columns.includes('analysis_result'));
}
main();
