import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DeepRemembranceSurvey } from '@/components/remembrance/DeepRemembranceSurvey'

interface PageProps {
    params: Promise<{ petId: string }>
}

export default async function DeepRemembrancePage({ params }: PageProps) {
    const { petId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get pet info
    const { data: pet, error: petError } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .eq('user_id', user.id)
        .single()

    if (petError || !pet) {
        redirect('/dashboard')
    }

    // Get existing responses if any
    const { data: existingResponse } = await supabase
        .from('deep_remembrance_responses')
        .select('*')
        .eq('pet_id', petId)
        .single()

    return (
        <main
            className="min-h-screen"
            style={{ background: 'linear-gradient(135deg, #FAFBFC 0%, #F0F4F8 50%, #E8EEF5 100%)' }}
        >
            <DeepRemembranceSurvey
                petId={petId}
                petName={pet.name}
                initialResponses={existingResponse?.responses || {}}
                initialIndex={existingResponse?.current_question_index || 0}
                responseId={existingResponse?.id}
            />
        </main>
    )
}
