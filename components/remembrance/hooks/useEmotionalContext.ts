'use client'

import { useMemo } from 'react'
import type { SurveyQuestion } from './useSurveyNavigation'

// ============================================================
// Types
// ============================================================

export interface UseEmotionalContextOptions {
  currentIndex: number
  questions: SurveyQuestion[]
}

export interface UseEmotionalContextReturn {
  isPhase4: boolean
  needsEmotionalBreather: boolean
  currentPhaseIntensity: number
  isClimax: boolean
}

// Phase intensity map (1-5 scale)
const PHASE_INTENSITY: Record<string, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 5,
  P5: 4,
}

// ============================================================
// Hook
// ============================================================

export function useEmotionalContext({
  currentIndex,
  questions,
}: UseEmotionalContextOptions): UseEmotionalContextReturn {
  return useMemo(() => {
    const currentQuestion = questions[currentIndex]
    const phase = (currentQuestion as any)?.phase || (currentQuestion as any)?.category || ''

    const isPhase4 = phase === 'P4'

    // Q17 is index 16 (0-based); transitioning to it signals the climax
    const isClimax = currentIndex === 16

    // Emotional breather needed when transitioning into Q17 (index 16)
    const needsEmotionalBreather = isClimax

    const currentPhaseIntensity = PHASE_INTENSITY[phase] ?? 2

    return {
      isPhase4,
      needsEmotionalBreather,
      currentPhaseIntensity,
      isClimax,
    }
  }, [currentIndex, questions])
}
