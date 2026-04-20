'use client'

import type { SurveyQuestion } from './hooks/useSurveyNavigation'
import { SurveyQuestionCard } from './SurveyQuestionCard'
import { SurveyChoiceGrid } from './SurveyChoiceGrid'
import { SurveyTextInput } from './SurveyTextInput'

// ============================================================
// Shared types (exported for orchestrator use)
// ============================================================

export interface ChoiceOption {
    label: string
    value: string
    score?: number
    dimension?: string
    requires_input?: boolean
}

export interface SurveyBodyProps {
    currentQuestion: SurveyQuestion
    petName?: string
    inputType: string
    regularOptions: ChoiceOption[]
    otherOption: ChoiceOption | undefined
    isMulti: boolean
    currentIndex: number
    totalQuestions: number
    progress: number
    isFirstQuestion: boolean
    isLastQuestion: boolean
    responses: Record<string, any>
    otherTexts: Record<string, string>
    error: string | null
    onTextAnswer: (value: string) => void
    onSingleChoice: (choice: ChoiceOption) => void
    onMultipleChoice: (choice: ChoiceOption, checked: boolean) => void
    onOtherTextChange: (text: string) => void
}

// ============================================================
// Helpers (exported for orchestrator)
// ============================================================

export function getInputType(q: SurveyQuestion): string {
    if (q.input_type) return q.input_type
    if (q.type === 'text') return 'long_text'
    if (q.type === 'choice') return 'single_choice'
    return q.type || 'single_choice'
}

export function parseOptions(q: SurveyQuestion): ChoiceOption[] {
    if (q.options) {
        if (Array.isArray(q.options)) return q.options
        if (typeof q.options === 'string') {
            try { return JSON.parse(q.options) } catch { return [] }
        }
    }
    if (q.choices_en && Array.isArray(q.choices_en)) {
        return q.choices_en.map((c: string) => ({ label: c, value: c }))
    }
    return []
}

export function isMultipleChoiceQuestion(q: SurveyQuestion): boolean {
    return !!(q.allow_multiple || q.input_type === 'multiple_choice' || q.type === 'multiple_choice')
}

function getTextValue(question: SurveyQuestion, responses: Record<string, any>): string {
    const resp = responses[question.question_key]
    if (!resp) return ''
    if (typeof resp === 'string') return resp
    return resp.text_answer || ''
}

function getQuestionText(q: SurveyQuestion, petName?: string): string {
    const text = q.question_text_en || q.question_en || q.question_text_kr || q.question_kr || ''
    if (!petName) return text
    return text
        .replace(/\[이름\]/g, petName)
        .replace(/\[Name\]/g, petName)
        .replace(/\{petName\}/g, petName)
}

function getHelpText(q: SurveyQuestion): string | null {
    return q.help_text_en || q.help_text_kr || null
}

// ============================================================
// SurveyBody — composes animated micro-interaction components
// ============================================================

export function SurveyBody({
    currentQuestion,
    petName,
    inputType,
    regularOptions,
    otherOption,
    isMulti,
    currentIndex,
    totalQuestions,
    responses,
    otherTexts,
    error,
    onTextAnswer,
    onSingleChoice,
    onMultipleChoice,
    onOtherTextChange,
}: SurveyBodyProps) {
    const isChoiceType = inputType === 'single_choice' || inputType === 'multiple_choice' || inputType === 'choice'
    const isTextType = inputType === 'long_text' || inputType === 'text' || inputType === 'short_text'

    return (
        <SurveyQuestionCard
            questionText={getQuestionText(currentQuestion, petName)}
            helpText={getHelpText(currentQuestion)}
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            isMulti={isMulti}
        >
            {isTextType && (
                <SurveyTextInput
                    value={getTextValue(currentQuestion, responses)}
                    onChange={onTextAnswer}
                    inputType={inputType as 'long_text' | 'short_text' | 'text'}
                    ariaLabel={getQuestionText(currentQuestion, petName)}
                />
            )}

            {isChoiceType && (
                <SurveyChoiceGrid
                    question={currentQuestion}
                    regularOptions={regularOptions}
                    otherOption={otherOption}
                    isMulti={isMulti}
                    responses={responses}
                    otherTexts={otherTexts}
                    onSingleChoice={onSingleChoice}
                    onMultipleChoice={onMultipleChoice}
                    onOtherTextChange={onOtherTextChange}
                />
            )}

            {error && (
                <div className="mt-8 p-4 rounded-2xl bg-red-50/50 border border-red-200/50 backdrop-blur-sm">
                    <p className="text-red-500 text-sm font-bold uppercase tracking-widest text-center">{error}</p>
                </div>
            )}
        </SurveyQuestionCard>
    )
}
