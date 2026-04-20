const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function approveLetter() {
    const letterId = '1eea1f79-20cb-4f90-b8ff-7cab35e8b689';
    console.log(`Attempting to approve letter: ${letterId}`);

    const { data, error, count } = await supabase
        .from('letters')
        .update({ status: 'approved' })
        .eq('id', letterId)
        .select();

    if (error) {
        console.error('❌ Update Failed:', error);
    } else {
        console.log('✅ Update Success!');
        console.log('Updated Rows:', data);
    }
}

approveLetter();
