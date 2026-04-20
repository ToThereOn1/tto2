'use client'

interface StreakBadgeProps {
  streak: number
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) return null

  const isGold = streak >= 7

  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
        isGold
          ? 'bg-yellow-400 text-yellow-900'
          : 'bg-amber-100 text-amber-600',
      ].join(' ')}
    >
      {isGold ? '🔥' : '🔥'}
      {streak}-day streak
    </span>
  )
}
