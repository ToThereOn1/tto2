# Persona Voice & World Immersion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make each pet's feed feel like a real, living person with a distinct voice, routines, and a world to inhabit — not a generic AI narrator in a fantasy setting.

**Architecture:**
Three-layer fix: (1) Inject each pet's unique voice into the Claude system prompt so every sentence sounds like *that* pet. (2) Wire unused PersonaProfile fields (behavioral_patterns, afterlife_setting, communication_style) into the user prompt for world continuity. (3) Fix the seed test data schema mismatch so test results reflect real user personas.

**Tech Stack:** TypeScript, Next.js App Router, `@anthropic-ai/sdk`, Supabase, `dotenv`

---

## Context: Why This Matters

The current system generates feed events that feel generic because:

1. **`buildSystemPrompt()` in `event-generator.ts` ignores `PersonaProfile`** — it uses generic tone rules for every single pet. Biscuit and Luna sound identical.
2. **`prompt-builder.ts` ignores `communication_style`, `behavioral_patterns`, `afterlife_setting`** — these are the richest data from Deep Remembrance, and they're sitting unused.
3. **Seed script uses a non-standard schema** — `speaking_style` / `emotional_traits` instead of `communication_style` / `core_traits`. Test output never reflects real user data quality.
4. **System prompt says "멀리 떨어져만 있을뿐" but doesn't say it** — the framing is implicit; the model doesn't know to write from "I live here, this is my life" vs "I exist here between visits."
5. **Length conflict** — system prompt says "3-5 sentences", user prompt says "2-3 paragraphs." Whichever wins is random.

## Key Files

| File | Role |
|------|------|
| `tothereon/lib/event-generator.ts` | System prompt + generation loop |
| `tothereon/lib/prompt-builder.ts` | User prompt builder |
| `tothereon/scripts/seed-test-pet.ts` | Test data creation |
| `tothereon/app/api/admin/test-generate/route.ts` | Test-trigger endpoint |
| `tothereon/lib/types/database.ts` | PersonaProfile type definition (READ-ONLY reference) |

---

## Task 1: Voice Injection into System Prompt

**Goal:** Each pet gets a `━━━ YOUR VOICE ━━━` block in the Claude system prompt with their specific speaking style. This is the highest-leverage change.

**Files:**
- Modify: `tothereon/lib/event-generator.ts` (lines 142–210)

### What to change

**Before:**
```typescript
function buildSystemPrompt(language: string): string {
    // ... only injects language instructions
}
// Called as:
system: buildSystemPrompt(context.userLanguage),
```

**After:**
```typescript
function buildSystemPrompt(language: string, personaProfile?: PersonaProfile): string {
    // ... injects language + voice
}
// Called as:
system: buildSystemPrompt(context.userLanguage, context.personaProfile),
```

**Voice extraction logic** — must handle BOTH formats:
- Real personas: `personaProfile.communication_style?.letter_voice_tone`
- Seed test data: `(personaProfile as any).speaking_style` (fallback until Task 4 fixes seed)

### Step 1: Update `buildSystemPrompt` signature and add voice section

In `event-generator.ts`, change:

```typescript
function buildSystemPrompt(language: string): string {
    const langInstruction = getLanguageInstruction(language);

    const languageSection = [
        `━━━ LANGUAGE ━━━`,
        langInstruction.header,
        langInstruction.forbiddenWordsPrompt
            ? `\n${langInstruction.forbiddenWordsPrompt}`
            : '',
    ].filter(Boolean).join('\n');

    return `${SYSTEM_PROMPT_BASE}\n\n${languageSection}`;
}
```

To:

```typescript
function buildSystemPrompt(language: string, personaProfile?: PersonaProfile): string {
    const langInstruction = getLanguageInstruction(language);

    const languageSection = [
        `━━━ LANGUAGE ━━━`,
        langInstruction.header,
        langInstruction.forbiddenWordsPrompt
            ? `\n${langInstruction.forbiddenWordsPrompt}`
            : '',
    ].filter(Boolean).join('\n');

    // Extract voice from either PersonaProfile format:
    // - Real (LLM-generated) persona: communication_style.letter_voice_tone
    // - Seed test persona: speaking_style (non-standard, fixed in Task 4)
    const commStyle = personaProfile?.communication_style;
    const voiceTone = commStyle?.letter_voice_tone
        || (personaProfile as any)?.speaking_style
        || '';
    const sentenceStructure = commStyle?.sentence_structure || '';
    const vocabularyPref = commStyle?.vocabulary_preference || '';

    const voiceSection = voiceTone ? `
