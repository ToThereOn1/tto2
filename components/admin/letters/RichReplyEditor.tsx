
'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

interface Issue {
    type: 'hallucination' | 'tone' | 'safety' | 'style';
    quote: string;
    reason: string;
    severity: 'warning' | 'danger';
}

interface AnalysisResult {
    is_safe: boolean;
    issues: Issue[];
}

interface RichReplyEditorProps {
    content: string;
    onChange: (value: string) => void;
    analysisResult?: AnalysisResult | null;
}

export function RichReplyEditor({ content, onChange, analysisResult }: RichReplyEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const [hoveredIssue, setHoveredIssue] = useState<Issue | null>(null);
    const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

    // Sync scroll
    const handleScroll = () => {
        if (textareaRef.current && backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
        }
    };

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    // Highlighting Logic
    const renderHighlights = () => {
        if (!analysisResult?.issues?.length) return content;

        let lastIndex = 0;
        const elements: React.ReactNode[] = [];
        const text = content;

        // Sort issues by position in text (need to find indices)
        // Note: Simple indexOf finds first occurrence. 
        // For distinct highlighting, we need more robust logic, but for MVP let's assume unique enough quotes.
        // We will create a map of ranges to highlight.

        const ranges: { start: number; end: number; issue: Issue }[] = [];

        analysisResult.issues.forEach(issue => {
            if (!issue.quote) return;
            const start = text.indexOf(issue.quote);
            if (start !== -1) {
                ranges.push({ start, end: start + issue.quote.length, issue });
            }
        });

        // Sort ranges and prevent overlap (simple strategy: first wins or merge?)
        ranges.sort((a, b) => a.start - b.start);

        ranges.forEach((range, idx) => {
            // Text before highlight
            if (range.start > lastIndex) {
                elements.push(<span key={`text-${idx}`}>{text.slice(lastIndex, range.start)}</span>);
            }

            // Highlighted text
            const severityColor = range.issue.severity === 'danger' ? 'bg-red-200 decoration-red-400' : 'bg-yellow-200 decoration-amber-400';

            elements.push(
                <span
                    key={`highlight-${idx}`}
                    className={cn("underline decoration-wavy decoration-2 cursor-help relative inline-block rounded px-0.5 mx-[-2px]", severityColor)}
                    onMouseEnter={(e) => {
                        setHoveredIssue(range.issue);
                        setHoverPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHoveredIssue(null)}
                >
                    {text.slice(range.start, range.end)}
                </span>
            );

            lastIndex = range.end;
        });

        // Remaining text
        if (lastIndex < text.length) {
            elements.push(<span key="text-end">{text.slice(lastIndex)}</span>);
        }

        return elements;
    };

    return (
        <div className="relative w-full h-full min-h-[500px] flex flex-col font-sans">
            {/* Toolbar / Header */}
            <div className="bg-white border-b border-slate-100 p-3 flex justify-between items-center sticky top-0 z-20">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    AI Reply Editor
                </div>
                {analysisResult && (
                    <div className="flex gap-4 text-xs">
                        {analysisResult.is_safe ? (
                            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                <Info className="w-3.5 h-3.5" /> Safe Content
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 animate-pulse">
                                <AlertTriangle className="w-3.5 h-3.5" /> Issues Detected ({analysisResult.issues.length})
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Editor Container */}
            <div className="relative flex-1 p-8 overflow-hidden group">
                {/* Backdrop (Highlights) */}
                <div
                    ref={backdropRef}
                    className="absolute inset-0 px-8 py-8 m-0 whitespace-pre-wrap break-words font-medium text-lg leading-relaxed text-transparent pointer-events-none select-none overflow-auto scrollbar-hide"
                    aria-hidden="true"
                    style={{ fontFamily: 'var(--font-pretendard), sans-serif' }}
                >
                    {renderHighlights()}
                </div>

                {/* Foreground (Textarea) */}
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => {
                        onChange(e.target.value);
                        // Resize handled by useEffect
                    }}
                    onScroll={handleScroll}
                    spellCheck={false}
                    className="relative w-full h-full min-h-[400px] bg-transparent text-slate-800 font-medium text-lg leading-relaxed focus:outline-none resize-none overflow-auto scrollbar-hide z-10"
                    style={{ fontFamily: 'var(--font-pretendard), sans-serif' }}
                    placeholder="Write your reply here..."
                />

                {/* Tooltip Overlay */}
                {hoveredIssue && (
                    <div
                        className="fixed z-50 bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl max-w-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                        style={{ top: hoverPos.y + 20, left: hoverPos.x }}
                    >
                        <div className="flex items-center gap-2 mb-1 font-bold text-slate-200 capitalize">
                            {hoveredIssue.severity === 'danger' && <XCircle className="w-3 h-3 text-red-500" />}
                            {hoveredIssue.severity === 'warning' && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                            {hoveredIssue.type} Issue
                        </div>
                        <p className="font-normal leading-relaxed">{hoveredIssue.reason}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
