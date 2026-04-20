'use client'

import { useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { Variants, Easing } from 'framer-motion'

interface SurveyIntroScreenProps {
  petName: string
  onComplete: () => void
}

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
  driftX: number
  driftY: number
}

const PARTICLES: Particle[] = [
  { id: 0,  x: 8,  y: 15, size: 3,   duration: 9,  delay: 0,    driftX: 18,  driftY: -22 },
  { id: 1,  x: 82, y: 8,  size: 5,   duration: 11, delay: 1.2,  driftX: -14, driftY: 20  },
  { id: 2,  x: 55, y: 78, size: 2,   duration: 8,  delay: 0.5,  driftX: 22,  driftY: -15 },
  { id: 3,  x: 20, y: 60, size: 4,   duration: 13, delay: 2,    driftX: -20, driftY: -18 },
  { id: 4,  x: 90, y: 45, size: 2.5, duration: 7,  delay: 0.8,  driftX: -16, driftY: 24  },
  { id: 5,  x: 35, y: 25, size: 3.5, duration: 10, delay: 1.7,  driftX: 12,  driftY: 18  },
  { id: 6,  x: 70, y: 85, size: 2,   duration: 12, delay: 3,    driftX: -18, driftY: -20 },
  { id: 7,  x: 48, y: 5,  size: 4,   duration: 9,  delay: 0.3,  driftX: 20,  driftY: 16  },
  { id: 8,  x: 12, y: 90, size: 3,   duration: 14, delay: 2.5,  driftX: 16,  driftY: -12 },
  { id: 9,  x: 65, y: 55, size: 2,   duration: 8,  delay: 1,    driftX: -22, driftY: 14  },
]

const PHASE_NAMES = [
  'THE DOOR',
  'THE LIVING ROOM',
  'THE QUIET ROOM',
  'THE LETTER',
  'THE LIGHT',
]

export function SurveyIntroScreen({ petName, onComplete }: SurveyIntroScreenProps) {
  const shouldReduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  // Precompute letter array once
  const letters = petName.split('')

  const SPRING_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
  const EASE_OUT: Easing = 'easeOut'
  const EASE_IN: Easing = 'easeIn'

  // Name stagger: each letter appears with delay
  const nameContainerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.4,
      },
    },
    exit: {
      transition: { staggerChildren: 0.03, staggerDirection: -1 },
    },
  }

  const letterVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: SPRING_EASE },
    },
    exit: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : -10,
      transition: { duration: 0.25 },
    },
  }

  // Subtitle appears after name (~letters.length * 0.08 + 0.4 + 0.5)
  const subtitleDelay = shouldReduceMotion ? 0 : letters.length * 0.08 + 0.9
  const buttonDelay = shouldReduceMotion ? 0 : subtitleDelay + 0.8

  const subtitleVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: subtitleDelay, duration: 0.7, ease: EASE_OUT },
    },
    exit: { opacity: 0, transition: { duration: 0.2 } },
  }

  const buttonVariants: Variants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.85, y: shouldReduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { delay: buttonDelay, duration: 0.6, ease: SPRING_EASE },
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.25 } },
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
    exit: {
      opacity: 0,
      scale: 0.96,
      transition: { duration: 0.45, ease: EASE_IN },
    },
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        ref={containerRef}
        key="survey-intro"
        className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          background: 'linear-gradient(145deg, #0f0c29 0%, #1a1a4e 35%, #1e1b4b 60%, #0d1b3e 100%)',
        }}
      >
        {/* Floating particles */}
        {!shouldReduceMotion && PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: 'radial-gradient(circle, rgba(251,191,36,0.7) 0%, rgba(251,191,36,0.1) 100%)',
              boxShadow: `0 0 ${p.size * 3}px rgba(251,191,36,0.4)`,
            }}
            animate={{
              x: [0, p.driftX, 0],
              y: [0, p.driftY, 0],
              opacity: [0.3, 0.9, 0.3],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Ambient glow blobs */}
        <div
          className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-15%] w-[55%] h-[55%] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl mx-auto select-none">
          {/* Eyebrow label */}
          <motion.span
            className="block text-[10px] font-bold uppercase tracking-[0.4em] text-indigo-400/70 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: shouldReduceMotion ? 0 : 0.2, duration: 0.6 } }}
          >
            Deep Remembrance
          </motion.span>

          {/* Phase list — subtle */}
          <motion.div
            className="flex items-center gap-3 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: shouldReduceMotion ? 0 : 0.25, duration: 0.6 } }}
          >
            {PHASE_NAMES.map((name, i) => (
              <span key={name} className="flex items-center gap-3">
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500/60">{name}</span>
                {i < PHASE_NAMES.length - 1 && (
                  <span className="w-1 h-1 rounded-full bg-slate-600/50 inline-block" />
                )}
              </span>
            ))}
          </motion.div>

          {/* Pet name — letter by letter */}
          <motion.h1
            className="flex flex-wrap justify-center mb-3"
            variants={nameContainerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            aria-label={petName}
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {letters.map((letter, i) => (
              <motion.span
                key={i}
                variants={letterVariants}
                className="inline-block"
                style={{
                  fontSize: 'clamp(3rem, 8vw, 5.5rem)',
                  fontWeight: 300,
                  letterSpacing: '0.04em',
                  lineHeight: 1.1,
                  background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 40%, #FBBF24 70%, #FDE68A 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: 'none',
                  filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.3))',
                }}
              >
                {letter === ' ' ? '\u00A0' : letter}
              </motion.span>
            ))}
          </motion.h1>

          {/* Decorative line */}
          <motion.div
            className="w-20 h-px mb-8"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(251,191,36,0.5), transparent)',
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{
              scaleX: 1,
              opacity: 1,
              transition: { delay: shouldReduceMotion ? 0 : subtitleDelay - 0.2, duration: 0.6 },
            }}
          />

          {/* Subtitle */}
          <motion.p
            className="text-lg md:text-xl font-light text-slate-300/80 tracking-wide mb-14"
            variants={subtitleVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            A journey to remember{' '}
            <span style={{ color: '#FCD34D', fontStyle: 'italic' }}>{petName}</span>
          </motion.p>

          {/* CTA button */}
          <motion.button
            onClick={onComplete}
            className="group flex items-center gap-3 px-10 py-5 rounded-full font-bold uppercase tracking-[0.25em] text-sm transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              boxShadow: '0 20px 40px rgba(245,158,11,0.3), 0 0 0 1px rgba(245,158,11,0.2)',
              color: '#0f0c29',
            }}
            variants={buttonVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            whileHover={{ scale: 1.04, boxShadow: '0 24px 50px rgba(245,158,11,0.45)' }}
            whileTap={{ scale: 0.97 }}
          >
            Begin the Journey
            <span
              className="inline-block transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden
            >
              →
            </span>
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
