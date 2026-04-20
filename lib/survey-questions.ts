// Deep Remembrance Survey Questions v2.2
// 21 questions, 5 phases, English-only (US target)
// Based on 02 deep remembrance v2.md spec (2026-02-28)
// NOTE: This file is a static reference. The DB (survey_questions table) is the runtime source.

export const PHASE_LABELS: Record<string, { en: string; intro: string }> = {
    P1: {
        en: 'The Door',
        intro: 'Let\'s take a moment to remember [Name]. There are no right or wrong answers — just share what comes to mind. This will take about 8 minutes.',
    },
    P2: {
        en: 'The Living Room',
        intro: 'Now let\'s step into everyday life with [Name]. The little things matter most.',
    },
    P3: {
        en: 'The Quiet Room',
        intro: 'Let\'s go a little deeper now. This part is about you and [Name] — your story together.',
    },
    P4: {
        en: 'The Letter',
        intro: 'Take your time from here. Just let your heart lead the way.',
    },
    P5: {
        en: 'The Light',
        intro: 'Almost there. Just one or two more things.',
    },
}

export interface SurveyQuestionV2 {
    question_key: string
    phase: string
    input_type: 'single_choice' | 'multiple_choice' | 'short_text' | 'long_text'
    question_en: string
    subtext_en?: string
    placeholder_en?: string
    guide_en?: string
    choices?: Array<{
        label: string
        value: string
        score?: number | null
        dimension?: string
        tags?: string[]
    }>
    scoring_dimensions?: string[]
    is_required: boolean
    allow_multiple: boolean
    has_other_option: boolean
}

