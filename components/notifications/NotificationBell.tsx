'use client'

import { Bell } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationList } from './NotificationList'

interface Notification {
    id: string
    title: string
    message: string
    isRead: boolean
    createdAt: Date
    linkUrl?: string
}

export function NotificationBell() {
    const router = useRouter()
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications/mark-read', {
                method: 'GET',
            })
            if (!res.ok) return
            const data = await res.json()

            // Map DB fields to local interface
            const mapped: Notification[] = (data.notifications || []).map((n: any) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                isRead: n.is_read,
                createdAt: new Date(n.created_at),
                linkUrl: n.link_url || undefined,
            }))
            setNotifications(mapped)
        } catch (err) {
            console.error('Failed to fetch notifications:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchNotifications()
        // Poll every 60 seconds for new notifications
        const interval = setInterval(fetchNotifications, 60_000)
        return () => clearInterval(interval)
    }, [fetchNotifications])

    const unreadCount = notifications.filter(n => !n.isRead).length

    const handleMarkAllRead = async () => {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markAll: true }),
            })
            setNotifications(notifications.map(n => ({ ...n, isRead: true })))
        } catch (err) {
            console.error('Failed to mark all as read:', err)
        }
    }

    const handleNotificationClick = async (id: string) => {
        try {
            await fetch('/api/notifications/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds: [id] }),
            })
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, isRead: true } : n
            ))
            // Navigate if linkUrl exists
            const notif = notifications.find(n => n.id === id)
            if (notif?.linkUrl) {
                router.push(notif.linkUrl)
            }
        } catch (err) {
            console.error('Failed to mark notification as read:', err)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="notification-bell" aria-label="Notifications" suppressHydrationWarning>
                    <Bell
                        size={22}
                        color="var(--color-text-secondary)"
                        strokeWidth={1.8}
                    />
                    {!loading && unreadCount > 0 && (
                        <span className="notification-badge">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-80 p-0 glass-effect border-none shadow-lg"
                sideOffset={8}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3
                        className="font-semibold"
                        style={{
                            fontFamily: 'var(--font-sans)',
                            color: 'var(--color-text-primary)',
                            fontSize: '16px'
                        }}
                    >
                        Notifications
                    </h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            className="text-sm hover:underline transition-all"
                            style={{ color: 'var(--color-primary)' }}
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Notification List */}
                <div className="max-h-80 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center">
                            <p
                                className="text-sm"
                                style={{ color: 'var(--color-text-tertiary)' }}
                            >
                                Loading...
                            </p>
                        </div>
                    ) : notifications.length > 0 ? (
                        <NotificationList
                            notifications={notifications}
                            onNotificationClick={handleNotificationClick}
                        />
                    ) : (
                        <div className="p-8 text-center">
                            <Bell
                                size={32}
                                color="var(--color-text-tertiary)"
                                className="mx-auto mb-3 opacity-50"
                            />
                            <p
                                className="text-sm"
                                style={{ color: 'var(--color-text-tertiary)' }}
                            >
                                No notifications yet
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                    <>
                        <DropdownMenuSeparator className="m-0" />
                        <div className="p-3 text-center">
                            <button
                                onClick={handleMarkAllRead}
                                className="text-sm hover:underline transition-all"
                                style={{ color: 'var(--color-primary)' }}
                            >
                                Mark all as read
                            </button>
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
