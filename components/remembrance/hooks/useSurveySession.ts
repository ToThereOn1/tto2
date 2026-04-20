'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

export interface UseSurveySessionOptions {
  petId: string
  initialResponses?: Record<string, any>
  responseId?: string
  currentIndexRef: React.MutableRefObject<number>
  progressRef: React.MutableRefObject<number>
}

export interface UseSurveySessionReturn {
  responses: Record<string, any>
  setResponses: React.Dispatch<React.SetStateAction<Record<string, any>>>
  responseId: string | null
  setResponseId: React.Dispatch<React.SetStateAction<string | null>>
  otherTexts: Record<string, string>
  setOtherTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>
  saveProgress: () => Promise<void>
  isSaving: boolean
  saveStatus: 'idle' | 'saving' | 'saved'
  initializeSession: (totalQuestions: number) => Promise<void>
  isInitialized: boolean
}

// ============================================================
// Hook
// ============================================================

export function useSurveySession({
  petId,
  initialResponses = {},
  responseId: existingResponseId,
  currentIndexRef,
  progressRef,
}: UseSurveySessionOptions): UseSurveySessionReturn {
  const supabase = createClient()

  const [responses, setResponses] = useState<Record<string, any>>(initialResponses)
  const [responseId, setResponseId] = useState<string | null>(existingResponseId || null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [isInitialized, setIsInitialized] = useState(!!existingResponseId)

  // SESSION RECOVERY BUG FIX: restore otherTexts from initialResponses
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>(() => {
    const extracted: Record<string, string> = {}
    for (const [key, val] of Object.entries(initialResponses)) {
      if (val && typeof val === 'object' && typeof val.other_text === 'string') {
        extracted[key] = val.other_text
      }
    }
    return extracted
  })

  // STALE CLOSURE BUG FIX: use refs so the interval callback always reads fresh values
  const responsesRef = useRef(responses)
  const responseIdRef = useRef(responseId)

  useEffect(() => { responsesRef.current = responses }, [responses])
  useEffect(() => { responseIdRef.current = responseId }, [responseId])

  const saveProgress = useCallback(async () => {
    const rid = responseIdRef.current
    if (!rid) return

    setSaveStatus('saving')
    try {
      const { error } = await supabase
        .from('deep_remembrance_responses')
        .update({
          responses: responsesRef.current,
          current_question_index: currentIndexRef.current,
          completion_percentage: progressRef.current,
          last_saved_at: new Date().toISOString(),
        })
        .eq('id', rid)

      if (error) throw error
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Auto-save failed:', err)
      setSaveStatus('idle')
    }
  }, [supabase, currentIndexRef, progressRef])

  // FIXED: stable interval — does NOT re-create on every state change
  // The interval callback reads from refs, not closed-over state
  useEffect(() => {
    const interval = setInterval(() => {
      if (responseIdRef.current && Object.keys(responsesRef.current).length > 0) {
        saveProgress()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [saveProgress]) // saveProgress is stable (useCallback with no volatile deps)

  const initializeSession = useCallback(async (totalQuestions: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check for existing session
      const { data: existing } = await supabase
        .from('deep_remembrance_responses')
        .select('*')
        .eq('pet_id', petId)
        .single()

      if (existing) {
        setResponseId(existing.id)
        const restoredResponses = existing.responses || {}
        setResponses(restoredResponses)
        // Restore otherTexts from recovered session
        const extracted: Record<string, string> = {}
        for (const [key, val] of Object.entries(restoredResponses)) {
          if (val && typeof val === 'object' && typeof (val as any).other_text === 'string') {
            extracted[key] = (val as any).other_text
          }
        }
        setOtherTexts(extracted)
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('deep_remembrance_responses')
          .insert({
            pet_id: petId,
            user_id: user.id,
            responses: {},
            current_question_index: 0,
            total_questions: totalQuestions,
            survey_version: 2,
          })
          .select()
          .single()

        if (error) throw error
        setResponseId(data.id)
      }
      setIsInitialized(true)
    } catch (err) {
      console.error('Failed to initialize session:', err)
      toast.error('Failed to start survey. Please try again.')
    }
  }, [petId, supabase])

  return {
    responses,
    setResponses,
    responseId,
    setResponseId,
    otherTexts,
    setOtherTexts,
    saveProgress,
    isSaving: saveStatus === 'saving',
    saveStatus,
    initializeSession,
    isInitialized,
  }
}
