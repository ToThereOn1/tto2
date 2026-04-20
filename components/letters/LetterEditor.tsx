'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Loader2, Image as ImageIcon, Send, X, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStarters } from '@/lib/conversation-starters'

interface LetterEditorProps {
    petId: string
    petName: string
    userId: string
    quotaRemaining: number
}

type FontStyle = 'sans' | 'serif' | 'handwriting'

export function LetterEditor({ petId, petName, userId, quotaRemaining }: LetterEditorProps) {
    const supabase = createClient()
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State
    const [content, setContent] = useState('')
    const [fontStyle, setFontStyle] = useState<FontStyle>('sans')
    const [photos, setPhotos] = useState<string[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [autoSaved, setAutoSaved] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [showStarters, setShowStarters] = useState(true)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const starters = getStarters(
        typeof navigator !== 'undefined' ? navigator.language : 'en'
    ).slice(0, 3)

    // Load from LocalStorage
    useEffect(() => {
        const key = `letter_draft_${petId}`
        const saved = localStorage.getItem(key)
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setContent(parsed.content || '')
                setFontStyle(parsed.fontStyle || 'sans')
                setPhotos(parsed.photos || [])
                toast.success('Draft loaded from local storage')
            } catch (e) {
                console.error('Failed to parse draft', e)
            }
        }
    }, [petId])

    // Auto-Save to LocalStorage
    useEffect(() => {
        const key = `letter_draft_${petId}`
        const data = { content, fontStyle, photos, updatedAt: new Date().toISOString() }
        const timer = setTimeout(() => {
            localStorage.setItem(key, JSON.stringify(data))
            setAutoSaved(true)
            setTimeout(() => setAutoSaved(false), 2000)
        }, 1000)
        return () => clearTimeout(timer)
    }, [content, fontStyle, photos, petId])

    // Handle Photo Upload
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        if (photos.length >= 5) {
            toast.error('Maximum 5 photos allowed')
            return
        }

        const file = e.target.files[0]

        // QA FIX: Add strict file size and type validation
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error('Only JPG, PNG, and WebP images are allowed')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Each image must be less than 5MB')
            return
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/${petId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${fileName}`

        setIsUploading(true)
        try {
            const { error: uploadError } = await supabase.storage
                .from('letter-photos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data: signedData, error: signedError } = await supabase.storage
                .from('letter-photos')
                .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year expiry for preview

            if (signedError || !signedData) throw signedError

            setPhotos([...photos, signedData.signedUrl])
            toast.success('Photo uploaded')
        } catch (error) {
            console.error('Upload failed:', error)
            toast.error('Failed to upload photo')
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Handle Send
    const handleSend = async () => {
        if (!content.trim()) {
            toast.error('Please write something to your pet')
            return
        }
        if (quotaRemaining <= 0) {
            toast.error('You have reached your monthly letter quota')
            return
        }

        setIsSending(true)
        try {
            const response = await fetch('/api/letters/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    petId,
                    content,
                    fontStyle,
                    photos
                })
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.error || 'Failed to send letter')

            // Success
            localStorage.removeItem(`letter_draft_${petId}`)
            setIsSuccess(true) // Trigger Modal
        } catch (error: any) {
            console.error('Send failed:', error)
            toast.error(error.message || 'Failed to send letter')
            setIsSending(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6 md:p-10 min-h-screen flex flex-col gap-8 relative">
            <AnimatePresence>
                {isSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-[32px] p-8 md:p-12 shadow-2xl max-w-sm w-full text-center relative overflow-hidden"
                        >
                            {/* Background Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-100 rounded-full blur-3xl -z-10" />

                            <motion.div
                                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                animate={{ x: 100, y: -100, opacity: 0, scale: 0.5 }}
                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                className="inline-block mb-6 text-purple-600"
                            >
                                <Send className="w-16 h-16" />
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="text-2xl font-bold text-slate-800 mb-2"
                            >
                                Your letter is on its way
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="text-slate-500 mb-8"
                            >
                                It will find its way safely to {petName}.
                            </motion.p>

                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1 }}
                                onClick={() => router.push(`/dashboard/pets/${petId}`)}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                            >
                                Back to Dashboard
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-serif text-slate-800">To. {petName}</h1>
                        <p className="text-sm text-slate-500">
                            {autoSaved ? 'Saved locally' : 'Auto-saving...'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        className={cn(
                            "px-4 py-2 rounded-full text-sm transition-all",
                            fontStyle === 'sans' ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-100"
                        )}
                        onClick={() => setFontStyle('sans')}
                    >
                        Sans
                    </button>
                    <button
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-serif transition-all",
                            fontStyle === 'serif' ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-100"
                        )}
                        onClick={() => setFontStyle('serif')}
                    >
                        Serif
                    </button>
                    <button
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-[cursive] transition-all", // Using generic
                            fontStyle === 'handwriting' ? "bg-slate-200 text-slate-800" : "text-slate-500 hover:bg-slate-100"
                        )}
                        onClick={() => setFontStyle('handwriting')}
                        style={{ fontFamily: 'Dancing Script, cursive' }}
                    >
                        Handwriting
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 bg-white/50 backdrop-blur-sm rounded-3xl p-8 shadow-sm border border-white/60 relative flex flex-col">
                {/* Conversation Starters */}
                {showStarters && !content && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {starters.map((starter, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    setContent(starter)
                                    setShowStarters(false)
                                    setTimeout(() => {
                                        const el = textareaRef.current
                                        if (el) {
                                            el.focus()
                                            el.setSelectionRange(starter.length, starter.length)
                                        }
                                    }, 0)
                                }}
                                className="px-3 py-1.5 text-xs rounded-full bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition-colors"
                            >
                                {starter}
                            </button>
                        ))}
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => {
                        setContent(e.target.value)
                        if (e.target.value && showStarters) setShowStarters(false)
                    }}
                    placeholder={`Write a letter to ${petName}...`}
                    className={cn(
                        "w-full flex-1 bg-transparent border-none resize-none focus:ring-0 text-slate-700 text-lg leading-relaxed placeholder:text-slate-300",
                        fontStyle === 'sans' && "font-sans",
                        fontStyle === 'serif' && "font-serif",
                        fontStyle === 'handwriting' && "font-[cursive]"
                    )}
                    style={fontStyle === 'handwriting' ? { fontFamily: 'Dancing Script, cursive', fontSize: '1.5rem' } : {}}
                />

                {/* Photo Preview */}
                {photos.length > 0 && (
                    <div className="flex gap-4 mt-6 overflow-x-auto pb-2">
                        {photos.map((url, idx) => (
                            <div key={idx} className="relative group flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden shadow-md">
                                <img src={url} alt="Attached" className="w-full h-full object-cover" />
                                <button
                                    onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || photos.length >= 5}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-white/50 rounded-full transition-colors disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                        <span>Add Photo ({photos.length}/5)</span>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-500">
                        {quotaRemaining} letter{quotaRemaining === 1 ? '' : 's'} remaining
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={isSending || !content.trim() || quotaRemaining <= 0}
                        className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-medium transition-all shadow-lg shadow-purple-200 disabled:opacity-50 disabled:shadow-none"
                    >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        <span>Send through the Waterway</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
