
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetQuota() {
    const email = process.env.ADMIN_EMAIL || 'ljhwany@gmail.com';
    console.log(`Resetting quota for ${email}...`);

    // 1. Get User ID
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (userError || !user) {
        console.error('User not found:', userError);
        return;
    }

    // 2. Reset Quota
    const { error: updateError } = await supabase
        .from('letter_quota')
        .update({ letters_sent: 0 })
        .eq('user_id', user.id);

    if (updateError) {
        console.error('Failed to reset quota:', updateError);
    } else {
        console.log('Successfully reset letter_quota sent count to 0.');
    }
}

resetQuota();
