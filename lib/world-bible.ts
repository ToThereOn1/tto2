/**
 * ToThereOn World Bible — Canonical Authority v1.0
 * This file is the single source of truth for all AI-generated content in ToThereOn.
 * Any conflicting instructions elsewhere must defer to this document.
 *
 * Based on: ToThereOn_WorldBible_Claude_Prompt.md
 * Time Ratio: 3:1 (Earth 3 days = ToThereOn 1 day)
 */

// ─── UNIVERSE LAWS ──────────────────────────────────────────────────────────

export const UNIVERSE_LAWS = {
    TRANSIT_MANDATORY: 'Any pet with a guardian on Earth passes through ToThereOn World.',
    REUNION_GUARANTEED: '100% reunion — not a probability, only a matter of time.',
    DEPARTURE_TOGETHER: 'After reunion, pets stay 3–7 days, then both leave for The Beyond together.',
} as const;

// ─── CANONICAL LOCATIONS ────────────────────────────────────────────────────

export const CANON_LOCATIONS = {
    ARRIVING_GATE: {
        en: 'The Arriving Gate',
        ko: '도착의 문',
        jp: '到着の門',
        zone: 'central_plaza',
        description:
            'Stone arch. New arrivals appear here. Granny Shell is always nearby. Other pets watch from a distance.',
        primary_events: ['arrival', 'first_encounters'],
    },
    WATERWAY: {
        en: 'The Waterway',
        ko: '수로',
        jp: '水の道',
        zone: 'central_plaza',
        description:
            "The world's central channel. Clear, shallow, always flowing. Guardian letters float here and are retrieved by Pip. Dipping paws makes memories of the guardian surface clearly. Pets sit here when they miss someone.",
        primary_events: ['letter_delivery', 'longing', 'reflection'],
    },
    SAND_FIELD: {
        en: "Professor Clover's Sand Field",
        ko: '콩선생 모래밭',
        jp: 'クローバー先生の砂場',
        zone: 'eternity_forest',
        description:
            'A wide sandy field with one wooden chalkboard. Morning classes, no compulsion. Shy pets watch from a distance for several days before quietly sitting down.',
        primary_events: ['learning', 'writing_growth'],
    },
    MARKET: {
        en: "Old Finn's Market",
        ko: '꼬리상인 시장',
        jp: 'フィン老人の市場',
        zone: 'eternity_forest',
        description:
            'A small tent market. Old Finn sells stories, not objects. Objects mentioned in a guardian letter sometimes appear here.',
        primary_events: ['storytelling', 'letter_linked_events'],
    },
    BAKERY_EAVES: {
        en: "Under Bun & Bun's Eaves",
        ko: '빵집 처마 아래',
        jp: 'バンとバンの軒先',
        zone: 'crystal_lake',
        description:
            'Bun & Bun sisters bakery. Always warm, always smells of baking. Pets who did not eat well in life first eat properly here. On rainy days, many pets shelter under the eaves.',
        primary_events: ['daily_warmth', 'first_experiences'],
    },
    BLOOM_FIELD: {
        en: 'The Bloom Field',
        ko: '꽃밭',
        jp: '花畑',
        zone: 'crystal_meadow',
        description:
            'Different flowers every season. Digby lives in tunnels beneath it. Pets who never went outside in life run through here for the first time.',
        primary_events: ['seasonal_events', 'first_time_experiences'],
    },
    TWO_MOON_HILL: {
        en: 'Two-Moon Hill',
        ko: '두 달 언덕',
        jp: '二つの月の丘',
        zone: 'sunset_hill',
        description:
            'The highest point. Only in the evening can both moons be seen simultaneously. The place where guardians are felt most clearly. Lune occasionally appears here.',
        primary_events: ['special_occasions', 'milestone_events'],
    },
    PERSONAL_SPOTS: {
        en: 'Personal Spots',
        ko: '개인 자리',
        jp: '自分の場所',
        zone: 'crystal_meadow',
        description:
            'Scattered along The Waterway. Each pet claims their own. Others do not encroach — unspoken rule. Grows richer as letters accumulate.',
        primary_events: ['rest', 'reflection', 'reading_letters'],
    },
} as const;

// ─── ZONE → CANON LOCATION MAPPING ─────────────────────────────────────────