━━━ YOUR VOICE ━━━
This is how you write — not a generic animal, but specifically you:
${voiceTone}${sentenceStructure ? `\nSentence style: ${sentenceStructure}` : ''}${vocabularyPref ? `\nVocabulary: ${vocabularyPref}` : ''}

Write every sentence in this voice. If the voice is terse, be terse. If it uses fragments, use fragments.
Do not drift into a "literary animal narrator" style — stay in character.` : '';

    return `${SYSTEM_PROMPT_BASE}\n\n${languageSection}${voiceSection}`;
}
```

### Step 2: Update the call site in `generateStatusEvent`

Find the call to `buildSystemPrompt` inside `generateStatusEvent`:
```typescript
system: buildSystemPrompt(context.userLanguage),
```

Change to:
```typescript
system: buildSystemPrompt(context.userLanguage, context.personaProfile),
```

### Step 3: Also add `import type { PersonaProfile }` if not already imported

Check line 1-15 of event-generator.ts. It already imports:
```typescript
import type { PersonaProfile, DimensionalScores } from '@/lib/types/database';
```
✓ Already imported, no change needed.

### Verify

Run: `npx tsx scripts/trigger-feed.ts <petId>`

Expected: Feed content noticeably sounds like the specific pet's voice, not generic narrative.

---

## Task 2: Fix SYSTEM_PROMPT_BASE — Framing + Length Conflict

**Goal:** Fix two problems in the base system prompt: (a) length conflict with user prompt, (b) add "멀리 떨어져만 있을뿐" framing so the model knows the pet has a real life here.

**Files:**
- Modify: `tothereon/lib/event-generator.ts` (SYSTEM_PROMPT_BASE constant, lines 144–192)

### Step 1: Fix length instruction

Find:
```
LENGTH: 3–5 sentences. Short. First person, past tense.
```

Replace with:
```
LENGTH: 2–3 short paragraphs. Each paragraph 1–3 sentences. Total: ~80–120 words.
First person, past tense.
```

### Step 2: Expand the TONE section — "living there" framing

Find the TONE section:
```
━━━ TONE ━━━
Casual. Direct. A little wry. Warm without being sentimental.
Short sentences are fine. Fragments are fine. Humor is fine.
You're not writing for an audience — you're just putting down what happened.
Do NOT address your guardian directly. Do NOT say you miss them or wish they were here.
They exist in your life as habits you carry — not as someone you're speaking to.
```

Replace with:
```
━━━ TONE ━━━
Casual. Direct. A little wry. Warm without being sentimental.
Short sentences are fine. Fragments are fine. Humor is fine.
You're not writing for an audience — you're just putting down what happened.

You live here. ToThereOn World is your life now — not a waiting room, not a dream.
You have regulars. Favorite spots. Ongoing things. Real routines that are yours.
Write as someone living their day — not as someone waiting to go somewhere else.

Do NOT address your guardian directly. Do NOT say you miss them or wish they were here.
They exist in your life as physical habits you carry — a posture, a reflex, a familiar pull.
Never as someone you speak to or describe what they are doing.
```

### Verify

Run: `npx tsx scripts/trigger-feed.ts <petId>`

Expected: Output reads like the pet is occupied with their own life — not pining or waiting.

---

## Task 3: Inject Behavioral & World Data into User Prompt

**Goal:** Wire `behavioral_patterns.joy_triggers`, `behavioral_patterns.daily_routines`, and `afterlife_setting.primary_landscape` into the `▸ YOU ARE` section of the user prompt. This gives the model concrete behavioral detail to write from.

**Files:**
- Modify: `tothereon/lib/prompt-builder.ts` (the `buildStatusFeedPrompt` function)

### What data is available

From `PersonaProfile` (real persona):
```typescript
personaProfile.behavioral_patterns?.joy_triggers      // "발소리, 간식 봉지 소리"
personaProfile.behavioral_patterns?.daily_routines    // "아침마다 창가에 앉음"
personaProfile.afterlife_setting?.primary_landscape   // "넓은 들판, 강 근처"
personaProfile.core_traits                            // ["loyal", "playful", "food-obsessed"]
```

From seed test data (non-standard format, handled with fallback):
```typescript
(personaProfile as any).emotional_traits              // ["loyal", "playful"]
```

### Step 1: Extract new fields in `buildStatusFeedPrompt`

After the existing extractions (lines ~183-186):
```typescript
const personalitySummary = personaProfile.personality_summary || 'Affectionate and loyal';
const behavioralPatterns = personaProfile.behavioral_patterns || {} as any;
const communicationStyle = personaProfile.communication_style || {} as any;
```

