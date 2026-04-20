/**
 * scripts/eval-output.ts
 *
 * Evaluates AI-generated content (feed events + reply letters) for a pet
 * using LLM-as-Judge via the admin test-generate endpoint.
 *
 * Displays a formatted report with dimension scores, highlights, issues,
 * and concrete improvement suggestions.
 *
 * Usage:
 *   npx tsx scripts/eval-output.ts <petId>
 *
 * Requires:
 *   CRON_SECRET in .env.local
 *   Dev server running at http://localhost:3000 (or set BASE_URL env)
 *   Feed events or reply letters already generated for the pet
 */

import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET

function scoreBar(score: number): string {
    const filled = Math.round(score / 10)
    return '[' + '█'.repeat(filled) + '░'.repeat(10 - filled) + ']'
}

function scoreColor(score: number): string {
    if (score >= 8) return '\x1b[32m'  // green
    if (score >= 6) return '\x1b[33m'  // yellow
    return '\x1b[31m'                   // red
}

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const CYAN = '\x1b[36m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'

async function main() {
    const petId = process.argv[2]

    if (!petId) {
        console.error('Usage: npx tsx scripts/eval-output.ts <petId>')
        process.exit(1)
    }

    if (!CRON_SECRET) {
        console.error('ERROR: CRON_SECRET not found in .env.local')
        process.exit(1)
    }

    console.log(`\n${CYAN}${BOLD}AI 콘텐츠 품질 평가 중: ${petId}${RESET}`)
    console.log(`${DIM}LLM-as-Judge 호출 중 (${BASE_URL}/api/admin/test-generate)...${RESET}\n`)

    const res = await fetch(`${BASE_URL}/api/admin/test-generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({ action: 'eval', petId }),
    })

    const data = await res.json()

    if (!res.ok || !data.success) {
        console.error(`${RED}ERROR:${RESET}`, data.error || `HTTP ${res.status}`)
        process.exit(1)
    }

    const r = data.result
    const { scores, highlights, issues, suggestions, sample_improvement } = r.eval

    const divider = '─'.repeat(60)

    console.log(`${BOLD}${divider}${RESET}`)
    console.log(`${BOLD}  콘텐츠 품질 평가 결과 — ${r.petName}${RESET}`)
    console.log(`${DIM}  평가 대상: 피드 이벤트 ${r.feedCount}개, 답장 편지 ${r.replyCount}개${RESET}`)
    console.log(`${DIM}  사용 토큰: ${r.tokensUsed}${RESET}`)
    console.log(`${BOLD}${divider}${RESET}\n`)

    // Scores
    const dimensions: [string, string][] = [
        ['persona_consistency',    '페르소나 일관성       '],
        ['emotional_authenticity', '감정 진정성           '],
        ['world_bible_compliance', '세계관 준수           '],
        ['language_quality',       '문장 품질             '],
        ['user_impact',            '사용자 위로 효과      '],
        ['narrative_continuity',   '서사 연속성 (인과관계)'],
        ['world_aliveness',        '세계 살아있음 (NPC·장소)'],
    ]

    console.log(`${BOLD}  항목별 점수${RESET}\n`)
    for (const [key, label] of dimensions) {
        const score = scores[key] ?? 0
        const color = scoreColor(score)
        console.log(`  ${label} ${color}${scoreBar(score)} ${score}/10${RESET}`)
    }

    const overall = scores.overall ?? 0
    const overallColor = scoreColor(overall)
    console.log(`\n  ${BOLD}종합 점수              ${overallColor}${scoreBar(overall)} ${overall}/10${RESET}`)
    console.log(`\n${divider}`)

    // Highlights
    if (highlights?.length) {
        console.log(`\n${GREEN}${BOLD}  잘된 점${RESET}`)
        for (const h of highlights) {
            console.log(`  ${GREEN}+${RESET} ${h}`)
        }
    }

    // Issues
    if (issues?.length) {
        console.log(`\n${RED}${BOLD}  문제점${RESET}`)
        for (const issue of issues) {
            console.log(`  ${RED}!${RESET} ${issue}`)
        }
    }

    // Suggestions
    if (suggestions?.length) {
        console.log(`\n${YELLOW}${BOLD}  개선 제안${RESET}`)
        for (const s of suggestions) {
            console.log(`  ${YELLOW}>${RESET} ${s}`)
        }
    }

    // Sample improvement
    if (sample_improvement) {
        console.log(`\n${BOLD}  개선 예시 문장${RESET}`)
        console.log(`  ${DIM}${sample_improvement}${RESET}`)
    }

    console.log(`\n${divider}\n`)

    // Exit with non-zero if quality is poor
    if (overall < 6) {
        console.log(`${RED}${BOLD}  품질 기준 미달 (${overall}/10 < 6.0) — 위 문제점을 확인하세요.${RESET}\n`)
        process.exit(1)
    } else {
        console.log(`${GREEN}${BOLD}  콘텐츠 품질 양호 (${overall}/10)${RESET}\n`)
    }
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