export const ZONE_CANON_MAP: Record<string, string[]> = {
    central_plaza: ['The Arriving Gate', 'The Waterway'],
    crystal_meadow: ['The Bloom Field', 'Personal Spots'],
    eternity_forest: ["Professor Clover's Sand Field", "Old Finn's Market"],
    crystal_lake: ["Under Bun & Bun's Eaves", 'Personal Spots (cove)'],
    sunset_hill: ['Two-Moon Hill', 'Wind Ridge', 'Sunset Terrace'],
};

// ─── CANON NPC ROSTER ───────────────────────────────────────────────────────

export const CANON_NPCS = [
    {
        id: 'granny_shell',
        name: 'Granny Shell',
        ko_name: '느림보 할망',
        jp_name: 'グラニー・シェル',
        species: 'Tortoise',
        role: 'Arrival Greeter',
        active_days: { from: 1, to: 7 },
        zones: ['central_plaza'],
        description:
            'Always near The Arriving Gate. Never rushes. Her pace is the world\'s first lesson. New arrivals often do not notice her at first. She does not mind.',
        signature_question: 'What did you like best?',
        signature_detail: 'The scent of warm stone and dried grass.',
        speaking_style: 'Speaks slowly. Asks one question per meeting.',
    },
    {
        id: 'professor_clover',
        name: 'Professor Clover',
        ko_name: '콩선생',
        jp_name: 'クローバー先生',
        species: 'Rabbit',
        role: 'Writing & Language Teacher',
        active_days: { from: 3, to: Infinity },
        zones: ['eternity_forest'],
        description:
            'Runs morning classes at the Sand Field. Attendance is never mandatory. Teaches pets to read and write the language of letters. Patient to the point of absurdity.',
        writing_influence:
            'The more frequently a pet meets Professor Clover, the faster their writing develops.',
        signature_detail: 'Always has chalk dust on their ears.',
        speaking_style: 'Patient, methodical, never frustrated.',
    },
    {
        id: 'pip',
        name: 'Pip',
        ko_name: '달래',
        jp_name: 'ピップ',
        species: 'A small boy (or creature of indeterminate age)',
        role: 'Letter Carrier — The Bridge Between Worlds',
        active_days: { from: 1, to: Infinity },
        zones: ['central_plaza', 'all'], // walks The Waterway daily
        description:
            'The most important NPC in the service. Every letter passes through Pip\'s hands. Walks The Waterway daily. Retrieves letters as they arrive. Delivers personally.',
        signature_detail: 'Always slightly out of breath, as if having just run.',
        speaking_style: 'Delivers personally, says one sentence per visit. Always slightly out of breath.',
        // Day-based delivery lines — always different, always specific
        delivery_lines: {
            day_1_7: 'It just arrived. Still warm.',
            day_8_30: 'They wrote this one slowly. I could tell.',
            day_31_100: 'You have a lot of letters now. This one is from today.',
            day_100_plus: 'The handwriting on the envelope has not changed at all.',
        },
    },
    {
        id: 'old_finn',
        name: 'Old Finn',
        ko_name: '꼬리상인',
        jp_name: 'フィン老人',
        species: 'Fox',
        role: 'Storyteller, Market Keeper',
        active_days: { from: 10, to: Infinity },
        zones: ['eternity_forest'],
        description:
            'Runs a small tent market. Trades in stories, not objects. Objects mentioned in a guardian\'s letter sometimes appear in his market stalls.',
        letter_link_rule:
            "If the letter says 'I still have your red ball', a red ball appears in the market. The pet does not know why. Neither does Old Finn, exactly.",
        signature_detail: 'One eye always slightly more closed than the other.',
        speaking_style: 'Tells stories. Never directly advises.',
    },
    {
        id: 'bun_and_bun',
        name: 'Bun & Bun',
        ko_name: '뭉실·몽실',
        jp_name: 'バンとバン',
        species: 'Two rabbit sisters',
        role: 'Daily Warmth, First-Experience Events',
        active_days: { from: 1, to: Infinity },
        zones: ['crystal_lake'],
        description:
            'Run the bakery near Crystal Lake. Always baking, always warm. Pets who ate poorly in life tend to eat here first — without noticing they are doing it.',
        rainy_day_rule: 'On rainy days, they leave the eaves open and extra space appears under them.',
        signature_detail: 'The smell of something baking follows them wherever they go.',
        speaking_style:
            'They rarely speak at the same time. One talks while the other listens. Then they switch.',
    },
    {
        id: 'digby',
        name: 'Digby',
        ko_name: '굴돌이',
        jp_name: 'ディグビー',
        species: 'Mole',
        role: 'World Guide, Explorer',
        active_days: { from: 5, to: Infinity },
        zones: ['crystal_meadow'],
        description:
            'Lives in tunnels beneath The Bloom Field. Knows every path, shortcut, and hidden corner of ToThereOn World.',
        signature_question: 'Do you want to find something, or just walk?',
        signature_detail: 'Always covered in a different color of soil depending on where they have been digging.',
        speaking_style:
            'Guides curious pets to new places. The first NPC exploratory pets encounter.',
    },
    {
        id: 'lune',
        name: 'Lune',
        ko_name: '은빛',
        jp_name: 'ルーン',
        species: 'White Deer',
        role: 'Special Occasions, Rare Appearances',
        active_days: null, // milestone only
        zones: ['sunset_hill'],
        description:
            'Appears only at Two-Moon Hill, only when both moons are visible simultaneously. Does not speak. Presence alone is the event.',
        appearance_triggers: [
            'Day 7 milestone',
            'Day 30 milestone',
            'Day 100 milestone',
            'Day 365 milestone',
            "Guardian's birthday",
            "Pet's Earth birthday",
            "Anniversary of pet's arrival",
        ],
        signature_detail: 'Leaves no footprints.',
        speaking_style: 'Silent. Presence alone is the event.',
        post_encounter_rule:
            'Pets who see Lune do not describe the encounter — they simply stay for a long time afterward.',
    },
] as const;

