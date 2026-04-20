
'use client';

import { cn } from '@/lib/utils';
import { ChevronLeft, Mail, Search, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { useState } from 'react';

const RELATIONSHIP_LABELS: Record<string, string> = {
    'mom': '엄마',
    'dad': '아빠',
    'friend': '친구',
    'sister': '언니/여동생',
    'brother': '오빠/남동생',
    'guardian': '보호자',
    'other': '보호자',
};

function formatRelationship(rel: string | null | undefined): string {
    if (!rel) return 'Guardian';
    return RELATIONSHIP_LABELS[rel] ?? rel;
}

interface ReviewSidebarProps {
    letters: any[];
    selectedId: string | null;
    onSelect: (letter: any) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export function ReviewSidebar({
    letters,
    selectedId,
    onSelect,
    isCollapsed,
    onToggleCollapse
}: ReviewSidebarProps) {
    const [searchTerm, setSearchTerm] = useState('');

    // Grouping Logic
    const filteredLetters = letters.filter(l =>
        l.pet_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const grouped = groupLettersByDate(filteredLetters);
    // Sort dates descending
    const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Auto-expand mostly recent date
    const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(() => {
        // Default to first date expanded
        return sortedDates.length > 0 ? { [sortedDates[0]]: true } : {};
    });

    const toggleDate = (date: string) => {
        setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
    };

    if (isCollapsed) {
        return <div className="w-0 overflow-hidden transition-all duration-300" />;
    }

    return (
        <div className="w-[280px] h-full border-r border-slate-200 bg-white flex flex-col transition-all duration-300">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    Mailbox ({letters.length})
                </h2>
                <button onClick={onToggleCollapse} className="p-1 hover:bg-slate-200 rounded">
                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-slate-50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow"
                    />
                </div>
            </div>

            {/* Tree List */}
            <div className="flex-1 overflow-y-auto p-2">
                {sortedDates.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No letters found</div>
                ) : (
                    <div className="space-y-1">
                        {sortedDates.map(date => {
                            const dateLetters = grouped[date] as any[]; // Type assertion
                            const isExpanded = expandedDates[date];

                            return (
                                <div key={date} className="rounded-lg overflow-hidden">
                                    {/* Date Group Header */}
                                    <button
                                        onClick={() => toggleDate(date)}
                                        className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 transition-colors text-left group"
                                    >
                                        <div className="text-indigo-300 group-hover:text-indigo-500 transition-colors">
                                            {/* Folder Iconish */}
                                            {isExpanded ? (
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            ) : (
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            )}
                                        </div>
                                        <div className="flex-1 flex items-baseline justify-between">
                                            <span className="text-xs font-bold text-slate-700">{date}</span>
                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                                {dateLetters.length}
                                            </span>
                                        </div>
                                    </button>

                                    {/* Children Letters */}
                                    {isExpanded && (
                                        <div className="ml-2 pl-3 border-l border-slate-100 space-y-0.5 py-1">
                                            {dateLetters.map((letter: any) => {
                                                const isSelected = selectedId === letter.id;
                                                const timeStr = new Date(letter.reply_created_at || letter.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                                return (
                                                    <button
                                                        key={letter.id}
                                                        onClick={() => onSelect(letter)} // <--- CRITICAL CONNECTION
                                                        className={cn(
                                                            "w-full flex items-center gap-2.5 p-2 text-left rounded-md transition-all text-xs group",
                                                            isSelected
                                                                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100 shadow-sm"
                                                                : "hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                                                        )}
                                                    >
                                                        {/* Icon */}
                                                        <span className={cn(
                                                            "text-lg opacity-80 group-hover:scale-110 transition-transform",
                                                            isSelected ? "opacity-100" : "grayscale opacity-50"
                                                        )}>
                                                            {letter.pet_id ? '🐾' : '📄'}
                                                        </span>

                                                        {/* Content */}
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <div className="flex items-center justify-between w-full">
                                                                <span className="font-semibold truncate">
                                                                    {letter.pet_name || 'Unknown'}
                                                                </span>
                                                                {/* Status Dot */}
                                                                {renderStatusDot(letter.status)}
                                                            </div>
                                                            <span className={cn(
                                                                "truncate text-[10px]",
                                                                isSelected ? "text-blue-500" : "text-slate-400"
                                                            )}>
                                                                {timeStr} • {letter.pet?.name ? `${letter.pet.name}'s ${formatRelationship(letter.pet.relationship)}` : formatRelationship(letter.pet?.relationship)}
                                                            </span>
                                                        </div>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// Helpers
function groupLettersByDate(letters: any[]) {
    const grouped: Record<string, any[]> = {};
    letters.forEach(l => {
        const d = new Date(l.received_at || l.reply_created_at || l.created_at || Date.now());
        const dateKey = `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(l);
    });
    // Sort items within group by time desc
    Object.keys(grouped).forEach(k => {
        grouped[k].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    return grouped;
}

function renderStatusDot(status: string | undefined) {
    if (!status) return null;
    const s = status.toLowerCase();
    let color = 'bg-slate-300';
    if (s.includes('approv') || s.includes('sent') || s === 'received') color = 'bg-emerald-400';
    if (s.includes('pending') || s.includes('review')) color = 'bg-amber-400';
    if (s.includes('process')) color = 'bg-blue-400';

    return <div className={cn("w-1.5 h-1.5 rounded-full ml-2 shrink-0", color)} />;
}
