
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    try {
        const supabase = await createClient();

        // Auth check (Admin or Master User only for debug)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // For now, allow anyone authenticated to run this for testing, 
        // OR restrict to specific email if needed.
        // if (user.email !== 'ljhwany@gmail.com') ...

        const { searchParams } = new URL(request.url);
        const targetUserId = searchParams.get('userId') || user.id;

        // Simulate Renewal:
        // 1. Set remaining_letters = 4
        // 2. Clear next_available_at (or set to NULL or NOW) to remove cooldown
        // 3. Update current_period_start/end if we wanted to be fancy, but not needed for logic test.

        const { data, error } = await supabase
            .from('subscriptions')
            .update({
                remaining_letters: 4,
                next_available_at: new Date().toISOString(), // Reset cooldown to NOW
                updated_at: new Date().toISOString()
            })
            .eq('user_id', targetUserId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'Subscription renewed successfully (Debug)',
            data
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
