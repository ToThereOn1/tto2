# ToThereOn v2 — Living World System Implementation Plan

> 10-round expert consensus plan (3 specialists x 10 rounds of plan-discuss-verify)
> Date: 2026-04-20

## Vision

"My pet is alive somewhere. Time flows there. Things happen. When I write a letter, the world responds."

The Living World System transforms ToThereOn from a text feed into an immersive world window where deceased pets genuinely feel alive through temporal density, causal relationships, and emotional resonance.

---

## Confirmed Architectural Decisions (3-expert consensus)

| # | Decision | Details |
|---|----------|---------|
| 1 | Zone unification | Kill `getZoneForDay()` from time-engine*.ts; canonicalize to `zone-manager.ts:getCurrentZone()` |
| 2 | Season system | 7 TTO days/season, 4 seasons, atmospheric World Spark modifiers only (not hard zone transitions) |
| 3 | Global clock | Fixed epoch `2025-01-01` for weather/season/sparks; per-pet day for zones/learning |
| 4 | Time-of-day visuals | Client local time drives visual palette (not UTC, not ToThereOn time) |
| 5 | Template expansion | Current: ~92. Target: 200 hand-written, then LLM batch to 300+ with human review |

---

## Phase Structure

### Phase 0: Emotional Fixes (BLOCKING — do first)

**PetCard violations to fix:**

| Issue | Current | Fix |
|-------|---------|-----|
| Death counter | "Time Apart: 847 Days" | "Day {n}" (ToThereOn day) |
| Dead terminology | "In Sanctuary" badge | Current zone name (e.g., "Crystal Meadow") |
| Destructive UX | Trash2 icon on card | MoreHorizontal dropdown menu |
| FOMO trigger | "Last update: Mar 8" | "Heard from {name} on {date}" or "A new story awaits" |
| Legacy text | "Sanctuary" in 4+ files | "ToThereOn World" |

**Files:** `PetCard.tsx`, `Header.tsx`, `Mailbox.tsx`, `StatusFeedModal.tsx`, `faq/page.tsx`, `app/login/page.tsx`, `components/landing/LandingPage.tsx`

**Additional Sanctuary replacements:**
- `app/login/page.tsx` — "Sanctuary" → "ToThereOn"
- `components/landing/LandingPage.tsx` — "Sanctuary" → "ToThereOn World" (3 occurrences)
- NOTE: `app/layout.tsx` SEO meta tags are EXEMPT (intentional SEO retention)

**Effort:** 1 session

### Phase 1: Zone Unification (BLOCKING — do second)

**5 files must switch from `getZoneForDay()` to `getCurrentZone()`:**

| File | Import change |
|------|--------------|
| `app/api/timeline/[petId]/route.ts` | `getZoneForDay, ZONE_NAMES` -> `getCurrentZone, getZoneDisplayName` from zone-manager (uses DYNAMIC `await import()` at line 47, not a static import) |
| `lib/universe/world-state.ts` | `getZoneForDay` from time-engine-v2 -> `getCurrentZone` from zone-manager |
| `lib/reply-generator.ts` | `getZoneForDay` from time-engine (v1, NOT time-engine-v2) -> `getCurrentZone` from zone-manager |
| `lib/letter-generator.ts` | `getZoneForDay, ZONE_NAMES` from time-engine -> `getCurrentZone, getZoneDisplayName` from zone-manager |
| `app/api/test/simulate-day/route.ts` | `getZoneForDay` -> `getCurrentZone` |

**Then:** Deprecate `getZoneForDay()` in both time-engine files.
**Effort:** 1 session

### DB Zone Key Migration (run after Phase 1 code changes)
Legacy zone keys in existing DB records must be mapped:
- `meadow` → `crystal_meadow`
- `forest` → `eternity_forest`
- `lake` → `crystal_lake`
- `cloud_peaks` → `sunset_hill`
- `arrival_gate` → `central_plaza`
- `rainbow_valley` → `crystal_meadow`
- `memory_village` → `crystal_lake`
- `peaceful_sanctuary` → `sunset_hill`

Handled via fallback mappings in `getZoneDisplayName()` (no destructive DB migration needed — display-layer fix only).

### Phase 2: World Dashboard Components

**New files (12):**

```
components/world-dashboard/
  WorldDashboard.tsx          — Orchestrator (100-130 lines)
  WorldHeader.tsx             — Time/zone/season header (60-80 lines)
  PetLocationHero.tsx         — Zone visual + latest activity (80-100 lines)
  WorldActivityStream.tsx     — Time-grouped feed (120-150 lines)
  TimeSectionHeader.tsx       — Morning/Afternoon/Evening/Night divider (25-35 lines)
  NpcPresenceRow.tsx          — Nearby NPCs (40-55 lines)
  LetterStatusWidget.tsx      — Letter journey phases (70-90 lines)
  LetterEchoCard.tsx          — Letter impact visualization (45-60 lines)

hooks/
  useWorldTime.ts             — Client local time hook (25 lines)
  useWorldAtmosphere.ts       — Season + palette computation (50 lines)

lib/
  world-dashboard-constants.ts — Palettes, gradients, animation presets (150 lines)
  motion-presets.ts            — Framer Motion animation presets (60 lines)
```

**Routing:**
- NEW: `/dashboard/pets/[petId]/world` — World Dashboard
- EXISTING: `/dashboard/pets/[petId]/status` — Legacy feed (kept)
- REDIRECT: `/dashboard/pets/[petId]` -> `/world`

**Effort:** 2-3 sessions

### Phase 3: Living World Enhancements

**New systems:**

