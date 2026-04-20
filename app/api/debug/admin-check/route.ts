
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Not logged in' });
    }

    const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    return NextResponse.json({
        user_id: user.id,
        is_admin: !!adminUser,
        admin_data: adminUser,
        error: error ? error.message : null
    });
}