Add:
```typescript
const joyTriggers = behavioralPatterns.joy_triggers || (personaProfile as any).emotional_traits?.join(', ') || '';
const dailyRoutines = behavioralPatterns.daily_routines || '';
const afterlifeLandscape = personaProfile.afterlife_setting?.primary_landscape
    || (personaProfile as any).afterlife_landscape
    || '';
const coreTraits = (personaProfile.core_traits || (personaProfile as any).emotional_traits || []).join(', ');
```

### Step 2: Expand `▸ YOU ARE` section in the prompt template

Find:
```typescript
▸ YOU ARE
${petName} — ${species}${breed ? ` (${breed})` : ''}, ${relationship}'s companion.
Write as ${petName}, in first person. This is your journal entry for today.
Personality: ${personalitySummary}
```

Replace with:
```typescript
▸ YOU ARE
${petName} — ${species}${breed ? ` (${breed})` : ''}, ${relationship}'s companion.
Write as ${petName}, in first person. This is your journal entry for today.

Personality: ${personalitySummary}
${coreTraits ? `Core traits: ${coreTraits}` : ''}
${joyTriggers ? `What gets your attention: ${joyTriggers}` : ''}
${dailyRoutines ? `Your routines here: ${dailyRoutines}` : ''}
${afterlifeLandscape ? `Your corner of ToThereOn: ${afterlifeLandscape}` : ''}
```

Note the template literal — empty lines are fine, but filter out blank bullet lines when the field is empty. The `${ condition ? value : ''}` pattern already handles this (produces an empty string that adds a blank line). Use a slightly more careful approach:

```typescript
const youAreDetails = [
    personalitySummary ? `Personality: ${personalitySummary}` : '',
    coreTraits ? `Core traits: ${coreTraits}` : '',
    joyTriggers ? `What gets your attention: ${joyTriggers}` : '',
    dailyRoutines ? `Your routines here: ${dailyRoutines}` : '',
    afterlifeLandscape ? `Your corner of ToThereOn: ${afterlifeLandscape}` : '',
].filter(Boolean).join('\n');
```

Then in the template:
```typescript
▸ YOU ARE
${petName} — ${species}${breed ? ` (${breed})` : ''}, ${relationship}'s companion.
Write as ${petName}, in first person. This is your journal entry for today.
${youAreDetails}
```

### Verify

Run: `npx tsx scripts/trigger-feed.ts <petId>`

Expected: Journal entries reference pet-specific habits and surroundings. Biscuit's output mentions food-obsession or lake. Luna's output has regal, selective behavior near moonlit rooftop.

---

## Task 4: Fix Seed Script Schema to Match PersonaProfile

**Goal:** The seed script currently uses `speaking_style` and `emotional_traits` — non-standard fields not in `PersonaProfile`. Real users get `communication_style`, `core_traits`, `behavioral_patterns`, `afterlife_setting`, `letter_generation_guidelines`. Fix the seed so test data reflects real quality.

**Files:**
- Modify: `tothereon/scripts/seed-test-pet.ts`

### Step 1: Rewrite Biscuit's persona profile

Old non-standard profile:
```typescript
profile: {
    personality_summary: '...',
    speaking_style: '...',         // ← non-standard
    emotional_traits: [...],       // ← non-standard
    memory_anchors: [...]
}
```

