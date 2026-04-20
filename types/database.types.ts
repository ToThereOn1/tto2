export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string | null
                    display_name: string | null
                    avatar_url: string | null
                    subscription_tier: 'free' | 'basic' | 'standard' | 'premium'
                    subscription_start_date: string | null
                    max_pets_allowed: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email?: string | null
                    display_name?: string | null
                    avatar_url?: string | null
                    subscription_tier?: 'free' | 'basic' | 'standard' | 'premium'
                    subscription_start_date?: string | null
                    max_pets_allowed?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string | null
                    display_name?: string | null
                    avatar_url?: string | null
                    subscription_tier?: 'free' | 'basic' | 'standard' | 'premium'
                    subscription_start_date?: string | null
                    max_pets_allowed?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "users_id_fkey"
                        columns: ["id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            pets: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    species: string
                    breed: string | null
                    birth_date: string | null
                    passed_date: string | null
                    gender: string | null
                    weight_kg: number | null
                    relationship: string | null
                    photos: string[] | null
                    persona_generated: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    species?: string
                    breed?: string | null
                    birth_date?: string | null
                    passed_date?: string | null
                    gender?: string | null
                    weight_kg?: number | null
                    relationship?: string | null
                    photos?: string[] | null
                    persona_generated?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    species?: string
                    breed?: string | null
                    birth_date?: string | null
                    passed_date?: string | null
                    gender?: string | null
                    weight_kg?: number | null
                    relationship?: string | null
                    photos?: string[] | null
                    persona_generated?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "pets_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            letters: {
                Row: {
                    id: string
                    pet_id: string
                    user_id: string
                    sender_type: 'user' | 'pet'
                    content: string
                    status: 'draft' | 'sent' | 'arrived_tothereon' | 'delivered' | 'writing_reply' | 'pending_review' | 'borderline_review' | 'approved' | 'read'
                    subject: string | null
                    photos: string[] | null
                    font_style: string | null
                    sent_at: string | null
                    delivered_at: string | null
                    current_tothereon_day: number | null
                    model_used: string | null
                    generation_cost_usd: number | null
                    regeneration_count: number
                    metadata: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    pet_id: string
                    user_id: string
                    sender_type: 'user' | 'pet'
                    content: string
                    status?: 'draft' | 'sent' | 'arrived_tothereon' | 'delivered' | 'writing_reply' | 'pending_review' | 'borderline_review' | 'approved' | 'read'
                    subject?: string | null
                    photos?: string[] | null
                    font_style?: string | null
                    sent_at?: string | null
                    delivered_at?: string | null
                    current_tothereon_day?: number | null
                    model_used?: string | null
                    generation_cost_usd?: number | null
                    regeneration_count?: number
                    metadata?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    pet_id?: string
                    user_id?: string
                    sender_type?: 'user' | 'pet'
                    content?: string
                    status?: 'draft' | 'sent' | 'arrived_tothereon' | 'delivered' | 'writing_reply' | 'pending_review' | 'borderline_review' | 'approved' | 'read'
                    subject?: string | null
                    photos?: string[] | null
                    font_style?: string | null
                    sent_at?: string | null
                    delivered_at?: string | null
                    current_tothereon_day?: number | null
                    model_used?: string | null
                    generation_cost_usd?: number | null
                    regeneration_count?: number
                    metadata?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "letters_pet_id_fkey"
                        columns: ["pet_id"]
                        referencedRelation: "pets"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "letters_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            pet_status_events: {
                Row: {
                    id: string
                    pet_id: string
                    tothereon_day: number | null
                    event_type: string
                    event_title: string
                    event_description: string | null
                    zone: string | null
                    mood: string | null
                    image_url: string | null
                    metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    pet_id: string
                    tothereon_day?: number | null
                    event_type: string
                    event_title: string
                    event_description?: string | null
                    zone?: string | null
                    mood?: string | null
                    image_url?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    pet_id?: string
                    tothereon_day?: number | null
                    event_type?: string
                    event_title?: string
                    event_description?: string | null
                    zone?: string | null
                    mood?: string | null
                    image_url?: string | null
                    metadata?: Json | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "pet_status_events_pet_id_fkey"
                        columns: ["pet_id"]
                        referencedRelation: "pets"
                        referencedColumns: ["id"]
                    }
                ]
            }
            subscriptions: {
                Row: {
                    id: string
                    user_id: string | null
                    lemon_squeezy_subscription_id: string | null
                    lemon_squeezy_customer_id: string | null
                    tier: 'free' | 'basic' | 'standard' | 'premium'
                    status: 'active' | 'past_due' | 'cancelled' | 'expired' | 'trialing'
                    current_period_start: string | null
                    current_period_end: string | null
                    cancel_at: string | null
                    cancelled_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    lemon_squeezy_subscription_id?: string | null
                    lemon_squeezy_customer_id?: string | null
                    tier?: 'free' | 'basic' | 'standard' | 'premium'
                    status?: 'active' | 'past_due' | 'cancelled' | 'expired' | 'trialing'
                    current_period_start?: string | null
                    current_period_end?: string | null
                    cancel_at?: string | null
                    cancelled_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    lemon_squeezy_subscription_id?: string | null
                    lemon_squeezy_customer_id?: string | null
                    tier?: 'free' | 'basic' | 'standard' | 'premium'
                    status?: 'active' | 'past_due' | 'cancelled' | 'expired' | 'trialing'
                    current_period_start?: string | null
                    current_period_end?: string | null
                    cancel_at?: string | null
                    cancelled_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "subscriptions_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            payment_history: {
                Row: {
                    id: string
                    user_id: string | null
                    lemon_squeezy_order_id: string | null
                    amount_usd: number | null
                    currency: string | null
                    status: 'paid' | 'failed' | 'refunded' | null
                    receipt_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    lemon_squeezy_order_id?: string | null
                    amount_usd?: number | null
                    currency?: string | null
                    status?: 'paid' | 'failed' | 'refunded' | null
                    receipt_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    lemon_squeezy_order_id?: string | null
                    amount_usd?: number | null
                    currency?: string | null
                    status?: 'paid' | 'failed' | 'refunded' | null
                    receipt_url?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "payment_history_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            deep_remembrance_responses: {
                Row: {
                    id: string
                    pet_id: string
                    user_id: string
                    responses: Json
                    current_question_index: number
                    total_questions: number
                    completion_percentage: number
                    started_at: string
                    last_saved_at: string | null
                    completed_at: string | null
                    time_spent_seconds: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    pet_id: string
                    user_id: string
                    responses?: Json
                    current_question_index?: number
                    total_questions?: number
                    completion_percentage?: number
                    started_at?: string
                    last_saved_at?: string | null
                    completed_at?: string | null
                    time_spent_seconds?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    pet_id?: string
                    user_id?: string
                    responses?: Json
                    current_question_index?: number
                    total_questions?: number
                    completion_percentage?: number
                    started_at?: string
                    last_saved_at?: string | null
                    completed_at?: string | null
                    time_spent_seconds?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "deep_remembrance_responses_pet_id_fkey"
                        columns: ["pet_id"]
                        referencedRelation: "pets"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "deep_remembrance_responses_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            pet_personas: {
                Row: {
                    id: string
                    pet_id: string
                    response_id: string | null
                    dimensional_scores: Json
                    narrative_data: Json
                    persona_profile: Json
                    quality_score: number
                    detail_richness: number | null
                    emotional_authenticity: number | null
                    behavioral_consistency: number | null
                    narrative_depth: number | null
                    generation_model: string
                    generation_timestamp: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    pet_id: string
                    response_id?: string | null
                    dimensional_scores: Json
                    narrative_data: Json
                    persona_profile: Json
                    quality_score?: number
                    detail_richness?: number | null
                    emotional_authenticity?: number | null
                    behavioral_consistency?: number | null
                    narrative_depth?: number | null
                    generation_model?: string
                    generation_timestamp?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    pet_id?: string
                    response_id?: string | null
                    dimensional_scores?: Json
                    narrative_data?: Json
                    persona_profile?: Json
                    quality_score?: number
                    detail_richness?: number | null
                    emotional_authenticity?: number | null
                    behavioral_consistency?: number | null
                    narrative_depth?: number | null
                    generation_model?: string
                    generation_timestamp?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "pet_personas_pet_id_fkey"
                        columns: ["pet_id"]
                        referencedRelation: "pets"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "pet_personas_response_id_fkey"
                        columns: ["response_id"]
                        referencedRelation: "deep_remembrance_responses"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