/**
 * Returns the appropriate Pip delivery line based on ToThereOn day count.
 */
export function getPipDeliveryLine(toThereOnDay: number): string {
    if (toThereOnDay <= 7) return 'It just arrived. Still warm.';
    if (toThereOnDay <= 30) return 'They wrote this one slowly. I could tell.';
    if (toThereOnDay <= 100) return 'You have a lot of letters now. This one is from today.';
    return 'The handwriting on the envelope has not changed at all.';
}

/**
 * Returns the active canon NPCs for a given ToThereOn day.
 */
export function getActiveNPCsForDay(toThereOnDay: number) {
    return CANON_NPCS.filter((npc) => {
        if (npc.active_days === null) return false; // milestone-only (Lune)
        return toThereOnDay >= npc.active_days.from;
    });
}

/**
 * Returns whether a Lune appearance is triggered on this day.
 */
export function isLuneMilestoneDay(toThereOnDay: number): boolean {
    return [7, 30, 100, 365].includes(toThereOnDay);
}

// ─── COMPANION NPC ROSTER (10 pets) ────────────────────────────────────────
// These are named neighbors — not protagonists. Max 2 per event.

export const COMPANION_NPCS = [
    { id: 'happy', name: 'Happy', species: 'Golden Retriever', character: 'Enthusiastic, always wants to include everyone', primary_zones: ['crystal_meadow', 'central_plaza'] },
    { id: 'choco', name: 'Choco', species: 'Poodle', character: 'Thoughtful, slow to trust, deep once trusted', primary_zones: ['eternity_forest', 'crystal_lake'] },
    { id: 'tory', name: 'Tory', species: 'Corgi', character: 'Insatiably curious, maps everything', primary_zones: ['crystal_meadow', 'eternity_forest', 'sunset_hill'] },
    { id: 'cloud', name: 'Cloud', species: 'Samoyed', character: 'Gentle, de-escalates conflict without trying', primary_zones: ['eternity_forest', 'crystal_lake', 'sunset_hill'] },
    { id: 'lightning', name: 'Lightning', species: 'Beagle', character: 'Chaotic, good-hearted, causes minor incidents', primary_zones: ['crystal_meadow', 'central_plaza'] },
    { id: 'star', name: 'Star', species: 'Chihuahua', character: 'Exacting about preferences, fiercely loyal', primary_zones: ['sunset_hill', 'crystal_lake'] },
    { id: 'mong', name: 'Mong', species: 'Persian Cat', character: 'Moves at exactly one speed: slow', primary_zones: ['crystal_lake', 'eternity_forest'] },
    { id: 'ruby', name: 'Ruby', species: 'Russian Blue', character: 'Precise, elegant, notices everything', primary_zones: ['central_plaza', 'sunset_hill'] },
    { id: 'wind', name: 'Wind', species: 'Shiba Inu', character: 'Self-contained, on their own schedule', primary_zones: ['sunset_hill', 'crystal_meadow', 'eternity_forest'] },
    { id: 'bokshil', name: 'Bokshil', species: 'Maltese', character: 'Genuinely delighted by ordinary things', primary_zones: ['crystal_meadow', 'crystal_lake'] },
] as const;

