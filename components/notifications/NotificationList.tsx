'use client'

import { formatDistanceToNow } from 'date-fns'

interface Notification {
    id: string
    title: string
    message: string
    isRead: boolean
    createdAt: Date
    linkUrl?: string
}

interface NotificationListProps {
    notifications: Notification[]
    onNotificationClick: (id: string) => void
}

export function NotificationList({ notifications, onNotificationClick }: NotificationListProps) {
    return (
        <div className="divide-y divide-gray-50">
            {notifications.map((notification) => (
                <button
                    key={notification.id}
                    onClick={() => onNotificationClick(notification.id)}
                    className="w-full p-4 text-left hover:bg-blue-50/50 transition-colors relative"
                    style={{
                        backgroundColor: notification.isRead ? 'transparent' : 'rgba(74, 144, 226, 0.04)',
                    }}
                >
                    {/* Unread indicator */}
                    {!notification.isRead && (
                        <span
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'var(--color-primary)' }}
                        />
                    )}

                    <div className={notification.isRead ? 'pl-0' : 'pl-4'}>
                        <h4
                            className="font-medium text-sm mb-1"
                            style={{
                                color: 'var(--color-text-primary)',
                                fontFamily: 'var(--font-sans)'
                            }}
                        >
                            {notification.title}
                        </h4>
                        <p
                            className="text-sm line-clamp-2"
                            style={{
                                color: 'var(--color-text-secondary)',
                                fontFamily: 'var(--font-sans)'
                            }}
                        >
                            {notification.message}
                        </p>
                        <span
                            className="text-xs mt-2 block"
                            style={{ color: 'var(--color-text-tertiary)' }}
                        >
                            {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                        </span>
                    </div>
                </button>
            ))}
        </div>
    )
}
