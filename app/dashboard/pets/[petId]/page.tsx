import { redirect } from 'next/navigation'

export default async function PetDashboardRedirect({ params }: { params: Promise<{ petId: string }> }) {
    const { petId } = await params
    redirect(`/dashboard/pets/${petId}/status`)
}