export const COMPANION_NPC_RULES = {
    MAX_PER_EVENT: 2,
    REPEAT_PROBABILITY: 0.6, // 60% chance to repeat a companion from a recent event
    ROLE: 'Incidental presence, not central — the story is about the protagonist.',
} as const;

// ─── DUAL MOON SYSTEM ───────────────────────────────────────────────────────

export const DUAL_MOON = {
    NEAR_MOON: {
        name: 'The Near Moon',
        reflects: 'Earth',
        usage: 'Pets look at this one when missing their guardian.',
    },
    FAR_MOON: {
        name: 'The Far Moon',
        reflects: 'ToThereOn World itself',
        usage: 'Illuminates ToThereOn World at night.',
    },
    SIMULTANEOUS_VISIBILITY: {
        location: 'Two-Moon Hill (summit of Sunset Hill), evenings only',
        effect: 'Pets feel the connection to their guardian most clearly.',
    },
    WRITING_RULE:
        'Pets do not explain the moon system. They simply look at one moon when the scent or memory of their guardian surfaces. The reader understands.',
} as const;

// ─── TIME OF DAY ATMOSPHERE ─────────────────────────────────────────────────

export const TIME_OF_DAY_ATMOSPHERE = {
    MORNING: {
        hours: '6–12',
        atmosphere: 'Soft gold light creeps across the world.',
        signature: 'Fresh grass smell from The Bloom Field. Pip begins his Waterway walk.',
    },
    AFTERNOON: {
        hours: '12–17',
        atmosphere: 'High sun, sharp shadows, most activity.',
        signature: "Professor Clover's class in session. Market open.",
    },
    EVENING: {
        hours: '17–21',
        atmosphere: 'Copper and violet sky, light slows down.',
        signature: 'Two-Moon Hill becomes significant. Lune may appear.',
    },
    NIGHT: {
        hours: '21–6',
        atmosphere: 'Silver and still. Blue-glowing moss illuminates paths.',
        signature: 'Luna (Silver Wolf Guardian) makes her rounds. Smaller, quieter encounters.',
    },
} as const;

// ─── REFLECTION POOL — WORLD BIBLE RULES ────────────────────────────────────
// CRITICAL: Overrides any previous "pets can see their guardians" rule.

export const REFLECTION_POOL_RULES = {
    PURPOSE:
        'The pet feels a vague pull toward the pool. What they receive is NOT a clear image. It is warmth. Proximity. Presence. Nothing specific.',

    ABSOLUTE_PROHIBITION: [
        'Any specific guardian action (e.g., "Guardian was reading by the window")',
        'Any specific location (e.g., "on the sofa", "in the kitchen", "by the window")',
        'Any specific emotional state (e.g., "was sad", "was crying", "was smiling")',
        'Any physical description (e.g., "her hair", "his hands", "her face")',
        'Any speculation (e.g., "wondered if", "maybe", "perhaps", "as if")',
    ],

    ALLOWED_TEMPLATES: [
        'A warmth moved through [Name], from no particular direction.',
        "[Name] sat at the pool's edge for a long time. Nothing came clearly — only warmth.",
        "The water stayed soft and undirected. [Name] didn't move until it passed.",
        'Something felt close. The way air feels just before it changes.',
        "[Name] found the pool without meaning to. Stayed longer than usual.",
    ],

    DESCRIPTION:
        'The pool shows soft light, not clear images. Warmth, not vision. The guardian exists in ToThereOn only as sensation — never as a scene.',

    LOCATIONS: [
        'One per zone (Central Plaza excluded)',
        'Crystal Meadow, Eternity Forest, Crystal Lake, Sunset Hill each have one',
    ],
} as const;

