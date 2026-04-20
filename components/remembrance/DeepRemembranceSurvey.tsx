'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Sparkles, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PhaseTransition } from '@/components/remembrance/PhaseTransition'
import { PHASE_LABELS } from '@/lib/survey-questions'
import { useSurveySession } from './hooks/useSurveySession'
import { useSurveyNavigation } from './hooks/useSurveyNavigation'
import { useEmotionalContext } from './hooks/useEmotionalContext'
import type { SurveyQuestion } from './hooks/useSurveyNavigation'
import { SurveyBody, getInputType, parseOptions, isMultipleChoiceQuestion } from './SurveyBody'
import type { ChoiceOption } from './SurveyBody'
import { EmotionalBreather } from './EmotionalBreather'
import type { BreatherType } from './EmotionalBreather'
import { SurveyIntroScreen } from './SurveyIntroScreen'
import { SurveyProgress } from './SurveyProgress'

interface DeepRemembranceSurveyProps {
    petId: string
    petName: string
    initialResponses?: Record<string, any>
    initialIndex?: number
    responseId?: string
}

export function DeepRemembranceSurvey({
    petId,
    petName,
    initialResponses = {},
    responseId: existingResponseId,
}: DeepRemembranceSurveyProps) {
    const router = useRouter()
    const supabase = createClient()

    const [questions, setQuestions] = useState<SurveyQuestion[]>([])
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
    const [showIntro, setShowIntro] = useState(true)
    const [breather, setBreather] = useState<{ type: BreatherType } | null>(null)
    const breatherShownRef = useRef(new Set<number>())
    const currentIndexRef = useRef(0)
    const progressRef = useRef(0)

    const session = useSurveySession({ petId, initialResponses, responseId: existingResponseId, currentIndexRef, progressRef })
    const nav = useSurveyNavigation({ questions, responses: session.responses, petId, responseId: session.responseId, onComplete: () => router.push(`/dashboard/pets/${petId}/remembrance/complete`), currentIndexRef, progressRef })
    useEmotionalContext({ currentIndex: nav.currentIndex, questions })

    // EmotionalBreather: show before Q17 (index 16) and after Q18 (index 18)
    useEffect(() => {
        const idx = nav.currentIndex
        if ((idx === 16 || idx === 18) && !breatherShownRef.current.has(idx)) {
            breatherShownRef.current.add(idx)
            setBreather({ type: idx === 16 ? 'climax' : 'landing' })
        }
    }, [nav.currentIndex])

    useEffect(() => {
        const fetchQuestions = async () => {
            const { data, error } = await supabase.from('survey_questions').select('*').eq('is_active', true).eq('version', 2).order('order_index')
            if (error) { console.error('Failed to fetch survey questions:', error); toast.error('Failed to load survey') }
            else setQuestions(data || [])
            setIsLoadingQuestions(false)
        }
        fetchQuestions()
    }, [])

    useEffect(() => {
        if (!session.isInitialized && questions.length > 0) session.initializeSession(questions.length)
    }, [questions.length])
    useEffect(() => {
        if (!isLoadingQuestions && questions.length > 0 && nav.currentIndex >= questions.length)
            router.push(`/dashboard/pets/${petId}/remembrance/complete`)
    }, [nav.currentIndex, questions.length, isLoadingQuestions])

    const currentQuestion = nav.currentQuestion
    const handleTextAnswer = useCallback((value: string) => {
        if (!currentQuestion) return
        const qKey = currentQuestion.question_key
        session.setResponses(prev => ({ ...prev, [qKey]: { answer_type: 'text', question_key: qKey, text_answer: value } }))
        nav.setError(null)
    }, [currentQuestion, session.setResponses, nav.setError])

    const handleSingleChoice = useCallback((choice: ChoiceOption) => {
        if (!currentQuestion) return
        const qKey = currentQuestion.question_key
        session.setResponses(prev => ({
            ...prev,
            [qKey]: choice.requires_input
                ? { answer_type: 'other', question_key: qKey, selected_choice: { label: choice.label, value: choice.value }, other_text: session.otherTexts[qKey] || '' }
                : { answer_type: 'single_choice', question_key: qKey, selected_choice: { label: choice.label, value: choice.value, score: choice.score, dimension: choice.dimension } },
        }))
        nav.setError(null)
    }, [currentQuestion, session.setResponses, session.otherTexts, nav.setError])

    const handleMultipleChoice = useCallback((choice: ChoiceOption, checked: boolean) => {
        if (!currentQuestion) return
        const qKey = currentQuestion.question_key
        if (choice.requires_input) {
            if (checked) session.setResponses(prev => ({ ...prev, [qKey]: { answer_type: 'multiple_choice', question_key: qKey, selected_choices: prev[qKey]?.selected_choices || [], other_text: session.otherTexts[qKey] || '' } }))
            else { session.setResponses(prev => ({ ...prev, [qKey]: { ...prev[qKey], other_text: undefined } })); session.setOtherTexts(prev => { const next = { ...prev }; delete next[qKey]; return next }) }
            return
        }
        session.setResponses(prev => {
            const existing = prev[qKey]?.selected_choices || []
            const updated = checked ? [...existing, { label: choice.label, value: choice.value, score: choice.score, dimension: choice.dimension }] : existing.filter((c: any) => c.value !== choice.value)
            return { ...prev, [qKey]: { answer_type: 'multiple_choice', question_key: qKey, selected_choices: updated, other_text: prev[qKey]?.other_text } }
        })
        nav.setError(null)
    }, [currentQuestion, session.setResponses, session.otherTexts, session.setOtherTexts, nav.setError])

    const handleOtherTextChange = useCallback((text: string) => {
        if (!currentQuestion) return
        const qKey = currentQuestion.question_key
        session.setOtherTexts(prev => ({ ...prev, [qKey]: text }))
        session.setResponses(prev => ({ ...prev, [qKey]: { ...prev[qKey], other_text: text } }))
    }, [currentQuestion, session.setOtherTexts, session.setResponses])

    if (showIntro) return <SurveyIntroScreen petName={petName} onComplete={() => setShowIntro(false)} />

    if (isLoadingQuestions) return (
        <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #fafafa 50%, #e0f7fa 100%)' }}>
            <div className="relative z-10 flex flex-col items-center gap-8 text-center">
                <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-2xl shadow-sky-500/25 animate-breath">
                    <Sparkles className="w-9 h-9 text-white" />
                </div>
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sky-400">Deep Remembrance</p>
                    <p className="text-lg font-light text-slate-500 tracking-wide">Opening the Soul&apos;s Archive...</p>
                </div>
                <div className="flex items-center gap-2">
                    {[0, 160, 320].map(d => <div key={d} className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                </div>
            </div>
        </div>
    )

    if (!currentQuestion) {
        if (nav.currentIndex >= nav.totalQuestions && nav.totalQuestions > 0) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 text-primary animate-spin" /></div>
        return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400 text-sm font-bold uppercase tracking-widest">No questions available.</p></div>
    }

    const inputType = getInputType(currentQuestion)
    const options = parseOptions(currentQuestion)
    const isMulti = isMultipleChoiceQuestion(currentQuestion)
    const nextPhaseKey = nav.pendingNextIndex !== null ? ((questions[nav.pendingNextIndex] as any)?.phase || '') : ''
    const nextPhaseLabel = PHASE_LABELS[nextPhaseKey]

    return (
        <div className="min-h-screen relative overflow-hidden bg-[var(--color-background)] font-sans selection:bg-primary/20">
            {breather && <EmotionalBreather type={breather.type} onReady={() => setBreather(null)} />}
            {nav.showPhaseTransition && nextPhaseLabel && (
                <PhaseTransition phaseName={nextPhaseLabel.en} phaseIntro={nextPhaseLabel.intro} petName={petName} onContinue={nav.handlePhaseTransitionContinue} />
            )}
            <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-slate-50">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-50/80 via-blue-50/60 to-cyan-50/80 animate-gradient-xy" />
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-35 mix-blend-multiply filter blur-3xl animate-blob" style={{ backgroundColor: '#BAE6FD' }} />
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-30 mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" style={{ backgroundColor: '#E0F2FE' }} />
                <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full opacity-25 mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" style={{ backgroundColor: '#CFFAFE' }} />
            </div>
            <header className="fixed top-0 inset-x-0 z-50 px-6 md:px-12 py-6 flex items-center justify-between backdrop-blur-md border-b border-white/20 bg-white/40">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shadow-inner"><span className="text-xl" suppressHydrationWarning>&#10022;</span></div>
                    <div className="hidden sm:block"><span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 block">Deep Remembrance</span><span className="text-sm font-bold">{petName}&apos;s Soul</span></div>
                </div>
                <div className="flex-1 max-w-md mx-8 flex flex-col items-center gap-2">
                    <SurveyProgress currentPhase={['P1','P2','P3','P4','P5'].indexOf((currentQuestion as any)?.phase || 'P1')} totalPhases={5} />
                    {isMulti && <span className="text-[9px] font-bold uppercase tracking-widest text-primary opacity-80" suppressHydrationWarning>&#10022; Multiple Select</span>}
                </div>
                <div className="flex items-center gap-4">
                    <div className={`hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-opacity duration-300 ${session.saveStatus !== 'idle' ? 'opacity-100' : 'opacity-0'}`}>
                        {session.saveStatus === 'saving' ? <span className="text-slate-400 animate-pulse">Saving whispers...</span> : <span className="text-primary flex items-center gap-1"><Check size={10} /> Saved</span>}
                    </div>
                    <button onClick={async () => { await session.saveProgress(); router.push('/dashboard') }} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/50 border border-white/60 backdrop-blur-xl hover:bg-white hover:shadow-lg transition-all text-sm font-bold uppercase tracking-wider text-slate-600">
                        <span>Exit</span><ArrowLeft size={16} />
                    </button>
                </div>
            </header>
            <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 max-w-5xl mx-auto pt-24 pb-32">
                <SurveyBody
                    currentQuestion={currentQuestion}
                    petName={petName}
                    inputType={inputType}
                    regularOptions={options.filter(o => !o.requires_input)}
                    otherOption={options.find(o => o.requires_input)}
                    isMulti={isMulti}
                    currentIndex={nav.currentIndex}
                    totalQuestions={nav.totalQuestions}
                    progress={nav.progress}
                    isFirstQuestion={nav.isFirstQuestion}
                    isLastQuestion={nav.isLastQuestion}
                    responses={session.responses}
                    otherTexts={session.otherTexts}
                    error={nav.error}
                    onTextAnswer={handleTextAnswer}
                    onSingleChoice={handleSingleChoice}
                    onMultipleChoice={handleMultipleChoice}
                    onOtherTextChange={handleOtherTextChange}
                />
            </main>
            <footer className="fixed bottom-12 inset-x-0 z-50 pointer-events-none">
                <div className="max-w-4xl mx-auto px-6 flex items-center justify-between pointer-events-auto">
                    <button onClick={nav.handleBack} disabled={nav.isFirstQuestion} className={`flex items-center gap-3 px-8 py-5 rounded-full font-bold uppercase tracking-[0.2em] text-xs transition-all ${nav.isFirstQuestion ? 'opacity-0 scale-90' : 'opacity-60 hover:opacity-100 hover:-translate-x-1'}`}>
                        <ArrowLeft size={18} /><span>Previous</span>
                    </button>
                    <button onClick={() => nav.isLastQuestion ? nav.handleSubmit(session.saveProgress) : nav.handleNext(session.saveProgress)} disabled={nav.isSubmitting} className="group flex items-center gap-4 bg-primary text-white px-10 py-5 rounded-full shadow-[0_20px_40px_rgba(99,102,241,0.3)] hover:shadow-[0_20px_60px_rgba(99,102,241,0.5)] hover:-translate-y-1 active:scale-95 transition-all duration-300">
                        <span className="font-bold uppercase tracking-[0.25em] text-sm">{nav.isLastQuestion ? (nav.isSubmitting ? 'Weaving Soul...' : 'Complete Linking') : 'Continue Journey'}</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </footer>
        </div>
    )
}