New correct PersonaProfile structure:
```typescript
profile: {
    personality_summary: 'Biscuit was a joyful, exuberant golden retriever who treated every moment as an adventure. He had an infectious enthusiasm that could light up any room, and a deep, unwavering loyalty to his family. He was the kind of dog who made strangers feel like old friends.',
    core_traits: ['loyal', 'playful', 'food-obsessed', 'social', 'exuberant', 'gentle'],
    behavioral_patterns: {
        daily_routines: 'Morning patrol of the yard before breakfast, afternoon spot in the sunniest room, post-dinner walk ritual',
        social_interactions: 'Approaches everyone — no stranger is a stranger. Leans his full weight in for contact.',
        stress_responses: 'Yawns dramatically and seeks physical contact. Never aggressive.',
        joy_triggers: 'Peanut butter, scrambled eggs, the sound of a leash, water (any water), humans sitting on the floor',
    },
    communication_style: {
        letter_voice_tone: 'Warm, enthusiastic, vivid. Short excited bursts for discoveries ("Water. Cold. Perfect."). Longer sentences when reflective. Always notices smells, textures, the exact feeling of sunlight. Never cynical, never sarcastic.',
        vocabulary_preference: 'Concrete and sensory. Food words. Temperature words. Movement words. Avoids abstractions.',
        sentence_structure: 'Short declaratives when excited. Run-ons when following a scent. Fragments are natural.',
        emotional_range: 'High — expresses through body and action, not labels. Tail-wag energy even in writing.',
    },
    memory_anchors: [
        { category: 'Favorite ritual', details: 'After-dinner walks when the neighborhood was quiet' },
        { category: 'Signature move', details: 'Full-body wiggle when excited, tail going like a propeller' },
        { category: 'Special moment', details: 'Jumped into the lake without warning and looked so proud' },
        { category: 'Comfort behavior', details: 'Slept with head on feet, always needed physical contact' },
        { category: 'Nickname', details: 'Biscuit Bear, Sir Fluffington, The Golden King' },
    ],
    afterlife_setting: {
        primary_landscape: 'Rolling meadows full of tall grass to crash through, with a slow river nearby for spontaneous swimming',
        daily_activities: 'Morning: grass patrol and smell inventory. Afternoon: sun patch napping. Evening: water adventures.',
        emotional_state: 'Completely at home. Thriving. The lake is even better than the one back home.',
    },
    letter_generation_guidelines: {
        opening_style: 'Jump into the action — no "Dear" anything. Start with what happened.',
        content_themes: ['food discoveries', 'water adventures', 'new friends', 'sunny spots', 'remembered rituals from home'],
        closing_style: 'End mid-energy — something good just happened or is about to.',
        forbidden_patterns: ['missing you', 'wish you were here', 'it\'s not the same without you'],
    },
    persona_quality_score: {
        detail_richness: 90,
        emotional_authenticity: 88,
        behavioral_consistency: 92,
        narrative_depth: 85,
        overall_score: 89,
    },
}
```

### Step 2: Rewrite Luna's persona profile

```typescript
profile: {
    personality_summary: 'Luna was a quietly observant tabby cat who chose her moments of affection carefully but deeply. She had a mysterious, regal quality balanced by unexpected bursts of kitten-like play. She was selective with trust and devoted to those she chose.',
    core_traits: ['independent', 'discerning', 'quietly affectionate', 'curious', 'graceful', 'intuitive'],
    behavioral_patterns: {
        daily_routines: 'Dawn windowsill observation. Late-morning grooming ritual in a specific sunny patch. Late-night zoomies followed by immediate composure.',
        social_interactions: 'Approaches on her own terms, at her own pace. Proximity is the message — does not perform affection.',
        stress_responses: 'Withdraws to high ground. Watches. Returns when ready. Never panics.',
        joy_triggers: 'The specific shrimp treat brand, tuna from the can (not the pouch), a moving shadow, suddenly remembering she can run',
    },
    communication_style: {
        letter_voice_tone: 'Measured and thoughtful. Dry wit delivered without announcement. Long pauses implied in punctuation. Notices what others overlook. Chooses words with precision. Never effusive, but genuine warmth underneath.',
        vocabulary_preference: 'Precise. Slight formality. Understatement. The wry observation stated matter-of-factly.',
        sentence_structure: 'Controlled. Sometimes a single sentence paragraph for emphasis. No run-ons. The pause is part of the writing.',
        emotional_range: 'Narrow register shown through behavior. A slow blink. Choosing to sit closer. Staying longer than necessary.',
    },
    memory_anchors: [
        { category: 'Defining trait', details: 'Being chosen by her felt like an honor — she had standards' },
        { category: 'Nightly ritual', details: 'Slept at the foot of the bed in a perfect circle, completely still' },
        { category: 'Special moment', details: 'Stayed on lap for hours the night her owner was sick' },
        { category: 'Playful side', details: 'Late-night zoomies followed by immediate dignified composure' },
        { category: 'Food preference', details: 'Tuna from the can only, specific shrimp treats — very particular' },
    ],
    afterlife_setting: {
        primary_landscape: 'A moonlit rooftop garden with jasmine and high vantage points over the city',
        daily_activities: 'Dawn: watching the light change from the highest point. Dusk: patrol of the garden perimeter. Night: optional zoomies.',
        emotional_state: 'Settled. She has evaluated the situation and found it acceptable. The jasmine is good.',
    },
    letter_generation_guidelines: {
        opening_style: 'Start with an observation. Something noticed, not something felt.',
        content_themes: ['precise observations', 'small discoveries worth noting', 'routines established', 'things that met or failed standards'],
        closing_style: 'End with a dry observation or something left deliberately understated.',
        forbidden_patterns: ['missing you terribly', 'I need you', 'it\'s so hard here', 'everyone is so nice'],
    },
    persona_quality_score: {
        detail_richness: 88,
        emotional_authenticity: 90,
        behavioral_consistency: 91,
        narrative_depth: 87,
        overall_score: 89,
    },
}
```

