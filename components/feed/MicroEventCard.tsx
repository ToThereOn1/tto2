'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Wind, Eye, Mail, Sparkles, Clock, PawPrint } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getNpcDisplayName } from '@/lib/npc-constants'

export interface MicroEventCardProps {
  content: string
  category: string
  timeOfDay: string
  npcInvolved: string | null
  createdAt: string
  zone: string
  language?: string
}

const TIME_OF_DAY_GRADIENTS: Record<string, string> = {
  morning: 'from-amber-50/60 to-orange-50/40',
  afternoon: 'from-sky-50/60 to-blue-50/40',
  evening: 'from-violet-50/60 to-indigo-50/40',
  night: 'from-slate-100/60 to-slate-200/40',
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  atmosphere: Wind,
  pet_action: PawPrint,
  npc_sighting: Eye,
  letter_echo: Mail,
  world_ambient: Sparkles,
  time_marker: Clock,
}

const ITALIC_CATEGORIES = new Set(['atmosphere', 'world_ambient'])

export function MicroEventCard({
  content,
  category,
  timeOfDay,
  npcInvolved,
  createdAt,
  zone,
  language,
}: MicroEventCardProps) {
  const shouldReduceMotion = useReducedMotion()

  const gradient = TIME_OF_DAY_GRADIENTS[timeOfDay] ?? TIME_OF_DAY_GRADIENTS.morning
  const Icon = CATEGORY_ICONS[category] ?? Sparkles
  const isItalic = ITALIC_CATEGORIES.has(category)

  let relativeTime = ''
  try {
    relativeTime = formatDistanceToNow(new Date(createdAt), { addSuffix: true })
  } catch {
    relativeTime = ''
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`bg-gradient-to-r ${gradient} border border-white/50 rounded-[24px] px-5 py-4 shadow-sm backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0 text-stone-400">
          <Icon size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm text-stone-600 leading-relaxed ${isItalic ? 'italic' : ''}`}
          >
            {content}
          </p>
          {npcInvolved && (
            <p className="text-xs text-stone-400 mt-1 font-medium">
              {getNpcDisplayName(npcInvolved, (language ?? 'en') as 'en' | 'ko' | 'ja')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-300 capitalize">
          {zone.replace(/_/g, ' ')}
        </span>
        {relativeTime && (
          <span className="text-xs text-stone-400">{relativeTime}</span>
        )}
      </div>
    </motion.div>
  )
}
