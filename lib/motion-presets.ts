export const LIVING_PAINTING_ENTER = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
};

export const GENTLE_FADE_IN = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

export const CARD_ENTER = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

export const AMBIENT_BREATHE = {
    animate: { scale: [1, 1.005, 1] },
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
};

export const STAGGER_CONTAINER = {
    initial: 'hidden' as const,
    animate: 'visible' as const,
    variants: {
        visible: { transition: { staggerChildren: 0.08 } },
        hidden: {},
    },
};

export const STAGGER_ITEM = {
    variants: {
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
    },
};

export const REDUCED_MOTION_FALLBACK = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.15 },
};
