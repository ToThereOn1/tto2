// Database types for ToThereOn
// Auto-generated based on schema.sql

export type SubscriptionTier = 'free' | 'basic' | 'premium';
export type Species = 'dog' | 'cat' | 'rabbit' | 'bird' | 'hamster' | 'other';
export type Gender = 'male' | 'female';
export type Relationship = 'mom' | 'dad' | 'friend' | 'sister' | 'brother' | 'guardian' | 'other';
export type NotificationType = 'welcome' | 'letter_status' | 'new_event' | 'subscription' | 'system';
export type InputType = 'single_choice' | 'multiple_choice' | 'short_text' | 'long_text' | 'slider';

// =====================================================
// USER
// =====================================================
export interface User {
    id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    subscription_tier: SubscriptionTier;
    subscription_start_date: string | null;
    max_pets_allowed: number;
    created_at: string;
    updated_at: string;
}

// =====================================================
// PET
// =====================================================
export interface Pet {
    id: string;
    user_id: string;
    name: string;
    birth_date: string | null;
    passed_date: string;
    species: Species;
    breed: string | null;
    weight_kg: number | null;
    gender: Gender | null;
    photos: string[] | null;
    relationship: Relationship | null;
    persona_generated: boolean;
    created_at: string;
    updated_at: string;
}

export interface PetFormData {
    name: string;
    birth_date: string;
    passed_date: string;
    species: Species;
    breed: string;
    weight_kg: number | null;
    gender: Gender;
    relationship: Relationship;
    photos: File[];
}

// =====================================================
// SURVEY QUESTIONS
// =====================================================
export interface SurveyQuestion {
    id: number;
    question_key: string;
    section: string;
    input_type: InputType;
    question_en: string;
    question_kr: string | null;
    choices_en: string[] | null;
    choices_kr: string[] | null;
    placeholder_en: string | null;
    placeholder_kr: string | null;
    help_text_en: string | null;
    help_text_kr: string | null;
    display_order: number;
    scoring_dimension: string | null;
    scoring_map: Record<string, number> | null;
    is_required: boolean;
    is_active: boolean;
    // v2.2 extensions
    version?: number;
    phase?: string;
    phase_intro_text?: string | null;
    allow_multiple?: boolean;
}

// =====================================================
// DEEP REMEMBRANCE RESPONSES
// =====================================================
export interface DeepRemembranceResponse {
    id: string;
    pet_id: string;
    user_id: string;
    responses: Record<string, string | string[]>;
    current_question_index: number;
    total_questions: number;
    completion_percentage: number;
    started_at: string;
    last_saved_at: string;
    completed_at: string | null;
    time_spent_seconds: number;
    created_at: string;
    survey_version?: number;
}

export type HealingDirection = 'guilt_relief' | 'grief_comfort' | 'love_affirmation' | 'closure';

export interface HealingMission {
    core_desire: string;
    desired_messages: string[];
    healing_direction: HealingDirection;
}

// =====================================================
// PET PERSONA
// =====================================================
export interface DimensionalScores {
    social_energy: number;
    curiosity_drive: number;
    affection_style: number;
    emotional_resilience: number;
    playfulness_intensity: number;
    food_motivation: number;
    empathy_sensitivity: number;
    social_preference: number;
}

export interface NarrativeData {
    nickname: string;
    secret_habit: string;
    favorite_snack: string;
    precious_memory: string;
    special_superpower: string;
    joyful_treasure: string;
    unsaid_message: string;
    relationship_type: string;
    voice_tone: string;
    afterlife_landscape: string;
    overall_presence: string;
}

export interface PersonaProfile {
    personality_summary: string;
    core_traits: string[];
    behavioral_patterns: {
        daily_routines: string;
        social_interactions: string;
        stress_responses: string;
        joy_triggers: string;
    };
    communication_style: {
        letter_voice_tone: string;
        vocabulary_preference: string;
        sentence_structure: string;
        emotional_range: string;
    };
    memory_anchors: Array<{
        category: string;
        details: string;
    }>;
    afterlife_setting: {
        primary_landscape: string;
        daily_activities: string;
        emotional_state: string;
    };
    letter_generation_guidelines: {
        opening_style: string;
        content_themes: string[];
        closing_style: string;
        forbidden_patterns: string[];
    };
    persona_quality_score: {
        detail_richness: number;
        emotional_authenticity: number;
        behavioral_consistency: number;
        narrative_depth: number;
        overall_score: number;
    };
}

export interface PetPersona {
    id: string;
    pet_id: string;
    response_id: string | null;
    dimensional_scores: DimensionalScores;
    narrative_data: NarrativeData;
    persona_profile: PersonaProfile;
    quality_score: number;
    detail_richness: number | null;
    emotional_authenticity: number | null;
    behavioral_consistency: number | null;
    narrative_depth: number | null;
    generation_model: string;
    generation_timestamp: string;
    created_at: string;
    updated_at: string;
}

// =====================================================
// NOTIFICATIONS
// =====================================================
export interface Notification {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    link_url: string | null;
    is_read: boolean;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface NotificationSettings {
    user_id: string;
    email_letter_updates: boolean;
    email_pet_events: boolean;
    email_marketing: boolean;
    in_app_sounds: boolean;
    updated_at: string;
}

// =====================================================
// PET STATUS EVENTS (Feed)
// =====================================================
export interface PetStatusEvent {
    id: string;
    pet_id: string;
    tothereon_day: number;
    event_type: string;
    event_title: string;
    event_description: string | null;
    zone: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

// =====================================================
// LETTERS (Mailbox)
// =====================================================
export type SenderType = 'user' | 'pet';
// Letter Status Workflow (Module 07):
// sent (0h) → arrived_tothereon (48h) → delivered (72h) → writing_reply (96h) → pending_review (120h) → approved
export type LetterStatus = 'sent' | 'arrived_tothereon' | 'delivered' | 'writing_reply' | 'pending_review' | 'borderline_review' | 'approved';

export interface Letter {
    id: string;
    pet_id: string;
    user_id: string;
    sender_type: SenderType;
    content: string;
    status: LetterStatus;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
}

