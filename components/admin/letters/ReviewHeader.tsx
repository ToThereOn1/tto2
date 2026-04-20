import Image from 'next/image';
import { Sparkles, Calendar, Menu, ArrowLeftFromLine, ArrowRightFromLine, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReviewHeaderProps {
    pet: any;
    currentDay: number;
    userLetterDate?: string;
    onRefresh?: () => void;
    isSidebarCollapsed: boolean;
    onToggleSidebar: () => void;
}

export function ReviewHeader({
    pet,
    currentDay,
    userLetterDate,
    onRefresh,
    isSidebarCollapsed,
    onToggleSidebar
}: ReviewHeaderProps) {
    if (!pet) return null;

    // Calculate Elapsed Time
    let elapsedHours = 0;
    if (userLetterDate) {
        const offsetHours = pet.time_offset_hours || 0;
        const now = new Date();
        const effectiveNow = new Date(now.getTime() + (offsetHours * 60 * 60 * 1000));
        const letterTime = new Date(userLetterDate);

        const diffMs = effectiveNow.getTime() - letterTime.getTime();
        elapsedHours = Math.floor(diffMs / (1000 * 60 * 60));
    }

    const currentDDay = Math.floor(elapsedHours / 24);

    // Parse persona traits
    const traits = pet.pet_personas?.persona_profile?.core_traits || [];

    return (
        <div className="h-[64px] border-b border-indigo-100 bg-white/90 backdrop-blur px-6 flex items-center justify-between shadow-sm z-10 sticky top-0">
            <div className="flex items-center gap-6">
                {/* Sidebar Toggle */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                    title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isSidebarCollapsed ? <ArrowRightFromLine className="w-5 h-5" /> : <ArrowLeftFromLine className="w-5 h-5" />}
                </button>

                {/* Pet Info */}
                <div className="flex items-center gap-4 border-l border-slate-200 pl-6 h-10">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200 shadow-sm ring-2 ring-white relative">
                        {pet.photos && pet.photos[0] ? (
                            <Image src={pet.photos[0]} alt={pet.name} fill className="object-cover" sizes="40px" />
                        ) : '🐶'}
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            {pet.name}
                            <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 uppercase tracking-widest">
                                {pet.species}
                            </span>
                        </h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {traits.slice(0, 3).map((trait: string, idx: number) => (
                                <span key={idx} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100">
                                    #{trait}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* 1. Time Badge */}
                <div className={`flex items-center h-9 pl-3 pr-1 rounded-full border bg-white shadow-sm
                    ${elapsedHours >= 168
                        ? 'border-red-200 text-red-600 ring-1 ring-red-50'
                        : elapsedHours >= 120
                            ? 'border-orange-200 text-orange-600 ring-1 ring-orange-50'
                            : 'border-blue-200 text-blue-600 ring-1 ring-blue-50'
                    }`}
                >
                    <div className="flex items-center gap-2 mr-3 font-mono font-bold text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{elapsedHours}H PASSED</span>
                    </div>

                    <div className="h-full w-px bg-slate-100 mx-1" />

                    {/* D-Day + Warp */}
                    <div className="flex items-center gap-1">
                        <span className="text-xs font-bold px-2">D+{currentDDay}</span>
                        <button
                            onClick={async () => {
                                const toastId = toast.loading('Warping time +24h...');
                                try {
                                    const currentOffset = pet.time_offset_hours || 0;
                                    const newOffset = currentOffset + 24;

                                    const res = await fetch(`/api/admin/pets/${pet.id}/time-warp`, {
                                        method: 'POST',
                                        body: JSON.stringify({ offsetHours: newOffset })
                                    });

                                    if (!res.ok) throw new Error('API Error');

                                    toast.success(`Warped! Now D+${currentDDay + 1}`, { id: toastId });

                                    if (onRefresh) onRefresh();
                                } catch (e: any) {
                                    toast.error('Failed: ' + e.message, { id: toastId });
                                }
                            }}
                            className="h-7 px-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ml-1"
                            title="Warp Time (+24 Hours)"
                        >
                            +24H
                        </button>
                    </div>
                </div>

                {/* 2. AI Score */}
                <div className="flex items-center gap-2 h-9 px-4 rounded-full border border-green-200 bg-green-50 text-green-700 shadow-sm" title="AI Consistency Score">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="font-bold text-sm">{pet.ai_score || 95}</span>
                </div>
            </div>
        </div>
    );
}
