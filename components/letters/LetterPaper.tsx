'use client';

// =============================================================
// LetterPaper — 7단계 학습 시스템 폰트/레이아웃 렌더링 컴포넌트
// stage1-2: Caveat/Gamja Flower + heavy wobble + school notebook lines
// stage3:   Kalam/Nanum Pen Script + subtle wobble + faint lines
// stage4-5: Kalam→Patrick Hand / Nanum Pen Script + no wobble
// stage6-7: Lora / Nanum Myeongjo — elegant serif
// =============================================================

import { useEffect, useRef, useState } from 'react';
import type { LearningStage } from '@/lib/learning-stage';

interface LetterPaperProps {
    content: string;
    stage: LearningStage;
}

// ─── Language Detection ────────────────────────────────────────────────────
function detectLang(text: string): 'ko' | 'ja' | 'en' {
    const koCount = (text.match(/[\uAC00-\uD7A3]/g) || []).length;
    const jaCount = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
    const threshold = Math.max(text.length * 0.05, 3);
    if (koCount > jaCount && koCount > threshold) return 'ko';
    if (jaCount > threshold) return 'ja';
    return 'en';
}

function isCJK(char: string): boolean {
    const c = char.charCodeAt(0);
    return (c >= 0xAC00 && c <= 0xD7A3)
        || (c >= 0x3040 && c <= 0x30FF)
        || (c >= 0x4E00 && c <= 0x9FFF);
}

// ─── Seeded PRNG (xorshift32) ──────────────────────────────────────────────
function contentHash(str: string): number {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return (Math.abs(h) | 1); // ensure non-zero
}

function makeSeededRng(seed: number): () => number {
    let s = seed;
    return () => {
        s ^= s << 13;
        s ^= s >> 17;
        s ^= s << 5;
        return (s >>> 0) / 0x100000000;
    };
}

// ─── Font Map (stage × language) ──────────────────────────────────────────
const FONT_MAP: Record<LearningStage, Record<'ko' | 'ja' | 'en', string>> = {
    stage1: { ko: "'Gamja Flower', cursive",     ja: "'Zen Kurenaido', cursive", en: "'Caveat', cursive" },
    stage2: { ko: "'Gamja Flower', cursive",     ja: "'Zen Kurenaido', cursive", en: "'Caveat', cursive" },
    stage3: { ko: "'Nanum Pen Script', cursive", ja: "'Zen Kurenaido', cursive", en: "'Kalam', cursive" },
    stage4: { ko: "'Nanum Pen Script', cursive", ja: "'Klee One', cursive",      en: "'Kalam', cursive" },
    stage5: { ko: "'Nanum Pen Script', cursive", ja: "'Klee One', cursive",      en: "'Patrick Hand', cursive" },
    stage6: { ko: "'Nanum Myeongjo', serif",     ja: "'Noto Serif JP', serif",   en: "'Lora', serif" },
    stage7: { ko: "'Nanum Myeongjo', serif",     ja: "'Noto Serif JP', serif",   en: "'Lora', serif" },
};

// ─── Stage Styles ──────────────────────────────────────────────────────────
interface StageStyle {
    fontSize: string;
    lineHeight: string;
    textAlign: 'left' | 'justify';
    letterSpacing: string;
    useWobble: boolean;
    useRuledLines: boolean;
    ruledLineSpacing: number; // px between lines
    ruledLineColor: string;   // CSS color for ruled lines
    showMarginLine: boolean;
    paperRotation: number; // degrees (0 = none)
    textColor: string;
    inkShadow: string; // CSS text-shadow or 'none'
}

const STAGE_STYLES: Record<LearningStage, StageStyle> = {
    stage1: {
        fontSize: '1.2rem', lineHeight: '2.4', textAlign: 'left', letterSpacing: '0.04em',
        useWobble: true,  useRuledLines: true,  ruledLineSpacing: 45, ruledLineColor: '#d4e4f7', showMarginLine: true,
        paperRotation: 0.3, textColor: '#3d3d3d', inkShadow: '0 0 1.5px rgba(60,60,60,0.3)',
    },
    stage2: {
        fontSize: '1.15rem', lineHeight: '2.2', textAlign: 'left', letterSpacing: '0.03em',
        useWobble: true,  useRuledLines: true,  ruledLineSpacing: 45, ruledLineColor: '#d4e4f7', showMarginLine: true,
        paperRotation: 0.3, textColor: '#3d3d3d', inkShadow: '0 0 1px rgba(60,60,60,0.2)',
    },
    stage3: {
        fontSize: '1.08rem', lineHeight: '1.95', textAlign: 'left', letterSpacing: '0.02em',
        useWobble: true,  useRuledLines: true,  ruledLineSpacing: 56, ruledLineColor: '#e8f2fb', showMarginLine: false,
        paperRotation: 0, textColor: '#3d3d3d', inkShadow: '0 0 0.5px rgba(60,60,60,0.15)',
    },
    stage4: {
        fontSize: '1.05rem', lineHeight: '1.9', textAlign: 'left', letterSpacing: '0.01em',
        useWobble: false, useRuledLines: false, ruledLineSpacing: 0, ruledLineColor: '', showMarginLine: false,
        paperRotation: 0, textColor: '#3d3d3d', inkShadow: 'none',
    },
    stage5: {
        fontSize: '1rem', lineHeight: '1.8', textAlign: 'left', letterSpacing: '0',
        useWobble: false, useRuledLines: false, ruledLineSpacing: 0, ruledLineColor: '', showMarginLine: false,
        paperRotation: 0, textColor: '#2a2a2a', inkShadow: 'none',
    },
    stage6: {
        fontSize: '1rem', lineHeight: '1.75', textAlign: 'justify', letterSpacing: '0.02em',
        useWobble: false, useRuledLines: false, ruledLineSpacing: 0, ruledLineColor: '', showMarginLine: false,
        paperRotation: 0, textColor: '#2a2a2a', inkShadow: 'none',
    },
    stage7: {
        fontSize: '1rem', lineHeight: '1.75', textAlign: 'justify', letterSpacing: '0',
        useWobble: false, useRuledLines: false, ruledLineSpacing: 0, ruledLineColor: '', showMarginLine: false,
        paperRotation: 0, textColor: '#2a2a2a', inkShadow: 'none',
    },
};

