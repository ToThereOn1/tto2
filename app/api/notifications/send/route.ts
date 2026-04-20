import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        // Internal service only: require CRON_SECRET bearer token
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET
        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = await createClient()

        const { userId, type, title, message, linkUrl, metadata, sendEmail } = await request.json()

        // Validate required fields
        if (!userId || !type || !title || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, type, title, message' },
                { status: 400 }
            )
        }

        // Validate notification type
        const validTypes = ['welcome', 'letter_status', 'new_event', 'subscription', 'system']
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            )
        }

        // 1. Get user notification settings
        const { data: settings } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('user_id', userId)
            .single()

        // 2. Create in-app notification
        const { data: notification, error: insertError } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                title,
                message,
                link_url: linkUrl,
                metadata,
                is_read: false,
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating notification:', insertError)
            return NextResponse.json(
                { error: 'Failed to create notification' },
                { status: 500 }
            )
        }

        // 3. Send email if requested and enabled in settings
        if (sendEmail && settings) {
            const shouldSend = shouldSendEmail(type, settings)
            if (shouldSend) {
                // TODO: Integrate with email service (Resend)
                // await sendTransactionalEmail({ to: user.email, template: type, data: metadata })
                console.log('Email would be sent for notification:', notification.id)
            }
        }

        return NextResponse.json({
            success: true,
            notification
        })
    } catch (error) {
        console.error('Notification API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

function shouldSendEmail(type: string, settings: Record<string, boolean>): boolean {
    const emailSettingsMap: Record<string, string> = {
        'letter_status': 'email_letter_updates',
        'new_event': 'email_pet_events',
        'subscription': 'email_letter_updates',
        'system': 'email_letter_updates',
        'welcome': 'email_letter_updates',
    }

    const settingKey = emailSettingsMap[type]
    return settingKey ? settings[settingKey] !== false : true
}
