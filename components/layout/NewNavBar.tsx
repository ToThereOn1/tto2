'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, PenLine, X, User as UserIcon, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function NewNavBar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [canWriteLetter, setCanWriteLetter] = useState(false);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);

            // Check subscription tier for letter writing
            if (session?.user) {
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('tier')
                    .eq('user_id', session.user.id)
                    .in('status', ['active', 'trialing'])
                    .single();

                let tier = sub?.tier || null;
                if (!tier) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('subscription_tier')
                        .eq('id', session.user.id)
                        .single();
                    tier = userData?.subscription_tier || 'free';
                }
                const paid = ['basic', 'plus', 'pro'].includes((tier as string).toLowerCase());
                setCanWriteLetter(paid);
            }

            setLoading(false);
        };

        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, [supabase]);

    const isActive = (path: string) => {
        if (path === '/') return pathname === '/';
        return pathname === path || pathname?.startsWith(path + '/');
    };

    const dashboardLinks = [
        { name: 'My Pets', href: '/dashboard' },
        { name: 'Pet Feed', href: '/dashboard/feed' },
        { name: 'Mailbox', href: '/dashboard/mailbox' },
    ];

    const publicLinks = [
        { name: 'Home', href: '/' },
        { name: 'Features', href: '/features' }, // Placeholder routes
        { name: 'Pricing', href: '/pricing' },
    ];

    const navLinks = user ? dashboardLinks : publicLinks;

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    if (loading) {
        return <div className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100" />;
    }

    return (
        <>
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

                {/* 1. Left: Logo */}
                <div className="flex-shrink-0 flex items-center">
                    <Link href="/" className="flex items-center">
                        <Image src="/logo-ci.svg" alt="ToThereOn" width={150} height={40} className="flex-shrink-0 h-8 w-auto" priority />
                    </Link>
                </div>

                {/* 2. Center: Desktop Menu */}
                <div className="hidden md:flex items-center space-x-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`text-sm font-medium transition-colors duration-200 ${isActive(link.href)
                                ? 'text-slate-900 font-semibold border-b-2 border-slate-900 px-1 py-4'
                                : 'text-gray-500 hover:text-gray-900 px-1 py-4 border-b-2 border-transparent hover:border-gray-200'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* 3. Right: Actions */}
                <div className="hidden md:flex items-center space-x-4">
                    {user ? (
                        <>
                            {/* Logged In State */}
                            <NotificationBell />

                            {canWriteLetter ? (
                                <Link
                                    href="/dashboard/letters"
                                    className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
                                >
                                    <PenLine className="w-4 h-4" />
                                    <span>Write a Letter</span>
                                </Link>
                            ) : (
                                <button
                                    onClick={() => setUpgradeModalOpen(true)}
                                    className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
                                >
                                    <Lock className="w-4 h-4" />
                                    <span>Write a Letter</span>
                                </button>
                            )}

                            <div
                                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-200"
                                onClick={handleSignOut}
                                title="Sign Out"
                            >
                                <UserIcon className="w-4 h-4 text-slate-500" />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Logged Out State */}
                            <Link
                                href="/login"
                                className={`text-sm font-medium transition-colors ${isActive('/login') ? 'text-slate-900' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                                Login
                            </Link>
                            <Link
                                href="/login?mode=signup"
                                className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center">
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg p-4 flex flex-col space-y-4 animate-in slide-in-from-top-2">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`text-base font-medium py-2 border-b border-gray-50 ${isActive(link.href) ? 'text-slate-900 font-semibold' : 'text-gray-600'
                                }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="pt-2 flex flex-col space-y-3">
                        {user ? (
                            <>
                                {canWriteLetter ? (
                                    <Link
                                        href="/dashboard/letters"
                                        className="bg-slate-900 text-white px-4 py-3 rounded-xl text-center text-sm font-medium hover:bg-slate-800"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        Write a Letter
                                    </Link>
                                ) : (
                                    <button
                                        onClick={() => { setUpgradeModalOpen(true); setIsMobileMenuOpen(false); }}
                                        className="bg-slate-900 text-white px-4 py-3 rounded-xl text-center text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2"
                                    >
                                        <Lock className="w-4 h-4" />
                                        Write a Letter
                                    </button>
                                )}
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
                                    Login
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

            {/* Upgrade Modal for non-subscribers */}
            <UpgradeModal
                isOpen={upgradeModalOpen}
                onClose={() => setUpgradeModalOpen(false)}
                title="Subscription Required"
                message="Writing heartfelt letters to your beloved pet in ToThereOn World is a premium feature. Subscribe to begin your correspondence through the Waterway."
                redirectUrl="/pricing"
                redirectText="View Plans"
            />
        </>
    );
}
