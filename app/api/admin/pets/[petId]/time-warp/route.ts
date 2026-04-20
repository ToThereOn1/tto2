
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ petId: string }> }
) {
    try {
        // Auth Check
        const supabaseAuth = await createClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { petId } = await context.params;

        // Admin authorization check
        const { data: adminUser } = await supabaseAuth
            .from('admin_users')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (!adminUser) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { offsetHours } = await req.json();
        const supabase = createAdminClient();

        // Validate
        if (typeof offsetHours !== 'number' || !isFinite(offsetHours) || offsetHours < -8760 || offsetHours > 8760) {
            return NextResponse.json({ error: 'offsetHours must be a finite number between -8760 and 8760' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('pets')
            .update({ time_offset_hours: offsetHours })
            .eq('id', petId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Time warp API error:', error);
        return NextResponse.json(
            { error: 'Time warp failed' },
            { status: 500 }
        );
    }
}
