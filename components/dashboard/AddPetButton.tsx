'use client'

import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'
import { UpgradeModal } from '@/components/ui/UpgradeModal'

interface AddPetButtonProps {
    canAddPet: boolean
}

export function AddPetButton({ canAddPet }: AddPetButtonProps) {
    const router = useRouter()
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

    const handleClick = () => {
        if (!canAddPet) {
            setIsUpgradeModalOpen(true)
        } else {
            router.push('/dashboard/register')
        }
    }

    return (
        <>
            <button
                onClick={handleClick}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 hover:text-sky-600 transition-colors shadow-sm text-sm"
            >
                <Plus className="w-4 h-4" />
                Add New Pet
            </button>

            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                title="Pet Limit Reached"
                message="You have reached the pet limit for your current plan. Upgrade your plan to add more companions to your sanctuary."
                redirectUrl="/settings?tab=subscription"
                redirectText="Upgrade Plan"
            />
        </>
    )
}
