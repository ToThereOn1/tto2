'use client'

interface WhisperBannerProps {
    message: string
    onClose: () => void
}

export default function WhisperBanner({ message, onClose }: WhisperBannerProps) {
    return (
        <div className="animate-fade-in w-full rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-teal-50 px-4 py-3 shadow-sm">
            <div className="flex items-start gap-3">
                {/* Waterway icon */}
                <span className="mt-0.5 text-lg select-none" aria-hidden>
                    🌊
                </span>

                <p className="flex-1 text-sm text-cyan-900 leading-relaxed">
                    {message}
                </p>

                <button
                    onClick={onClose}
                    aria-label="Close whisper"
                    className="ml-2 shrink-0 text-cyan-400 hover:text-cyan-600 transition-colors text-lg leading-none"
                >
                    ×
                </button>
            </div>
        </div>
    )
}
