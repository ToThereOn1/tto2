import { getGlobalToThereOnDay } from './world-clock';
import { getSeasonState, type Season } from './season-engine';

export interface WorldSpark {
    text: string;
    category: 'weather' | 'atmosphere' | 'phenomenon';
}

const SPARK_POOL: Record<string, Record<Season | 'any', WorldSpark[]>> = {
    crystal_meadow: {
        any: [
            { text: 'The crystal flowers turned slightly toward the light, all at once, like a held breath released.', category: 'atmosphere' },
            { text: 'A warm updraft carried pollen in a slow spiral above the meadow center.', category: 'weather' },
            { text: 'The grass shifted from silver to pale green as the light changed angle.', category: 'atmosphere' },
            { text: 'Something glinted at the meadow edge — gone before anyone looked directly.', category: 'phenomenon' },
            { text: '', category: 'atmosphere' }, // ordinary day
        ],
        bloom: [
            { text: 'Tiny translucent buds appeared overnight along the crystal stems.', category: 'atmosphere' },
            { text: 'The meadow smelled faintly of something sweet and unfamiliar.', category: 'weather' },
        ],
        warmth: [
            { text: 'The crystal flowers opened wider than usual, catching every particle of light.', category: 'atmosphere' },
            { text: 'Heat shimmered above the meadow stones, making the far edge waver.', category: 'weather' },
        ],
        drift: [
            { text: 'A few crystal petals detached and drifted groundward, spinning slowly.', category: 'atmosphere' },
            { text: 'The morning dew took longer to evaporate today.', category: 'weather' },
        ],
        stillness: [
            { text: 'A thin frost covered each blade of grass, glinting like scattered glass.', category: 'atmosphere' },
            { text: 'The air was so still that sound carried from the far side of the meadow.', category: 'weather' },
        ],
    },
    eternity_forest: {
        any: [
            { text: 'The blue moss pulsed faintly, as it does when the canopy is thick.', category: 'atmosphere' },
            { text: 'A branch creaked overhead — not from wind, but from slow, imperceptible growth.', category: 'phenomenon' },
            { text: 'The forest floor was damp. Mushrooms appeared along the fallen trunk near the east path.', category: 'atmosphere' },
            { text: 'Light filtered through the canopy in narrow beams that shifted as clouds moved above.', category: 'weather' },
            { text: '', category: 'atmosphere' },
        ],
        bloom: [
            { text: 'New ferns uncurled along the path edges, pale and still soft.', category: 'atmosphere' },
        ],
        warmth: [
            { text: 'The canopy was so thick today that the forest floor stayed cool and dim.', category: 'weather' },
        ],
        drift: [
            { text: 'Leaves turned copper at the edges. The forest smelled of woodsmoke and earth.', category: 'atmosphere' },
        ],
        stillness: [
            { text: 'Ice crystals formed on the moss, making the blue glow sharper and colder.', category: 'atmosphere' },
        ],
    },
    crystal_lake: {
        any: [
            { text: 'The lake surface was perfectly still — not a single ripple for hours.', category: 'atmosphere' },
            { text: 'Fish surfaced briefly, then dove. The circles they left took a long time to fade.', category: 'phenomenon' },
            { text: 'The reflection of two moons wavered on the water at dusk.', category: 'atmosphere' },
            { text: '', category: 'atmosphere' },
        ],
        bloom: [
            { text: 'Water lilies appeared at the lake edge, white and luminous.', category: 'atmosphere' },
        ],
        warmth: [
            { text: 'The lake was warm at the surface. Steam rose from it at dawn.', category: 'weather' },
        ],
        drift: [
            { text: 'Fallen leaves floated on the lake surface, forming slow patterns.', category: 'atmosphere' },
        ],
        stillness: [
            { text: 'The lake froze at the edges overnight. The center stayed liquid, dark and deep.', category: 'atmosphere' },
        ],
    },
    sunset_hill: {
        any: [
            { text: 'The wind changed direction twice before noon. No one commented on it.', category: 'weather' },
            { text: 'From the hilltop, the entire world was visible — meadow, forest, lake, and the Waterway beyond.', category: 'atmosphere' },
            { text: 'The bell from Guardian Tower rang once. Then silence.', category: 'phenomenon' },
            { text: '', category: 'atmosphere' },
        ],
        bloom: [
            { text: 'Wildflowers covered the hillside in patches — purple, gold, white.', category: 'atmosphere' },
        ],
        warmth: [
            { text: 'The hilltop grass was warm enough to lie in. The ground held the day\'s heat.', category: 'weather' },
        ],
        drift: [
            { text: 'The sunset lasted longer than usual. No one could say when it ended.', category: 'atmosphere' },
        ],
        stillness: [
            { text: 'Frost sparkled on the hilltop stones. The view was clearer than it had been in weeks.', category: 'weather' },
        ],
    },
};

function seededIndex(seed: number, poolSize: number): number {
    const hash = ((seed * 2654435761) >>> 0) % poolSize;
    return hash;
}

export function getWorldSparkForDay(zone: string, globalDay?: number): WorldSpark {
    const day = globalDay ?? getGlobalToThereOnDay();
    const seasonState = getSeasonState(day);
    const zonePool = SPARK_POOL[zone] ?? SPARK_POOL.crystal_meadow;

    const seasonSparks = zonePool[seasonState.season] ?? [];
    const anySparks = zonePool.any ?? [];
    const combined = [...seasonSparks, ...anySparks];

    if (combined.length === 0) return { text: '', category: 'atmosphere' };

    const idx = seededIndex(day * 31 + zone.charCodeAt(0), combined.length);
    return combined[idx] ?? { text: '', category: 'atmosphere' };
}

export function getWorldSparkText(zone: string, globalDay?: number): string {
    return getWorldSparkForDay(zone, globalDay).text;
}
