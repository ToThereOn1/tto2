'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Sparkles, Heart, MoreHorizontal, Trash2, X, AlertTriangle } from 'lucide-react'
import { differenceInDays } from 'date-fns'
import { Database } from '@/types/database.types'
import { getCurrentZone, getZoneDisplayName } from '@/lib/zone-manager'
import { TIME_RATIO } from '@/lib/time-constants'

type Pet = Database['public']['Tables']['pets']['Row']

interface PetCardProps {
    pet: Pet
    lastFeedDate?: string | null
    drCompleted?: boolean
    canWriteLetter?: boolean
}

export function PetCard({ pet, lastFeedDate, drCompleted, canWriteLetter }: PetCardProps) {
    const router = useRouter()
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showRemembranceAlert, setShowRemembranceAlert] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const [showDropdown, setShowDropdown] = useState(false)
    const passedDate = pet.passed_date ? new Date(pet.passed_date) : new Date()
    const daysSince = differenceInDays(new Date(), passedDate)
    const toThereOnDay = Math.max(1, Math.floor(daysSince / TIME_RATIO) + 1)
    const currentZoneKey = getCurrentZone(toThereOnDay)
    const currentZoneName = getZoneDisplayName(currentZoneKey)
    const photoUrl = pet.photos?.[0] || '/api/placeholder/400/300'

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/pets/${pet.id}`, { method: 'DELETE' })
            if (res.ok) {
                router.refresh()
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to delete pet')
            }
        } catch (err) {
            console.error('Delete failed:', err)
            alert('An error occurred while deleting.')
        } finally {
            setIsDeleting(false)
            setShowDeleteConfirm(false)
        }
    }

    return (
        <>
            <motion.div
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -8, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="group relative bg-white/70 backdrop-blur-2xl rounded-[32px] overflow-hidden shadow-md hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 border border-white/60"
            >
                {/* Image Section */}
                <div className="relative h-64 overflow-hidden bg-gray-100">
                    {pet.photos?.[0] ? (
                        <img
                            src={photoUrl}
                            alt={pet.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                            🐾
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-blue-600 shadow-sm">
                        {currentZoneName}
                    </div>

                    <div className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-red-400 shadow-sm">
                        <Heart className="w-4 h-4 fill-current" />
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-6 relative">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">{pet.name}</h3>
                            <p className="text-sm text-gray-500 font-medium capitalize">
                                {pet.breed || pet.species} • {pet.gender === 'male' ? 'Boy' : pet.gender === 'female' ? 'Girl' : ''}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">ToThereOn World</div>
                            <div className="text-lg font-bold text-blue-600 flex items-center justify-end gap-1">
                                <Sparkles className="w-4 h-4" />
                                Day {toThereOnDay}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {pet.persona_generated ? (
                            <Link href={`/dashboard/pets/${pet.id}`} className="flex-1">
                                <motion.button
                                    whileHover={{ scale: 1.03 }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                    className="w-full py-4 rounded-2xl bg-gray-50/80 text-gray-900 font-bold hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white transition-all group-hover:shadow-lg group-hover:shadow-blue-500/30 flex items-center justify-center gap-2">
                                    Pet Feed <ArrowRight className="w-4 h-4" />
                                </motion.button>
                            </Link>
                        ) : (
                            <motion.button
                                onClick={() => setShowRemembranceAlert(true)}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.96 }}
                                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                className="flex-1 py-4 rounded-2xl bg-gray-50/80 text-gray-900 font-bold hover:bg-gradient-to-r hover:from-amber-400 hover:to-orange-500 hover:text-white transition-all group-hover:shadow-lg group-hover:shadow-amber-500/30 flex items-center justify-center gap-2">
                                Pet Feed <ArrowRight className="w-4 h-4" />
                            </motion.button>
                        )}
                        <div className="relative">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setShowDropdown(v => !v)}
                                className="py-4 px-4 rounded-2xl bg-gray-50/80 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                                title="More options"
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </motion.button>
                            {showDropdown && (
                                <div
                                    className="absolute right-0 mt-1 w-36 bg-white rounded-2xl shadow-lg border border-gray-100 z-20 overflow-hidden"
                                    onMouseLeave={() => setShowDropdown(false)}
                                >
                                    <button
                                        onClick={() => { setShowDropdown(false); setShowDeleteConfirm(true) }}
                                        className="w-full text-left px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Row (US-B2) */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs text-gray-400">
                            {lastFeedDate ? (
                                <span>Heard from {pet.name} on {new Date(lastFeedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            ) : (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-semibold">A new story awaits</span>
                            )}
                        </div>
                        <div className="text-xs font-semibold">
                            {drCompleted ? (
                                <span className="text-green-600">DR Complete ✓</span>
                            ) : (
                                <span className="text-amber-500">Deep Remembrance pending</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Decoration */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent z-10" />
            </motion.div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => !isDeleting && setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-red-500" />
                                </div>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Delete {pet.name}?
                            </h3>
                            <p className="text-gray-500 mb-6 leading-relaxed">
                                This will permanently remove <strong>{pet.name}</strong> and all associated data including letters, survey responses, and persona. This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Deep Remembrance Alert Modal */}
            <AnimatePresence>
                {showRemembranceAlert && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                        onClick={() => setShowRemembranceAlert(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                                </div>
                                <button
                                    onClick={() => setShowRemembranceAlert(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                Deep Remembrance Required
                            </h3>
                            <p className="text-gray-500 mb-6 leading-relaxed">
                                Please complete Deep Remembrance first to receive letters from <strong>{pet.name}</strong>.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowRemembranceAlert(false)}
                                    className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <Link href={`/dashboard/pets/${pet.id}/remembrance`} className="flex-1">
                                    <button
                                        onClick={() => setShowRemembranceAlert(false)}
                                        className="w-full py-3 rounded-2xl bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        Start Now
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
