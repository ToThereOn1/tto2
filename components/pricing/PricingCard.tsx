
'use client'

import { Check, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { PRICING_PLANS } from '@/lib/constants/pricing'

interface PricingCardProps {
    plan: typeof PRICING_PLANS[keyof typeof PRICING_PLANS]
    billingInterval: 'monthly' | 'yearly'
    onAction: (planId: string) => void
}

export function PricingCard({ plan, billingInterval, onAction }: PricingCardProps) {
    const isYearly = billingInterval === 'yearly'
    const price = isYearly ? plan.price.yearly : plan.price.monthly
    const isComingSoon = plan.status === 'coming_soon'
    const isPopular = plan.badge === 'MOST POPULAR'

    return (
        <motion.div
            whileHover={{ y: -8 }}
            className={cn(
                "relative flex flex-col p-8 rounded-[32px] border transition-all duration-300 bg-white",
                isPopular ? "border-primary shadow-xl scale-[1.02] z-10 ring-4 ring-primary/5" : "border-slate-200 shadow-sm hover:shadow-xl",
                isComingSoon && "opacity-80 grayscale-[0.5] hover:grayscale-0"
            )}
        >
            {plan.badge && (
                <div className={cn(
                    "absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    isPopular ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-100 text-slate-500 border border-slate-200"
                )}>
                    {plan.badge}
                </div>
            )}

            <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                {'tagline' in plan && (
                    <p className="text-xs font-semibold text-primary/60 italic mb-2 tracking-wide">
                        {(plan as any).tagline}
                    </p>
                )}
                <p className="text-sm text-slate-500 min-h-[40px]">{plan.description}</p>
            </div>

            <div className="mb-8 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-slate-900">
                    ${price}
                </span>
                <span className="text-slate-500 font-medium">
                    /{isYearly ? 'year' : 'month'}
                </span>
            </div>

            <button
                onClick={() => onAction(plan.id)}
                className={cn(
                    "w-full py-3.5 rounded-xl font-bold transition-all mb-3 flex items-center justify-center gap-2",
                    plan.buttonVariant === 'primary'
                        ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/40"
                        : plan.buttonVariant === 'outline'
                            ? "border-2 border-slate-200 hover:border-slate-900 hover:text-slate-900 text-slate-600 bg-transparent"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
            >
                {plan.buttonText}
            </button>

            {isComingSoon && (
                <p className="text-center text-[11px] text-slate-400 mb-5">
                    247 people already on the waitlist
                </p>
            )}

            <div className="space-y-4 flex-1">
                {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                        {feature.included ? (
                            <div className="mt-0.5 min-w-[18px] h-[18px] rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <Check size={12} strokeWidth={3} />
                            </div>
                        ) : (
                            <div className="mt-0.5 min-w-[18px] h-[18px] rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                <X size={12} strokeWidth={3} />
                            </div>
                        )}
                        <span className={cn(
                            feature.included ? "text-slate-600" : "text-slate-400 line-through decoration-slate-300"
                        )}>
                            {feature.text}
                        </span>
                    </div>
                ))}
            </div>

            {'note' in plan && (
                <div className="mt-6 pt-6 border-t border-slate-100 text-xs font-medium text-amber-600 bg-amber-50/50 p-3 rounded-lg">
                    {(plan as any).note}
                </div>
            )}
        </motion.div>
    )
}
