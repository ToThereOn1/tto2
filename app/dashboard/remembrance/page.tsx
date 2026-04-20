import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Check, Clock, Sparkles } from 'lucide-react'

export default async function RemembranceSelectionPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch pets with their deep remembrance status
    const { data: pets, error } = await supabase
        .from('pets')
        .select(`
            *,
            deep_remembrance_responses (
                id,
                completion_percentage,
                updated_at
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching pets:', error)
        return <div>Error loading pets. Please refresh.</div>
    }

    if (!pets || pets.length === 0) {
        redirect('/dashboard/register')
    }

    return (
        <main className="min-h-screen bg-[var(--color-background)] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ fontFamily: 'var(--font-sans)' }}>
                        Deep Remembrance
                    </h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Select a companion to begin or continue their journey of remembrance.
                        Your memories will weave their soul in the sanctuary.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pets.map((pet: any) => {
                        const response = pet.deep_remembrance_responses?.[0]
                        const isCompleted = pet.persona_generated || response?.completion_percentage === 100
                        const isInProgress = !isCompleted && response && response.completion_percentage > 0

                        return (
                            <Link
                                key={pet.id}
                                href={isCompleted ? `/dashboard/pets/${pet.id}/remembrance/complete` : `/dashboard/pets/${pet.id}/remembrance`}
                                className="group relative bg-white rounded-[32px] p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 hover:border-primary/20 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Sparkles size={100} className="text-primary" />
                                </div>

                                <div className="flex items-start gap-6 relative z-10">
                                    {/* Pet Image */}
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white shadow-md flex-shrink-0">
                                        {pet.photos?.[0] ? (
                                            <img
                                                src={pet.photos[0]}
                                                alt={pet.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-slate-900 mb-1 truncate">{pet.name}</h3>
                                        <p className="text-sm text-slate-500 mb-4 capitalize">{pet.breed || pet.species}</p>

                                        {/* Status Indicator */}
                                        <div className="flex items-center gap-2">
                                            {isCompleted ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider border border-green-100">
                                                    <Check size={12} strokeWidth={3} />
                                                    Completed
                                                </span>
                                            ) : isInProgress ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider border border-amber-100">
                                                    <Clock size={12} strokeWidth={3} />
                                                    {response.completion_percentage}% Done
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border border-slate-100">
                                                    Not Started
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="self-center">
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                                            ${isCompleted
                                                ? 'bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white'
                                                : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                                            }
                                        `}>
                                            {isCompleted ? <Check size={20} /> : <ArrowRight size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {isInProgress && (
                                    <div className="mt-6 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-400 rounded-full"
                                            style={{ width: `${response.completion_percentage}%` }}
                                        />
                                    </div>
                                )}
                            </Link>
                        )
                    })}
                </div>
            </div>
        </main>
    )
}
