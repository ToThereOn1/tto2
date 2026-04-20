'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface AuroraOrbProps {
    size?: number
    className?: string
}

export function AuroraOrb({ size = 420, className = '' }: AuroraOrbProps) {
    const ref = useRef<HTMLDivElement>(null)

    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const springX = useSpring(mouseX, { stiffness: 22, damping: 20 })
    const springY = useSpring(mouseY, { stiffness: 22, damping: 20 })
    const rotateX = useTransform(springY, [-150, 150], [10, -10])
    const rotateY = useTransform(springX, [-150, 150], [-10, 10])

    return (
        <div
            ref={ref}
            className={`relative select-none ${className}`}
            style={{ width: size, height: size }}
            onMouseMove={(e) => {
                const rect = ref.current?.getBoundingClientRect()
                if (!rect) return
                mouseX.set(e.clientX - rect.left - rect.width / 2)
                mouseY.set(e.clientY - rect.top - rect.height / 2)
            }}
            onMouseLeave={() => {
                mouseX.set(0)
                mouseY.set(0)
            }}
        >
            {/* Atmospheric outer glow — breathes */}
            <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                    inset: '-28%',
                    background:
                        'radial-gradient(circle, rgba(56,189,248,0.22) 0%, rgba(14,165,233,0.09) 45%, transparent 70%)',
                    filter: 'blur(40px)',
                }}
                animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Warm sunrise glow — subtle warm undertone */}
            <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                    inset: '-15%',
                    bottom: '-5%',
                    background:
                        'radial-gradient(circle at 60% 80%, rgba(254,243,199,0.18) 0%, transparent 60%)',
                    filter: 'blur(30px)',
                }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />

            {/* 3D rotating sphere wrapper */}
            <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: 'preserve-3d',
                    perspective: 800,
                }}
            >
                {/* Main sphere — pearl-white Mediterranean azure */}
                <div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{
                        background: `radial-gradient(
                            circle at 36% 30%,
                            rgba(255,255,255,0.97) 0%,
                            rgba(224,242,254,0.86) 18%,
                            rgba(186,230,253,0.70) 38%,
                            rgba(125,211,252,0.54) 56%,
                            rgba(14,165,233,0.45) 74%,
                            rgba(2,132,199,0.58) 100%
                        )`,
                        boxShadow: `
                            inset 0 0 80px rgba(255,255,255,0.30),
                            inset -28px -28px 72px rgba(2,132,199,0.22),
                            0 0 110px rgba(56,189,248,0.18),
                            0 28px 75px rgba(14,165,233,0.16)
                        `,
                    }}
                >
                    {/* Aurora swirl 1 — drifts slowly */}
                    <div
                        className="absolute inset-0 rounded-full animate-blob"
                        style={{
                            background:
                                'radial-gradient(ellipse at 45% 65%, rgba(186,230,253,0.65) 0%, transparent 55%)',
                            mixBlendMode: 'screen',
                        }}
                    />
                    {/* Aurora swirl 2 */}
                    <div
                        className="absolute inset-0 rounded-full animate-blob animation-delay-2000"
                        style={{
                            background:
                                'radial-gradient(ellipse at 70% 28%, rgba(224,242,254,0.72) 0%, transparent 48%)',
                            mixBlendMode: 'screen',
                        }}
                    />
                    {/* Warm golden hint */}
                    <div
                        className="absolute inset-0 rounded-full animate-blob animation-delay-4000"
                        style={{
                            background:
                                'radial-gradient(ellipse at 22% 78%, rgba(254,243,199,0.26) 0%, transparent 42%)',
                            mixBlendMode: 'screen',
                        }}
                    />

                    {/* Primary pearl highlight — top-left specular */}
                    <div
                        className="absolute"
                        style={{
                            top: '10%',
                            left: '15%',
                            width: '42%',
                            height: '30%',
                            background:
                                'radial-gradient(ellipse, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.55) 35%, transparent 70%)',
                            filter: 'blur(14px)',
                            borderRadius: '50%',
                            transform: 'rotate(-18deg)',
                        }}
                    />
                    {/* Secondary glint — bottom-right */}
                    <div
                        className="absolute"
                        style={{
                            bottom: '16%',
                            right: '13%',
                            width: '18%',
                            height: '13%',
                            background:
                                'radial-gradient(ellipse, rgba(255,255,255,0.50) 0%, transparent 70%)',
                            filter: 'blur(5px)',
                            borderRadius: '50%',
                        }}
                    />
                </div>

                {/* Rim ring — faint azure edge */}
                <div
                    className="absolute inset-0 rounded-full"
                    style={{
                        border: '1.5px solid rgba(56,189,248,0.22)',
                        boxShadow: '0 0 20px rgba(14,165,233,0.10)',
                    }}
                />
            </motion.div>
        </div>
    )
}
