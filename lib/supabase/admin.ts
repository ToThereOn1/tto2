import { createClient } from '@supabase/supabase-js'

// admin client bypasses RLS and authenticated context.
// Use this ONLY in secure server environments like webhooks or cron jobs
// where you need to perform actions on behalf of the system, not a specific user.
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)
