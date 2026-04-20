'use client'

import { motion, useReducedMotion } from 'framer-motion'

interface SurveyProgressProps {
  currentPhase: number  // 0-indexed (0-4)
  totalPhases: number
}

const PHASE_LABELS = [
  'THE DOOR',
  'THE LIVING ROOM',
  'THE QUIET ROOM',
  'THE LETTER',
  'THE LIGHT',
]

type OrbState = 'completed' | 'current' | 'future'

function getOrbState(orbIndex: number, currentPhase: number): OrbState {
  if (orbIndex < currentPhase) return 'completed'
  if (orbIndex === currentPhase) return 'current'
  return 'future'
}

interface OrbProps {
  index: number
  state: OrbState
  reducedMotion: boolean
}

function PhaseOrb({ index, state, reducedMotion }: OrbProps) {
  const isCompleted = state === 'completed'
  const isCurrent = state === 'current'

  const orbColor =
    isCompleted ? '#F59E0B' :
    isCurrent   ? '#38BDF8' :
                  '#64748B'

  const orbOpacity = state === 'future' ? 0.35 : 1

  return (
    <div className="relative flex items-center justify-center" style={{ width: 32, height: 32 }}>
      {/* Pulse ring for current orb */}
      {isCurrent && !reducedMotion && (
        <motion.span
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 32,
            height: 32,
            border: `2px solid ${orbColor}`,
            opacity: 0,
          }}
          animate={{ scale: [1, 1.9], opacity: [0.7, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* Orb body */}
      <div
        className="relative z-10 flex items-center justify-center rounded-full text-[10px] font-bold transition-all duration-500"
        style={{
          width: 28,
          height: 28,
          backgroundColor: orbColor,
          opacity: orbOpacity,
          boxShadow: isCompleted
            ? `0 0 10px rgba(245,158,11,0.45), 0 0 4px rgba(245,158,11,0.25)`
            : isCurrent
            ? `0 0 12px rgba(56,189,248,0.55), 0 0 4px rgba(56,189,248,0.3)`
            : 'none',
          color: isCompleted ? '#451a03' : isCurrent ? '#0c4a6e' : '#cbd5e1',
        }}
      >
        {isCompleted ? (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <path
              d="M2 5.5L4.5 8L9 3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
    </div>
  )
}

export function SurveyProgress({ currentPhase, totalPhases }: SurveyProgressProps) {
  const shouldReduceMotion = useReducedMotion() ?? false
  const clampedPhase = Math.max(0, Math.min(currentPhase, totalPhases - 1))
  const count = Math.min(totalPhases, PHASE_LABELS.length)

  return (
    <div
      className="flex items-center gap-0"
      role="progressbar"
      aria-valuenow={clampedPhase + 1}
      aria-valuemin={1}
      aria-valuemax={totalPhases}
      aria-label={`Journey phase ${clampedPhase + 1} of ${totalPhases}: ${PHASE_LABELS[clampedPhase] ?? ''}`}
    >
      {Array.from({ length: count }).map((_, i) => {
        const state = getOrbState(i, clampedPhase)
        const isLast = i === count - 1

        return (
          <div key={i} className="flex items-center">
            {/* Tooltip wrapper */}
            <div className="relative group flex items-center justify-center">
              <PhaseOrb index={i} state={state} reducedMotion={shouldReduceMotion} />

              {/* Phase name tooltip on hover */}
              <div
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-slate-900/90 text-[9px] font-bold uppercase tracking-widest whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ color: state === 'completed' ? '#F59E0B' : state === 'current' ? '#38BDF8' : '#94a3b8' }}
              >
                {PHASE_LABELS[i]}
              </div>
            </div>

            {/* Connector line between orbs */}
            {!isLast && (
              <div
                className="h-px transition-all duration-500"
                style={{
                  width: 28,
                  backgroundColor: state === 'completed' ? '#F59E0B' : '#334155',
                  opacity: state === 'completed' ? 0.7 : 0.3,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
