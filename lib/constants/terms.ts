// Current version of Terms of Service and Privacy Policy
// Update this when terms change — triggers re-consent prompt for existing users
export const TERMS_VERSION = '2026-03-05'
export const PRIVACY_VERSION = '2026-03-05'

// All consent item IDs that must be accepted
export const REQUIRED_CONSENT_ITEMS = [
    'ai_simulation',
    'not_therapy',
    'data_processing',
    'age_confirm',
] as const
