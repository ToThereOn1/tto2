/**
 * Calculates the delivery status of a letter based on the time elapsed since it was sent.
 * 
 * Timeline:
 * - 0h ~ 48h: Sent (Step 1)
 * - 48h ~ 72h: Arrived at ToThereOn (Step 2)
 * - 72h ~ 96h: Delivered to Pet (Step 3)
 * - 96h ~ 120h: Pet is Writing (Step 4)
 * - 120h ~ 168h: Reply Sent (Step 5) - "Pet has sent a reply"
 * - 168h+: Reply Arrived / Replied (Step 6) - "Check your inbox"
 */
/**
 * Calculates the delivery status of a letter based on the time elapsed since it was sent.
 * 
 * Timeline:
 * - 0h ~ 48h: Sent (Step 1)
 * - 48h ~ 72h: Arrived at ToThereOn (Step 2)
 * - 72h ~ 96h: Delivered to Pet (Step 3)
 * - 96h ~ 120h: Pet is Writing (Step 4)
 * - 120h+: Reply Ready (Step 5) - Only if reply actually exists
 */
export function getMailboxStatus(lastLetterDate: string | null, timeOffsetHours: number = 0, hasReply: boolean = false) {
    if (!lastLetterDate) {
        return {
            step: 0,
            status: 'No letters sent yet',
            label: 'Ready to send',
            progress: 0,
            nextIn: 0
        };
    }

    const now = Date.now();
    // Effective Now = Real Now + Offset
    const effectiveNow = now + (timeOffsetHours * 60 * 60 * 1000);
    const sentTime = new Date(lastLetterDate).getTime();
    const hoursPassed = (effectiveNow - sentTime) / (1000 * 60 * 60);

    // Step 1: Sent (0-48h)
    if (hoursPassed < 48) {
        return {
            step: 1,
            label: 'Sent',
            description: 'Your letter is traveling through the Waterway.',
            nextIn: 48 - hoursPassed,
            progress: (hoursPassed / 48) * 20
        };
    }
    // Step 2: Arrived (48-72h)
    if (hoursPassed < 72) {
        return {
            step: 2,
            label: 'Arrived at ToThereOn',
            description: 'It has reached the Rainbow Gate.',
            nextIn: 72 - hoursPassed,
            progress: 20 + ((hoursPassed - 48) / 24) * 20
        };
    }
    // Step 3: Delivered (72-96h)
    if (hoursPassed < 96) {
        return {
            step: 3,
            label: 'Delivered to Pet',
            description: 'Your pet is reading your letter.',
            nextIn: 96 - hoursPassed,
            progress: 40 + ((hoursPassed - 72) / 24) * 20
        };
    }
    // Step 4: Writing (96-120h)
    if (hoursPassed < 120) {
        return {
            step: 4,
            label: 'Writing Reply...',
            description: 'Your pet is writing a reply.',
            nextIn: 120 - hoursPassed,
            progress: 60 + ((hoursPassed - 96) / 24) * 20
        };
    }

    // Step 5: Reply Ready (120h+) OR Still Writing
    if (hasReply) {
        return {
            step: 6, // Jump to completed
            label: 'Reply Arrived!',
            description: 'Check your inbox!',
            nextIn: 0,
            progress: 100
        };
    } else {
        // Just stay at Step 4 but full progress
        return {
            step: 4,
            label: 'Writing Reply...',
            description: 'Your pet is thinking deeply...',
            nextIn: 0,
            progress: 80
        };
    }
}
