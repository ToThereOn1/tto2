
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { getMailboxStatus } from '@/lib/mailbox-status';
import { CheckCircle2, Circle, Truck, Package, PenTool, Mail, Clock } from 'lucide-react';

interface MailboxSidebarProps {
    petName: string;
    petPhotoUrl?: string;
    activeLetter: { createdAt: string } | null; // Changed from lastLetterDate string
    timeOffsetHours?: number;
    hasReply?: boolean;
}

export default function MailboxSidebar({ petName, petPhotoUrl, activeLetter, timeOffsetHours = 0, hasReply = false }: MailboxSidebarProps) {
    const status = getMailboxStatus(activeLetter?.createdAt || null, timeOffsetHours, hasReply);

    const steps = [
        { id: 1, label: 'Sent', icon: Mail },
        { id: 2, label: 'Arrived at ToThereOn', icon: Truck },
        { id: 3, label: 'Delivered to Pet', icon: Package },
        { id: 4, label: 'Writing Reply', icon: PenTool },
        // Step 5 is dynamic in getMailboxStatus (it jumps to 6 if replied, or stays at 4)
        { id: 6, label: 'Reply Arrived', icon: CheckCircle2 },
    ];

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 h-full flex flex-col">
            {/* Pet Profile */}
            <div className="flex flex-col items-center mb-10">
                <div className="w-24 h-24 rounded-full border-4 border-amber-100 p-1 mb-4">
                    <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 relative">
                        {petPhotoUrl ? (
                            <Image src={petPhotoUrl} alt={petName} fill className="object-cover" sizes="96px" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
                        )}
                    </div>
                </div>
                <h2 className="text-xl font-bold text-gray-800">{petName}</h2>
                <span className="text-xs text-amber-500 font-medium tracking-widest uppercase mt-1">ToThereOn Citizen</span>
            </div>

            {/* Delivery Tracker */}
            <div className="flex-1 px-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">
                    Delivery Status
                </h3>

                {!activeLetter ? (
                    <div className="text-center py-10 text-gray-400">
                        <p className="text-sm">No active letter</p>
                        <p className="text-xs mt-1">Send a letter to start tracking</p>
                    </div>
                ) : (
                    <div className="relative space-y-6">
                        {/* Vertical Line */}
                        <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-100 -z-10" />

                        {steps.map((step) => {
                            const isCompleted = status.step > step.id; // Past steps
                            const isCurrent = status.step === step.id; // Current active step
                            const isPending = status.step < step.id; // Future steps

                            // Hide "Reply Arrived" (6) if not yet reached and still in writing phase (4)
                            // But keeping it visible as pending is fine too.

                            return (
                                <div key={step.id} className={`flex items-start gap-4 ${isPending ? 'opacity-40' : ''}`}>
                                    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 
                                        ${isCompleted ? 'bg-amber-500 border-amber-500 text-white' :
                                            isCurrent ? 'bg-white border-amber-500 text-amber-500 shadow-md scale-110' :
                                                'bg-white border-gray-200 text-gray-300'}`}>
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                            <step.icon className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="pt-1">
                                        <p className={`text-sm font-medium ${isCurrent ? 'text-amber-600 font-bold' : 'text-gray-600'}`}>
                                            {step.label}
                                        </p>
                                        {isCurrent && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="mt-1"
                                            >
                                                <span className="text-xs text-amber-500 font-medium block">
                                                    {status.description}
                                                </span>
                                                {status.nextIn > 0 && (
                                                    <span className="text-[10px] text-gray-400 block mt-0.5">
                                                        Next update: {Math.ceil(status.nextIn)}h
                                                    </span>
                                                )}
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
