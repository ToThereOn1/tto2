
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import {
    LayoutDashboard,
    Mail,
    FileText,
    ListChecks,
    Globe,
    Users,
    Shield,
    UserCircle,
    Activity,
    LogOut,
    ClipboardCheck
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [authChecked, setAuthChecked] = useState(false);

    // Admin authorization check — redirect non-admin users
    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/login');
                return;
            }
            const { data: adminUser } = await supabase
                .from('admin_users')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();
            if (!adminUser) {
                router.replace('/dashboard');
                return;
            }
            setAuthChecked(true);
        })();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const navItems = [
        { name: '대시보드', href: '/admin', icon: LayoutDashboard },
        { name: '편지 검수', href: '/admin/letters', icon: Mail },
        { name: '펫 스키마', href: '/admin/pet-schema', icon: FileText },
        { name: '설문 관리', href: '/admin/survey-editor', icon: ListChecks },
        { name: '세계관 설정', href: '/admin/worldview-config', icon: Globe },
        { name: 'NPC 관리', href: '/admin/npc-manager', icon: Users },
        { name: '체크리스트', href: '/admin/checklist', icon: ClipboardCheck },
        { name: '페르소나 관리', href: '/admin/personas', icon: UserCircle },
        { name: '타임라인 현황', href: '/admin/timeline-monitor', icon: Activity },
    ];

    if (!authChecked) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="text-slate-500 text-sm">Verifying access...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10 shadow-xl">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <Image src="/logo-ci-dark.svg" alt="ToThereOn" width={140} height={38} className="flex-shrink-0 h-8 w-auto" priority />
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest ml-auto">Admin</span>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                                <span className="text-sm font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-900">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/10 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">로그아웃</span>
                    </button>
                    <div className="mt-4 px-4 text-xs text-slate-600 flex justify-between">
                        <span>v1.2.0</span>
                        <span>Phase 8-2</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
