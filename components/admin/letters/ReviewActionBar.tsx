'use client';


import { Check, Loader2, RefreshCw, Save, X, ChevronDown, CheckCircle2 } from "lucide-react";
import { useState } from 'react';
import { cn } from "@/lib/utils";

interface ReviewActionBarProps {
    status: string;
    onApprove: () => void;
    onCancelApproval: () => void;
    onReject: () => void;
    onRegenerate: (instruction?: string) => void;
    isProcessing: boolean;
}

export function ReviewActionBar({
    status,
    onApprove,
    onCancelApproval,
    onReject,
    onRegenerate,
    isProcessing
}: ReviewActionBarProps) {
    const [showOptions, setShowOptions] = useState(false);
    const [instruction, setInstruction] = useState('');

    const handleRegenClick = () => {
        onRegenerate(instruction || undefined);
        setShowOptions(false);
        setInstruction('');
    };

    const isApproved = status === 'approved' || status === 'received';

    return (
        <div className="h-16 bg-white border-t border-slate-200 px-6 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] z-20 relative">
            <div className="flex items-center gap-3">
                <button
                    onClick={onReject}
                    disabled={isProcessing || isApproved}
                    className="text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded transition-colors"
                >
                    Reject
                </button>
            </div>

            <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="flex items-center rounded-lg border border-slate-200 shadow-sm p-1 bg-slate-50">
                        <button
                            onClick={() => onRegenerate()}
                            disabled={isProcessing || isApproved}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded bg-white shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 hover:text-indigo-600",
                                isProcessing && "animate-pulse"
                            )}
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", isProcessing && "animate-spin")} />
                            Regenerate
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <button
                            onClick={() => !isApproved && setShowOptions(!showOptions)}
                            disabled={isProcessing || isApproved}
                            className="px-1.5 py-1.5 text-slate-500 hover:bg-white hover:text-indigo-600 rounded disabled:opacity-50"
                        >
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {showOptions && !isApproved && (
                        <div className="absolute bottom-full right-0 mb-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 p-3 animate-in slide-in-from-bottom-2">
                            <h3 className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider px-1">AI Instruction</h3>
                            <div className="space-y-1">
                                <button onClick={() => onRegenerate('Make it warmer and more emotional')} className="w-full text-left text-xs p-2 hover:bg-slate-50 rounded text-slate-700">🔥 Warmer & Emotional</button>
                                <button onClick={() => onRegenerate('Expand length and add more details')} className="w-full text-left text-xs p-2 hover:bg-slate-50 rounded text-slate-700">📝 Expand Length</button>
                                <button onClick={() => onRegenerate('Make it shorter and concise')} className="w-full text-left text-xs p-2 hover:bg-slate-50 rounded text-slate-700">✂️ Shorter</button>
                                <button onClick={() => onRegenerate('Mention specific shared memory')} className="w-full text-left text-xs p-2 hover:bg-slate-50 rounded text-slate-700">🧠 Mention Memory</button>
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-100">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Custom instruction..."
                                        className="flex-1 text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-300"
                                        value={instruction}
                                        onChange={(e) => setInstruction(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRegenClick()}
                                    />
                                    <button
                                        onClick={handleRegenClick}
                                        className="bg-indigo-600 text-white text-xs font-bold px-3 rounded hover:bg-indigo-700"
                                    >
                                        Go
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-px h-6 bg-slate-200" />
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onApprove}
                    disabled={isProcessing || isApproved}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                        isApproved && "bg-emerald-500 hover:bg-emerald-600"
                    )}
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : isApproved ? <CheckCircle2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    {isApproved ? "Approved" : "Approve & Reserve"}
                </button>
            </div>
        </div>
    );
}
