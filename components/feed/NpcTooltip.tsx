'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'

// ─── NPC tooltip data (Canon 7 NPCs — English canonical keys) ────────────────
const TOOLTIP_NPC_DATA: Record<string, {
    emoji: string
    role: string
    desc: string
}> = {
    'Granny Shell': {
        emoji: '🐢',
        role: 'Arrival Greeter',
        desc: 'Always near the Arriving Gate. Never rushes. Her pace is the world\'s first lesson.',
    },
    'Professor Clover': {
        emoji: '🐇',
        role: 'Writing & Language Teacher',
        desc: 'Runs morning classes at the Sand Field. Teaches pets to write letters. Patient to the point of absurdity.',
    },
    'Pip': {
        emoji: '📬',
        role: 'Letter Carrier · The Bridge',
        desc: 'Every letter passes through Pip\'s hands. Walks the Waterway daily. Always slightly out of breath.',
    },
    'Old Finn': {
        emoji: '🦊',
        role: 'Storyteller · Market Keeper',
        desc: 'Runs a small tent market. Trades in stories, not objects. Never directly advises.',
    },
    'Bun & Bun': {
        emoji: '🥐',
        role: 'Daily Warmth · Bakery Sisters',
        desc: 'Run the bakery near Crystal Lake. Always warm, always baking. The smell of something baking follows them.',
    },
    'Digby': {
        emoji: '🌱',
        role: 'World Guide · Explorer',
        desc: 'Lives in tunnels beneath the Bloom Field. Knows every path and hidden corner of ToThereOn World.',
    },
    'Lune': {
        emoji: '🦌',
        role: 'Special Occasions · Rare Appearances',
        desc: 'Appears only at Two-Moon Hill on milestone days. Does not speak. Presence alone is the event.',
    },
}

// ─── Multilingual aliases → English canonical name ────────────────────────────
// Korean and Japanese NPC names that appear in AI-generated posts
const NPC_ALIAS: Record<string, string> = {
    // Korean (한국어)
    '느림보 할망': 'Granny Shell',
    '콩선생':      'Professor Clover',
    '달래':        'Pip',
    '꼬리상인':    'Old Finn',
    '뭉실·몽실':   'Bun & Bun',
    '굴돌이':      'Digby',
    '은빛':        'Lune',
    // Japanese (日本語)
    'グラニー・シェル': 'Granny Shell',
    'クローバー先生':   'Professor Clover',
    'ピップ':           'Pip',
    'フィン老人':       'Old Finn',
    'バンとバン':       'Bun & Bun',
    'ディグビー':       'Digby',
    'ルーン':           'Lune',
}

// ─── Regex: all names (English + Korean + Japanese), longest first ────────────
// Longest-first prevents "Bun" matching before "Bun & Bun", "달래" before longer names, etc.
const ALL_NPC_NAMES = [
    ...Object.keys(TOOLTIP_NPC_DATA),
    ...Object.keys(NPC_ALIAS),
].sort((a, b) => b.length - a.length)

const ESCAPED = ALL_NPC_NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')

// Universal word boundary for English, Korean (가-힣 + compat jamo), and Japanese (hiragana + katakana + CJK)
// Prevents "달래가" matching "달래", "Pipettes" matching "Pip", etc.
const WORD_CHARS = 'a-zA-Z가-힣ㄱ-ㅎㅏ-ㅣぁ-ゔァ-ヴー一-龯'
const NPC_PATTERN = new RegExp(
    `(?<![${WORD_CHARS}])(${ESCAPED})(?![${WORD_CHARS}])`,
    'g'
)

// ─── Resolve matched name to canonical English name ───────────────────────────
function resolveCanonical(matched: string): string {
    return NPC_ALIAS[matched] ?? matched
}

// ─── Parse text into text/npc segments ────────────────────────────────────────
type Segment = { type: 'text'; content: string } | { type: 'npc'; content: string }

