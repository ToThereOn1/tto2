
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import TimelineItem, { TimelineItemProps } from '@/components/timeline/TimelineItem';
import LetterReadModal from '@/components/timeline/LetterReadModal';

interface TimelineFeedProps {
    items: TimelineItemProps['item'][];
    petName: string;
    petPhotoUrl?: string; // Optional for now
    petId: string;
}

export default function TimelineFeed({ items, petName, petPhotoUrl, petId }: TimelineFeedProps) {
    const [selectedLetter, setSelectedLetter] = useState<{ content: string, date: string } | null>(null);

    const handleReadLetter = (content: string, date: string) => {
        setSelectedLetter({ content, date });
    };

    const handleCloseModal = () => {
        setSelectedLetter(null);
    };

    // Animation variants for container (stagger children)
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4 text-2xl animate-pulse">
                    ✨
                </div>
                <h3 className="text-lg font-serif font-medium text-gray-800 mb-2">
                    The story hasn't begun yet
                </h3>
                <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                    Send your first letter to {petName}.<br />
                    A reply will find its way to you soon.
                </p>
                <button
                    onClick={() => window.location.href = `/dashboard/pets/${petId}/write`}
                    className="mt-6 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                    <Sparkles className="w-4 h-4" />
                    Write First Letter
                </button>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen pb-20">
            {/* Timeline Line (Background) */}
            <div className="absolute left-[24px] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-gray-100 via-gray-200 to-gray-50 transform -translate-x-1/2 z-0 hidden md:block" />

            {/* Feed Items */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="relative z-10 space-y-8 px-4 md:px-0 max-w-3xl mx-auto"
            >
                {items.map((item) => (
                    <TimelineItem
                        key={item.id}
                        item={item}
                        petName={petName}
                        onReadLetter={handleReadLetter}
                    />
                ))}
            </motion.div>

            {/* Read Letter Modal */}
            <LetterReadModal
                isOpen={!!selectedLetter}
                onClose={handleCloseModal}
                content={selectedLetter?.content || ''}
                petName={petName}
                petPhotoUrl={petPhotoUrl}
                sentDate={selectedLetter?.date || new Date().toISOString()}
            />
        </div>
    );
}