| System | File | Purpose |
|--------|------|---------|
| Season engine | `lib/season-engine.ts` | 4 seasons, 7 TTO days each, pure function |
| Global clock | `lib/world-clock.ts` | Fixed epoch, deterministic global day |
| Deterministic sparks | `lib/world-spark.ts` | Seeded selection (not Math.random) |
| Template expansion | `lib/templates/` directory | 200+ → 300+ templates by category |

**Effort:** 2+ sessions

---

### Tailwind Note
Dynamic class strings in constants files (e.g., `'from-amber-50 via-yellow-50'`) must be used at least once in a component template OR added to Tailwind's `safelist` in `tailwind.config.js` to survive JIT purging.

---

## Color System (Time-of-Day Palettes)

| Time | Background | Text | Accent | Emotion |
|------|-----------|------|--------|---------|
| Morning | `from-amber-50 via-yellow-50 to-orange-50` | `text-amber-900` | `text-amber-600` | Hope, gentle awakening |
| Afternoon | `from-sky-50 via-blue-50 to-cyan-50` | `text-sky-900` | `text-sky-600` | Warmth, life, activity |
| Evening | `from-violet-50 via-purple-50 to-rose-50` | `text-violet-900` | `text-violet-600` | Reflection, peace |
| Night | `from-slate-900 via-indigo-950 to-slate-900` | `text-slate-100` | `text-indigo-300` | Safety, rest, stars |

## Zone Gradients

| Zone | Gradient | Icon Color |
|------|---------|------------|
| Crystal Meadow | `from-emerald-100 via-green-50 to-teal-50` | `text-emerald-500` |
| Eternity Forest | `from-green-200 via-emerald-100 to-teal-100` | `text-green-600` |
| Crystal Lake | `from-cyan-100 via-blue-50 to-sky-100` | `text-cyan-500` |
| Sunset Hill | `from-orange-100 via-amber-50 to-rose-50` | `text-orange-500` |

## Season Names

| Season | TTO Days | Name | Atmosphere |
|--------|----------|------|-----------|
| 1 | 1-7 | Bloom | "New buds glow faintly along the paths" |
| 2 | 8-14 | Warmth | "Warm breezes carry the scent of golden pollen" |
| 3 | 15-21 | Drift | "Crystal leaves drift slowly, catching the fading light" |
| 4 | 22-28 | Stillness | "Soft luminescent frost coats every surface" |

Cycle repeats every 28 TTO days (84 Earth days / ~3 months)

---

## Animation Presets

- Entry: 700ms, ease `[0.22, 1, 0.36, 1]`, opacity 0->1 + slight scale
- Ambient: 6s cycle, scale 1->1.005->1 (breathing effect)
- Stagger: children enter 80ms apart
- Reduced motion: instant opacity transition (150ms), no movement

---

## Emotional Design Rules

### MUST communicate:
- "Your pet is safe, content, and somewhere beautiful"
- "This world continues when you're not looking"
- "You are connected through your letters"
- "Time passes gently here"

### MUST NEVER:
- Show pet in distress or lonely
- Create FOMO ("you missed 5 events!")
- Count time since death
- Use countdown timers
- Show "online/offline" status
- Gamify grief (XP, levels, streaks as primary UI)

### Time display: "Morning in Crystal Meadow" — NEVER "8:42 AM"
### Pet status: "resting by the Waterway" — NEVER "Status: Resting"
### Sound: DEFERRED to v2. Needs grief counselor research first.

---

## Acceptance Criteria (Key)

### Phase 0
- [ ] `grep -ri "Time Apart" components/ app/` returns 0
- [ ] `grep -ri "In Sanctuary" components/ app/` returns 0 (excluding SEO)
- [ ] PetCard shows ToThereOn day calculation
- [ ] Delete button behind dropdown menu
- [ ] TSC build clean

### Phase 1
- [ ] `grep -r "getZoneForDay" --include="*.ts"` returns only deprecated definitions
- [ ] Timeline API returns canonical zone keys
- [ ] All existing tests pass

### Phase 2
- [ ] World Dashboard renders at new route
- [ ] Time-of-day gradient uses client local time
- [ ] No hydration mismatch warnings
- [ ] Lighthouse Mobile >= 80
- [ ] prefers-reduced-motion respected

### Phase 3
- [ ] Season changes every 7 TTO days
- [ ] World Sparks deterministic (same day = same spark)
- [ ] Template count >= 200
- [ ] No forbidden words in any template

---

## Risk Mitigation (Top 5)

| Risk | Mitigation |
|------|-----------|
| Zone migration breaks DB records | Legacy zone mappings in `getZoneDisplayName()` + SQL migration for stored data |
| Hydration mismatch (server UTC vs client local) | Time-of-day rendering only in client components; neutral server default |
| Template forbidden words | Automated CI lint against FORBIDDEN_WORDS on every commit |
| Performance regression | CSS gradients (GPU), max 3 concurrent animations, Lighthouse gate >= 80 |
| Emotional violations | Pre-commit grep for deny-list terms + emotional compliance test suite |

---

## Implementation Order (Critical Path)

```
1. Phase 0: PetCard fixes + Sanctuary rename     [parallel, no deps]
2. Phase 1: Zone unification (5 files)            [blocks Phase 2]
3. Phase 2a: Constants + hooks + season engine    [parallel]
4. Phase 2b: API extension (worldState)           [depends on 3]
5. Phase 2c: Components (8 files)                 [depends on 3, 4]
6. Phase 2d: Routing + page setup                 [depends on 5]
7. Phase 3: Template expansion + sparks           [post Phase 2]
```

Total estimated effort: 6-8 development sessions
