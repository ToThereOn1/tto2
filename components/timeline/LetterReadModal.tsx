
'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { LetterPaper } from '@/components/letters/LetterPaper';
import { getLearningStage, type LearningStage } from '@/lib/learning-stage';

const FALLBACK_FONTS_URL =
    'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap';

const EARLY_STAGE_LABELS: Partial<Record<LearningStage, string>> = {
    stage1: 'First words · still learning to hold the pen',
    stage2: 'Finding words · handwriting is growing',
    stage3: 'Practicing · a little unsteady still',
    stage4: 'Getting there · almost fluent',
};

interface LetterReadModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    petName: string;
    petPhotoUrl?: string;
    sentDate: string;
    type?: 'received' | 'sent';
    // 학습 단계 관련 (received 타입에만 적용)
    currentTothereonDay?: number;
    writingMasteryDay?: number; // legacy, unused — kept for backward compat
}

export default function LetterReadModal({
    isOpen,
    onClose,
    content,
    petName,
    petPhotoUrl,
    sentDate,
    type = 'received',
    currentTothereonDay,
    writingMasteryDay,
}: LetterReadModalProps) {
    // received 타입이고 학습 데이터가 있으면 단계 계산
    const learningStage: LearningStage | null =
        type === 'received' && currentTothereonDay !== undefined
            ? getLearningStage(currentTothereonDay)
            : null;
    const earlyLabel = learningStage ? EARLY_STAGE_LABELS[learningStage] ?? null : null;

    // Inject fallback font for legacy letters (no learningStage → LetterPaper not rendered)
    useEffect(() => {
        if (learningStage) return; // LetterPaper handles its own font injection
        if (document.querySelector('link[data-fonts="modal-fallback"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FALLBACK_FONTS_URL;
        link.setAttribute('data-fonts', 'modal-fallback');
        document.head.appendChild(link);
    }, [learningStage]);
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop with Blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Content - Letter Paper */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ duration: 0.4, type: 'spring' }}
                        className="relative w-full max-w-2xl bg-white rounded-lg shadow-[0_2px_24px_rgba(0,0,0,0.08)] ring-1 ring-gray-100 overflow-hidden max-h-[85vh] flex flex-col"
                    >
                        {/* Header Image (Pet's Photo Blurred) */}
                        <div className="relative h-48 w-full overflow-hidden bg-amber-100">
                            {petPhotoUrl ? (
                                <img
                                    src={petPhotoUrl}
                                    alt={petName}
                                    className="w-full h-full object-cover blur-sm opacity-60 scale-110"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-b from-amber-200 to-amber-50" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent" />

                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full transition-colors backdrop-blur-md"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>

                            <div className="absolute bottom-4 left-6">
                                <h2 className="text-2xl font-serif text-gray-800">
                                    {type === 'received' ? `From. ${petName}` : `To. ${petName}`}
                                </h2>
                                <p className="text-sm text-gray-500 font-medium">ToThereOn • {new Date(sentDate).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Letter Content */}
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            {/* Learning progress indicator — stages 1–4 only */}
                            {earlyLabel && type === 'received' && currentTothereonDay !== undefined && (
                                <div className="mb-6 flex items-center gap-2 text-xs text-gray-400">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300" />
                                    <span>Day {currentTothereonDay} · {earlyLabel}</span>
                                </div>
                            )}
                            {learningStage ? (
                                <LetterPaper content={content} stage={learningStage} />
                            ) : (
                                /* 구버전 편지(current_tothereon_day 없음) — Nanum Myeongjo로 손편지 느낌 유지 */
                                <div
                                    className="max-w-none leading-relaxed text-gray-700 whitespace-pre-wrap"
                                    style={{ fontFamily: "'Nanum Myeongjo', serif", fontSize: '1rem', lineHeight: '1.8' }}
                                >
                                    {content}
                                </div>
                            )}

                            <div className="mt-12 text-right">
                                <p className="font-handwriting text-xl text-gray-600">
                                    {type === 'received' ? 'With love,' : 'With longing,'}<br />
                                    {type === 'received' ? petName : 'Me'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