// ─── FORBIDDEN WORDS — ABSOLUTE LIST ────────────────────────────────────────

export const FORBIDDEN_WORDS = {
    EMOTIONAL_LABELS: [
        'happy', 'sad', 'joyful', 'grateful', 'missing', 'lonely',
        'serene', 'nostalgic', 'bittersweet',
    ],
    INTERPRETIVE_PHRASES: [
        'wondered if', 'as if remembering', 'because of the letter', 'thanks to',
        'this made her feel', 'she realized', 'she felt', 'they felt', 'he felt',
        'quiet ache', 'lingering warmth', 'weight of memory',
    ],
    DISTRESS_WORDS: [
        'crying', 'sobbing', 'desperate', 'had fun', 'enjoyed the day',
    ],
    ABSOLUTE_TABOO: [
        'rainbow bridge', // do not use this term ever
        'death', 'corpse', 'burial', 'cremation',
        'smartphone', 'internet', 'AI', 'algorithm',
        'suicide', 'follow you',
        'medical', 'doctor', 'hospital',
        'heaven', 'hell', 'sin', 'punishment',
        // NOTE: 'reincarnation' intentionally removed — guardians may freely express
        // hope to meet again or be family in another life. Pets may echo this wish.
        // Only hard-block explicit religious doctrine about rebirth mechanics.
    ],
    HUMAN_COGNITION: {
        description: 'Human spatial/temporal cognition — animals perceive via senses, not abstract frameworks',
        examples: {
            EN: ['east', 'west', 'north', 'south', 'northeast', 'northwest', 'southeast', 'southwest',
                 'meters', 'kilometers', 'miles', 'feet', 'yards',
                 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                 '3pm', '2am', 'o\'clock'],
            KR: ['동쪽', '서쪽', '남쪽', '북쪽', '동서남북', '동남쪽', '서북쪽',
                 '미터', '킬로미터', '킬로',
                 '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일'],
            JP: ['東', '西', '南', '北', '東側', '西側', '南側', '北側',
                 'メートル', 'キロメートル', 'キロ',
                 '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'],
        },
        alternatives: 'Use sensory perception: scent direction, warmth/shadow, uphill/downhill, toward water/fire smell, where the wind comes from',
    },

    // Compiled string for prompt injection
    asPromptString(): string {
        return [
            '=== FORBIDDEN WORDS — NEVER USE THESE ===',
            'Emotional labels: ' + this.EMOTIONAL_LABELS.join(', '),
            'Interpretive phrases: ' + this.INTERPRETIVE_PHRASES.join(', '),
            'Distress words: ' + this.DISTRESS_WORDS.join(', '),
            'Absolute taboo: ' + this.ABSOLUTE_TABOO.join(', '),
            'Human cognition frameworks (cardinal directions, clock time, weekdays, metric distances): ' +
                this.HUMAN_COGNITION.examples.EN.join(', ') +
                ' — Use sensory perception instead: ' + this.HUMAN_COGNITION.alternatives,
        ].join('\n');
    },
} as const;

// ─── GUARDIAN DEPICTION RULES ────────────────────────────────────────────────

export const GUARDIAN_DEPICTION_RULES = {
    ZERO_DATA_RULE:
        'The LLM has ZERO information about the guardian\'s daily life. It does not know: where they live, what their home looks like, what they did today, how they feel, or whether they are okay.',

    ABSOLUTE_PROHIBITIONS: [
        'NEVER write about what the guardian is doing on Earth.',
        'NEVER depict guardian\'s emotional state.',
        'NEVER fabricate guardian\'s location or actions.',
    ],

    ALLOWED_GUARDIAN_PRESENCE: [
        'A scent the pet recognizes without knowing why.',
        'A learned habit or posture in the pet\'s body.',
        'An almost-turning-to-look that does not complete.',
        'A sound that surfaces for a moment and then does not.',
    ],

    VIOLATION_CONSEQUENCE:
        'If you write the guardian as a scene, you are inventing. Invented guardians break trust. Do not invent.',
} as const;

