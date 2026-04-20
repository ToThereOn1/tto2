'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { PHASE_LABELS } from '@/lib/survey-questions'

// ============================================================
// Types
// ============================================================

export interface SurveyQuestion {
  id: string
  question_key: string
  question_en?: string
  question_kr?: string
  question_text_en?: string
  question_text_kr?: string
  type?: string
  input_type?: 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice'
  is_required?: boolean
  is_active?: boolean
  order_index: number
  choices_en?: string[] | null
  options?: { label: string; value: string; score?: number; dimension?: string; requires_input?: boolean }[] | string
  allow_multiple?: boolean
  has_other_option?: boolean
  placeholder_en?: string | null
  help_text_en?: string | null
  help_text_kr?: string | null
  category?: string
  phase?: string
}

export interface UseSurveyNavigationOptions {
  questions: SurveyQuestion[]
  responses: Record<string, any>
  petId: string
  responseId: string | null
  onComplete: () => void
  // Refs owned by the orchestrator so useSurveySession reads the same values
  currentIndexRef: React.MutableRefObject<number>
  progressRef: React.MutableRefObject<number>
}

export interface UseSurveyNavigationReturn {
  currentIndex: number
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>
  currentIndexRef: React.MutableRefObject<number>
  currentQuestion: SurveyQuestion | null
  currentPhase: string
  progress: number
  progressRef: React.MutableRefObject<number>
  isTransitioning: boolean
  showPhaseTransition: boolean
  pendingNextIndex: number | null
  isLastQuestion: boolean
  isFirstQuestion: boolean
  totalQuestions: number
  handleNext: (saveProgress: () => Promise<void>) => void
  handleBack: () => void
  handleSubmit: (saveProgress: () => Promise<void>) => Promise<void>
  handlePhaseTransitionContinue: () => void
  hasAnswer: (questionId: string) => boolean
  error: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>
  isSubmitting: boolean
}

// ============================================================
// Hook
// ============================================================

export function useSurveyNavigation({
  questions,
  responses,
  petId,
  responseId,
  onComplete,
  currentIndexRef,
  progressRef,
}: UseSurveyNavigationOptions): UseSurveyNavigationReturn {
  const router = useRouter()
  const supabase = createClient()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showPhaseTransition, setShowPhaseTransition] = useState(false)
  const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalQuestions = questions.length
  const currentQuestion = questions[currentIndex] || null
  const progress = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0
  const isLastQuestion = currentIndex === totalQuestions - 1
  const isFirstQuestion = currentIndex === 0
  const currentPhase = (currentQuestion as any)?.phase || (currentQuestion as any)?.category || ''

  // Keep refs in sync with derived values
  currentIndexRef.current = currentIndex
  progressRef.current = progress

  const hasAnswer = useCallback((qKey: string): boolean => {
    const resp = responses[qKey]
    if (!resp) return false
    if (typeof resp === 'string') return resp.trim().length > 0
    if (resp.answer_type === 'text') return !!resp.text_answer?.trim()
    if (resp.answer_type === 'single_choice') return !!resp.selected_choice
    if (resp.answer_type === 'multiple_choice') return (resp.selected_choices?.length || 0) > 0
    if (resp.answer_type === 'other') return !!resp.other_text?.trim()
    return true
  }, [responses])

  const handleNext = useCallback((saveProgress: () => Promise<void>) => {
    if (!currentQuestion) return
    const isRequired = currentQuestion.is_required !== false
    if (isRequired && !hasAnswer(currentQuestion.question_key)) {
      setError('Please answer this question.')
      return
    }

    if (!isLastQuestion) {
      const nextIndex = currentIndex + 1
      const nextQ = questions[nextIndex]
      const curPhase = (currentQuestion as any).phase || (currentQuestion as any).category
      const nextPhase = (nextQ as any)?.phase || (nextQ as any)?.category

      // Show phase transition if entering a new phase
      if (nextPhase && curPhase && nextPhase !== curPhase && PHASE_LABELS[nextPhase]) {
        setPendingNextIndex(nextIndex)
        setShowPhaseTransition(true)
        setError(null)
        return
      }

      setCurrentIndex(nextIndex)
      setError(null)
    }
  }, [currentQuestion, currentIndex, questions, isLastQuestion, hasAnswer])

  const handleBack = useCallback(() => {
    if (!isFirstQuestion) {
      setCurrentIndex(prev => prev - 1)
      setError(null)
    }
  }, [isFirstQuestion])

  const handlePhaseTransitionContinue = useCallback(() => {
    if (pendingNextIndex !== null) {
      setCurrentIndex(pendingNextIndex)
      setPendingNextIndex(null)
    }
    setShowPhaseTransition(false)
  }, [pendingNextIndex])

  const handleSubmit = useCallback(async (saveProgress: () => Promise<void>) => {
    if (currentQuestion) {
      const isRequired = currentQuestion.is_required !== false
      if (isRequired && !hasAnswer(currentQuestion.question_key)) {
        setError('Please answer this question.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      let activeId = responseId

      // Safety net: self-healing if responseId is invalid/missing
      if (!activeId || activeId === 'null' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeId)) {
        console.warn('[Session] Recovery initiated')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User authentication lost. Please log in again.')

        const { data: existing } = await supabase
          .from('deep_remembrance_responses')
          .select('id')
          .eq('pet_id', petId)
          .eq('user_id', user.id)
          .single()

        if (existing?.id) {
          activeId = existing.id
        } else {
          const { data: newSession, error: createError } = await supabase
            .from('deep_remembrance_responses')
            .insert({
              pet_id: petId,
              user_id: user.id,
              responses,
              current_question_index: totalQuestions,
              completion_percentage: 100,
              created_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .select('id')
            .single()

          if (createError) throw new Error('Failed to save session data')
          activeId = newSession.id
        }
      }

      // Mark as completed
      const { error: updateError } = await supabase
        .from('deep_remembrance_responses')
        .update({
          responses,
          current_question_index: totalQuestions,
          completion_percentage: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('id', activeId)

      if (updateError) {
        throw new Error('Failed to save responses')
      }

      // Update pet as persona ready
      const { error: petError } = await supabase
        .from('pets')
        .update({ persona_generated: true })
        .eq('id', petId)

      if (petError) {
        console.warn('Pet status update failed but proceeding...')
      }

      // Trigger Deep Remembrance Completion (background)
      toast.promise(
        fetch('/api/deep-remembrance/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ petId, responseId: activeId }),
        }).then(res => {
          if (!res.ok) throw new Error('Completion trigger failed')
          return res.json()
        }),
        {
          loading: 'Saving your memories...',
          success: 'Memories safely stored! The Soul Archive is processing...',
          error: 'Error saving memories. Please try again.',
        }
      )

      toast.info('Transitioning to completion page...', { duration: 2000 })
      onComplete()
    } catch (err: any) {
      console.error('Submit Critical Error:', err)
      setError(`Failed to submit: ${err.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [currentQuestion, hasAnswer, responseId, responses, petId, totalQuestions, supabase, onComplete])

  return {
    currentIndex,
    setCurrentIndex,
    currentIndexRef,
    currentQuestion,
    currentPhase,
    progress,
    progressRef,
    isTransitioning: false,
    showPhaseTransition,
    pendingNextIndex,
    isLastQuestion,
    isFirstQuestion,
    totalQuestions,
    handleNext,
    handleBack,
    handleSubmit,
    handlePhaseTransitionContinue,
    hasAnswer,
    error,
    setError,
    isSubmitting,
  }
}
