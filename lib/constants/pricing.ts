
export const PRICING_PLANS = {
    free: {
        id: 'free',
        name: 'Free',
        price: { monthly: 0, yearly: 0 },
        badge: null,
        tagline: 'From a Distance',
        description: "You'll know they're okay. They send a letter. So do you.",
        features: [
            { text: '1 companion in ToThereOn World', included: true },
            { text: "Weekly updates — they're living their days", included: true },
            { text: 'Write to them, 2 letters a month', included: true },
            { text: '2 replies back — in their voice', included: true },
            { text: 'The distance is real. But so is the connection.', included: true },
        ],
        buttonText: 'Send My First Letter',
        buttonVariant: 'outline',
        status: 'active',
        note: "Your first letter takes 7 days to arrive. That's how you know it matters.",
    },
    basic: {
        id: 'basic',
        name: 'Basic',
        price: { monthly: 9.99, yearly: 99 },
        badge: 'MOST POPULAR',
        tagline: 'Staying Close',
        description: 'Twice a week, you hear from them. You write whenever you need to.',
        features: [
            { text: '1 companion in ToThereOn World', included: true },
            { text: "Updates twice a week — what they've been up to", included: true },
            { text: '4 letters a month, whenever you need to reach them', included: true },
            { text: "4 replies — written in their voice, from their days", included: true },
            { text: 'Full journal: every day since they arrived', included: true },
            { text: '7-day delivery — because real letters take time', included: true },
        ],
        buttonText: 'Stay Connected',
        buttonVariant: 'primary',
        status: 'active',
        note: 'Most Free users write their first letter within days of signing up. Most upgrade within the month.',
    },
    premium: {
        id: 'premium',
        name: 'Premium',
        price: { monthly: 19.99, yearly: 199 },
        badge: 'COMING SOON',
        tagline: 'Right There With Them',
        description: "Every image. Every day. Like you never had to say goodbye.",
        features: [
            { text: 'Everything in Basic', included: true },
            { text: '2 companions — bring someone else along', included: true },
            { text: "Illustrated updates — see their world, not just read it", included: true },
            { text: 'Send them photos — they write back about what they see', included: true },
            { text: 'Illustrated replies — moments you can hold onto', included: true },
            { text: 'Priority support', included: true },
        ],
        buttonText: 'Reserve My Spot',
        buttonVariant: 'secondary',
        status: 'coming_soon',
        note: 'Join early. The first 500 members get Premium at Basic pricing — forever.',
    }
} as const;

export type PricingTier = keyof typeof PRICING_PLANS;
