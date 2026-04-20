/**
 * Comment Notification System
 * Sends email notifications when pet replies to guardian comments.
 *
 * Uses fetch() to call Resend API directly (no npm package needed).
 * Falls back silently if RESEND_API_KEY is not set.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@tothereon.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.tothereon.com';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!RESEND_API_KEY) {
        console.warn('[CommentNotify] RESEND_API_KEY not set, skipping email');
        return;
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: `ToThereOn <${FROM_EMAIL}>`,
                to,
                subject,
                html,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('[CommentNotify] Resend API error:', res.status, err);
        }
    } catch (error) {
        console.error('[CommentNotify] Email send failed:', error);
    }
}

// ─── Types ──────────────────────────────────────────────────────────────

interface NotificationParams {
    userEmail: string;
    petName: string;
    petId: string;
}

// ─── Thinking Notification (midpoint) ───────────────────────────────────

export async function sendThinkingNotification(params: NotificationParams): Promise<void> {
    const { userEmail, petName, petId } = params;

    await sendEmail(
        userEmail,
        `${petName} is reading your note... 🐾`,
        `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
                From the Waterway
            </p>
            <h2 style="font-size: 20px; color: #1e293b; margin-bottom: 16px;">
                ${petName} found your note
            </h2>
            <p style="font-size: 16px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
                Your message drifted through the Waterway and reached ${petName}.
                They're reading it now, turning it over in their mind...
            </p>
            <p style="font-size: 14px; color: #94a3b8; margin-bottom: 24px;">
                A reply is on its way. Check back soon.
            </p>
            <a href="${APP_URL}/dashboard/pets/${petId}"
               style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 600;">
                See ${petName}'s World
            </a>
            <p style="font-size: 12px; color: #cbd5e1; margin-top: 32px;">
                ToThereOn — Where love reaches across worlds
            </p>
        </div>`,
    );
}

// ─── Reply Delivered Notification ───────────────────────────────────────

export async function sendReplyNotification(
    params: NotificationParams & { replyPreview: string },
): Promise<void> {
    const { userEmail, petName, petId, replyPreview } = params;

    await sendEmail(
        userEmail,
        `${petName} replied to your note! 💌`,
        `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
                New reply from ${petName}
            </p>
            <h2 style="font-size: 20px; color: #1e293b; margin-bottom: 16px;">
                ${petName} wrote back
            </h2>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
                <p style="font-size: 16px; color: #92400e; line-height: 1.7; margin: 0; font-style: italic;">
                    "${replyPreview.slice(0, 150)}${replyPreview.length > 150 ? '...' : ''}"
                </p>
                <p style="font-size: 12px; color: #d97706; margin-top: 8px; margin-bottom: 0;">
                    — ${petName} 🐾
                </p>
            </div>
            <a href="${APP_URL}/dashboard/pets/${petId}"
               style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-size: 14px; font-weight: 600;">
                Read the full reply
            </a>
            <p style="font-size: 12px; color: #cbd5e1; margin-top: 32px;">
                ToThereOn — Where love reaches across worlds
            </p>
        </div>`,
    );
}
