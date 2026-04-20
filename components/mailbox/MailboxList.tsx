
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Mail, Send, ChevronRight, PenLine, Inbox, Eye, X, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UpgradeModal } from '@/components/ui/UpgradeModal';
import LetterDeliveryJourney from '@/components/mailbox/LetterDeliveryJourney';

interface MailboxListProps {
    inbox: any[];
    sent: any[];
    petName: string;
    onReadLetter: (content: string, date: string, type: 'received' | 'sent') => void;
    onSelectLetter?: (letter: any) => void;
    petId: string;
    canWriteLetter?: boolean;
    onCooldown?: boolean;
    cooldownUntil?: string;
}

function getDeliveryStage(createdAt: string): { label: string; step: number } {
    const hoursElapsed = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursElapsed < 72) return { label: 'Crossing the Waterway', step: 0 };
    if (hoursElapsed < 96) return { label: 'Arrived at ToThereOn', step: 1 };
    if (hoursElapsed < 120) return { label: 'Being read...', step: 2 };
    if (hoursElapsed < 168) return { label: 'Writing a reply', step: 3 };
    return { label: 'Reply on its way', step: 4 };
}

function formatCooldown(until: string): string {
    const diff = new Date(until).getTime() - Date.now();
    if (diff <= 0) return '곧 가능';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}일 ${hours}시간 후`;
    return `${hours}시간 후`;
}

// ─── Cooldown Modal ────────────────────────────────────────────────────────────

function CooldownModal({ isOpen, onClose, petName, cooldownUntil }: {
    isOpen: boolean;
    onClose: () => void;
    petName: string;
    cooldownUntil?: string;
}) {
    if (!isOpen) return null;

    const timeLeft = cooldownUntil ? formatCooldown(cooldownUntil) : '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full relative text-center space-y-5">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                    <Clock className="w-7 h-7 text-amber-500" />
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900">편지가 아직 전달 중이에요</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        <strong className="text-slate-700">{petName}</strong>이(가) 지난 편지를
                        받고 답장을 준비하는 중이에요.
                    </p>
                </div>

                {cooldownUntil && (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3">
                        <p className="text-xs text-amber-600 font-medium mb-0.5">다음 편지 가능까지</p>
                        <p className="text-xl font-bold text-amber-700">{timeLeft}</p>
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors text-sm"
                >
                    확인
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MailboxList({
    inbox, sent, petName, onReadLetter, onSelectLetter,
    petId, canWriteLetter = false, onCooldown = false, cooldownUntil
}: MailboxListProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [cooldownModalOpen, setCooldownModalOpen] = useState(false);

    const handleWriteLetterClick = () => {
        if (!canWriteLetter) {
            setUpgradeModalOpen(true);
            return;
        }
        if (onCooldown) {
            setCooldownModalOpen(true);
            return;
        }
        router.push(`/dashboard/pets/${petId}/write`);
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
            {/* Header Tabs */}
            <div className="flex border-b border-gray-100">
                <button
                    onClick={() => setActiveTab('inbox')}
                    className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2
                        ${activeTab === 'inbox' ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Inbox className="w-4 h-4" />
                    Unknown Inbox ({inbox.filter(i => !i.is_read).length})
                </button>
                <button
                    onClick={() => setActiveTab('sent')}
                    className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2
                        ${activeTab === 'sent' ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Send className="w-4 h-4" />
                    Sent
                </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {activeTab === 'inbox' ? (
                    inbox.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                <Inbox className="w-6 h-6 opacity-30" />
                            </div>
                            <p className="text-sm font-medium">No replies have arrived yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {inbox.map((letter) => (
                                <div
                                    key={letter.id}
                                    onClick={() => onReadLetter(letter.content, letter.createdAt, 'received')}
                                    className={`p-4 rounded-xl cursor-pointer transition-all border group relative
                                        ${!letter.is_read ? 'bg-amber-50 border-amber-100 hover:shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            {!letter.is_read && (
                                                <span className="w-2 h-2 rounded-full bg-amber-500 block animate-pulse" />
                                            )}
                                            <span className={`text-sm ${!letter.is_read ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                {petName}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium tabular-nums">
                                            {format(new Date(letter.createdAt), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                    <h4 className={`text-sm mb-1 truncate pr-8 ${!letter.is_read ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                                        {letter.content.substring(0, 30)}...
                                    </h4>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors" />
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    // Sent Tab
                    <div className="space-y-1">
                        {/* Write New Button */}
                        <div className="p-4 mb-2">
                            <button
                                onClick={handleWriteLetterClick}
                                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                                    ${onCooldown
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-amber-100 hover:bg-amber-100'
                                        : 'bg-gray-900 hover:bg-black text-white shadow-gray-200'
                                    }`}
                            >
                                {onCooldown ? (
                                    <>
                                        <Clock className="w-4 h-4" />
                                        편지 전달 중 · {cooldownUntil ? formatCooldown(cooldownUntil) : ''} 후 작성 가능
                                    </>
                                ) : (
                                    <>
                                        <PenLine className="w-4 h-4" />
                                        Write New Letter
                                    </>
                                )}
                            </button>
                        </div>

                        {sent.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 px-4">
                                <p className="text-sm">No letters yet. When you write, your words travel through the Waterway and reach them within a few days.</p>
                            </div>
                        ) : (
                            sent.map((letter, idx) => (
                                <div
                                    key={letter.id}
                                    onClick={() => onSelectLetter && onSelectLetter(letter)}
                                    className="p-4 rounded-xl bg-white hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all cursor-pointer group flex flex-col gap-2"
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="text-sm font-medium text-gray-600">To. {petName}</span>
                                        <span className="text-xs text-gray-400 font-medium tabular-nums">
                                            {format(new Date(letter.createdAt), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        {letter.content}
                                    </p>

                                    {/* Most recent letter: rich Journey widget; older: compact label */}
                                    {idx === 0 ? (
                                        <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                                            <LetterDeliveryJourney sentAt={letter.createdAt} />
                                        </div>
                                    ) : (
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4].map(i => {
                                                    const { step } = getDeliveryStage(letter.createdAt);
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`h-1.5 w-6 rounded-full ${i <= step ? 'bg-cyan-400' : 'bg-gray-200'}`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                            <span className="text-xs text-gray-500">{getDeliveryStage(letter.createdAt).label}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-1">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onReadLetter(letter.content, letter.createdAt, 'sent');
                                            }}
                                            className="text-xs font-bold text-gray-400 hover:text-amber-600 flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-amber-50"
                                        >
                                            <Eye className="w-3 h-3" />
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            <UpgradeModal
                isOpen={upgradeModalOpen}
                onClose={() => setUpgradeModalOpen(false)}
                title="Subscription Required"
                message="Writing letters to your beloved pet is a premium feature. Subscribe to a plan to send heartfelt messages through the Waterway to ToThereOn World."
                redirectUrl="/pricing"
                redirectText="View Plans"
            />
            <CooldownModal
                isOpen={cooldownModalOpen}
                onClose={() => setCooldownModalOpen(false)}
                petName={petName}
                cooldownUntil={cooldownUntil}
            />
        </div>
    );
}