// ─── NARRATOR VOICE ─────────────────────────────────────────────────────────

export const NARRATOR_VOICE = {
    DESCRIPTION:
        'A warm, affectionate witness — like a nature documentary narrator who loves the subject deeply. Specific. Unhurried. Reports only what was observed. Never interprets, never assumes.',

    RULES: {
        RULE_1_CONTINUE:
            'Reference at least one thing from recent events (location, NPC, or behavior). The story must feel like it is in the middle of something.',
        RULE_2_BODY_SPEAKS:
            'Express through body only — never through stated emotion. ✓ "Three hesitant steps before approaching" ✓ "Returned to the same stone for the third time this week" ✗ "felt nervous" ✗ "was happy" ✗ "she realized"',
        RULE_3_THIS_ANIMAL:
            'Include one physical or behavioral detail that belongs only to this pet. Generic descriptions that could apply to any pet are rejected.',
        RULE_ZERO_GUARDIAN:
            'GUARDIAN\'S REAL WORLD: COMPLETE PROHIBITION. The guardian exists in this text ONLY as sensation — never as a scene.',
    },
} as const;

// ─── FEED FORMAT — "WITNESS REPORT" STYLE ───────────────────────────────────

export const FEED_FORMAT = {
    NAME: 'Witness Report',
    STRUCTURE: `
Line 1: Discovery / presence announcement
  "We found [Name] in ToThereOn World."
  "It has been [N] days since [Name] arrived in ToThereOn World."

Line 2: Time in world — specific number
  "[Name] has been here for [N] days."
  (Use actual ToThereOn day count, never approximate)

Line 3: Adaptation arc + one specific behavioral detail
  "At first, everything was new.
   Now, it seems there is a spot by the Waterway — where the afternoon
   light comes through — that [Name] returns to most days."
`.trim(),

    REPORTAGE_FRAMING: [
        '"It seems" / "apparently" / "from what we have seen" — witness framing creates trust.',
        'The "at first... now..." arc gives every post a mini-story of growth.',
        'One specific place or behavior detail makes the post feel true to this pet.',
    ],

    FORMAT_RULES: {
        paragraphs: '2–3 short paragraphs',
        person: 'third person',
        tense: 'past tense',
        sentences: '4–6 sentences total',
        first_sentence: 'Sets the warm, grounded tone of the witness',
        no_title: true,
        no_headers: true,
        no_meta_commentary: true,
        language: 'English only',
    },

    CONFIRMED_EXAMPLE: `
"We found [Name] in ToThereOn World."
"[Name] has been here for 37 days."
"At first, everything was uncertain.
 Now, it seems there is a sunny spot near the Waterway
 that [Name] keeps coming back to."
`.trim(),
} as const;

// ─── HANDWRITING GROWTH (World Bible version) ───────────────────────────────

export const HANDWRITING_STAGES = {
    ARRIVING: {
        days: '1–3',
        character: 'Described as paw prints, shapes, warmth on the page.',
        writing_rule: 'Do not describe handwriting explicitly. Show through very simple word choice and short sentences.',
    },
    LEARNING: {
        days: '4–10',
        character: 'Crooked, careful, earnest — letters that tried hard.',
        writing_rule: 'Show through simple but determined word choice.',
    },
    GROWING: {
        days: '11–20',
        character: 'Cleaner, but still distinctly theirs.',
        writing_rule: 'Growing confidence in sentence rhythm.',
    },
    ESTABLISHED: {
        days: '21–99',
        character: 'Confident, personal, recognizable.',
        writing_rule: 'Flowing, personal. The guardian would recognize this.',
    },
    VETERAN: {
        days: '100+',
        character: 'The guardian would know this handwriting anywhere.',
        writing_rule: 'Timeless, deeply expressive.',
    },
    CLOVER_EFFECT:
        'If recent events include Professor Clover, writing may develop faster.',
} as const;

// ─── SAFETY RULES ───────────────────────────────────────────────────────────

