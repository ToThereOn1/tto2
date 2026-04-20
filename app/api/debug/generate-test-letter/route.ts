
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateLetterReply } from '@/lib/reply-generator';

export const dynamic = 'force-dynamic';

export async function GET() {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    console.log('🔍 [Debug] Step 1: Starting test letter generation endpoint');

    try {
        const supabase = await createClient();

        // 1. Get current user
        console.log('🔍 [Debug] Step 2: Fetching current authenticated user');
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('❌ [Debug] Auth Error:', authError);
            return NextResponse.json({ error: 'Not authenticated', details: authError }, { status: 401 });
        }
        console.log(`✅ [Debug] User authenticated: ${user.id}`);

        // 2. Get first pet for this user
        console.log('🔍 [Debug] Step 3: Fetching first pet for user');
        // Note: For testing, we just grab ANY pet to create data for, 
        // OR we can grab a pet belonging to the Admin if strictly testing personal flow.
        // Let's stick to "any pet in DB" if we want to test "Admin reviewing ANYONE's letter"
        // BUT 'letters' table enforces foreign key.

        // Let's try to find a pet that belongs to the CURRENT user first (if they have one)
        // If not, find ANY pet, but then we must use THAT pet's owner ID as 'user_id' in letters.

        const { data: pet, error: pErr } = await supabase
            .from('pets')
            .select('id, name, user_id')
            .eq('persona_generated', true)
            .limit(1)
            .single();

        if (pErr || !pet) {
            console.error('❌ [Debug] Pet Fetch Error:', pErr);
            return NextResponse.json({ error: 'No pets found in DB', details: pErr }, { status: 404 });
        }
        console.log(`✅ [Debug] Found pet: ${pet.name} (${pet.id}), Owner: ${pet.user_id}`);

        const targetUserId = pet.user_id;

        // 3. Insert User Letter (Simulate previous history)
        console.log('🔍 [Debug] Step 4: Creating Admin Client for Service Role insert');
        let supabaseAdmin;
        try {
            supabaseAdmin = createAdminClient();
        } catch (adminClientErr: any) {
            console.error('❌ [Debug] Failed to create Admin Client. Check SUPABASE_SERVICE_ROLE_KEY.');
            throw new Error(`Admin Client Init Failed: ${adminClientErr.message}`);
        }

        console.log('🔍 [Debug] Step 5: Inserting test letter (User -> Pet) via Admin Client');
        const { data: insertedLetter, error: lErr } = await supabaseAdmin
            .from('letters')
            .insert({
                pet_id: pet.id,
                user_id: targetUserId, // Owner of the pet
                sender_type: 'user',
                direction: 'user_to_pet',
                status: 'delivered', // 'replied' is not in allowed check constraint
                content: 'Test letter from Admin User: I miss you so much! How are you doing?',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (lErr) {
            console.error('❌ [Debug] Letter Insert Error:', JSON.stringify(lErr, null, 2));
            return NextResponse.json({ error: 'Failed to create user letter', details: lErr }, { status: 500 });
        }
        console.log(`✅ [Debug] User letter created: ${insertedLetter.id}`);

        // 4. Trigger AI Reply Generation
        console.log(`🔍 [Debug] Step 6: Triggering AI reply generation for letter ${insertedLetter.id}`);
        const result = await generateLetterReply(insertedLetter.id, pet.id);

        console.log('✅ [Debug] AI Reply Generated Successfully:', JSON.stringify(result, null, 2));

        return NextResponse.json({
            success: true,
            message: `Created test letter loop for pet ${pet.name}`,
            replyId: result.reply_letter_id,
            debug: result.debug
        });

    } catch (error: any) {
        console.error('❌ [Debug] CRITICAL UNHANDLED ERROR in generate-test-letter:');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        return NextResponse.json(
            {
                error: error.message || 'Internal Server Error',
                details: error.stack
            },
            { status: 500 }
        );
    }
}
