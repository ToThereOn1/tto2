
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { PRICING_PLANS } from '@/lib/constants/pricing'
import { PricingCard } from '@/components/pricing/PricingCard'
import { WaitlistModal } from '@/components/pricing/WaitlistModal'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface PricingSectionProps {
    className?: string
    showTitle?: boolean
    isLoggedIn?: boolean
}

export function PricingSection({ className, showTitle = true, isLoggedIn: isLoggedInProp }: PricingSectionProps) {
    const router = useRouter()
    const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
    const [waitlistModalOpen, setWaitlistModalOpen] = useState(false)
    const [selectedWaitlistPlan, setSelectedWaitlistPlan] = useState('')
    const [loading, setLoading] = useState(false)
    const [isLoggedIn, setIsLoggedIn] = useState(isLoggedInProp ?? false)

    // Auto-detect login status when isLoggedIn prop is not explicitly provided
    useEffect(() => {
        if (isLoggedInProp !== undefined) {
            setIsLoggedIn(isLoggedInProp)
            return
        }
        const supabase = createClient()
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: { user: unknown } | null } }) => {
            setIsLoggedIn(!!session?.user)
        })
    }, [isLoggedInProp])

    const handleAction = async (planId: string) => {
        if (!isLoggedIn) {
            router.push('/login')
            return
        }

        if (planId === 'free') {
            toast.info("You are already on the Free plan.")
        } else if (planId === 'basic') {
            window.open('https://buy.polar.sh/polar_cl_UDzu8zCrgd9Inl5fs9QB53zK1F0zjqRxALi8S0t6EZC', '_blank')
        } else {
            window.open('https://buy.polar.sh/polar_cl_m3DU1mBJWZvARH5t13cKOGeAi7CWOrCpu9wNL27qgLM', '_blank')
        }
    }

    return (
        <section className={cn("py-20 px-6 relative overflow-hidden", className)}>
            <WaitlistModal
                isOpen={waitlistModalOpen}
                onClose={() => setWaitlistModalOpen(false)}
                planName={selectedWaitlistPlan}
            // No need for duplicate declaration
            />

            {showTitle && (
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight"
                    >
                        AI Pet Memorial Plans —{' '}
                        <span className="text-primary italic">Reconnect Through Letters Across the Waterway</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-slate-500 max-w-2xl mx-auto"
                    >
                        Every plan keeps their journey alive in ToThereOn World. Start free. Cancel anytime.
                    </motion.p>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-base text-slate-600 max-w-xl mx-auto mt-4 font-medium italic"
                    >
                        They didn&apos;t leave. They just moved somewhere you can still reach.
                    </motion.p>
                </div>
            )}

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-16">
                <span className={`text-sm font-bold ${billingInterval === 'monthly' ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
                <button
                    onClick={() => setBillingInterval(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                    className="w-16 h-8 bg-slate-200 rounded-full p-1 relative transition-colors duration-300 hover:bg-slate-300"
                >
                    <motion.div
                        layout
                        className="w-6 h-6 bg-white rounded-full shadow-sm"
                        animate={{ x: billingInterval === 'monthly' ? 0 : 32 }}
                    />
                </button>
                <span className={`text-sm font-bold flex items-center gap-2 ${billingInterval === 'yearly' ? 'text-slate-900' : 'text-slate-400'}`}>
                    Yearly
                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">2 months free</span>
                </span>
            </div>

            {/* Pricing Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Mobile Order: Basic -> Free -> Premium */}
                {/* Desktop Order: Free -> Basic -> Premium */}

                <div className="order-2 lg:order-1">
                    <PricingCard plan={PRICING_PLANS.free} billingInterval={billingInterval} onAction={handleAction} />
                </div>

                <div className="order-1 lg:order-2">
                    <PricingCard plan={PRICING_PLANS.basic} billingInterval={billingInterval} onAction={handleAction} />
                </div>

                <div className="order-3 lg:order-3">
                    <PricingCard plan={PRICING_PLANS.premium} billingInterval={billingInterval} onAction={handleAction} />
                </div>
            </div>

            {/* Legal note below pricing cards */}
            <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
                By subscribing, you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600 transition-colors">
                    Terms of Service
                </a>
                {' '}and{' '}
                <a href="/terms#6" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600 transition-colors">
                    Refund Policy
                </a>
                . Subscriptions auto-renew. Cancel anytime.
            </p>
        </section>
    )
}