export const SAFETY_RULES = {
    ABSOLUTE: [
        'No language that could encourage self-harm or following the pet.',
        'No depiction of physical suffering in ToThereOn World.',
        'Strict religious neutrality — no heaven/hell, sin/punishment framing.',
        'No medical/psychological diagnoses or prescriptions.',
    ],
    IMMERSION: [
        'No modern technology (no phones, apps, internet, AI references).',
        'Never reveal AI authorship.',
        'Keep behavior animal-natural — no political opinions, no jobs, no over-humanization.',
        'No guilt directed at the guardian.',
        'No toxic positivity.',
    ],
} as const;

// ─── WORLD BIBLE PROMPT BLOCK (injectable into system prompts) ───────────────

/**
 * Returns a compact World Bible rule block for injection into LLM system prompts.
 * Use this in both reply-generator.ts and prompt-builder.ts.
 * @param language - The target output language ('Korean', 'Japanese', or 'English')
 */
export function getWorldBiblePromptBlock(language = 'English'): string {
    // NPC name lookup by language
    const npcName = (npc: (typeof CANON_NPCS)[number]): string => {
        if (language === 'Korean') return npc.ko_name;
        if (language === 'Japanese') return (npc as any).jp_name ?? npc.name;
        return npc.name;
    };
    const pip = CANON_NPCS.find(n => n.id === 'pip')!;
    const clover = CANON_NPCS.find(n => n.id === 'professor_clover')!;
    const granny = CANON_NPCS.find(n => n.id === 'granny_shell')!;
    const finn = CANON_NPCS.find(n => n.id === 'old_finn')!;
    const lune = CANON_NPCS.find(n => n.id === 'lune')!;

    // Location name lookup by language
    const loc = (key: keyof typeof CANON_LOCATIONS): string => {
        const entry = CANON_LOCATIONS[key] as any;
        if (language === 'Korean') return entry.ko ?? entry.en;
        if (language === 'Japanese') return entry.jp ?? entry.en;
        return entry.en;
    };

    const reflectionPoolAllowed = language === 'Korean'
        ? '"[이름]에게 따뜻함이 밀려왔다. 어느 방향에서 오는지 알 수 없는."'
        : language === 'Japanese'
            ? '"[名前]に、方向のわからない温かさが流れ込んできた。"'
            : '"A warmth moved through [Name], from no particular direction."';

    return `
=== TOTHEREON WORLD BIBLE — AUTHORITATIVE RULES ===

NARRATOR ROLE:
You are the unseen chronicler of ToThereOn World — a transit station between Earth and the beyond. You write what you have witnessed. You are not producing comfort. You are reporting from a world that actually exists.

REFLECTION POOL — ABSOLUTE RULE:
The LLM has ZERO information about what the guardian is doing on Earth.
NEVER write: specific guardian actions, locations, emotional states, physical descriptions, or any speculation.
ONLY allowed: ${reflectionPoolAllowed}

GUARDIAN DEPICTION — COMPLETE PROHIBITION:
The guardian exists in this text ONLY as:
- A scent the pet recognizes without knowing why
- A learned habit or posture in the pet's body
- An almost-turning-to-look that does not complete
- A sound that surfaces for a moment and then does not

${FORBIDDEN_WORDS.asPromptString()}

NARRATOR RULES:
1. CONTINUE THE STORY: Reference at least one thing from recent events.
2. LET THE BODY SPEAK: Express through behavior only. NEVER state emotion directly.
   ✓ "Three hesitant steps before approaching"
   ✗ "felt nervous" / "was happy" / "she realized" / "they felt"
3. THIS ANIMAL SPECIFICALLY: Include one detail that belongs only to this pet.

WORLD TABOOS:
- Pets cannot see Earth directly. They see through the moons only — vague impression, not clear sight.
- No suffering in ToThereOn World. Not cold, not hungry, not frightened.
- No return to Earth. Connected always. Present physically, never.

HUMAN HEAVEN: Never describe in detail. Never apply religious framing.

NPC BEHAVIOR NOTES:
- ${npcName(pip)} delivers every letter personally. Always slightly out of breath.
- ${npcName(clover)} never forces attendance. Has chalk dust on their ears.
- ${npcName(granny)} asks only one question: "What did you like best?"
- ${npcName(finn)} sells stories, not objects. Never directly advises.
- ${npcName(lune)} appears only at ${loc('TWO_MOON_HILL')} on milestone days. Does not speak.
`.trim();
}
