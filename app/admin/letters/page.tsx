'use client';

import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { Database } from '@/types/database.types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Loader2, RefreshCw, Send, CheckCircle2, ChevronDown, ChevronRight, X, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ReviewSidebar } from '@/components/admin/letters/ReviewSidebar';
import { ReviewHeader } from '@/components/admin/letters/ReviewHeader';
import { ReviewActionBar } from '@/components/admin/letters/ReviewActionBar';
import { LETTER_PIPELINE } from '@/lib/time-constants';

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

export default function AdminLettersPage() {
    const supabase = createClient();
    const [allLetters, setAllLetters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLetter, setSelectedLetter] = useState<any | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Filter States
    const [activeTab, setActiveTab] = useState<'processing' | 'review' | 'completed'>('processing');

    // Editing States
    const [editedContent, setEditedContent] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Regeneration
    const [regenerating, setRegenerating] = useState(false);

    // Test Modal
    const [processing, setProcessing] = useState(false);
    const [showTestModal, setShowTestModal] = useState(false);

    // LLM 검수 실패 노트 패널
    const [showReviewNotes, setShowReviewNotes] = useState(true);

    // Initial Fetch (Refactored for Strict Logic)
    const fetchLetters = async (preserveSelectionId?: string) => {
        try {
            // 1. Fetch ALL Letters + Pets (Simplified single query to memory to ensure correlation correctness)
            const { data: allData, error } = await supabase
                .from('letters')
                .select('*, pets(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!allData) return;

            // Helper to safely get pet object
            const getPet = (p: any) => {
                if (!p) return null;
                if (Array.isArray(p)) return p[0] || null;
                return p;
            };

            const getPetName = (p: any) => {
                const pet = getPet(p);
                return pet?.name || 'Unknown';
            };

            // 2. Classify Letters
            const processingList: any[] = [];
            const reviewList: any[] = [];
            const completedList: any[] = [];

            // Group by Pet for logical "latest status" checks
            const groupedByPet: Record<string, any[]> = {};
            (allData as any[]).forEach((l: any) => {
                if (!groupedByPet[l.pet_id]) groupedByPet[l.pet_id] = [];
                groupedByPet[l.pet_id].push(l);
            });

            // Process relationships
            // For each USER letter, checks if there is a Response.
            const userLetters = (allData as any[]).filter((l: any) => l.sender_type === 'user');

            userLetters.forEach((ul: any) => {
                const myReplies = (allData as any[]).filter((l: any) =>
                    l.sender_type === 'pet' &&
                    l.pet_id === ul.pet_id &&
                    new Date(l.created_at) > new Date(ul.created_at)
                );

                // If NO reply exists at all -> Processing
                if (myReplies.length === 0) {
                    processingList.push({
                        id: ul.id,
                        pet_name: getPetName(ul.pets),
                        status: ul.status.replace('_', ' ').toUpperCase(),
                        content: ul.content,
                        date: ul.created_at,
                        raw: { ...ul, pet: getPet(ul.pets), original_content: ul.content, original_created_at: ul.created_at },
                        type: 'processing'
                    });
                }
            });

            // For REVIEW & COMPLETED tabs, we look at PET letters
            const petLetters = (allData as any[]).filter((l: any) => l.sender_type === 'pet');

            // Collect promises for auto-sending
            const autoSendPromises: Promise<any>[] = [];

            petLetters.forEach((pl: any) => {
                // Calculate Time
                const originalUserLetter = (allData as any[]).find((l: any) =>
                    l.sender_type === 'user' &&
                    l.pet_id === pl.pet_id &&
                    new Date(l.created_at) < new Date(pl.created_at)
                );

                const anchorDate = originalUserLetter ? new Date(originalUserLetter.created_at) : new Date(pl.created_at);
                const petObj = getPet(pl.pets);
                const offsetHours = petObj?.time_offset_hours || 0;

                const now = new Date();
                const effectiveNow = new Date(now.getTime() + (offsetHours * 60 * 60 * 1000));
                const diffHours = (effectiveNow.getTime() - anchorDate.getTime()) / (1000 * 60 * 60);

                const isApproved = pl.status === 'received' || pl.status === 'approved' || pl.status === 'sent';
                const isDelivered = diffHours >= LETTER_PIPELINE.VISIBLE_TO_USER;

                // Auto-Send Logic (Lazy Trigger)
                // If Approved + Time Passed + Status is NOT 'sent', update it.
                if (isApproved && isDelivered && pl.status !== 'sent') {
                    // We update local state to reflect 'sent' immediately for UI
                    pl.status = 'sent';
                    // And fire off an async update
                    autoSendPromises.push(
                        supabase.from('letters').update({ status: 'sent' }).eq('id', pl.id)
                    );
                }

                // Review List: 
                // 1. Pending Review
                // 2. Approved BUT Not Delivered strict (< 168h)
                if (pl.status === 'pending_review' || pl.status === 'borderline_review' || (isApproved && !isDelivered)) {
                    reviewList.push({
                        id: pl.id, // reply_id
                        pet_name: getPetName(pl.pets),
                        status: isApproved ? '발송 예정' : '검수 필요',
                        content: pl.content,
                        date: pl.created_at,
                        raw: {
                            ...pl,
                            pet: petObj,
                            reply_id: pl.id,
                            reply_content: pl.content,
                            reply_created_at: pl.created_at,
                            original_content: originalUserLetter?.content || '(No context found)',
                            original_created_at: originalUserLetter?.created_at,
                            user_email: petObj?.user_email || 'user'
                        },
                        type: 'review'
                    });
                }

                // Completed List: Approved AND Delivered strict (>= 168h)
                // Note: If we auto-updated pl.status to 'sent' above, it falls here validly.
                if (isApproved && isDelivered) {
                    completedList.push({
                        id: pl.id,
                        pet_name: getPetName(pl.pets),
                        status: '발송 완료',
                        content: pl.content,
                        date: pl.created_at,
                        raw: {
                            ...pl,
                            pet: petObj,
                            reply_id: pl.id,
                            reply_content: pl.content,
                            reply_created_at: pl.created_at,
                            original_content: originalUserLetter?.content || '(No context found)',
                            original_created_at: originalUserLetter?.created_at
                        },
                        type: 'completed'
                    });
                }
            });

            // Execute auto-sends if any (fire and forget or await?)
            // Better to await somewhat or just let it happen.
            if (autoSendPromises.length > 0) {
                console.log(`🚀 Auto-sending ${autoSendPromises.length} letters...`);
                Promise.all(autoSendPromises).then(() => console.log('Auto-send batch complete'));
            }

            const combined = [...processingList, ...reviewList, ...completedList];
            setAllLetters(combined);

            if (preserveSelectionId) {
                const found = combined.find((x: any) => x.id === preserveSelectionId || x.raw.reply_id === preserveSelectionId);
                if (found) {
                    setSelectedLetter(found.raw);
                    if (found.type === 'review') setEditedContent(found.raw.reply_content || '');
                }
            }
        } catch (e: any) {
            toast.error('Load failed: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLetters();
    }, []);

    const handleSelect = (item: any) => {
        console.log('👆 Selected Item:', item);

        // 1. Try to find authoritative full item
        const fullItem = (allLetters as any[]).find((l: any) => l.id === item.id || l.raw.id === item.id);

        // 2. Fallback to using the passed item itself (it has most data)
        const target = fullItem ? fullItem.raw : item;

        console.log('✅ Resolved Target:', target);

        if (target) {
            setSelectedLetter(target);

            // Determine content to edit
            if (activeTab === 'processing' && target.type === 'processing') {
                setEditedContent('');
            } else {
                // review & completed both have reply_content
                setEditedContent(target.reply_content || target.content || '');
            }

            setIsSidebarCollapsed(true);
        } else {
            console.error('❌ Failed to resolve selection');
        }
    };

    // Filter & Grouping for Sidebar
    const getFilteredLetters = () => {
        if (activeTab === 'review') {
            return (allLetters as any[]).filter((l: any) => l.type === 'review').map((l: any) => ({
                ...l.raw,
                id: l.id, // Explicit ID
                reply_id: l.id,
                pet_name: l.pet_name
            }));
        }

        if (activeTab === 'processing') {
            return (allLetters as any[]).filter((l: any) => l.type === 'processing').map((l: any) => ({
                id: l.id, // Explicit ID for handleSelect
                reply_id: l.id,
                pet_name: l.pet_name,
                reply_content: l.content, // User content
                reply_created_at: l.date,
                pet_id: l.raw.pet?.id,
                pet: l.raw.pet,
                user_email: l.raw.user_email || 'user',
                original_content: l.content
            }));
        }

        if (activeTab === 'completed') {
            return (allLetters as any[])
                .filter((l: any) => l.type === 'completed')
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((l: any) => ({
                    id: l.id, // Explicit ID
                    reply_id: l.id,
                    pet_name: l.pet_name,
                    reply_content: l.content,
                    reply_created_at: l.date,
                    pet_id: l.raw.pet?.id,
                    pet: l.raw.pet,
                    user_email: l.raw.user_email || 'user',
                    status: 'received'
                }));
        }
        return [];
    };

    const handleApprove = async () => {
        if (!selectedLetter) return;
        setIsSending(true);
        try {
            // New Logic: Approve = Reserve. Status 'approved'.
            // Do NOT send to user yet. 
            const { error } = await supabase
                .from('letters')
                .update({
                    status: 'approved', // Reservation status
                    content: editedContent // Save any edits
                })
                .eq('id', selectedLetter.reply_id || selectedLetter.id);

            if (error) throw error;

            toast.success(`승인되었습니다! 7일 후 전송되도록 예약되었습니다.`);
            fetchLetters(selectedLetter.id);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleRegenerate = async (instruction?: string) => {
        if (!selectedLetter) return;
        setRegenerating(true);
        try {
            // Call API to regenerate
            // We need a specific endpoint for this. Assuming /api/admin/letters/regenerate
            const res = await fetch('/api/admin/letters/regenerate', {
                method: 'POST',
                body: JSON.stringify({
                    letterId: selectedLetter.reply_id,
                    instruction,
                    temperature: 1.2 // EXPLICIT HIGH VARIANCE
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Regeneration failed');
            }
            const data = await res.json();

            setEditedContent(data.content);
            toast.success('Regenerated!');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setRegenerating(false);
        }
    };

    // Warp Time for Testing
    const handleWarpTime = async () => {
        // This is a dev helper to simulate time passing for the pet
        // It should advance the letter's created_at or adjust the pet's time offset?
        // Actually, let's just adjust the pet's time_offset_hours.
        if (!selectedLetter?.pet?.id) return;

        const { error } = await supabase
            .rpc('increment_pet_time_offset', { pet_uuid: selectedLetter.pet.id, hours: 24 });

        if (error) toast.error(error.message);
        else {
            toast.success('Warped 24h!');
            fetchLetters(selectedLetter.id);
        }
    };
    return (
        <div className="flex h-[calc(100vh-64px)] bg-slate-50">
            {/* Sidebar */}
            <div className="flex flex-col border-r border-slate-200 bg-white h-full transition-all duration-300 relative z-20 shadow-sm"
                style={{ width: isSidebarCollapsed ? '0px' : '320px', overflow: 'hidden' }}>
                <div className="flex items-center p-2 gap-1 border-b border-slate-100 bg-slate-50 min-w-[320px]">
                    {(['processing', 'review', 'completed'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "flex-1 py-2 text-xs font-bold tracking-wider rounded-md transition-all",
                                activeTab === tab
                                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200"
                                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            )}
                        >
                            {tab === 'processing' ? 'AI 작성중' : tab === 'review' ? '검수 대기' : '처리 완료'}
                            {tab === 'review' && <span className="ml-1 text-[10px]">🔥</span>}
                        </button>
                    ))}
                </div>
                <div className="flex-1 overflow-hidden relative min-w-[320px]">
                    <ReviewSidebar
                        letters={getFilteredLetters()}
                        selectedId={selectedLetter?.id}
                        onSelect={handleSelect}
                        isCollapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
                {selectedLetter ? (
                    <div className="flex h-full">
                        {/* Left: Original Letter */}
                        <div className="w-5/12 p-6 overflow-y-auto border-r border-slate-200 bg-white">
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="flex items-center gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-lg shadow-sm">
                                        👤
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-sm">
                                            {selectedLetter.pet?.name
                                                ? `${selectedLetter.pet.name}'s ${formatRelationship(selectedLetter.pet.relationship)}`
                                                : formatRelationship(selectedLetter.pet?.relationship)}
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            {selectedLetter.original_created_at ? format(new Date(selectedLetter.original_created_at), 'PPP p', { locale: ko }) : '-'}
                                        </p>
                                    </div>
                                </div>

                                <div className="prose prose-slate prose-sm max-w-none">
                                    <div className="whitespace-pre-wrap text-slate-700 leading-loose text-base font-serif bg-slate-50/50 p-6 rounded-2xl border border-slate-100/50">
                                        {selectedLetter.original_content}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Reply Editor / View */}
                        <div className="w-7/12 flex flex-col bg-slate-50 h-full relative">
                            {/* Header (Time Control & Sidebar Toggle) */}
                            <ReviewHeader
                                pet={selectedLetter.pet}
                                currentDay={0} // To be calculated or passed
                                userLetterDate={selectedLetter.original_created_at}
                                isSidebarCollapsed={isSidebarCollapsed}
                                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                onRefresh={() => fetchLetters(selectedLetter.id)}
                            />

                            <div className="flex-1 overflow-y-auto p-8">
                                <div className="max-w-3xl mx-auto space-y-6">
                                    {activeTab === 'processing' ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                                            <Loader2 className="w-10 h-10 animate-spin text-indigo-200" />
                                            <p className="text-sm font-medium">AI가 교감을 분석중입니다...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Pet Profile in Editor Area */}
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200 relative">
                                                    {selectedLetter.pet?.photos?.[0] ?
                                                        <Image src={selectedLetter.pet.photos[0]} alt="Pet" fill className="object-cover" sizes="32px" /> :
                                                        '🐾'
                                                    }
                                                </div>
                                                <span className="text-xs font-bold text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md">
                                                    AI 답변
                                                </span>
                                                {activeTab === 'completed' && (
                                                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> 승인 완료 · 수정 불가
                                                    </span>
                                                )}
                                            </div>

                                            {/* LLM 자동검수 실패 노트 (3회 전부 미통과 시 표시) */}
                                            {selectedLetter.metadata?.auto_review_failed && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
                                                    <button
                                                        onClick={() => setShowReviewNotes(v => !v)}
                                                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-100/60 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                                            <span className="text-xs font-bold text-amber-800">
                                                                LLM 자동검수 {selectedLetter.metadata.review_attempts}회 전부 미통과 — 운영자 판단 필요
                                                            </span>
                                                        </div>
                                                        {showReviewNotes
                                                            ? <ChevronDown className="w-4 h-4 text-amber-500" />
                                                            : <ChevronRight className="w-4 h-4 text-amber-500" />
                                                        }
                                                    </button>

                                                    {showReviewNotes && (
                                                        <div className="px-4 pb-4 space-y-3">
                                                            {(selectedLetter.metadata.review_notes as any[] || []).map((note: any) => (
                                                                <div key={note.attempt} className="bg-white rounded-lg border border-amber-100 p-3 space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={cn(
                                                                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                                            note.passed
                                                                                ? "bg-emerald-100 text-emerald-700"
                                                                                : "bg-red-100 text-red-700"
                                                                        )}>
                                                                            {note.attempt}회차 · {note.score}점 · {note.passed ? '통과' : '탈락'}
                                                                        </span>
                                                                        <p className="text-xs text-slate-600 flex-1">{note.critique}</p>
                                                                    </div>
                                                                    {note.issues?.length > 0 && (
                                                                        <ul className="space-y-1">
                                                                            {note.issues.map((issue: any, i: number) => (
                                                                                <li key={i} className="flex items-start gap-2 text-[11px]">
                                                                                    <span className={cn(
                                                                                        "mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0",
                                                                                        issue.severity === 'danger'
                                                                                            ? "bg-red-100 text-red-700"
                                                                                            : "bg-amber-100 text-amber-700"
                                                                                    )}>
                                                                                        {issue.type}
                                                                                    </span>
                                                                                    <span className="text-slate-600">
                                                                                        {issue.quote && <span className="font-mono text-slate-800 bg-slate-100 px-1 rounded mr-1">"{issue.quote}"</span>}
                                                                                        {issue.reason}
                                                                                    </span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <textarea
                                                value={editedContent}
                                                onChange={(e) => activeTab !== 'completed' && setEditedContent(e.target.value)}
                                                readOnly={activeTab === 'completed'}
                                                className={cn(
                                                    "w-full h-[600px] p-8 rounded-xl border bg-white shadow-sm resize-none text-slate-700 leading-loose text-lg font-serif focus:outline-none transition-all placeholder:text-slate-300",
                                                    activeTab === 'completed'
                                                        ? "border-slate-100 cursor-default text-slate-500 bg-slate-50/80"
                                                        : "border-transparent focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50/50"
                                                )}
                                                placeholder="답변을 작성해주세요..."
                                                style={{ fontFamily: '"Pretendard", serif' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Bar */}
                            {activeTab === 'review' && (
                                <ReviewActionBar
                                    status={selectedLetter.status}
                                    onApprove={handleApprove}
                                    onReject={() => { }}
                                    onCancelApproval={() => { }}
                                    onRegenerate={handleRegenerate}
                                    isProcessing={isSending || regenerating}
                                />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-4 shadow-sm">
                            <Send className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="font-medium text-sm">검수할 편지를 선택하세요</p>
                    </div>
                )}
            </div>
        </div>
    );
}
