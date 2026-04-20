import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function FeedRedirectPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // specific selection for minimal data
    const { data: pets } = await supabase
        .from('pets')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

    if (pets && pets.length > 0) {
        // Redirect to the most recently created pet's feed/dashboard
        // Assuming the pet dashboard IS the feed or has a feed component
        redirect(`/dashboard/pets/${pets[0].id}`)
    } else {
        // No pets, redirect to create new
        redirect('/dashboard/pets/new')
    }
}
