
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateLetterReply } from '@/lib/reply-generator';

export async function POST(request: Request) {
    try {
        const { letterId, instruction } = await request.json();
        const supabase = await createClient();

        // Auth Check (Admin Only)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: adminUser } = await supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle()
        if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // Use Admin Client for DB operations to bypass RLS (especially for DELETE)
        const adminDb = createAdminClient();

        // 1. Retrieve the REPLY letter first
        const { data: replyLetter, error: fetchError } = await adminDb
            .from('letters')
            .select('id, reply_to_id, user_id, pet_id, created_at, content')
            .eq('id', letterId)
            .single();

        if (fetchError || !replyLetter) {
            return NextResponse.json({ error: 'Reply letter not found: ' + letterId }, { status: 404 });
        }

        // 2. Find the Original User Letter that triggered this reply
        // We look for a User letter from the same pet, strictly before this reply was created?
        // Or just the latest one?
        const { data: userLetter } = await adminDb
            .from('letters')
            .select('id')
            .eq('pet_id', replyLetter.pet_id)
            .eq('sender_type', 'user')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!userLetter) {
            return NextResponse.json({ error: 'Original user letter not found for pet ' + replyLetter.pet_id }, { status: 404 });
        }

        // 3. Generate NEW Reply
        // Note: generateLetterReply uses its own admin client internally, so RLS is fine there.
        console.log(`Regenerating reply for User Letter ${userLetter.id} with instruction: ${instruction}`);
        const result = await generateLetterReply(userLetter.id, replyLetter.pet_id, instruction);

        // 4. Delete OLD Reply (Soft delete? Hard delete?)
        // Hard delete to avoid duplicates in the list
        const { error: deleteError } = await adminDb
            .from('letters')
            .delete()
            .eq('id', letterId);

        if (deleteError) {
            console.error('Failed to delete old reply:', deleteError);
            // Verify if we should rollback? Ideally yes, but tricky.
            // Just warn for now.
        }

        // 5. Fetch new content to return
        const { data: newReply } = await adminDb
            .from('letters')
            .select('content')
            .eq('id', result.reply_letter_id)
            .single();

        return NextResponse.json({ success: true, content: newReply?.content });

    } catch (error: any) {
        console.error('Regenerate Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
