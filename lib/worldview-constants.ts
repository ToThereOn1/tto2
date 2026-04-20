/**
 * ToThereOn Worldview Constants v3.0
 * Complete worldview rulebook with zones, locations, NPCs, and guardians.
 * v3.0: Guardian NPC system replaced by World Bible canon NPCs.
 *       Reflection Pool rule updated to warmth-only (World Bible authority).
 */

import { TIME_RATIO } from '@/lib/time-constants';
import { CANON_NPCS } from '@/lib/world-bible';

export const WORLDBOOK = {
    UNIVERSE: {
        LAYERS: {
            TOP: "The Beyond (Final Destination)",
            MIDDLE: "ToThereOn (Pet World - Transit Station)",
            BOTTOM: "Earth (Physical World)"
        },
        RULES: {
            TRANSIT_MANDATORY: "Pets with owners MUST pass through ToThereOn.",
            REUNION_GUARANTEED: "100% reunion guarantee; it's a matter of time, not probability.",
            DEPARTURE_TOGETHER: "After reunion, stay 3-7 days, then depart to The Beyond together."
        }
    },

    TIME: {
        RATIO: TIME_RATIO, // 1 Beyond Day = 3 Earth Days
        CALCULATION: "Earth 50 Years = ToThereOn ~16.7 Years",
        MEANING: "Long but bearable wait."
    },

    ZONES: {
        CENTRAL_PLAZA: {
            id: "central_plaza",
            name: "Central Plaza",
            description: "Arrival point, meeting place, Guardian Tower.",
            features: ["Guardian Tower", "Welcome Plaza", "Bonfire Area", "Milky Way Bridge Entrance"],
            locations: [
                { id: "welcome_plaza", name: "Welcome Plaza", description: "A wide open space with warm golden light. New arrivals appear here, greeted by gentle chimes. The stone floor holds faint paw prints of those who came before.", suitable_for_events: ["arrival", "milestone", "any"] },
                { id: "guardian_tower", name: "Guardian Tower", description: "A tall ivory tower at the plaza's center. Its bell rings softly at dawn and dusk, marking the passage of ToThereOn time.", suitable_for_events: ["milestone", "guardian_observation"] },
                { id: "bonfire_circle", name: "Bonfire Circle", description: "A permanent fire that burns without smoke, surrounded by warm stones. Pets gather here in the evenings, the flames casting dancing shadows across peaceful faces.", suitable_for_events: ["daily_routine", "npc_interaction"] }
            ]
        },
        LIVING_AREAS: [
            {
                id: "crystal_meadow",
                name: "Crystal Meadow",
                description: "Endless grass fields dotted with crystalline flowers that catch the light. Butterflies with translucent wings drift lazily. The air smells of warm honey and fresh rain.",
                activities: ["Running", "Ball fetch", "Socializing", "Butterfly chasing"],
                locations: [
                    { id: "meadow_center", name: "Crystal Meadow Center", description: "The heart of the meadow, where the grass grows tallest and crystal flowers bloom in clusters. Light refracts through petals, casting tiny rainbows across the ground.", suitable_for_events: ["exploration", "daily_routine", "any"] },
                    { id: "butterfly_garden", name: "Butterfly Garden", description: "A sheltered hollow where translucent butterflies gather in swirling clouds. Their wings catch sunlight and scatter it like prisms.", suitable_for_events: ["exploration", "daily_routine"] },
                    { id: "meadow_edge", name: "Meadow's Edge", description: "Where the crystal flowers thin out and tall grass sways. A quiet spot away from the center, with a view of the entire meadow stretching to the horizon.", suitable_for_events: ["daily_routine", "guardian_observation"] },
                    { id: "reflection_pool_meadow", name: "Reflection Pool", description: "A perfectly still pool at the meadow's south edge. Its surface glows with soft light — not images, only warmth. Pets sit here when something indefinable pulls them close. Nothing comes clearly. Only presence.", suitable_for_events: ["guardian_observation", "letter_response"] }
                ]
            },
            {
                id: "eternity_forest",
                name: "Eternity Forest",
                description: "Giant ancient trees with silver bark, their canopy filtering golden light into shifting patterns on the forest floor. Moss glows faintly blue at night. The air is cool and smells of cedar.",
                activities: ["Exploring", "Climbing", "Resting", "Listening"],
                locations: [
                    { id: "northern_grove", name: "Northern Grove", description: "The oldest part of the forest, where shadows gather thick and roots create natural shelters. Ancient trees filter golden light into amber pools on the mossy floor.", suitable_for_events: ["exploration", "npc_interaction", "any"] },
                    { id: "whispering_hollow", name: "Whispering Hollow", description: "A natural amphitheater formed by curved trees. Sounds carry strangely here—sometimes you can hear distant echoes that sound like familiar voices.", suitable_for_events: ["guardian_observation", "daily_routine"] },
                    { id: "silver_canopy", name: "Silver Canopy", description: "The highest branches of the forest, accessible by spiraling tree paths. From here, you can see the entire world of ToThereOn spread out below.", suitable_for_events: ["exploration", "milestone"] },
                    { id: "reflection_pool_forest", name: "Forest Reflection Pool", description: "Hidden among fern-covered boulders. The pool's surface stays still even when wind moves the ferns. Pets find it without meaning to. The forest is unusually quiet here. Something is felt, not seen.", suitable_for_events: ["guardian_observation", "letter_response"] }
                ]
            },
            {
                id: "crystal_lake",
                name: "Crystal Lake",
                description: "Clear water so transparent you can see smooth stones at the bottom. A gentle beach curves along one shore. The water is always warm and the lake breathes softly with small waves.",
                activities: ["Swimming", "Beach rest", "Paddling", "Stone watching"],
                locations: [
                    { id: "lake_shore", name: "Lake Shore", description: "Smooth pebbles and fine sand meet water so clear it seems to glow. Small waves lap rhythmically, and the sunset paints the surface in copper and rose.", suitable_for_events: ["daily_routine", "any"] },
                    { id: "quiet_cove", name: "Quiet Cove", description: "A sheltered inlet where the water is perfectly still. Overhanging willows create a private canopy. The sand here is unusually warm.", suitable_for_events: ["daily_routine", "letter_response"] },
                    { id: "deep_waters", name: "Deep Waters", description: "The center of the lake, where the water shifts from clear to deep sapphire. Sunlight penetrates to the bottom, illuminating smooth white stones arranged in natural patterns.", suitable_for_events: ["exploration"] },
                    { id: "reflection_pool_lake", name: "Lake's Edge Pool", description: "Where the lake narrows into a still channel. The surface holds no images — only soft light that arrives from no direction in particular. Pets sit here, paws tucked beneath them. They do not know what they are waiting for. Something warm passes through.", suitable_for_events: ["guardian_observation", "letter_response"] }
                ]
            },
            {
                id: "sunset_hill",
                name: "Sunset Hill",
                description: "Rolling hills with panoramic views of the entire ToThereOn world. The wind is constant and warm. Tall grass ripples like ocean waves. The sunset here lasts for hours.",
                activities: ["Wind bathing", "Meditation", "Sunset watching", "Running downhill"],
                locations: [
                    { id: "hilltop", name: "Hilltop Summit", description: "The highest point in ToThereOn. The entire valley spreads below—meadows, forests, the lake—all visible. The wind carries scents from every zone.", suitable_for_events: ["milestone", "exploration", "any"] },
                    { id: "wind_ridge", name: "Wind Ridge", description: "A narrow ridge where the wind blows strongest. Fur and grass flatten in the same direction. Standing here feels like being at the edge of the world.", suitable_for_events: ["exploration", "daily_routine"] },
                    { id: "sunset_terrace", name: "Sunset Terrace", description: "A natural stone platform facing west. The sunset pours liquid gold across its surface every evening. Pets gather here to watch the light fade.", suitable_for_events: ["daily_routine", "guardian_observation"] },
                    { id: "tall_grass_field", name: "Tall Grass Field", description: "Waist-high grass that hides small paths and secret resting spots. The grass whispers when the wind passes through, and small flowers bloom between the blades.", suitable_for_events: ["daily_routine", "letter_response"] }
                ]
            }
        ]
    },

    // World Bible canon NPCs (v3.0) — replaces legacy Guardian system
    // Source: lib/world-bible.ts CANON_NPCS
    CANON_NPCS,

    // Companion NPCs — 10 named neighbors (unchanged from World Bible)
    EVENT_NPCS: [
        { id: "happy", name: "Happy", species: "Golden Retriever", personality: "Extroverted", trait: "Social Butterfly", zones: ["crystal_meadow", "central_plaza", "crystal_lake"] },
        { id: "choco", name: "Choco", species: "Poodle", personality: "Cautious", trait: "Deep Thinker", zones: ["eternity_forest", "crystal_lake"] },
        { id: "tory", name: "Tory", species: "Corgi", personality: "Curious", trait: "Explorer", zones: ["crystal_meadow", "eternity_forest", "sunset_hill"] },
        { id: "cloud", name: "Cloud", species: "Samoyed", personality: "Gentle", trait: "Peacemaker", zones: ["eternity_forest", "crystal_lake", "sunset_hill"] },
        { id: "lightning", name: "Lightning", species: "Beagle", personality: "Mischievous", trait: "Prankster", zones: ["crystal_meadow", "central_plaza"] },
        { id: "star", name: "Star", species: "Chihuahua", personality: "Sensitive", trait: "Picky but Loyal", zones: ["sunset_hill", "crystal_lake"] },
        { id: "mong", name: "Mong", species: "Persian Cat", personality: "Lazy", trait: "Relaxed Master", zones: ["crystal_lake", "eternity_forest"] },
        { id: "ruby", name: "Ruby", species: "Russian Blue", personality: "Elegant", trait: "Classy", zones: ["central_plaza", "sunset_hill"] },
        { id: "wind", name: "Wind", species: "Shiba Inu", personality: "Independent", trait: "Free Spirit", zones: ["sunset_hill", "crystal_meadow", "eternity_forest"] },
        { id: "bokshil", name: "Bokshil", species: "Maltese", personality: "Innocent", trait: "Pure Soul", zones: ["crystal_meadow", "crystal_lake"] }
    ],

    // World Bible Reflection Pool rules (v3.0)
    // CRITICAL: Pets do NOT see their guardians. Warmth only. No visual observation.
    REFLECTION_POOL: {
        RULE: "Warmth only — NOT visual observation. Pets feel a vague pull toward the pool. What they receive is NOT a clear image. It is warmth. Proximity. Presence. Nothing specific.",
        ABSOLUTE_PROHIBITION: "NEVER depict guardian actions, locations, emotional states, physical descriptions, or any speculation. No 'could see', 'watched', 'glimpsed'.",
        ALLOWED_EXPRESSION: "Body-felt impression only: 'A warmth moved through [Name], from no particular direction.' / 'Nothing came clearly — only warmth.'",
        LOCATIONS: ["reflection_pool_meadow", "reflection_pool_forest", "reflection_pool_lake"],
        FEELING: "Warmth. Proximity. Presence. Never a scene."
    },

    // Event types with descriptions for prompt context
    EVENT_TYPES: {
        exploration: "Pet discovers or explores a location",
        npc_interaction: "Pet meets and interacts with a canon NPC (Granny Shell, Pip, Professor Clover, Old Finn, Bun & Bun, Digby, or Lune)",
        daily_routine: "Pet's peaceful daily activities",
        letter_response: "Pet reacts to received letter (MUST reference letter content)",
        guardian_observation: "Pet sits by Reflection Pool — warmth sensation only, NO visual depiction of guardian",
        milestone: "Special day (Day 7, 30, 100, etc.) — Lune may appear at Two-Moon Hill"
    }
} as const;