### Verify

Run: `npx tsx scripts/seed-test-pet.ts`

Expected: Seed completes without errors. Then run `npx tsx scripts/trigger-feed.ts <petId>` — Biscuit output should sound physically energetic and food-focused. Luna output should sound measured, precise, slightly wry.

---

## Task 5: Add `todaysZoneEvents` Context to Test-Generate Endpoint

**Goal:** The test-generate endpoint currently always passes `null` for `todaysZoneEvents` (events from other pets in the same zone today). Wire this up so the "Living Universe" context actually flows through in test generation.

**Files:**
- Modify: `tothereon/app/api/admin/test-generate/route.ts` (inside `handleFeed()`)

### Context

In `StatusEventContext`:
```typescript
todaysZoneEvents?: Array<{ pet_name: string; first_sentence: string }>
```

This is shown to the model as "Earlier today in this zone" context — a light backdrop that makes the world feel populated. Currently, `handleFeed()` doesn't fetch this, so it's always absent.

### Step 1: After step 6 (zone calculation), fetch zone events

After:
```typescript
const currentZone = getCurrentZone(tothereonDay)
```

Add:
```typescript
// Fetch today's zone events from other pets (Living Universe context)
const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)

const { data: zoneEventData } = await admin
    .from('pet_status_events')
    .select('event_description, pets!inner(name)')
    .eq('zone', currentZone)
    .neq('pet_id', petId)
    .gte('created_at', todayStart.toISOString())
    .limit(3)

const todaysZoneEvents = (zoneEventData || []).map((e: any) => ({
    pet_name: e.pets?.name || 'Unknown',
    first_sentence: ((e.event_description || '') as string)
        .split(/[.。!！]/)[0]?.trim() || '',
})).filter(ev => ev.first_sentence.length > 5)
```

### Step 2: Pass `todaysZoneEvents` into `generateStatusEvent` call

Find the `eventResult = await generateStatusEvent({...})` call. Add:
```typescript
todaysZoneEvents,
```

### Verify

Run: `npx tsx scripts/trigger-feed.ts <petId>` with two pets seeded.

Expected: If both Biscuit and Luna are in the same zone, the second trigger shows subtle zone atmosphere from the first.

---

## Task 6: Final End-to-End Quality Validation

**Goal:** Run the full eval pipeline and confirm all changes compound correctly.

### Step 1: Re-seed test pets with new schema

```bash
npx tsx scripts/seed-test-pet.ts
```

Expected: "Seed complete" with both pets re-upserted.

### Step 2: Generate feed for Biscuit

```bash
npx tsx scripts/trigger-feed.ts <biscuit-petId>
```

Check:
- Written in first person ✓
- Sounds food-motivated and physically energetic ✓
- References their ToThereOn landscape (meadows/river) ✓
- Not generic "golden retriever in a magical world" ✓

### Step 3: Generate feed for Luna

```bash
npx tsx scripts/trigger-feed.ts <luna-petId>
```

Check:
- Measured, dry tone ✓
- Observations rather than feelings ✓
- References moonlit rooftop area ✓
- Biscuit and Luna feel like completely different narrators ✓

### Step 4: Run quality eval

```bash
npx tsx scripts/eval-output.ts <petId>
```

Expected: Overall score ≥ 8. Key dimensions:
- `persona_consistency` ≥ 8 (was the problem before)
- `emotional_authenticity` ≥ 8
- `language_quality` ≥ 8

### Step 5: Generate a reply letter

```bash
npx tsx scripts/trigger-reply.ts <petId>
```

Check: Voice is consistent between feed and letter.

---

## Implementation Order & Dependencies

```
Task 2 (system prompt base fixes)
    ↓ no deps
Task 1 (voice injection)
    ↓ depends on Task 4 being done for accurate testing, but can test with seed fallback
Task 3 (behavioral data in user prompt)
    ↓ depends on Task 4 for accurate field names
Task 4 (seed schema fix)
    ↓ enables accurate testing of Tasks 1 and 3
Task 5 (zone events in test endpoint)
    ↓ independent, can do anytime
Task 6 (end-to-end eval)
    ↓ final validation
```

**Recommended execution order: 2 → 4 → 1 → 3 → 5 → 6**
(Fix base framing first, fix seed data second, then inject the now-correct data)
