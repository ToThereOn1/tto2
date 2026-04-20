'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Home, Mail, Clock, Settings, LogOut, Menu, X, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UpgradeModal } from '@/components/ui/UpgradeModal'

interface SidebarProps {
    canAddPet?: boolean;
}

export function Sidebar({ canAddPet = true }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false)

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.refresh()
        router.push('/')
    }

    const navItems = [
        { name: 'My Family', href: '/dashboard', icon: Home, disabled: false },
        { name: 'Mailbox', href: '/dashboard/mailbox', icon: Mail, disabled: false },
    ]

    return (
        <>
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50 flex items-center justify-between px-4">
                <Link href="/" className="flex items-center">
                    <Image src="/logo-ci.svg" alt="ToThereOn" width={130} height={36} className="flex-shrink-0 h-7 w-auto" priority />
                </Link>
                <button
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                >
                    {isMobileOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Sidebar Container */}
            <aside
                className={`
                    fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 z-40 transition-transform duration-300 ease-in-out
                    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    md:pt-0 pt-16
                `}
            >
                <div className="flex flex-col h-full p-6">
                    {/* Logo (Desktop) */}
                    <div className="hidden md:flex items-center mb-10">
                        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                            <Image src="/logo-ci.svg" alt="ToThereOn" width={160} height={44} className="flex-shrink-0 h-9 w-auto" priority />
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.disabled ? '#' : item.href}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-2xl transition-all relative group
                                        ${isActive
                                            ? 'text-sky-600 bg-sky-50 font-bold'
                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
                                        ${item.disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-gray-500' : ''}
                                    `}
                                    onClick={() => setIsMobileOpen(false)}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.name}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active"
                                            className="absolute inset-0 rounded-2xl bg-blue-50 -z-10"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    {item.disabled && (
                                        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full text-gray-400">
                                            Soon
                                        </span>
                                    )}
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="pt-6 border-t border-gray-100 mt-auto">
                        <button
                            onClick={(e) => {
                                e.preventDefault()
                                if (!canAddPet) {
                                    setIsUpgradeModalOpen(true)
                                } else {
                                    setIsMobileOpen(false)
                                    router.push('/dashboard/register')
                                }
                            }}
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-95 mb-3"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Register Pet</span>
                        </button>

                        <Link
                            href="/dashboard/remembrance"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30 transition-all active:scale-95 mb-6"
                            onClick={() => setIsMobileOpen(false)}
                        >
                            <Sparkles className="w-5 h-5" />
                            <span>Deep Remembrance</span>
                        </Link>

                        {/* User Profile & Logout Area */}
                        <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-gray-50/50 border border-gray-100">
                            <Link href="/dashboard/settings/account" className="flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500 font-bold text-lg">
                                    U
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-bold text-slate-700 truncate">My Account</span>
                                    <span className="text-xs text-slate-400 font-medium truncate">Settings</span>
                                </div>
                            </Link>

                            <button
                                onClick={handleSignOut}
                                className="p-3 rounded-xl text-slate-400 hover:bg-white hover:text-red-500 hover:shadow-sm transition-all"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Overlay for Mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                title="Pet Limit Reached"
                message="You have reached the pet limit for your current plan. Upgrade to a higher tier to add another companion to ToThereOn World."
                redirectUrl="/settings?tab=subscription"
                redirectText="Upgrade Plan"
            />
        </>
    )
}
