
'use client';

import Image from 'next/image';
import { ExternalLink, ImageIcon } from "lucide-react";
import { useState } from "react";

interface UserLetterViewProps {
    letter: {
        content: string;
        created_at: string;
        photos?: string[];
        user_name?: string;
    };
}

export function UserLetterView({ letter }: UserLetterViewProps) {
    const [zoomImage, setZoomImage] = useState<string | null>(null);

    return (
        <div className="h-full bg-slate-50/50 flex flex-col p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full">
                <div className="mb-6 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        User Letter
                    </span>
                    <span className="text-xs text-slate-400">
                        {new Date(letter.created_at).toLocaleString()}
                    </span>
                </div>

                {/* Photo Gallery */}
                {letter.photos && letter.photos.length > 0 && (
                    <div className="mb-8 grid grid-cols-2 gap-4">
                        {letter.photos.map((photo, idx) => (
                            <button
                                key={idx}
                                onClick={() => setZoomImage(photo)}
                                className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all"
                            >
                                <Image src={photo} alt="User attachment" fill className="object-cover" sizes="(max-width: 768px) 50vw, 300px" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <ExternalLink className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Letter Content */}
                <div className="prose prose-slate prose-lg max-w-none">
                    <p className="whitespace-pre-wrap leading-loose text-slate-700 font-serif" style={{ fontFamily: '"Pretendard", serif' }}>
                        {letter.content}
                    </p>
                </div>
            </div>

            {/* Image Zoom Modal */}
            {zoomImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm"
                    onClick={() => setZoomImage(null)}
                >
                    <img src={zoomImage} alt="Zoomed" className="max-w-full max-h-full rounded shadow-2xl" />
                </div>
            )}
        </div>
    );
}
