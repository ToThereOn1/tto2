import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PetRegistrationForm } from '@/components/pets/PetRegistrationForm'
import { UpgradeNudge } from '@/components/ui/UpgradeNudge'
import { ArrowLeft } from 'lucide-react'

export default async function NewPetPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // 현재 등록된 Pet 수
    const { count: petCount } = await supabase
        .from('pets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    // pet_limit 조회 (신규 컬럼; 없으면 max_pets_allowed fallback, 기본값 1)
    const { data: userData } = await supabase
        .from('users')
        .select('pet_limit, max_pets_allowed, subscription_tier')
        .eq('id', user.id)
        .single()

    const petLimit = userData?.pet_limit ?? userData?.max_pets_allowed ?? 1
    const maxPetsReached = (petCount ?? 0) >= petLimit

    return (
        <main
            className="min-h-screen"
            style={{ background: 'linear-gradient(135deg, #FAFBFC 0%, #F0F4F8 50%, #E8EEF5 100%)' }}
        >
            {/* Header */}
            <div
                className="px-8 py-6 border-b"
                style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    borderColor: 'var(--color-border-light)'
                }}
            >
                <div className="max-w-2xl mx-auto flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <ArrowLeft size={20} style={{ color: 'var(--color-text-secondary)' }} />
                    </Link>
                    <div>
                        <h1
                            className="text-2xl font-semibold"
                            style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)' }}
                        >
                            Register Your Pet
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            Step 1 of 2 — Basic Information
                        </p>
                    </div>
                </div>
            </div>

            {/* Form Container */}
            <div className="max-w-2xl mx-auto px-8 py-12">
                <div
                    className="glass-effect rounded-3xl p-8 md:p-12"
                    style={{ boxShadow: '0 8px 32px rgba(74, 144, 226, 0.12)' }}
                >
                    {/* Intro */}
                    <div className="text-center mb-10">
                        <div
                            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(107, 163, 217, 0.1) 100%)' }}
                        >
                            <span className="text-4xl">🐾</span>
                        </div>
                        <h2
                            className="text-xl font-medium mb-2"
                            style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)' }}
                        >
                            Tell us about your beloved pet
                        </h2>
                        <p style={{ color: 'var(--color-text-secondary)' }}>
                            This information helps us create a more authentic connection
                        </p>
                    </div>

                    {/* Pet 한도 초과 시 UpgradeNudge 표시 */}
                    {maxPetsReached ? (
                        <>
                            <div className="text-center py-6">
                                <div className="text-5xl mb-4">🐾</div>
                                <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
                                    Maximum Pets Reached
                                </h3>
                                <p style={{ color: 'var(--color-text-secondary)' }}>
                                    You have reached the maximum number of pets on your current plan.
                                </p>
                            </div>
                            <UpgradeNudge
                                message="Bring your other companion to ToThereOn World"
                                subMessage="Upgrade to Plus to register a 2nd pet"
                                ctaText="See Plus Plan"
                                ctaHref="/pricing"
                            />
                        </>
                    ) : (
                        <PetRegistrationForm maxPetsReached={false} />
                    )}
                </div>
            </div>
        </main>
    )
}
