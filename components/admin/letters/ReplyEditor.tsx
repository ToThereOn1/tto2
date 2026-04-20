
'use client';

import { useRef, useEffect } from 'react';

interface ReplyEditorProps {
    content: string;
    onChange: (val: string) => void;
    isReadOnly?: boolean;
}

export function ReplyEditor({ content, onChange, isReadOnly = false }: ReplyEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [content]);

    return (
        <div className="h-full bg-white flex flex-col p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full h-full flex flex-col">
                <div className="mb-6 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                        AI Draft Reply (Interactive)
                    </span>
                    {/* Placeholder for future tools like 'Banned Words Detected' */}
                </div>

                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => onChange(e.target.value)}
                        readOnly={isReadOnly}
                        placeholder="AI is writing..."
                        className="w-full h-full resize-none border-none focus:ring-0 text-lg leading-loose text-slate-800 font-serif bg-transparent placeholder:text-slate-300 min-h-[500px]"
                        style={{ fontFamily: '"Pretendard", serif' }}
                        spellCheck={false}
                    />
                </div>

                <p className="text-xs text-slate-400 mt-4 text-center">
                    * You can edit this text directly before approving.
                </p>
            </div>
        </div>
    );
}
