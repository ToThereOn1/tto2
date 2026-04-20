import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = user.id

        // Delete user data in dependency order (RLS bypassed via admin client)
        const admin = createAdminClient()

        // 1. Delete letters
        await admin.from('letters').delete().eq('user_id', userId)

        // 2. Delete letter_quota
        await admin.from('letter_quota').delete().eq('user_id', userId)

        // 3. Delete pets (cascades any pet-linked records)
        await admin.from('pets').delete().eq('user_id', userId)

        // 4. Delete subscriptions
        await admin.from('subscriptions').delete().eq('user_id', userId)

        // 5. Delete user_consents
        await admin.from('user_consents').delete().eq('user_id', userId)

        // 6. Delete user record
        await admin.from('users').delete().eq('id', userId)

        // 7. Delete auth user (must be last)
        const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId)
        if (deleteAuthError) {
            console.error('[account/delete] Auth user delete error:', deleteAuthError)
            return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[account/delete] Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
