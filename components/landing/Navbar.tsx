'use client';
// Navbar Component

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, PenLine, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function Navbar() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
            setLoading(false);
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null); // Immediate UI update
        router.push('/');
        router.refresh();
    };

    // 🔴 DEFINITION: Guest Links
    const guestLinks = [
        { name: "Features", href: "/#explore" },
        { name: "Pricing", href: "/pricing" },
        { name: "FAQ", href: "/faq" },
    ];

    // 🔵 DEFINITION: User Links (Logged In)
    const userLinks = [
        { name: "My Pets", href: "/dashboard" },
        { name: "Pet Feed", href: "/dashboard/feed" },
        { name: "Mailbox", href: "/dashboard/mailbox" },
        { name: "Explore", href: "/explore" },
    ];

    const activeLinks = user ? userLinks : guestLinks;

    // Loading State — skeleton matching floating pill structure
    if (loading) return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] w-[calc(100%-2rem)] max-w-5xl h-14 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/[0.06]" />
    );

    return (
        <>
            <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-[999] w-[calc(100%-2rem)] max-w-5xl rounded-2xl bg-white/75 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/[0.06] transition-all duration-300">
                <div className="px-4 sm:px-6 h-14">
                    <div className="flex justify-between items-center h-full">

                        {/* 1. Logo */}
                        <Link href={user ? "/dashboard" : "/"} className="flex items-center">
                            <Image src="/logo-ci.svg" alt="ToThereOn" width={150} height={40} className="flex-shrink-0 h-8 w-auto" priority />
                        </Link>

                        {/* 2. Center Menu (Desktop) - DYNAMIC RENDERING */}
                        <div className="hidden md:flex space-x-8">
                            {activeLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`text-sm font-medium transition-colors ${pathname === link.href || pathname?.startsWith(link.href + '/')
                                        ? "text-sky-600"
                                        : "text-slate-500 hover:text-slate-900"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>

                        {/* 3. Right Actions - DYNAMIC RENDERING */}
                        <div className="hidden md:flex items-center space-x-4">
                            {user ? (
                                // [User Actions]
                                <>
                                    <NotificationBell />
                                    <Link href="/dashboard/letters">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-full text-sm font-medium shadow-sm transition-colors"
                                        >
                                            <PenLine className="w-4 h-4" />
                                            Write Letter
                                        </motion.button>
                                    </Link>
                                    {/* Profile Avatar Component */}
                                    <div
                                        className="w-8 h-8 bg-slate-200 rounded-full overflow-hidden cursor-pointer flex items-center justify-center hover:ring-2 hover:ring-slate-300 transition-all relative"
                                        onClick={handleSignOut}
                                        title="Sign Out"
                                    >
                                        {user.user_metadata?.avatar_url ? (
                                            <Image
                                                src={user.user_metadata.avatar_url}
                                                alt="User"
                                                fill
                                                className="object-cover"
                                                sizes="32px"
                                                referrerPolicy="no-referrer"
                                            />
                                        ) : (
                                            <UserIcon className="w-4 h-4 text-slate-500" />
                                        )}
                                    </div>
                                </>
                            ) : (
                                // [Guest Actions]
                                <>
                                    <Link href="/login" className="text-sm font-medium text-slate-500 hover:text-slate-900 px-3">
                                        Log in
                                    </Link>
                                    <Link href="/login?mode=signup">
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                            className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2 rounded-full text-sm font-medium shadow-sm shadow-sky-500/20 transition-colors hover:shadow-md hover:shadow-sky-500/30"
                                        >
                                            Get Started
                                        </motion.button>
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile Menu Button (Hamburger) */}
                        <div className="md:hidden flex items-center">
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600 p-2">
                                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl p-4 flex flex-col space-y-4 animate-in slide-in-from-top-2">
                        {activeLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`text-base font-medium py-2 border-b border-gray-50 ${pathname === link.href ? "text-sky-600" : "text-slate-600"
                                    }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="pt-2 flex flex-col space-y-3">
                            {user ? (
                                <>
                                    <Link
                                        href="/dashboard/letters"
                                        className="bg-slate-900 text-white px-4 py-3 rounded-xl text-center text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <PenLine className="w-4 h-4" />
                                        Write Letter
                                    </Link>
                                    <button
                                        onClick={() => {
                                            handleSignOut();
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="text-sm text-gray-500 hover:text-gray-900 text-left py-2"
                                    >
                                        Log Out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="text-center text-gray-700 py-2 border rounded-xl hover:bg-gray-50"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Log in
                                    </Link>
                                    <Link
                                        href="/login?mode=signup"
                                        className="bg-slate-900 text-white px-4 py-3 rounded-xl text-center text-sm font-medium hover:bg-slate-800"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>

        </>
    );
}
