'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface PhaseTransitionProps {
    phaseName: string
    phaseIntro: string
    petName: string
    onContinue: () => void
}

interface PhaseConfig {
    bgFrom: string
    bgTo: string
    accentColor: string
    particleType: 'dust' | 'firefly' | 'circles' | 'petals' | 'rings'
}

const PHASE_CONFIGS: Record<string, PhaseConfig> = {
    'THE DOOR':        { bgFrom: '#0F1729', bgTo: '#1E293B', accentColor: '#F59E0B', particleType: 'dust' },
    'THE LIVING ROOM': { bgFrom: '#2D1B0E', bgTo: '#3D2314', accentColor: '#FBBF24', particleType: 'firefly' },
    'THE QUIET ROOM':  { bgFrom: '#0D2626', bgTo: '#1A3D3D', accentColor: '#6EE7B7', particleType: 'circles' },
    'THE LETTER':      { bgFrom: '#1E1B4B', bgTo: '#2D2A6E', accentColor: '#A5B4FC', particleType: 'petals' },
    'THE LIGHT':       { bgFrom: '#2D1B1B', bgTo: '#3D2626', accentColor: '#FDE68A', particleType: 'rings' },
}

const DEFAULT_CONFIG: PhaseConfig = PHASE_CONFIGS['THE DOOR']

// Seeded pseudo-random so SSR and client produce the same values
function seededRand(seed: number): number {
    const x = Math.sin(seed + 1) * 10000
    return x - Math.floor(x)
}

function Particles({ type, color }: { type: PhaseConfig['particleType']; color: string }) {
    // Rings: centered expanding circles
    if (type === 'rings') {
        return (
            <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
                {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div key={i} className="absolute rounded-full border"
                        style={{ borderColor: color, width: 60, height: 60, opacity: 0 }}
                        animate={{ opacity: [0, 0.45, 0], scale: [0.5, 4.5] }}
                        transition={{ duration: 4, delay: i * 0.9, repeat: Infinity, ease: 'easeOut' }}
                    />
                ))}
            </div>
        )
    }

    // All other types: generate 12–18 positioned particles
    const count = type === 'petals' ? 12 : type === 'circles' ? 10 : 16
    const particles = Array.from({ length: count }, (_, i) => ({
        x: seededRand(i * 7)  * 90 + 5,
        y: seededRand(i * 13) * 90 + 5,
        size: seededRand(i * 3) * 4 + 2,
        dur: seededRand(i * 11) * 6 + 5,
        del: seededRand(i * 17) * 4,
        dx: (seededRand(i * 5) - 0.5) * 80,
        dy: (seededRand(i * 19) - 0.5) * 60,
        rot: seededRand(i * 23) * 360,
    }))

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p, i) => {
                if (type === 'dust') return (
                    <motion.div key={i} className="absolute rounded-full"
                        style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, backgroundColor: color, opacity: 0 }}
                        animate={{ opacity: [0, 0.6, 0.3, 0.6, 0], x: [0, p.dx], y: [0, p.dy] }}
                        transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )
                if (type === 'firefly') return (
                    <motion.div key={i} className="absolute rounded-full"
                        style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, backgroundColor: color, boxShadow: `0 0 6px 2px ${color}`, opacity: 0 }}
                        animate={{ opacity: [0, 0.8, 0, 0.8, 0], x: [0, p.dx, 0], y: [0, p.dy, 0] }}
                        transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: 'easeInOut' }}
                    />
                )
                if (type === 'circles') return (
                    <motion.div key={i} className="absolute rounded-full border"
                        style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size * 2, height: p.size * 2, borderColor: color, opacity: 0 }}
                        animate={{ opacity: [0, 0.5, 0], y: [0, -p.y * 3], scale: [0.8, 1.4] }}
                        transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: 'easeOut' }}
                    />
                )
                // petals
                return (
                    <motion.div key={i} className="absolute"
                        style={{ left: `${p.x}%`, top: '-3%', width: p.size, height: p.size * 1.6, backgroundColor: color, borderRadius: '50% 50% 50% 0', opacity: 0, rotate: p.rot }}
                        animate={{ opacity: [0, 0.55, 0.35, 0], y: ['0%', '110vh'], x: [0, p.dx], rotate: [p.rot, p.rot + 180] }}
                        transition={{ duration: p.dur, delay: p.del, repeat: Infinity, ease: 'easeIn' }}
                    />
                )
            })}
        </div>
    )
}

