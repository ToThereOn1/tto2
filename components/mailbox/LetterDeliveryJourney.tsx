'use client'

interface LetterDeliveryJourneyProps {
  sentAt: string | Date
  lang?: 'en' | 'ko' | 'ja'
}

interface DeliveryStage {
  stage: number
  label: string
  sublabel: string
  icon: string
}

function getDeliveryStage(sentAt: Date): DeliveryStage {
  const elapsed = Date.now() - new Date(sentAt).getTime()
  const hours = elapsed / (1000 * 60 * 60)

  if (hours < 24) return {
    stage: 1,
    label: 'Crossing the Waterway',
    sublabel: 'Your letter is floating through the Waterway...',
    icon: '🌊',
  }
  if (hours < 48) return {
    stage: 2,
    label: 'Arrived at ToThereOn',
    sublabel: 'Pip has delivered your letter safely.',
    icon: '✉️',
  }
  if (hours < 96) return {
    stage: 3,
    label: 'Being Read',
    sublabel: 'Your words are being felt, again and again.',
    icon: '📖',
  }
  return {
    stage: 4,
    label: 'A Reply is Coming',
    sublabel: 'Something is being written for you.',
    icon: '✨',
  }
}

const STAGES: Array<{ id: number; label: string; icon: string }> = [
  { id: 1, label: 'Crossing the Waterway', icon: '🌊' },
  { id: 2, label: 'Arrived at ToThereOn', icon: '✉️' },
  { id: 3, label: 'Being Read', icon: '📖' },
  { id: 4, label: 'A Reply is Coming', icon: '✨' },
]

export default function LetterDeliveryJourney({ sentAt }: LetterDeliveryJourneyProps) {
  const current = getDeliveryStage(new Date(sentAt))

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 p-4 text-white shadow-lg">
      {/* Current stage hero */}
      <div className="mb-4 text-center">
        <div
          className={`text-3xl mb-1 inline-block ${current.stage === 1 ? 'animate-bounce' : current.stage === 4 ? 'animate-pulse' : ''}`}
        >
          {current.icon}
        </div>
        <p className="text-sm font-bold text-cyan-200 tracking-wide">{current.label}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{current.sublabel}</p>
      </div>

      {/* Step trail */}
      <div className="flex items-start gap-0">
        {STAGES.map((s, idx) => {
          const active = s.id === current.stage
          const done = s.id < current.stage
          const isLast = idx === STAGES.length - 1

          return (
            <div key={s.id} className="flex items-center flex-1 min-w-0">
              {/* Node */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-base transition-all duration-500
                    ${done
                      ? 'bg-cyan-500/30 ring-1 ring-cyan-400/40 opacity-60'
                      : active
                        ? 'bg-blue-500/40 ring-2 ring-blue-300/60 shadow-[0_0_12px_rgba(96,165,250,0.5)] animate-pulse'
                        : 'bg-slate-700/50 opacity-30'
                    }`}
                >
                  {s.icon}
                </div>
                <span
                  className={`text-[9px] leading-tight text-center max-w-[56px] whitespace-normal break-words
                    ${active ? 'text-cyan-200 font-semibold' : done ? 'text-slate-400' : 'text-slate-600'}`}
                >
                  {s.label}
                </span>
              </div>

              {/* Connector */}
              {!isLast && (
                <div
                  className={`flex-1 h-px mx-1 mb-4 transition-all duration-500
                    ${done || active ? 'bg-cyan-500/40' : 'bg-slate-700'}`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
