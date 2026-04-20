'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

interface UpgradeModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    message?: string
    redirectUrl?: string
    redirectText?: string
}

export function UpgradeModal({
    isOpen,
    onClose,
    title = 'Upgrade Your Plan',
    message = 'You have reached the limit for your current plan. Upgrade to unlock more features and continue your journey in ToThereOn World.',
    redirectUrl = '/pricing',
    redirectText = 'View Plans'
}: UpgradeModalProps) {

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 300
                        }}
                        className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-white/80 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-sky-900/10"
                    >
                        {/* Ambient Glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-200/30 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-200/20 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2 pointer-events-none" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-8 sm:p-10 text-center">
                            {/* Icon */}
                            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-sky-50 shadow-sm border border-sky-100 flex items-center justify-center mb-6">
                                <Sparkles className="w-8 h-8 text-sky-500" />
                            </div>

                            {/* Text */}
                            <h3 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">
                                {title}
                            </h3>
                            <p className="text-slate-500 leading-relaxed mb-8">
                                {message}
                            </p>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <Link href={redirectUrl} onClick={onClose}>
                                    <button className="w-full relative overflow-hidden group rounded-2xl p-[1.5px]">
                                        <span className="absolute inset-0 bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400 opacity-100 group-hover:opacity-100 transition-opacity bg-[length:200%_auto] animate-gradient" />
                                        <div className="relative bg-white/10 backdrop-blur-sm group-hover:bg-transparent transition-colors w-full px-6 py-4 rounded-[14.5px] flex items-center justify-center gap-2">
                                            <span className="font-bold text-white tracking-wide">
                                                {redirectText}
                                            </span>
                                            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </button>
                                </Link>
                                <button
                                    onClick={onClose}
                                    className="w-full px-6 py-3.5 rounded-2xl font-semibold text-slate-500 hover:bg-slate-100/50 hover:text-slate-700 transition-colors"
                                >
                                    Maybe Later
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