function TypewriterText({ text, startDelay, stagger, onComplete }: {
    text: string; startDelay: number; stagger: number; onComplete: () => void
}) {
    const letters = Array.from(text)
    useEffect(() => {
        const ms = (startDelay + letters.length * stagger + 0.3) * 1000
        const t = setTimeout(onComplete, ms)
        return () => clearTimeout(t)
    }, [onComplete, startDelay, stagger, letters.length])

    return (
        <span aria-label={text}>
            {letters.map((char, i) => (
                <motion.span key={i}
                    style={{ display: 'inline-block', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: startDelay + i * stagger, duration: 0.25, ease: 'easeOut' }}
                >
                    {char}
                </motion.span>
            ))}
        </span>
    )
}

export function PhaseTransition({ phaseName, phaseIntro, petName, onContinue }: PhaseTransitionProps) {
    const shouldReduceMotion = useReducedMotion()
    const config = PHASE_CONFIGS[phaseName] ?? DEFAULT_CONFIG
    const renderedIntro = phaseIntro
        .replace(/\[Name\]/g, petName)
        .replace(/\[이름\]/g, petName)
    const [typewriterDone, setTypewriterDone] = useState(shouldReduceMotion ?? false)
    const [showButton, setShowButton] = useState(shouldReduceMotion ?? false)

    useEffect(() => {
        if (shouldReduceMotion) return
        const t = setTimeout(() => setShowButton(true), 3500)
        return () => clearTimeout(t)
    }, [shouldReduceMotion])

    const bgStyle = { background: `linear-gradient(135deg, ${config.bgFrom}, ${config.bgTo})` }

    if (shouldReduceMotion) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center" style={bgStyle}>
                <div className="flex flex-col items-center text-center px-6 max-w-2xl mx-auto">
                    <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: config.accentColor }}>Next Phase</p>
                    <h1 className="font-serif text-5xl font-semibold text-white mb-6">{phaseName}</h1>
                    <div className="w-16 h-px mb-8" style={{ backgroundColor: config.accentColor }} />
                    <p className="text-lg text-white/70 font-light leading-relaxed max-w-lg mb-12">{renderedIntro}</p>
                    <button onClick={onContinue}
                        className="px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:opacity-80"
                        style={{ backgroundColor: config.accentColor, color: '#0F1729' }}>
                        Continue →
                    </button>
                </div>
            </div>
        )
    }

    return (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center" style={bgStyle}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
            <Particles type={config.particleType} color={config.accentColor} />
            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl mx-auto">
                <motion.p className="text-xs font-bold uppercase tracking-[0.3em] mb-8" style={{ color: config.accentColor }}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
                    Next Phase
                </motion.p>
                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold text-white mb-6 min-h-[1.2em]">
                    <TypewriterText text={phaseName} startDelay={0.3} stagger={0.06} onComplete={() => setTypewriterDone(true)} />
                </h1>
                <motion.div className="w-16 h-px mb-8" style={{ backgroundColor: config.accentColor }}
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={typewriterDone ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
                    transition={{ duration: 0.5 }} />
                <motion.p className="text-lg md:text-xl text-white/70 font-light leading-relaxed max-w-lg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={typewriterDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                    transition={{ duration: 0.7, delay: 0.15 }}>
                    {renderedIntro}
                </motion.p>
                {showButton && (
                    <motion.button onClick={onContinue}
                        className="mt-14 px-10 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:opacity-80 active:scale-95"
                        style={{ backgroundColor: config.accentColor, color: '#0F1729', boxShadow: `0 8px 32px ${config.accentColor}55` }}
                        initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                        Continue →
                    </motion.button>
                )}
            </div>
        </motion.div>
    )
}
