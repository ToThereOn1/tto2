
import { PetPersona, PersonaProfile, DimensionalScores } from '@/lib/types/database';

interface NarrativeProfile {
    personality_description: string; // 3-5 line natural language personality description
    speaking_quirks: string;         // Speech habits, tone characteristics
    emotional_defaults: string;      // How emotions are expressed
    memory_style: string;            // How memories are recalled
}

/**
 * Converts persona data into a narrative profile for LLM prompts.
 * This is a utility for translating raw scores into natural language.
 */
export function buildNarrativeProfile(persona: PetPersona): NarrativeProfile {
    const scores = persona.dimensional_scores;
    const profile = persona.persona_profile;
    const traits: string[] = [];

    // Social Energy (social_energy)
    if (scores.social_energy >= 80)
        traits.push('Runs up to everyone first — greets even strangers with open enthusiasm');
    else if (scores.social_energy >= 50)
        traits.push('Observes cautiously at first, then approaches once comfortable');
    else
        traits.push('Values personal space deeply — only opens up to trusted companions');

    // Playfulness (playfulness_intensity)
    if (scores.playfulness_intensity >= 80)
        traits.push('Bursting with energy and mischief — turns everything into a game');
    else if (scores.playfulness_intensity >= 50)
        traits.push('Enjoys playtime but also appreciates quiet rest');
    else
        traits.push('Prefers calm companionship over active play');

    // Affection (affection_style)
    if (scores.affection_style >= 85)
        traits.push('Deeply dependent on their owner — gets anxious without them, loves intensely');
    else if (scores.affection_style >= 60)
        traits.push('Adores their owner more than anything but manages fine on their own too');
    else
        traits.push('Independent by nature, but always there when it truly matters');

    // Curiosity (curiosity_drive)
    if (scores.curiosity_drive >= 75)
        traits.push('Always poking their nose into new smells, sounds, and spaces — endlessly curious');
    else
        traits.push('Finds comfort in the familiar — prefers stability over change');

    // Communication Style
    const comms = profile.communication_style;
    const verbalStyle = comms.vocabulary_preference || 'Says what they want to say, but never rambles';
    const emotionalStyle = comms.emotional_range || 'Expresses emotions honestly';

    return {
        personality_description: traits.join('. ') + '. ' + profile.personality_summary,
        speaking_quirks: `${comms.letter_voice_tone || 'Warm tone'}. ${comms.sentence_structure || 'Natural sentence flow'}. ${verbalStyle}`,
        emotional_defaults: emotionalStyle,
        memory_style:
            scores.curiosity_drive >= 70
                ? 'Remembers vividly — specific scenes, smells, and sounds'
                : 'Remembers by feeling and atmosphere rather than precise details',
    };
}
