import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { notificationIds, markAll } = await request.json()

        if (markAll) {
            // Mark all notifications as read for current user
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false)

            if (error) {
                console.error('Error marking all as read:', error)
                return NextResponse.json(
                    { error: 'Failed to mark notifications as read' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                success: true,
                message: 'All notifications marked as read'
            })
        }

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json(
                { error: 'notificationIds must be an array' },
                { status: 400 }
            )
        }

        // Mark specific notifications as read
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .in('id', notificationIds)

        if (error) {
            console.error('Error marking notifications as read:', error)
            return NextResponse.json(
                { error: 'Failed to mark notifications as read' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: `${notificationIds.length} notification(s) marked as read`
        })
    } catch (error) {
        console.error('Mark read API error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function GET() {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get user's notifications (latest 20)
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            console.error('Error fetching notifications:', error)
            return NextResponse.json(
                { error: 'Failed to fetch notifications' },
                { status: 500 }
            )
        }

        // Get unread count
        const { count: unreadCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false)

        return NextResponse.json({
            notifications,
            unreadCount: unreadCount || 0
        })
    } catch (error) {
        console.error('Notifications fetch error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
