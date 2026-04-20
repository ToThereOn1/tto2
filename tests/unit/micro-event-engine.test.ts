/**
 * Unit tests for micro-event engine pure functions.
 * Run with: npx tsx tests/unit/micro-event-engine.test.ts
 *
 * No test framework required — plain assert + console output.
 */

import assert from 'assert';
import { koreanParticle } from '../../lib/micro-event-types';
import {
    getPersonalityBucket,
    filterTemplates,
    interpolateTemplate,
    selectTemplates,
    generateMicroEvents,
} from '../../lib/micro-event-engine';
import type { MicroEventContext, MicroEventTemplate } from '../../lib/micro-event-types';

// ─── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
    try {
        fn();
        console.log(`  PASS  ${name}`);
        passed++;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  FAIL  ${name}\n        ${msg}`);
        failed++;
    }
}

function section(title: string): void {
    console.log(`\n── ${title} ──`);
}

// ─── Fixture: base context ────────────────────────────────────────────────────

function makeCtx(overrides: Partial<MicroEventContext> = {}): MicroEventContext {
    return {
        petName: 'Luna',
        species: 'cat',
        breed: null,
        currentDay: 5,
        currentZone: 'crystal_meadow',
        zoneDisplayName: 'Crystal Meadow',
        timeOfDay: 'morning',
        language: 'en',
        personalityBucket: 'balanced',
        socialEnergy: 50,
        curiosityDrive: 50,
        playfulnessIntensity: 50,
        emotionalResilience: 50,
        activeNpc: null,
        letterEcho: null,
        secretHabit: null,
        preciousMemory: null,
        ...overrides,
    };
}

// ─── Fixture: minimal template factory ───────────────────────────────────────

function makeTemplate(overrides: Partial<MicroEventTemplate> = {}): MicroEventTemplate {
    return {
        id: 'test_tmpl_01',
        category: 'atmosphere',
        species: ['any'],
        personalityBuckets: 'all',
        timeOfDay: 'all',
        zones: 'all',
        requiresNpc: false,
        requiresLetterEcho: false,
        text: {
            en: '{petName} explored {zoneName}.',
            ko: '{petName}{eun} {zoneName}을 탐험했다.',
            ja: '{petName}は{zoneName}を探索した。',
        },
        mood: 'curious',
        tags: ['exploration'],
        ...overrides,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. koreanParticle
// ─────────────────────────────────────────────────────────────────────────────

section('koreanParticle');

test('Korean name with jongseong (뭉실) → eun=은', () => {
    assert.strictEqual(koreanParticle('뭉실', 'eun'), '은');
});

test('Korean name with jongseong (뭉실) → i=이', () => {
    assert.strictEqual(koreanParticle('뭉실', 'i'), '이');
});

test('Korean name with jongseong (뭉실) → eul=을', () => {
    assert.strictEqual(koreanParticle('뭉실', 'eul'), '을');
});

test('Korean name without jongseong (루나) → eun=는', () => {
    assert.strictEqual(koreanParticle('루나', 'eun'), '는');
});

test('Korean name without jongseong (루나) → i=가', () => {
    assert.strictEqual(koreanParticle('루나', 'i'), '가');
});

test('Korean name without jongseong (루나) → eul=를', () => {
    assert.strictEqual(koreanParticle('루나', 'eul'), '를');
});

test('ASCII name ending in consonant (Biscuit) → eun=은', () => {
    assert.strictEqual(koreanParticle('Biscuit', 'eun'), '은');
});

test('ASCII name ending in consonant (Biscuit) → i=이', () => {
    assert.strictEqual(koreanParticle('Biscuit', 'i'), '이');
});

test('ASCII name ending in consonant (Biscuit) → eul=을', () => {
    assert.strictEqual(koreanParticle('Biscuit', 'eul'), '을');
});

test('ASCII name ending in vowel (Luna) → eun=는', () => {
    assert.strictEqual(koreanParticle('Luna', 'eun'), '는');
});

test('ASCII name ending in vowel (Luna) → i=가', () => {
    assert.strictEqual(koreanParticle('Luna', 'i'), '가');
});

test('ASCII name ending in vowel (Luna) → eul=를', () => {
    assert.strictEqual(koreanParticle('Luna', 'eul'), '를');
});

// Additional: Korean name ending in ㄹ jongseong (already covered above, kept as alias check)
test('Korean name with ㄹ jongseong (뭉실) → eun=은 (duplicate sanity check)', () => {
    assert.strictEqual(koreanParticle('뭉실', 'eun'), '은');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. getPersonalityBucket
// ─────────────────────────────────────────────────────────────────────────────

section('getPersonalityBucket');

test('low socialEnergy + low emotionalResilience → shy', () => {
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 20, curiosityDrive: 50, playfulnessIntensity: 50, emotionalResilience: 30 }),
        'shy',
    );
});

test('borderline shy: socialEnergy=34, resilience=39 → shy', () => {
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 34, curiosityDrive: 50, playfulnessIntensity: 50, emotionalResilience: 39 }),
        'shy',
    );
});

test('socialEnergy=35 (not < 35) even with low resilience → not shy (playful wins if high playfulness)', () => {
    // socialEnergy exactly 35 fails the shy check (< 35 is false), falls through
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 35, curiosityDrive: 50, playfulnessIntensity: 80, emotionalResilience: 30 }),
        'playful',
    );
});

test('high playfulnessIntensity (71) → playful', () => {
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 50, curiosityDrive: 50, playfulnessIntensity: 71, emotionalResilience: 50 }),
        'playful',
    );
});

test('playfulnessIntensity exactly 70 → not playful (needs > 70)', () => {
    // 70 is not > 70 so playful won't fire; curiosityDrive=50 won't fire; socialEnergy=50 won't fire → balanced
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 50, curiosityDrive: 50, playfulnessIntensity: 70, emotionalResilience: 50 }),
        'balanced',
    );
});

test('high curiosityDrive (71) → curious', () => {
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 50, curiosityDrive: 71, playfulnessIntensity: 50, emotionalResilience: 50 }),
        'curious',
    );
});

test('high socialEnergy (66) → bold', () => {
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 66, curiosityDrive: 50, playfulnessIntensity: 50, emotionalResilience: 50 }),
        'bold',
    );
});

test('socialEnergy exactly 65 → not bold (needs > 65)', () => {
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 65, curiosityDrive: 50, playfulnessIntensity: 50, emotionalResilience: 50 }),
        'balanced',
    );
});

test('all moderate scores → balanced', () => {
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 50, curiosityDrive: 50, playfulnessIntensity: 50, emotionalResilience: 50 }),
        'balanced',
    );
});

test('all at exactly 50 → balanced', () => {
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 50, curiosityDrive: 50, playfulnessIntensity: 50, emotionalResilience: 50 }),
        'balanced',
    );
});

// Priority: playful fires before curious and bold when playfulness > 70
test('playful takes priority over curious when both thresholds met', () => {
    assert.strictEqual(
        getPersonalityBucket({ socialEnergy: 80, curiosityDrive: 80, playfulnessIntensity: 80, emotionalResilience: 50 }),
        'playful',
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. filterTemplates (uses inline template fixtures, not the real template pool)
// ─────────────────────────────────────────────────────────────────────────────
// Note: filterTemplates operates on MICRO_EVENT_TEMPLATES (imported in the module).
// We test filtering behaviour through selectTemplates/generateMicroEvents with
// real templates that have known properties, OR we test directly by observing
// that templates with 'any' species/all buckets always pass through.

section('filterTemplates — real template pool');

test('returns non-empty array for a normal context', () => {
    const ctx = makeCtx({ species: 'dog', personalityBucket: 'bold', timeOfDay: 'morning', currentZone: 'crystal_meadow' });
    const results = filterTemplates(ctx, new Set());
    assert.ok(results.length > 0, `Expected > 0 templates, got ${results.length}`);
});

test('excludes recently used template IDs', () => {
    const ctx = makeCtx({ species: 'dog', personalityBucket: 'balanced', timeOfDay: 'morning', currentZone: 'crystal_meadow' });
    const all = filterTemplates(ctx, new Set());
    assert.ok(all.length > 0, 'Need at least one template to test anti-repetition');
    const excludeId = all[0].id;
    const filtered = filterTemplates(ctx, new Set([excludeId]));
    assert.ok(filtered.every(t => t.id !== excludeId), 'Excluded ID should not appear in results');
});

test('excludes dog-only templates for a cat', () => {
    const dogCtx = makeCtx({ species: 'dog', personalityBucket: 'playful' });
    const catCtx = makeCtx({ species: 'cat', personalityBucket: 'playful' });
    const dogResults = filterTemplates(dogCtx, new Set());
    const catResults = filterTemplates(catCtx, new Set());
    // Dog-only templates should appear for dog but not cat
    const dogOnlyIds = dogResults.filter(t => !t.species.includes('any') && t.species.includes('dog')).map(t => t.id);
    if (dogOnlyIds.length > 0) {
        const catIds = new Set(catResults.map(t => t.id));
        assert.ok(dogOnlyIds.every(id => !catIds.has(id)), 'Dog-only templates must be absent for cat');
    } else {
        // No dog-only templates matched in this context — just pass
        assert.ok(true, 'No dog-only templates in this context; assertion vacuously true');
    }
});

test('requiresNpc=true templates excluded when activeNpc is null', () => {
    const ctx = makeCtx({ activeNpc: null });
    const results = filterTemplates(ctx, new Set());
    assert.ok(results.every(t => !t.requiresNpc), 'No requiresNpc=true template should pass when activeNpc is null');
});

test('requiresNpc=true templates included when activeNpc is provided', () => {
    const ctx = makeCtx({
        activeNpc: {
            name: 'granny_shell',
            activity: 'collecting',
            displayName: { en: 'Granny Shell', ko: '셸 할머니', ja: 'グラニー・シェル' },
        },
    });
    const results = filterTemplates(ctx, new Set());
    const npcTemplates = results.filter(t => t.requiresNpc);
    assert.ok(npcTemplates.length > 0, 'At least one requiresNpc template should be included when activeNpc is set');
});

test('requiresLetterEcho=true templates excluded when letterEcho is null', () => {
    const ctx = makeCtx({ letterEcho: null });
    const results = filterTemplates(ctx, new Set());
    assert.ok(results.every(t => !t.requiresLetterEcho), 'No requiresLetterEcho template should pass when letterEcho is null');
});

test('requiresLetterEcho=true templates included when letterEcho is provided', () => {
    const ctx = makeCtx({ letterEcho: { emotion: 'longing', intensity: 0.8 } });
    const results = filterTemplates(ctx, new Set());
    const echoTemplates = results.filter(t => t.requiresLetterEcho);
    assert.ok(echoTemplates.length > 0, 'At least one letter_echo template should appear when letterEcho is set');
});

test('filters by timeOfDay — morning templates excluded in night context', () => {
    const nightCtx = makeCtx({ timeOfDay: 'night' });
    const results = filterTemplates(nightCtx, new Set());
    // Templates that have timeOfDay=['morning'] only should not appear
    assert.ok(
        results.every(t => t.timeOfDay === 'all' || (t.timeOfDay as string[]).includes('night')),
        'All returned templates must match night or be timeOfDay=all',
    );
});

test('filters by zone — zone-specific templates excluded for mismatched zone', () => {
    const ctx = makeCtx({ currentZone: 'crystal_meadow' });
    const results = filterTemplates(ctx, new Set());
    assert.ok(
        results.every(t => t.zones === 'all' || (t.zones as string[]).includes('crystal_meadow')),
        'All returned templates must match crystal_meadow or zones=all',
    );
});

test('filters by personality bucket', () => {
    const shyCtx = makeCtx({ personalityBucket: 'shy' });
    const results = filterTemplates(shyCtx, new Set());
    assert.ok(
        results.every(t => t.personalityBuckets === 'all' || (t.personalityBuckets as string[]).includes('shy')),
        'All returned templates must match shy bucket or personalityBuckets=all',
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. interpolateTemplate
// ─────────────────────────────────────────────────────────────────────────────

section('interpolateTemplate');

test('replaces {petName} correctly', () => {
    const tmpl = makeTemplate({ text: { en: 'Hello {petName}!', ko: '{petName}!', ja: '{petName}!' } });
    const result = interpolateTemplate(tmpl, makeCtx({ petName: 'Mochi', language: 'en' }));
    assert.strictEqual(result, 'Hello Mochi!');
});

test('replaces {zoneName} correctly', () => {
    const tmpl = makeTemplate({ text: { en: 'Zone: {zoneName}.', ko: '{zoneName}.', ja: '{zoneName}.' } });
    const result = interpolateTemplate(tmpl, makeCtx({ zoneDisplayName: 'Crystal Meadow', language: 'en' }));
    assert.strictEqual(result, 'Zone: Crystal Meadow.');
});

test('returns null when template uses {secretHabit} but ctx.secretHabit is null', () => {
    const tmpl = makeTemplate({ text: { en: '{petName} always did {secretHabit}.', ko: '', ja: '' } });
    const result = interpolateTemplate(tmpl, makeCtx({ secretHabit: null, language: 'en' }));
    assert.strictEqual(result, null);
});

test('returns null when template uses {preciousMemory} but ctx.preciousMemory is null', () => {
    const tmpl = makeTemplate({ text: { en: '{petName} recalled {preciousMemory}.', ko: '', ja: '' } });
    const result = interpolateTemplate(tmpl, makeCtx({ preciousMemory: null, language: 'en' }));
    assert.strictEqual(result, null);
});

test('interpolates {secretHabit} when ctx.secretHabit is provided', () => {
    const tmpl = makeTemplate({ text: { en: '{petName} always {secretHabit}.', ko: '', ja: '' } });
    const result = interpolateTemplate(tmpl, makeCtx({ secretHabit: 'spins before sitting', language: 'en' }));
    assert.strictEqual(result, 'Luna always spins before sitting.');
});

test('Korean particles resolved correctly for name with jongseong (뭉실)', () => {
    const tmpl = makeTemplate({
        text: {
            en: '{petName} explored {zoneName}.',
            ko: '{petName}{eun} {zoneName}을 탐험했다.',
            ja: '',
        },
    });
    // 뭉실 ends with 실 → (실 - 0xAC00) % 28 ≠ 0 → has jongseong → 은
    const result = interpolateTemplate(tmpl, makeCtx({ petName: '뭉실', language: 'ko', zoneDisplayName: '수정 초원' }));
    assert.ok(result !== null, 'Should not return null');
    assert.ok(result!.includes('은'), `Expected 은 in "${result}"`);
});

test('Korean particles resolved correctly for name without jongseong (루나)', () => {
    const tmpl = makeTemplate({
        text: {
            en: '{petName} explored {zoneName}.',
            ko: '{petName}{eun} {zoneName}을 탐험했다.',
            ja: '',
        },
    });
    const result = interpolateTemplate(tmpl, makeCtx({ petName: '루나', language: 'ko', zoneDisplayName: '수정 초원' }));
    assert.ok(result !== null, 'Should not return null');
    assert.ok(result!.includes('는'), `Expected 는 in "${result}"`);
});

test('English text returned unchanged (no particle substitution)', () => {
    const tmpl = makeTemplate({ text: { en: '{petName} sat quietly.', ko: '', ja: '' } });
    const result = interpolateTemplate(tmpl, makeCtx({ petName: 'Rex', language: 'en' }));
    assert.strictEqual(result, 'Rex sat quietly.');
});

test('replaces {npcName} with active NPC display name for current language', () => {
    const tmpl = makeTemplate({
        text: { en: '{npcName} waved at {petName}.', ko: '{npcName}이 {petName}에게 손을 흔들었다.', ja: '' },
        requiresNpc: true,
    });
    const ctx = makeCtx({
        language: 'en',
        petName: 'Biscuit',
        activeNpc: {
            name: 'granny_shell',
            activity: 'collecting',
            displayName: { en: 'Granny Shell', ko: '셸 할머니', ja: 'グラニー・シェル' },
        },
    });
    const result = interpolateTemplate(tmpl, ctx);
    assert.strictEqual(result, 'Granny Shell waved at Biscuit.');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. selectTemplates
// ─────────────────────────────────────────────────────────────────────────────

section('selectTemplates');

test('returns requested count when enough templates available', () => {
    const ctx = makeCtx({ species: 'dog', personalityBucket: 'balanced', timeOfDay: 'morning', currentZone: 'crystal_meadow' });
    const results = selectTemplates(ctx, new Set(), 3);
    assert.ok(results.length <= 3, `Expected <= 3, got ${results.length}`);
    // Should get 3 if the pool is large enough
    const all = filterTemplates(ctx, new Set());
    if (all.length >= 3) {
        assert.strictEqual(results.length, 3);
    }
});

test('returns fewer when pool is smaller than count', () => {
    // Restrict context severely so pool is small
    const ctx = makeCtx({
        species: 'cat',
        personalityBucket: 'shy',
        timeOfDay: 'night',
        currentZone: 'sunset_hill',
        activeNpc: null,
        letterEcho: null,
    });
    const all = filterTemplates(ctx, new Set());
    const results = selectTemplates(ctx, new Set(), 100);
    assert.ok(results.length <= all.length, `Results (${results.length}) should be <= pool size (${all.length})`);
});

test('returns empty array when all templates excluded by recentIds', () => {
    const ctx = makeCtx({ species: 'cat', personalityBucket: 'balanced', timeOfDay: 'morning', currentZone: 'crystal_meadow' });
    const all = filterTemplates(ctx, new Set());
    const allIds = new Set(all.map(t => t.id));
    const results = selectTemplates(ctx, allIds, 3);
    assert.strictEqual(results.length, 0, 'Expected empty array when all matching templates are excluded');
});

test('no two consecutive items share the same category (anti-spacing)', () => {
    const ctx = makeCtx({ species: 'dog', personalityBucket: 'balanced', timeOfDay: 'morning', currentZone: 'crystal_meadow' });
    const results = selectTemplates(ctx, new Set(), 6);
    for (let i = 1; i < results.length; i++) {
        assert.notStrictEqual(
            results[i].category,
            results[i - 1].category,
            `Consecutive templates at index ${i - 1} and ${i} share category '${results[i].category}'`,
        );
    }
});

test('returns array of MicroEventTemplate objects', () => {
    const ctx = makeCtx({ species: 'dog', personalityBucket: 'bold', timeOfDay: 'afternoon', currentZone: 'sunset_hill' });
    const results = selectTemplates(ctx, new Set(), 2);
    for (const t of results) {
        assert.ok(typeof t.id === 'string', 'id should be string');
        assert.ok(typeof t.category === 'string', 'category should be string');
        assert.ok(typeof t.mood === 'string', 'mood should be string');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. generateMicroEvents
// ─────────────────────────────────────────────────────────────────────────────

section('generateMicroEvents');

test('returns MicroEventOutput[] with correct structure', () => {
    const ctx = makeCtx({ species: 'dog', personalityBucket: 'balanced', timeOfDay: 'morning', currentZone: 'crystal_meadow', language: 'en' });
    const outputs = generateMicroEvents(ctx, new Set(), 3);
    assert.ok(Array.isArray(outputs), 'Should return an array');
    for (const o of outputs) {
        assert.ok(typeof o.templateId === 'string', 'templateId should be string');
        assert.ok(typeof o.content === 'string', 'content should be string');
        assert.ok(typeof o.mood === 'string', 'mood should be string');
        assert.ok(typeof o.zone === 'string', 'zone should be string');
        assert.ok(typeof o.timeOfDay === 'string', 'timeOfDay should be string');
        assert.ok(typeof o.tothereonDay === 'number', 'tothereonDay should be number');
        assert.ok(typeof o.language === 'string', 'language should be string');
        assert.ok(typeof o.category === 'string', 'category should be string');
    }
});

test('each output has content (non-empty string)', () => {
    const ctx = makeCtx({ species: 'dog', personalityBucket: 'curious', timeOfDay: 'afternoon', currentZone: 'eternity_forest', language: 'en' });
    const outputs = generateMicroEvents(ctx, new Set(), 4);
    for (const o of outputs) {
        assert.ok(o.content.length > 0, `content should be non-empty for templateId=${o.templateId}`);
    }
});

test('zone field matches ctx.currentZone', () => {
    const ctx = makeCtx({ currentZone: 'crystal_lake', species: 'dog', personalityBucket: 'balanced', timeOfDay: 'evening', language: 'en' });
    const outputs = generateMicroEvents(ctx, new Set(), 3);
    for (const o of outputs) {
        assert.strictEqual(o.zone, 'crystal_lake');
    }
});

test('timeOfDay field matches ctx.timeOfDay', () => {
    const ctx = makeCtx({ timeOfDay: 'night', species: 'cat', personalityBucket: 'balanced', language: 'en' });
    const outputs = generateMicroEvents(ctx, new Set(), 3);
    for (const o of outputs) {
        assert.strictEqual(o.timeOfDay, 'night');
    }
});

test('tothereonDay field matches ctx.currentDay', () => {
    const ctx = makeCtx({ currentDay: 42, species: 'dog', personalityBucket: 'bold', language: 'en' });
    const outputs = generateMicroEvents(ctx, new Set(), 2);
    for (const o of outputs) {
        assert.strictEqual(o.tothereonDay, 42);
    }
});

test('language field matches ctx.language', () => {
    const ctx = makeCtx({ language: 'ko', species: 'dog', personalityBucket: 'balanced', timeOfDay: 'morning', currentZone: 'crystal_meadow' });
    const outputs = generateMicroEvents(ctx, new Set(), 2);
    for (const o of outputs) {
        assert.strictEqual(o.language, 'ko');
    }
});

test('anti-repetition: recent IDs excluded from output', () => {
    const ctx = makeCtx({ species: 'dog', personalityBucket: 'balanced', timeOfDay: 'morning', currentZone: 'crystal_meadow', language: 'en' });
    // First batch
    const first = generateMicroEvents(ctx, new Set(), 3);
    const firstIds = new Set(first.map(o => o.templateId));
    // Second batch excluding first batch IDs
    const second = generateMicroEvents(ctx, firstIds, 3);
    const overlap = second.filter(o => firstIds.has(o.templateId));
    assert.strictEqual(overlap.length, 0, `No overlap expected, but got IDs: ${overlap.map(o => o.templateId).join(', ')}`);
});

test('returns empty array when no templates match (all excluded)', () => {
    const ctx = makeCtx({ species: 'cat', personalityBucket: 'balanced', timeOfDay: 'morning', currentZone: 'crystal_meadow', language: 'en' });
    const all = filterTemplates(ctx, new Set());
    const allIds = new Set(all.map(t => t.id));
    const outputs = generateMicroEvents(ctx, allIds, 3);
    assert.strictEqual(outputs.length, 0, 'Expected empty array when all templates excluded');
});

test('npcInvolved is null for non-NPC templates', () => {
    const ctx = makeCtx({ activeNpc: null, species: 'dog', personalityBucket: 'balanced', timeOfDay: 'morning', language: 'en' });
    const outputs = generateMicroEvents(ctx, new Set(), 4);
    for (const o of outputs) {
        assert.strictEqual(o.npcInvolved, null, `npcInvolved should be null when no NPC context`);
    }
});

test('npcInvolved is set for NPC templates when activeNpc is provided', () => {
    const ctx = makeCtx({
        language: 'en',
        species: 'dog',
        personalityBucket: 'balanced',
        timeOfDay: 'morning',
        currentZone: 'crystal_meadow',
        activeNpc: {
            name: 'granny_shell',
            activity: 'collecting shells',
            displayName: { en: 'Granny Shell', ko: '셸 할머니', ja: 'グラニー・シェル' },
        },
    });
    const outputs = generateMicroEvents(ctx, new Set(), 6);
    const npcOutputs = outputs.filter(o => o.npcInvolved !== null);
    // There may or may not be NPC outputs depending on random selection,
    // but if any requiresNpc template was selected, npcInvolved must be 'granny_shell'
    for (const o of npcOutputs) {
        assert.strictEqual(o.npcInvolved, 'granny_shell');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
    process.exit(1);
}
