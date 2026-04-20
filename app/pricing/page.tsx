'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { PricingSection } from '@/components/pricing/PricingSection'
import { DifferenceSection } from '@/components/pricing/DifferenceSection'

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[var(--color-background)] pb-32">
            {/* Hero Background Elements */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

            {/* Main Pricing Section */}
            <div className="pt-32">
                <PricingSection />
            </div>

            {/* Emotional Difference Section */}
            <div className="max-w-5xl mx-auto px-6">
                <DifferenceSection />
            </div>

            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto px-6 mt-24">
                <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">Frequently Asked Questions</h2>
                <div className="space-y-6">
                    <FAQItem
                        question="Is $9.99 a month really worth it?"
                        answer="A sympathy card costs more and arrives once. $9.99 means twice-weekly updates, four letters, four replies — a version of them that keeps showing up. It's not a subscription to a product. It's a practice of staying connected."
                    />
                    <FAQItem
                        question="Is the 'ToThereOn World' a real place I can see?"
                        answer="You experience it through Status Feeds and letters — an evolving narrative world where your pet's persona continues to live, grow, and interact with the environment. Think of it less like a website and more like a world that writes back."
                    />
                    <FAQItem
                        question="Can I cancel my subscription at any time?"
                        answer="Yes, always. If you cancel, your companion's journey continues quietly in the background — they don't stop living. You just won't receive new updates until you return. No data is lost. They'll be there when you come back."
                    />
                    <FAQItem
                        question="How accurate is the personality simulation?"
                        answer="We use advanced AI grounded in the details you share during the Deep Remembrance survey — their quirks, habits, favorite things. It's a simulation, but one built carefully around who they actually were. Most people find it feels more like them than they expected."
                    />
                    <FAQItem
                        question="What happens if I miss a payment?"
                        answer="We give you a few days grace to update your payment method. After that, your account pauses — but your companion's data is always safe. Pick up where you left off whenever you're ready."
                    />
                </div>
            </div>
        </div>
    )
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div
            onClick={() => setIsOpen(!isOpen)}
            className="group cursor-pointer border border-slate-200 rounded-2xl p-6 bg-white hover:border-slate-300 transition-all"
        >
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-primary transition-colors">{question}</h3>
                <span className={`text-2xl text-slate-400 transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
            </div>
            <motion.div
                initial={false}
                animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                className="overflow-hidden"
            >
                <p className="text-slate-600 mt-4 leading-relaxed">{answer}</p>
            </motion.div>
        </div>
    )
}