// ─── Wobble Parameters ─────────────────────────────────────────────────────
const WOBBLE_PARAMS: Partial<Record<LearningStage, { degRange: number; yRange: number; xRange: number }>> = {
    stage1: { degRange: 12, yRange: 6,   xRange: 3   }, // ±6deg, ±3px Y, ±1.5px X
    stage2: { degRange: 7,  yRange: 3.6, xRange: 1.6 }, // ±3.5deg, ±1.8px Y, ±0.8px X
    stage3: { degRange: 3,  yRange: 1.6, xRange: 0.8 }, // ±1.5deg, ±0.8px Y, ±0.4px X
};

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function applyWobble(el: HTMLElement, stage: LearningStage, content: string) {
    const params = WOBBLE_PARAMS[stage];
    if (!params) return;
    const rng = makeSeededRng(contentHash(content));
    el.innerHTML = content
        .split('')
        .map((char) => {
            if (char === '\n') return '<br/>';
            if (char === ' ') return ' ';
            const cjkFactor = isCJK(char) ? 0.4 : 1;
            const deg = (rng() - 0.5) * params.degRange * cjkFactor;
            const y   = (rng() - 0.5) * params.yRange;
            const x   = (rng() - 0.5) * params.xRange;
            return `<span style="display:inline-block;transform:rotate(${deg.toFixed(2)}deg) translate(${x.toFixed(2)}px,${y.toFixed(2)}px)">${escapeHtml(char)}</span>`;
        })
        .join('');
}

// ─── Google Fonts (all stages) ─────────────────────────────────────────────
const FONTS_URL =
    'https://fonts.googleapis.com/css2?family=Caveat:wght@400;500&family=Kalam:wght@400&family=Patrick+Hand&family=Lora:ital,wght@0,400;1,400&family=Gamja+Flower&family=Nanum+Pen+Script&family=Nanum+Myeongjo:wght@400;700&family=Zen+Kurenaido&family=Klee+One&family=Noto+Serif+JP&display=swap';

export function LetterPaper({ content, stage }: LetterPaperProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const styles = STAGE_STYLES[stage] ?? STAGE_STYLES.stage1;
    const lang = detectLang(content);
    const fontFamily = FONT_MAP[stage][lang];
    const [reducedMotion, setReducedMotion] = useState(false);

    // Inject Google Fonts non-blocking via <link> (avoids render-blocking @import)
    useEffect(() => {
        if (document.querySelector('link[data-fonts="letterpaper"]')) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = FONTS_URL;
        link.setAttribute('data-fonts', 'letterpaper');
        document.head.appendChild(link);
    }, []);

    // Detect prefers-reduced-motion for both wobble and rotation
    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(mq.matches);
        const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    useEffect(() => {
        if (!styles.useWobble || !contentRef.current || reducedMotion) return;
        applyWobble(contentRef.current, stage, content);
    }, [stage, content, styles.useWobble, reducedMotion]);

    const ruledLinesBg = styles.useRuledLines
        ? `linear-gradient(to bottom, transparent 0px, transparent ${styles.ruledLineSpacing - 1}px, ${styles.ruledLineColor} ${styles.ruledLineSpacing - 1}px, ${styles.ruledLineColor} ${styles.ruledLineSpacing}px)`
        : undefined;

    const rotation = !reducedMotion && styles.paperRotation
        ? `rotate(${styles.paperRotation}deg)`
        : undefined;

    return (
        <>
            <div style={{
                transform: rotation,
                position: 'relative',
            }}>
                {/* Left margin line — stages 1-2 only */}
                {styles.showMarginLine && (
                    <div style={{
                        position: 'absolute',
                        left: '36px',
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        backgroundColor: '#f5c6c6',
                        pointerEvents: 'none',
                    }} />
                )}

                <div
                    ref={contentRef}
                    style={{
                        fontFamily,
                        fontSize: styles.fontSize,
                        lineHeight: styles.lineHeight,
                        textAlign: styles.textAlign,
                        letterSpacing: styles.letterSpacing,
                        backgroundImage: ruledLinesBg,
                        backgroundSize: ruledLinesBg ? `100% ${styles.ruledLineSpacing}px` : undefined,
                        color: styles.textColor,
                        textShadow: styles.inkShadow !== 'none' ? styles.inkShadow : undefined,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        paddingLeft: styles.showMarginLine ? '52px' : undefined,
                    }}
                >
                    {content}
                </div>
            </div>
        </>
    );
}
