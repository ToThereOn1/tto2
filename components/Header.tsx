'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Bell, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NotificationBell } from '@/components/notifications/NotificationBell'

interface HeaderProps {
    isLoggedIn?: boolean
    userName?: string
}

export function Header({ isLoggedIn = false, userName }: HeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <header
            className="sticky top-0 z-50 px-6 md:px-12 py-4 flex items-center justify-between transition-all duration-300 backdrop-blur-md border-b"
            style={{
                background: 'rgba(255, 255, 255, 0.7)',
                borderColor: 'rgba(255, 255, 255, 0.3)'
            }}
        >
            {/* Logo */}
            <Link href="/" className="group flex items-center">
                <Image src="/logo-ci.svg" alt="ToThereOn" width={160} height={44} className="flex-shrink-0 h-9 w-auto group-hover:opacity-80 transition-opacity" priority />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
                {isLoggedIn ? (
                    <>
                        <div className="flex items-center gap-6 pr-6 border-r border-slate-200">
                            <Link href="/dashboard" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/dashboard/mailbox" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors">
                                Mailbox
                            </Link>
                        </div>

                        <div className="flex items-center gap-4 pl-2">
                            <NotificationBell />
                            <div className="flex items-center gap-3 group cursor-pointer">
                                <div className="w-9 h-9 rounded-full border-2 border-primary overflow-hidden shadow-sm transition-transform group-hover:scale-105">
                                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                        {userName?.charAt(0) || 'U'}
                                    </div>
                                </div>
                                <span className="text-sm font-bold uppercase tracking-widest hidden lg:block" style={{ color: 'var(--color-text-primary)' }}>
                                    {userName?.split('@')[0]}
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors">
                            Sign In
                        </Link>
                        <Link href="/signup">
                            <button className="button-primary px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all hover:shadow-lg hover:shadow-primary/20">
                                Get Started
                            </button>
                        </Link>
                    </>
                )}
            </nav>

            {/* Mobile Menu Button */}
            <button
                className="md:hidden p-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="absolute top-[calc(100%+1rem)] left-6 right-6 p-6 rounded-[2rem] glass-effect shadow-2xl md:hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <nav className="flex flex-col gap-4">
                        {isLoggedIn ? (
                            <>
                                <Link href="/dashboard" className="py-4 px-6 rounded-2xl hover:bg-primary/5 text-sm font-bold uppercase tracking-widest">
                                    Dashboard
                                </Link>
                                <Link href="/dashboard/mailbox" className="py-4 px-6 rounded-2xl hover:bg-primary/5 text-sm font-bold uppercase tracking-widest">
                                    Mailbox
                                </Link>
                                <hr className="border-slate-100" />
                                <button className="py-4 px-6 text-sm font-bold uppercase tracking-widest text-red-500 text-left">
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="py-4 px-6 rounded-2xl hover:bg-primary/5 text-sm font-bold uppercase tracking-widest">
                                    Sign In
                                </Link>
                                <Link href="/signup">
                                    <button className="w-full button-primary py-4 rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-primary/20">
                                        Get Started
                                    </button>
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            )}
        </header>
    )
}
