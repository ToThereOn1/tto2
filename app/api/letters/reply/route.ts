import { NextRequest, NextResponse } from 'next/server';
import { generateLetterReply } from '@/lib/reply-generator';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        // Auth Check
        const supabaseAuth = await createClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { letterId, petId, forceTrigger, instruction } = await req.json();

        // 1. Validate Input
        if (!letterId) {
            return NextResponse.json({ error: 'Missing letterId' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 1b. Ownership check: letter must belong to a pet owned by this user
        const { data: letterOwner } = await supabase
            .from('letters')
            .select('id, pet_id')
            .eq('id', letterId)
            .maybeSingle();

        if (!letterOwner) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 403 });
        }

        const { data: petOwner } = await supabase
            .from('pets')
            .select('id')
            .eq('id', letterOwner.pet_id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!petOwner) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 403 });
        }

        // 2. Lock & Prevent Race Condition (Idempotency)
        // We only allow generation if the current status is 'sent' or 'pending_review'
        const { data: letter, error: fetchError } = await supabase
            .from('letters')
            .select('status')
            .eq('id', letterId)
            .single();

        if (fetchError || !letter) {
            return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
        }

        if (letter.status === 'reply_generating' || letter.status === 'replied') {
            return NextResponse.json({ error: 'Reply is already generating or finished.' }, { status: 409 });
        }

        // Atomically lock the letter so subsequent clicks fail
        const { error: lockError } = await supabase
            .from('letters')
            .update({ status: 'reply_generating' })
            .eq('id', letterId)
            // Ensure it hasn't changed since we checked
            .in('status', ['sent', 'pending_review', 'failed']);

        if (lockError) {
            return NextResponse.json({ error: 'Failed to acquire lock for generation' }, { status: 409 });
        }

        // 3. Call Shared Generator Logic
        const result = await generateLetterReply(letterId, petId, instruction);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Reply Generation Error]', error);

        // Rollback Lock on failure
        const supabase = createAdminClient();
        const { letterId } = await req.json().catch(() => ({ letterId: null }));
        if (letterId) {
            await supabase.from('letters').update({ status: 'sent' }).eq('id', letterId);
        }

        return NextResponse.json(
            { error: 'Reply generation failed' },
            { status: 500 }
        );
    }
}
