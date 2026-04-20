
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not logged in' });

    // Call RPC
    const { data, error } = await supabase.rpc('get_pending_reviews');

    return NextResponse.json({
        user: user.id,
        data,
        error,
        error_details: error ? JSON.stringify(error) : null
    });
}
