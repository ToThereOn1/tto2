
'use client';

import { motion } from 'framer-motion';
import { Mail, Send, Sparkles, Clock, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// --- Types ---
export type TimelineItemProps = {
    item: {
        id: string;
        type: 'letter' | 'status';
        subtype: 'sent' | 'received' | 'status_update';
        title: string;
        content: string;
        description?: string;
        zone?: string;
        createdAt: string;
        is_read?: boolean;
        pet_id?: string;
    };
    petName: string;
    onReadLetter?: (content: string, date: string) => void;
};

// --- Sub-components ---

// 1. User Letter Card (Right Aligned)
export function UserLetterCard({ item }: TimelineItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-end mb-6"
        >
            <div className="max-w-[80%] md:max-w-[60%]">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative group hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 font-medium uppercase tracking-wider">
                        <Send className="w-3 h-3" />
                        <span>Sent Letter</span>
                        <span className="ml-auto text-gray-300">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed line-clamp-3 font-serif">
                        {item.content}
                    </p>
                    {item.is_read && (
                        <div className="absolute -bottom-5 right-2 text-xs text-amber-500 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Read
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// 2. Pet Reply Card (Left Aligned - Highlighted)
export function PetReplyCard({ item, petName, onReadLetter }: TimelineItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-start mb-8"
        >
            <div className="max-w-[85%] md:max-w-[65%]">
                <div
                    onClick={() => onReadLetter?.(item.content, item.createdAt)}
                    className="bg-amber-50/50 rounded-2xl p-5 shadow-sm border border-amber-100 cursor-pointer hover:bg-amber-50 transition-colors group relative overflow-hidden"
                >
                    {/* Decorative shimmer */}
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Mail className="w-12 h-12 text-amber-600" />
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            {/* Avatar placeholder - ideal place for pet photo */}
                            <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold text-amber-700">
                                {petName[0]}
                            </div>
                            <span className="text-sm font-bold text-gray-800">{petName}</span>
                        </div>
                        <span className="text-xs text-amber-600/70 font-medium px-2 py-0.5 bg-amber-100 rounded-full">
                            Reply Arrived
                        </span>
                    </div>

                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 font-serif mb-3 opacity-80">
                        {item.content}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-100/50">
                        <span className="text-xs text-gray-400 font-medium">
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                        </span>
                        <button className="text-xs font-bold text-amber-600 group-hover:underline flex items-center gap-1">
                            Read Letter <span className="text-[10px]">▶</span>
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// 3. Status Feed Card (Center - Neutral)
export function StatusFeedCard({ item }: TimelineItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
        >
            <div className="text-center max-w-[80%]">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-50 rounded-full border border-gray-100 shadow-sm text-xs text-gray-500">
                    {/* Icon based on subtype/event_type could go here */}
                    {item.description === 'sleep' && <span>🌙</span>}
                    {item.description === 'activity' && <span>🎾</span>}
                    {item.description === 'thought' && <span>💭</span>}
                    {!['sleep', 'activity', 'thought'].includes(item.description || '') && <span>🐾</span>}

                    <span className="font-medium">{item.content}</span>

                    {item.zone && (
                        <span className="flex items-center gap-1 text-gray-400 pl-2 border-l border-gray-200 ml-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {item.zone}
                        </span>
                    )}
                </div>
                <div className="text-[10px] text-gray-300 mt-1">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </div>
            </div>
        </motion.div>
    );
}

// Main Dispatcher Component
export default function TimelineItem(props: TimelineItemProps) {
    const { item } = props;

    if (item.type === 'letter') {
        if (item.subtype === 'sent') {
            return <UserLetterCard {...props} />;
        } else {
            return <PetReplyCard {...props} />;
        }
    }

    return <StatusFeedCard {...props} />;
}