export const SURVEY_QUESTIONS_V2: SurveyQuestionV2[] = [
    // ─── Phase 1: THE DOOR (Q01-Q03) ──────────────────────
    {
        question_key: 'Q01',
        phase: 'P1',
        input_type: 'single_choice',
        question_en: 'Do you remember the day you first met [Name]? How did you two find each other?',
        choices: [
            { label: 'My family brought them home (breeder or adoption)', value: 'family_brought', dimension: 'origin_story' },
            { label: 'I found them on the street (rescue)', value: 'rescue', dimension: 'origin_story' },
            { label: 'They were a gift from someone', value: 'gift', dimension: 'origin_story' },
            { label: 'I got them from a pet store', value: 'pet_store', dimension: 'origin_story' },
            { label: 'They were born into our family', value: 'born_family', dimension: 'origin_story' },
            { label: "I don't quite remember", value: 'dont_remember', dimension: 'origin_story' },
        ],
        scoring_dimensions: ['origin_story'],
        is_required: true,
        allow_multiple: false,
        has_other_option: true,
    },
    {
        question_key: 'Q02',
        phase: 'P1',
        input_type: 'single_choice',
        question_en: 'When you came home and opened the door, what did [Name] usually do?',
        subtext_en: 'Pick the one that comes to mind first.',
        choices: [
            { label: 'Ran to me like crazy, full-body wiggle and all', value: 'ran_crazy', score: 95, dimension: 'social_energy' },
            { label: 'Came over with a wagging tail, happy but not over the top', value: 'wagging_tail', score: 80, dimension: 'social_energy' },
            { label: 'Got up slowly and strolled over to greet me', value: 'strolled', score: 60, dimension: 'social_energy' },
            { label: 'Lifted their head and looked at me from their spot', value: 'lifted_head', score: 45, dimension: 'social_energy' },
            { label: "Acted like they didn't care... then quietly came closer", value: 'pretend_no_care', score: 55, dimension: 'social_energy' },
            { label: 'Pretended not to notice, but their tail gave them away', value: 'tail_giveaway', score: 50, dimension: 'social_energy' },
            { label: 'It depended on the day', value: 'depended', score: 60, dimension: 'social_energy' },
        ],
        scoring_dimensions: ['social_energy', 'affection_style'],
        is_required: true,
        allow_multiple: false,
        has_other_option: true,
    },
    {
        question_key: 'Q03',
        phase: 'P1',
        input_type: 'single_choice',
        question_en: 'When someone new came to your home, how did [Name] usually react?',
        choices: [
            { label: 'Went right up to say hello — loved meeting new people', value: 'say_hello', score: 90, dimension: 'social_energy' },
            { label: 'Stayed cautious at first, but warmed up after a while', value: 'cautious_warmup', score: 65, dimension: 'social_energy' },
            { label: 'Hid behind me or kept their distance', value: 'hid', score: 30, dimension: 'social_energy' },
            { label: 'Barked or growled to let them know', value: 'barked', score: 25, dimension: 'social_energy' },
            { label: 'Completely ignored them — had better things to do', value: 'ignored', score: 50, dimension: 'social_energy' },
            { label: 'It really depended on the person', value: 'depended', score: 55, dimension: 'social_energy' },
        ],
        scoring_dimensions: ['social_energy', 'emotional_resilience'],
        is_required: true,
        allow_multiple: false,
        has_other_option: true,
    },

    // ─── Phase 2: THE LIVING ROOM (Q04-Q10) ──────────────
    {
        question_key: 'Q04',
        phase: 'P2',
        input_type: 'multiple_choice',
        question_en: 'When you left the house and [Name] was home alone, what usually happened?',
        subtext_en: 'You can pick more than one.',
        choices: [
            { label: 'Followed me around, trying to stop me from leaving', value: 'followed', dimension: 'separation_anxiety', tags: ['anxiety'] },
            { label: 'Waited by the door until I came back', value: 'waited_door', dimension: 'separation_anxiety', tags: ['anxiety', 'attachment'] },
            { label: 'Chewed things up or made a mess', value: 'chewed', dimension: 'coping_style', tags: ['externalizer'] },
            { label: 'Barked, whined, or cried', value: 'barked_cried', dimension: 'coping_style', tags: ['externalizer'] },
            { label: 'Slept quietly in their favorite spot', value: 'slept_quietly', dimension: 'independence', tags: ['independence'] },
            { label: 'Played on their own just fine', value: 'played_alone', dimension: 'independence', tags: ['independence'] },
            { label: 'Stopped eating until I got back', value: 'stopped_eating', dimension: 'separation_anxiety', tags: ['internalizer'] },
            { label: "Honestly, I'm not sure — no camera at home", value: 'not_sure', dimension: 'neutral', tags: ['neutral'] },
        ],
        scoring_dimensions: ['separation_anxiety', 'independence', 'coping_style'],
        is_required: true,
        allow_multiple: true,
        has_other_option: true,
    },
    {
        question_key: 'Q05',
        phase: 'P2',
        input_type: 'single_choice',
        question_en: 'When you gave [Name] a new toy or they saw something unfamiliar, how did they react?',
        choices: [
            { label: 'Ran straight to it — endlessly curious', value: 'ran_straight', score: 90, dimension: 'curiosity_drive' },
            { label: 'Sniffed it cautiously and approached slowly', value: 'sniffed_cautious', score: 70, dimension: 'curiosity_drive' },
            { label: 'Watched it for a long time before showing interest', value: 'watched_long', score: 50, dimension: 'curiosity_drive' },
            { label: "Didn't care much — stuck to what they already loved", value: 'didnt_care', score: 35, dimension: 'curiosity_drive' },
            { label: 'Got scared and backed away', value: 'scared', score: 20, dimension: 'curiosity_drive' },
            { label: 'Ignored the thing but went nuts for the packaging', value: 'packaging', score: 85, dimension: 'curiosity_drive' },
        ],
        scoring_dimensions: ['curiosity_drive', 'emotional_resilience'],
        is_required: true,
        allow_multiple: false,
        has_other_option: true,
    },
    {
        question_key: 'Q06',
        phase: 'P2',
        input_type: 'multiple_choice',
        question_en: 'What kind of play made [Name] the happiest?',
        subtext_en: 'You can pick more than one.',
        choices: [
            { label: 'Fetching a ball or toy', value: 'fetching', dimension: 'active_play' },
            { label: 'Chasing a string or wand toy', value: 'chasing', dimension: 'chase_play' },
            { label: 'Hide-and-seek or chase games with people', value: 'hide_seek', dimension: 'social_play' },
            { label: "Shaking, chewing, or 'destroying' a toy on their own", value: 'destroying', dimension: 'solo_play' },
            { label: 'Wrestling or rolling around together', value: 'wrestling', dimension: 'contact_play' },
            { label: 'Exploring and discovering new things on their own', value: 'exploring', dimension: 'explorer_play' },
            { label: 'Honestly, they just liked being next to me more than playing', value: 'next_to_me', dimension: 'low_play' },
        ],
        scoring_dimensions: ['playfulness_intensity', 'play_style'],
        is_required: true,
        allow_multiple: true,
        has_other_option: true,
    },
    {
        question_key: 'Q07',
        phase: 'P2',
        input_type: 'single_choice',
        question_en: 'When it came to treats or food, what was [Name] like?',
        choices: [
            { label: 'Would do absolutely anything for food — total foodie', value: 'total_foodie', score: 95, dimension: 'food_motivation' },
            { label: 'Loved their favorites, but ate in moderation', value: 'moderation', score: 65, dimension: 'food_motivation' },
            { label: 'Super picky — only ate what they liked', value: 'picky', score: 50, dimension: 'food_motivation' },
            { label: 'Not really into food all that much', value: 'not_into_food', score: 20, dimension: 'food_motivation' },
            { label: 'Treats could get them to do anything — ultimate motivator', value: 'treat_motivator', score: 85, dimension: 'food_motivation' },
            { label: 'Would eat anything I gave them (even people food...)', value: 'eat_anything', score: 80, dimension: 'food_motivation' },
        ],
        scoring_dimensions: ['food_motivation'],
        is_required: true,
        allow_multiple: false,
        has_other_option: true,
    },
    {
        question_key: 'Q08',
        phase: 'P2',
        input_type: 'short_text',
        question_en: "What was [Name]'s absolute favorite thing in the world?",
        subtext_en: 'A treat, a place, an activity, a person — anything that comes to mind.',
        placeholder_en: "e.g., Mom's lap, chicken jerky, sniffing everything on walks...",
        scoring_dimensions: ['joy_map'],
        is_required: true,
        allow_multiple: false,
        has_other_option: false,
    },
    {
        question_key: 'Q09',
        phase: 'P2',
        input_type: 'single_choice',
        question_en: 'On days when you were feeling down or sad, what did [Name] do?',
        choices: [
            { label: 'Noticed right away and came running to be close', value: 'noticed_running', score: 90, dimension: 'empathy_sensitivity' },
            { label: 'Quietly sat beside me without a sound', value: 'sat_quietly', score: 80, dimension: 'empathy_sensitivity' },
            { label: 'Licked my face or nuzzled me more than usual', value: 'licked_nuzzled', score: 85, dimension: 'empathy_sensitivity' },
            { label: "Seemed to sense it but didn't know what to do", value: 'sensed_unsure', score: 55, dimension: 'empathy_sensitivity' },
            { label: "Honestly, I don't think they noticed", value: 'didnt_notice', score: 30, dimension: 'empathy_sensitivity' },
            { label: 'Did something silly to make me laugh', value: 'silly_laugh', score: 70, dimension: 'empathy_sensitivity' },
        ],
        scoring_dimensions: ['empathy_sensitivity', 'family_role'],
        is_required: true,
        allow_multiple: false,
        has_other_option: true,
    },
    {
        question_key: 'Q10',
        phase: 'P2',
        input_type: 'single_choice',
        question_en: 'How was [Name] around other animals?',
        choices: [
            { label: 'Social butterfly — loved making friends', value: 'social_butterfly', score: 90, dimension: 'social_preference' },
            { label: 'Got along well, but did things at their own pace', value: 'own_pace', score: 70, dimension: 'social_preference' },
            { label: 'Wary at first, but slowly warmed up', value: 'wary_warmup', score: 55, dimension: 'social_preference' },
            { label: "Didn't care much for other animals — preferred people", value: 'preferred_people', score: 40, dimension: 'social_preference' },
            { label: 'Got nervous or tried to avoid them', value: 'nervous_avoid', score: 25, dimension: 'social_preference' },
            { label: 'Could be aggressive toward other animals', value: 'aggressive', score: 20, dimension: 'social_preference' },
            { label: 'Rarely ever met other animals', value: 'rarely_met', score: null, dimension: 'social_preference' },
        ],
        scoring_dimensions: ['social_preference'],
        is_required: true,
        allow_multiple: false,
        has_other_option: true,
    },

    // ─── Phase 3: THE QUIET ROOM (Q11-Q14) ───────────────
    {
        question_key: 'Q11',
        phase: 'P3',
        input_type: 'single_choice',
        question_en: 'Where did [Name] usually sleep?',
        choices: [
            { label: 'Always on my bed, right next to me', value: 'my_bed', score: 95, dimension: 'affection_style' },
            { label: 'In the same room, but in their own bed', value: 'same_room', score: 70, dimension: 'affection_style' },
            { label: 'Sometimes with me, sometimes in their own spot', value: 'sometimes', score: 65, dimension: 'affection_style' },
            { label: 'Always in their own space — a different room or favorite corner', value: 'own_space', score: 35, dimension: 'affection_style' },
            { label: 'Never had a set spot — slept somewhere different every night', value: 'no_set_spot', score: 50, dimension: 'affection_style' },
            { label: 'Had to burrow under the blankets no matter what', value: 'burrow_blankets', score: 90, dimension: 'affection_style' },
        ],
        scoring_dimensions: ['affection_style', 'independence'],
        is_required: true,
        allow_multiple: false,
        has_other_option: true,
    },
    {
        question_key: 'Q12',
        phase: 'P3',
        input_type: 'multiple_choice',
        question_en: 'How did you know [Name] loved you? What was their way of showing it?',
        subtext_en: "Pick as many as you'd like.",
        choices: [
            { label: 'Licked my face or hands', value: 'licked', dimension: 'physical' },
            { label: 'Climbed onto my lap or into my arms', value: 'climbed_lap', dimension: 'proximity' },
            { label: 'Wagged their tail (or purred)', value: 'wagged_purred', dimension: 'vocal_body' },
            { label: 'Held eye contact and just... looked at me', value: 'eye_contact', dimension: 'gaze' },
            { label: 'Followed me everywhere I went', value: 'followed', dimension: 'following' },
            { label: 'Showed me their belly', value: 'belly', dimension: 'trust' },
            { label: "Brought me toys or little 'gifts'", value: 'gifts', dimension: 'gift' },
            { label: "Didn't show it much, but I could always tell", value: 'reserved', dimension: 'reserved' },
        ],
        scoring_dimensions: ['affection_languages', 'expression_intensity'],
        is_required: true,
        allow_multiple: true,
        has_other_option: true,
    },
    {
        question_key: 'Q13',
        phase: 'P3',
        input_type: 'multiple_choice',
        question_en: 'When [Name] was scared or anxious — like during a thunderstorm, vet visit, or loud noise — how did they show it?',
        subtext_en: 'You can pick more than one.',
        choices: [
            { label: 'Came to me to hide or be held', value: 'came_to_hide', dimension: 'dependent' },
            { label: 'Found a corner or small space to hide in', value: 'found_corner', dimension: 'internalizer' },
            { label: 'Trembled or panted', value: 'trembled', dimension: 'physiological' },
            { label: 'Barked, whined, or cried', value: 'barked_cried', dimension: 'externalizer' },
            { label: 'Chewed or destroyed things', value: 'chewed', dimension: 'externalizer' },
            { label: 'Stopped eating or acted out of character', value: 'stopped_eating', dimension: 'internalizer' },
            { label: 'Slept a lot more than usual', value: 'slept_more', dimension: 'internalizer' },
            { label: "Surprisingly calm — didn't seem fazed", value: 'calm', dimension: 'resilient' },
        ],
        scoring_dimensions: ['emotional_resilience', 'stress_profile', 'coping_effectiveness'],
        is_required: true,
        allow_multiple: true,
        has_other_option: true,
    },
    {
        question_key: 'Q14',
        phase: 'P3',
        input_type: 'long_text',
        question_en: 'Did [Name] have any funny or unique little habits?',
        subtext_en: "Something weird, cute, or totally random — whatever comes to mind.",
        placeholder_en: 'e.g., Always stole socks and hid them / Watched the washing machine spin for 30 minutes / Kicked their legs while dreaming...',
        guide_en: 'A line or two is plenty. Short is totally fine.',
        scoring_dimensions: ['quirks'],
        is_required: false,
        allow_multiple: false,
        has_other_option: false,
    },

    // ─── Phase 4: THE LETTER (Q15-Q19) ───────────────────
    {
        question_key: 'Q15',
        phase: 'P4',
        input_type: 'long_text',
        question_en: 'Is there a moment with [Name] that still feels vivid — like it just happened?',
        subtext_en: "It doesn't have to be a big moment. Sometimes the smallest ones stay with us the longest.",
        placeholder_en: 'e.g., Watching the rain together by the window / The look on their face the first time they heard their name / How they rested their chin on my hand when I was sick...',
        guide_en: 'Even just one moment is enough.',
        scoring_dimensions: ['signature_moments', 'relationship_essence', 'healing_themes'],
        is_required: false,
        allow_multiple: false,
        has_other_option: false,
    },
    {
        question_key: 'Q16',
        phase: 'P4',
        input_type: 'short_text',
        question_en: 'If [Name] had a secret superpower, what would it be?',
        subtext_en: "It doesn't have to be serious — 'treat radar' or 'couch takeover specialist' totally counts.",
        placeholder_en: 'e.g., Could sense a delivery coming before the doorbell / Emotional support genius / Could squeeze into any space...',
        scoring_dimensions: ['uniqueness'],
        is_required: false,
        allow_multiple: false,
        has_other_option: false,
    },
    {
        question_key: 'Q17', // ⭐ HIGHEST PRIORITY — healing_mission
        phase: 'P4',
        input_type: 'long_text',
        question_en: 'If [Name] could talk, what would you want to hear them say?',
        subtext_en: "Take a moment with this one. There's no right answer.",
        scoring_dimensions: ['healing_mission'],
        is_required: false,
        allow_multiple: false,
        has_other_option: false,
    },
    {
        question_key: 'Q18',
        phase: 'P4',
        input_type: 'long_text',
        question_en: 'If you could say one thing to [Name] right now, what would it be?',
        subtext_en: 'This message will find its way to [Name].',
        scoring_dimensions: ['guilt_points', 'unspoken_words', 'closure_level'],
        is_required: false,
        allow_multiple: false,
        has_other_option: false,
    },
    {
        question_key: 'Q19',
        phase: 'P4',
        input_type: 'single_choice',
        question_en: 'If [Name] could write you a letter, what do you think their style would be?',
        choices: [
            { label: 'Excited and all over the place — "And then! Oh, also! Guess what!"', value: 'expressive_energetic', dimension: 'letter_voice' },
            { label: 'Quiet but warm — "Had a good day today. How are things over there?"', value: 'moderate_warm', dimension: 'letter_voice' },
            { label: 'Short and a little sassy — "You eating okay? Hmph."', value: 'reserved_tsundere', dimension: 'letter_voice' },
            { label: 'Awkward but heartfelt — "I\'m not good at this but... I miss you."', value: 'reserved_earnest', dimension: 'letter_voice' },
            { label: 'Playful and full of personality — "I\'m basically famous here lol, be jealous"', value: 'expressive_playful', dimension: 'letter_voice' },
            { label: 'Gentle and wise — "Don\'t worry about me. I\'m doing just fine here."', value: 'moderate_mature', dimension: 'letter_voice' },
        ],
        scoring_dimensions: ['letter_voice', 'expression_style', 'communication_style'],
        is_required: true,
        allow_multiple: false,
        has_other_option: true,
    },

    // ─── Phase 5: THE LIGHT (Q20-Q21) ────────────────────
    {
        question_key: 'Q20',
        phase: 'P5',
        input_type: 'single_choice',
        question_en: 'What was a typical day like for [Name]?',
        choices: [
            { label: 'Full of energy from morning to night — never stopped', value: 'full_energy', score: 90, dimension: 'energy_level' },
            { label: 'Balanced — played some, rested some, a nice rhythm', value: 'balanced', score: 65, dimension: 'energy_level' },
            { label: 'Mostly napped, but came alive at certain times', value: 'mostly_napped', score: 45, dimension: 'energy_level' },
            { label: 'Spent most of the day quietly, very chill', value: 'quiet_chill', score: 25, dimension: 'energy_level' },
            { label: 'A totally different animal during walks or outings', value: 'different_walks', score: 55, dimension: 'energy_level' },
            { label: 'Only really lit up around mealtime', value: 'mealtime', score: 40, dimension: 'energy_level' },
        ],
        scoring_dimensions: ['energy_level'],
        is_required: true,
        allow_multiple: false,
        has_other_option: true,
    },
    {
        question_key: 'Q21',
        phase: 'P5',
        input_type: 'single_choice',
        question_en: "Are you ready to receive [Name]'s first letter from ToThereOn?",
        choices: [
            { label: "Yes — I've been waiting for this", value: 'yes_waiting', score: 100, dimension: 'readiness_level' },
            { label: "A little nervous, but I'd like to try", value: 'nervous_try', score: 75, dimension: 'readiness_level' },
            { label: "I'm not sure yet... but I'll give it a go", value: 'not_sure', score: 50, dimension: 'readiness_level' },
            { label: "Honestly, it scares me a little — but that's okay", value: 'scared_okay', score: 30, dimension: 'readiness_level' },
        ],
        scoring_dimensions: ['readiness_level'],
        is_required: true,
        allow_multiple: false,
        has_other_option: false,
    },
]

export const TOTAL_QUESTIONS = SURVEY_QUESTIONS_V2.length // 21

// Completion screen text
export const COMPLETION_SCREEN = {
    title: 'Thank you.',
    message: "We're looking for [Name] now. The waterways are vast, so it might take a little while.",
}
