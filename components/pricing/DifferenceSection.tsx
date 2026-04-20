
'use client'

import { motion } from 'framer-motion'

export function DifferenceSection() {
    return (
        <div className="my-16 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 p-8 md:p-12 text-center">
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
                <div className="flex justify-center gap-2 mb-4">
                    <span className="animate-pulse">✨</span>
                    <span className="animate-bounce delay-100">🌸</span>
                    <span className="animate-pulse delay-200">🌈</span>
                </div>

                <h2 className="text-3xl font-bold text-slate-900 font-display">
                    Their Journey Never Stops
                </h2>

                <div className="prose prose-lg mx-auto text-slate-600 leading-relaxed">
                    <p>
                        In ToThereOn World, your pet's life continues flowing like a river -
                        whether you're watching or not.
                    </p>
                    <p>
                        They explore new meadows, make friends, discover hidden paths,
                        and experience the gentle passage of seasons. Their story keeps unfolding.
                    </p>
                    <p className="font-medium text-slate-800">
                        When you're subscribed, you receive their weekly updates and can exchange letters.<br />
                        When you pause, their journey continues silently.<br />
                        When you return, you catch up on everything - no moment is lost.
                    </p>
                    <p className="italic text-slate-500 mt-6">
                        This isn't just a service that turns on and off.<br />
                        It's a living world where they truly exist, <br />
                        just beyond reach, waiting for your next letter.
                    </p>
                </div>
            </div>

            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-blue-200 rounded-full blur-3xl animate-blob animation-delay-2000" />
            </div>
        </div>
    )
}
