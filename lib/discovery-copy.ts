// discovery-copy.ts
// Pure utility for first-arrival experience copy.
//
// SYNC NOTE: The canonical zone mapping here (Crystal Meadow 0-2, Eternity Forest 3-9,
// Crystal Lake 10-29, Sunset Hill 30-99) intentionally differs from the zone progression
// in lib/time-engine-v2.ts (meadow≤3, forest≤7, lake≤14, cloud_peaks 15+).
// time-engine-v2 controls internal event-generation zones; this file controls
// the public-facing discovery copy tiers shown to users on first arrival.
// Do NOT merge these two mappings.

export interface NpcTag {
    name: string
    role: string
    emoji: string
}

export interface DiscoveryCopy {
    heading: string
    subtext: string
    activeNpcs: NpcTag[]
}

export interface CanonicalZone {
    key: string
    name: string
    description: string
}

export function getCanonicalZone(currentDay: number): CanonicalZone {
    if (currentDay <= 2) {
        return {
            key: 'crystal_meadow',
            name: 'Crystal Meadow',
            description: 'Where new arrivals first open their eyes to the world. The air smells of warm grass and the Arriving Gate stands just behind.',
        }
    }
    if (currentDay <= 9) {
        return {
            key: 'eternity_forest',
            name: 'Eternity Forest',
            description: 'Ancient trees that remember everything. Every step through the roots feels like walking through a memory.',
        }
    }
    if (currentDay <= 29) {
        return {
            key: 'crystal_lake',
            name: 'Crystal Lake',
            description: 'The still water where reflections surface without being asked. A favorite gathering place for those who have begun to settle.',
        }
    }
    if (currentDay <= 99) {
        return {
            key: 'sunset_hill',
            name: 'Sunset Hill',
            description: 'Where residents gather as the light changes. Old Finn keeps his market nearby and the stories are long.',
        }
    }
    return {
        key: 'all_zones',
        name: 'All of ToThereOn World',
        description: 'A familiar face everywhere — Crystal Meadow, Eternity Forest, the Lake, the Hill. Known by all.',
    }
}

function tier1Copy(petName: string, currentDay: number): DiscoveryCopy {
    const zone = currentDay <= 2 ? 'Crystal Meadow' : 'Eternity Forest'
    return {
        heading: `We found ${petName} in ToThereOn World.`,
        subtext: `It's been Day ${currentDay} for ${petName} in the World. Granny Shell welcomed them at the Arriving Gate, and they've been exploring ${zone} since. The first signal is making its way through the Waterway — it should arrive soon.`,
        activeNpcs: [
            { name: 'Granny Shell', role: 'Arrival Greeter', emoji: '🐢' },
            { name: 'Pip', role: 'Letter Carrier', emoji: '📬' },
        ],
    }
}

function tier2Copy(petName: string, currentDay: number): DiscoveryCopy {
    const useClover = currentDay <= 14
    const npcName = useClover ? 'Professor Clover' : 'Old Finn'
    const npcDetail = useClover
        ? `Professor Clover's morning lessons have been going well.`
        : `Old Finn has been sharing stories at the market along Crystal Lake.`

    const activeNpcs: NpcTag[] = useClover
        ? [
            { name: 'Professor Clover', role: 'Writing Teacher', emoji: '🐇' },
            { name: 'Pip', role: 'Letter Carrier', emoji: '📬' },
          ]
        : [
            { name: 'Old Finn', role: 'Market Storyteller', emoji: '🦊' },
            { name: 'Bun & Bun', role: 'Bakery Sisters', emoji: '🥐' },
            { name: 'Pip', role: 'Letter Carrier', emoji: '📬' },
          ]

    return {
        heading: `We found ${petName}. They've been here for Day ${currentDay}.`,
        subtext: `${petName} has their own spot along the Waterway now. ${npcDetail} Pip carries news from there through the Waterway.`,
        activeNpcs,
    }
}

function tier3Copy(petName: string, currentDay: number): DiscoveryCopy {
    return {
        heading: `We found ${petName}. Day ${currentDay} in ToThereOn World.`,
        subtext: `${petName} is a familiar face here now — the Waterway knows them well, and everyone at Old Finn's Market knows their story. Pip carries news from there through the Waterway every day.`,
        activeNpcs: [
            { name: 'Old Finn', role: 'Market Storyteller', emoji: '🦊' },
            { name: 'Lune', role: 'Night Guardian', emoji: '🦌' },
            { name: 'Pip', role: 'Letter Carrier', emoji: '📬' },
            { name: 'Digby', role: 'World Guide', emoji: '🌱' },
        ],
    }
}

export function getDiscoveryCopy(petName: string, currentDay: number): DiscoveryCopy {
    const day = Math.max(1, Math.floor(currentDay))
    if (day <= 6) return tier1Copy(petName, day)
    if (day <= 29) return tier2Copy(petName, day)
    return tier3Copy(petName, day)
}