function parseSegments(text: string): Segment[] {
    const segments: Segment[] = []
    let lastIndex = 0
    NPC_PATTERN.lastIndex = 0

    let match: RegExpExecArray | null
    while ((match = NPC_PATTERN.exec(text)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
        }
        segments.push({ type: 'npc', content: match[0] })
        lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) {
        segments.push({ type: 'text', content: text.slice(lastIndex) })
    }
    return segments
}

// ─── Single NPC chip with inline context card (click/tap only) ───────────────
export const NpcChip = memo(function NpcChip({
    name,
    relationshipStage,
}: {
    name: string
    relationshipStage?: 'first_meeting' | 'acquaintance' | 'familiar'
}) {
    const canonical = resolveCanonical(name)
    const npc = TOOLTIP_NPC_DATA[canonical]
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLSpanElement>(null)

    const close = useCallback(() => setOpen(false), [])
    const toggle = useCallback(() => setOpen(v => !v), [])

    // Keyboard support: Enter/Space to toggle
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggle()
        } else if (e.key === 'Escape') {
            close()
        }
    }, [toggle, close])

    // Close on outside click/tap
    useEffect(() => {
        if (!open) return
        function handlePointer(e: MouseEvent | TouchEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                close()
            }
        }
        document.addEventListener('mousedown', handlePointer)
        document.addEventListener('touchstart', handlePointer)
        return () => {
            document.removeEventListener('mousedown', handlePointer)
            document.removeEventListener('touchstart', handlePointer)
        }
    }, [open, close])

    if (!npc) return <span>{name}</span>

    const stageLabel = relationshipStage === 'familiar' ? 'Close friend'
        : relationshipStage === 'acquaintance' ? 'Met before'
        : 'New face'

    const stageColor = relationshipStage === 'familiar' ? 'text-emerald-600'
        : relationshipStage === 'acquaintance' ? 'text-blue-500'
        : 'text-slate-400'

    return (
        <span ref={ref} className="relative inline-block">
            <button
                type="button"
                role="button"
                onClick={toggle}
                onKeyDown={handleKeyDown}
                className="text-amber-700 font-semibold underline decoration-dotted decoration-amber-400 underline-offset-2 hover:text-amber-900 hover:decoration-amber-600 transition-colors cursor-pointer leading-[inherit] bg-transparent border-0 p-0"
                aria-label={`${canonical} — ${npc.role}`}
                aria-expanded={open}
            >
                {name}
            </button>

            {open && (
                <span
                    className="block mt-1.5 w-full min-w-[240px] max-w-[320px]"
                    role="region"
                    aria-label={`${canonical} info`}
                >
                    <span className="block bg-white border border-slate-100 rounded-2xl shadow-lg p-4 text-left">
                        <span className="flex items-center gap-2 mb-1.5">
                            <span className="text-xl leading-none">{npc.emoji}</span>
                            <span className="text-sm font-bold text-slate-900 leading-tight">{canonical}</span>
                        </span>
                        <span className="block text-[11px] text-amber-600 font-medium mb-1">{npc.role}</span>
                        <span className="block text-[11px] text-slate-500 leading-relaxed mb-2">{npc.desc}</span>
                        <span className={`block text-[10px] font-medium ${stageColor}`}>
                            {stageLabel}
                        </span>
                    </span>
                </span>
            )}
        </span>
    )
})

// ─── Public: render paragraph text with NPC tooltips ─────────────────────────
export const FeedTextWithTooltips = memo(function FeedTextWithTooltips({
    text,
    className,
}: {
    text: string
    className?: string
}) {
    const segments = parseSegments(text)
    const hasNpc = segments.some(s => s.type === 'npc')

    // No NPC mentions — render as plain text (avoids re-render cost)
    if (!hasNpc) return <span className={className}>{text}</span>

    return (
        <span className={className}>
            {segments.map((seg, i) =>
                seg.type === 'npc'
                    ? <NpcChip key={i} name={seg.content} />
                    : <span key={i}>{seg.content}</span>
            )}
        </span>
    )
})
