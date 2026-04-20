'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, PenLine, Sparkles, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { UpgradeModal } from '@/components/ui/UpgradeModal'

export default function LetterSelectionPage() {
    const router = useRouter()
    const [pets, setPets] = useState<any[]>([])
    const [canWrite, setCanWrite] = useState(false)
    const [loading, setLoading] = useState(true)
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)

    useEffect(() => {
        const init = async () => {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { router.push('/login'); return }

                // Fetch pets
                const { data: petsData } = await supabase
                    .from('pets')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })

                if (!petsData || petsData.length === 0) {
                    router.push('/dashboard/register')
                    return
                }
                setPets(petsData)

                // Check subscription — server-side guard for write permission
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('tier')
                    .eq('user_id', user.id)
                    .in('status', ['active', 'trialing'])
                    .single()

                let tier = sub?.tier || null
                if (!tier) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('subscription_tier')
                        .eq('id', user.id)
                        .single()
                    tier = userData?.subscription_tier || 'free'
                }

                const paid = ['basic', 'plus', 'pro'].includes((tier as string).toLowerCase())
                setCanWrite(paid)

                // If not subscribed, immediately show upgrade modal
                if (!paid) {
                    setUpgradeModalOpen(true)
                }
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        init()
    }, [router])

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
            </main>
        )
    }

    return (
        <>
            <main className="min-h-screen bg-[var(--color-background)] py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center p-3 bg-purple-100 rounded-full mb-6">
                            <MessageCircle className="w-8 h-8 text-purple-600" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                            Message to My Dear
                        </h1>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Whose spirit do you wish to reach today?
                            <br />
                            Send your love through the Waterway to ToThereOn World.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {pets.map((pet: any) => (
                            canWrite ? (
                                <Link
                                    key={pet.id}
                                    href={`/dashboard/pets/${pet.id}/write`}
                                    className="group relative bg-white rounded-[32px] p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-purple-200 overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                                        <PenLine size={100} className="text-purple-600" />
                                    </div>

                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex-shrink-0">
                                            {pet.photos?.[0] ? (
                                                <img src={pet.photos[0]} alt={pet.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-bold text-slate-900 mb-1 truncate">{pet.name}</h3>
                                            <p className="text-sm text-slate-500 mb-2 capitalize">{pet.breed || pet.species}</p>
                                            <span className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 group-hover:gap-2 transition-all">
                                                Write Letter <ArrowRight size={16} />
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ) : (
                                <button
                                    key={pet.id}
                                    onClick={() => setUpgradeModalOpen(true)}
                                    className="group relative bg-white rounded-[32px] p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-purple-200 overflow-hidden text-left"
                                >
                                    <div className="flex items-center gap-6 relative z-10">
                                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex-shrink-0">
                                            {pet.photos?.[0] ? (
                                                <img src={pet.photos[0]} alt={pet.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl font-bold text-slate-900 mb-1 truncate">{pet.name}</h3>
                                            <p className="text-sm text-slate-500 mb-2 capitalize">{pet.breed || pet.species}</p>
                                            <span className="inline-flex items-center gap-1 text-sm font-medium text-purple-400">
                                                <Sparkles size={14} /> Subscription Required
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            )
                        ))}
                    </div>
                </div>
            </main>

            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={upgradeModalOpen}
                onClose={() => { setUpgradeModalOpen(false); router.push('/dashboard') }}
                title="Subscription Required"
                message="Writing heartfelt letters to your beloved pet in ToThereOn World is a premium feature. Subscribe to begin your correspondence through the Waterway."
                redirectUrl="/pricing"
                redirectText="View Plans"
            />
        </>
    )
}
