'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updatePersona(personaId: string, newProfile: any) {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('pet_personas')
        .update({
            persona_profile: newProfile,
            updated_at: new Date().toISOString()
        })
        .eq('id', personaId);

    if (error) {
        console.error('Failed to update persona:', error);
        throw new Error(error.message);
    }

    revalidatePath('/admin/personas');
    return { success: true };
}
