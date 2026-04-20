/**
 * Feed Comment System Types
 * Matches sql/migration_feed_comments.sql schema
 */

export interface FeedComment {
    id: string;
    pet_id: string;
    user_id: string;
    event_id: string;
    content: string;
    language: string;
    created_at: string;
}

export type CommentReplyStatus = 'pending' | 'generating' | 'delivered' | 'failed' | 'flagged';

export interface CommentReply {
    id: string;
    comment_id: string;
    pet_id: string;
    content: string | null;
    status: CommentReplyStatus;
    quality_score: number | null;
    review_notes: Record<string, unknown>;
    model_used: string | null;
    tokens_used: number | null;
    scheduled_at: string;
    delivered_at: string | null;
    rag_stored: boolean;
    created_at: string;
}

/** Comment with its reply (joined for frontend display) */
export interface CommentWithReply {
    comment: FeedComment;
    reply: CommentReply | null;
}

/** Reply limit per feed cycle by subscription tier */
export type ReplyLimitTier = 'free' | 'basic' | 'premium';
