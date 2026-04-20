
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function MailboxIndexPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [pets, setPets] = useState<any[]>([]);

    useEffect(() => {
        const fetchPets = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            const { data: userPets } = await supabase
                .from('pets')
                .select('id, name, photos, species')
                .eq('user_id', user.id);

            if (userPets && userPets.length > 0) {
                if (userPets.length === 1) {
                    // If only one pet, redirect immediately
                    router.replace(`/dashboard/pets/${userPets[0].id}/mailbox`);
                } else {
                    setPets(userPets);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchPets();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
                <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            </div>
        );
    }

    if (pets.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-background)] p-4 text-center">
                <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mb-6">
                    <Mail className="w-8 h-8 text-sky-500" />
                </div>
                <h2 className="text-xl font-bold tracking-[-0.01em] text-slate-900 mb-2">Your mailbox is empty</h2>
                <p className="text-slate-500 mb-8">
                    Register your companion first.<br />
                    Then you&apos;ll be able to send and receive letters.
                </p>
                <Link
                    href="/dashboard/register"
                    className="px-6 py-3 text-white rounded-xl transition-all font-semibold shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)' }}
                >
                    Register Your Companion
                </Link>
            </div>
        );
    }

    // Multiple pets selection
    return (
        <div className="min-h-screen bg-[var(--color-background)] py-20 px-4">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold tracking-[-0.02em] text-center text-slate-900 mb-10">
                    Whose mailbox would you like to open?
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {pets.map((pet) => (
                        <Link
                            key={pet.id}
                            href={`/dashboard/pets/${pet.id}/mailbox`}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-sky-200 transition-all group text-center"
                        >
                            <div className="w-20 h-20 mx-auto rounded-full bg-sky-50 mb-4 overflow-hidden border-2 border-sky-100 group-hover:border-sky-300 transition-colors relative">
                                {pet.photos?.[0] ? (
                                    <Image src={pet.photos[0]} alt={pet.name} fill className="object-cover" sizes="80px" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Mail className="w-7 h-7 text-sky-400" />
                                    </div>
                                )}
                            </div>
                            <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-sky-600 transition-colors">
                                {pet.name}
                            </h3>
                            <span className="text-xs text-sky-500 font-semibold uppercase tracking-wider">
                                {pet.species} Mailbox
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
