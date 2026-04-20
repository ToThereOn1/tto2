'use client'

import Link from 'next/link'
import type { Pet } from '@/lib/types/database'

interface PetCardProps {
    pet: Pet
    showActions?: boolean
}

export function PetCard({ pet, showActions = true }: PetCardProps) {
    const speciesEmoji: Record<string, string> = {
        dog: '🐕',
        cat: '🐱',
        rabbit: '🐰',
        bird: '🐦',
        hamster: '🐹',
        other: '🐾',
    }

    const firstPhoto = pet.photos?.[0] || null
    const timeSincePassing = getTimeSincePassing(pet.passed_date)

    return (
        <div className="block group">
            <div
                className="bg-white dark:bg-slate-800 p-5 rounded-[32px] border border-slate-100 dark:border-slate-700 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 cursor-pointer"
            >
                {/* Wrapper Link for Card Content */}
                <Link href={`/dashboard/pets/${pet.id}`} className="block">
                    {/* Pet Photo */}
                    <div className="relative aspect-square rounded-[24px] overflow-hidden mb-5">
                        {firstPhoto ? (
                            <img
                                src={firstPhoto}
                                alt={pet.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center text-6xl"
                                style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)' }}
                            >
                                {speciesEmoji[pet.species] || '🐾'}
                            </div>
                        )}

                        {/* Persona Badge */}
                        {pet.persona_generated && (
                            <div
                                className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 backdrop-blur-md shadow-lg"
                                style={{
                                    background: 'rgba(99, 102, 241, 0.9)',
                                    color: 'white'
                                }}
                            >
                                <span className="animate-pulse">✨</span> Persona Ready
                            </div>
                        )}

                        {/* Overlay Gradient on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    {/* Pet Info */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3
                                className="text-xl font-bold tracking-tight"
                                style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}
                            >
                                {pet.name}
                            </h3>
                            <p
                                className="text-xs font-semibold uppercase tracking-widest"
                                style={{ color: 'var(--color-text-secondary)' }}
                            >
                                {pet.breed || pet.species} • {pet.gender === 'male' ? '♂ Male' : '♀ Female'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <span className="text-xl">{speciesEmoji[pet.species] || '🐾'}</span>
                        </div>
                    </div>

                    <p
                        className="text-[11px] mt-3 font-medium opacity-60"
                        style={{ color: 'var(--color-text-tertiary)' }}
                    >
                        {timeSincePassing}
                    </p>
                </Link>

                {/* Action Buttons - Optional but kept for utility */}
                {showActions && (
                    <div className="mt-5 pt-5 border-t border-slate-50 dark:border-slate-700/50">
                        {pet.persona_generated ? (
                            <div className="flex gap-3">
                                <Link
                                    href={`/dashboard/pets/${pet.id}/status`}
                                    className="flex-1 text-center py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all hover:bg-primary/10 bg-slate-50 dark:bg-slate-900/50"
                                    style={{ color: 'var(--color-primary)' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Feed
                                </Link>
                                <Link
                                    href={`/dashboard/pets/${pet.id}/mailbox`}
                                    className="flex-1 text-center py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-primary/20 button-primary"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Mailbox
                                </Link>
                            </div>
                        ) : (
                            <Link
                                href={`/dashboard/pets/${pet.id}/remembrance`}
                                className="block w-full text-center py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-primary/20 button-primary"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Start Remembrance
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function getTimeSincePassing(passedDate: string): string {
    const passed = new Date(passedDate)
    const now = new Date()
    const diffMs = now.getTime() - passed.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 30) {
        return `Crossed ${diffDays} days ago`
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30)
        return `Crossed ${months} month${months > 1 ? 's' : ''} ago`
    } else {
        const years = Math.floor(diffDays / 365)
        return `Crossed ${years} year${years > 1 ? 's' : ''} ago`
    }
}

// Empty State Component
export function EmptyPetCard() {
    return (
        <div className="block group">
            <Link href="/dashboard/pets/new">
                <div
                    className="h-full min-h-[360px] flex flex-col items-center justify-center text-center p-8 rounded-[32px] border-2 border-dashed transition-all duration-500 hover:border-primary/50 hover:bg-primary/5 bg-slate-50/50 dark:bg-slate-900/20"
                    style={{
                        borderColor: 'rgba(99, 102, 241, 0.2)',
                    }}
                >
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-inner"
                        style={{
                            background: 'white',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)'
                        }}
                    >
                        <span className="text-3xl">🧩</span>
                    </div>

                    <h3
                        className="text-lg font-bold tracking-tight mb-2"
                        style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-primary)' }}
                    >
                        Register New Pet
                    </h3>

                    <p
                        className="text-xs font-medium leading-relaxed max-w-[200px]"
                        style={{ color: 'var(--color-text-secondary)' }}
                    >
                        Bring another companion to ToThereOn World and stay connected.
                    </p>

                    <div className="mt-8 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg group-hover:rotate-90 transition-transform duration-500">
                        <span className="text-2xl font-light">+</span>
                    </div>
                </div>
            </Link>
        </div>
    )
}
