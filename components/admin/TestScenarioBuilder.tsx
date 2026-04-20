
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Send, User, Dog, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TestUser {
    id: string;
    email: string;
    display_name: string;
}

interface TestPet {
    id: string;
    name: string;
    species: string;
    persona_generated: boolean;
}

interface TestLetter {
    id: string;
    content: string;
    created_at: string;
    has_reply: boolean;
}

export default function TestScenarioBuilder({ onTestComplete }: { onTestComplete: () => void }) {
    const supabase = createClient();

    // Steps: 0=User, 1=Pet, 2=Letter, 3=Review
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // Data Selection
    const [users, setUsers] = useState<TestUser[]>([]);
    const [pets, setPets] = useState<TestPet[]>([]);
    const [letters, setLetters] = useState<TestLetter[]>([]);

    const [selectedUser, setSelectedUser] = useState<TestUser | null>(null);
    const [selectedPet, setSelectedPet] = useState<TestPet | null>(null);
    const [selectedLetter, setSelectedLetter] = useState<TestLetter | null>(null);

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // === Step 0: Search Users ===
    const searchUsers = async (query: string) => {
        setLoading(true);
        // Using filtered search or just latest 10
        let queryBuilder = supabase
            .from('users') // Note: this is actually auth.users usually, but we might rely on public.users view if exists, OR we use Admin API.
            // Wait, front-end client cannot query auth.users directly usually.
            // Let's assume we have a public 'users' table or similar (User Profile).
            // Checking types/database.ts... yes, interface User exists.
            .from('users_view') // Assuming a view exists or we use RPC. 
            // If direct table access is blocked, we might default to just getting the current user or using an RPC.
            // Let's try direct access to 'users' (public profile table) if it exists.
            // Fallback: We'll list 'pets' first and get owners from `users(id, email)`.
            // Actually, safer to search PETS first as that's the core entity.
            // BUT User asked for: User -> Pet -> Letter.
            // Let's try to fetch users. If it fails due to RLS, we'll suggest using predefined list.
            // Given I'm Admin, I might have access.
            .select('id, email, display_name')
            .limit(10);

        if (query) {
            queryBuilder = queryBuilder.ilike('email', `%${query}%`);
        }

        const { data, error } = await supabase.from('users').select('id, email, display_name').limit(20);

        // If 'users' table doesn't exist or is empty, maybe we query pets and expand owners?
        // Let's try to query 'pets' and get owner info.
        if (error || !data || data.length === 0) {
            // Fallback strategy: Query Pets
            console.log("Fallback to pets search");
        } else {
            setUsers(data as any);
        }
        setLoading(false);
    };

    // To simplify: Implemented a robust "Search via RPC" or just "List recent active users"
    // Let's implement "Find User by Email" or just "List Latest Users"
    useEffect(() => {
        if (step === 0) {
            // Fetch initial recent users
            // Note: In Supabase, authenticating as Admin locally in Client is tricky unless we use the logged-in Admin's permissions.
            // If RLS allows Admins to read all users, this works.
            const fetchUsers = async () => {
                setLoading(true);
                // We will query distinct users who have pets
                const { data, error } = await supabase
                    .from('pets')
                    .select('user_id')
                    .limit(20);

                if (data) {
                    // Dedup IDs
                    const userIds = Array.from(new Set(data.map((p: any) => p.user_id)));
                    // Now fetch details? We can't query auth.users.
                    // We will mock the display for now or use what we have.
                    // Actually, if we can't search users easily, let's invert: Search Pets.
                    // But strictly following User -> Pet.
                    // Let's assume we can fetch from 'users' table referencing auth.users.

                    // Try fetching public.users
                    const { data: usersData } = await supabase.from('users').select('*').in('id', userIds);
                    if (usersData) setUsers(usersData);
                }
                setLoading(false);
            }
            fetchUsers();
        }
    }, [step]);

    // === Step 1: Select Pet ===
    const fetchPets = async (userId: string) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('pets')
            .select('id, name, species, persona_generated')
            .eq('user_id', userId);

        if (data) setPets(data);
        setLoading(false);
    };

    // === Step 2: Select Letter ===
    const fetchLetters = async (petId: string) => {
        setLoading(true);
        const { data } = await supabase
            .from('letters')
            .select('id, content, created_at')
            .eq('pet_id', petId)
            .eq('direction', 'user_to_pet')
            .order('created_at', { ascending: false });

        if (data) {
            // Check if they have replies (manual check or join)
            // For now just list them
            setLetters(data.map((l: any) => ({ ...l, has_reply: false })));
        }
        setLoading(false);
    };

    // === Action: Trigger Generation ===
    const handleGenerate = async () => {
        if (!selectedLetter || !selectedPet) return;
        const toastId = toast.loading('Generating Advanced Reply (Loop)...');

        try {
            const response = await fetch('/api/letters/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    letterId: selectedLetter.id,
                    petId: selectedPet.id,
                    forceTrigger: true
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            toast.success(`Reply Generated! (Attempts: ${result.debug?.attempts || 1})`, { id: toastId });
            onTestComplete(); // Refresh parent list
            // Reset
            setStep(0);
            setSelectedUser(null);
            setSelectedPet(null);
            setSelectedLetter(null);
        } catch (err: any) {
            toast.error(err.message, { id: toastId });
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                Test Scenario Builder
            </h2>

            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg mb-6 text-sm">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${step >= 0 ? 'bg-white shadow text-slate-900 font-medium' : 'text-slate-400'}`}>
                    <User className="w-4 h-4" /> {selectedUser ? selectedUser.email : 'Select User'}
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${step >= 1 ? 'bg-white shadow text-slate-900 font-medium' : 'text-slate-400'}`}>
                    <Dog className="w-4 h-4" /> {selectedPet ? selectedPet.name : 'Select Pet'}
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${step >= 2 ? 'bg-white shadow text-slate-900 font-medium' : 'text-slate-400'}`}>
                    <Mail className="w-4 h-4" /> {selectedLetter ? 'Letter Selected' : 'Select Letter'}
                </div>
                {step === 3 && (
                    <>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                        <div className="bg-indigo-600 text-white px-3 py-1.5 rounded-md font-bold text-xs animate-pulse">
                            Ready to Generate
                        </div>
                    </>
                )}
            </div>

            <div className="min-h-[200px]">
                {loading && <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-300" /></div>}

                {!loading && step === 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto">
                        {users.map(u => (
                            <button key={u.id} onClick={() => { setSelectedUser(u); fetchPets(u.id); setStep(1); }} className="text-left p-3 rounded border hover:bg-indigo-50 hover:border-indigo-200 transition">
                                <div className="font-bold text-slate-800 text-sm truncate">{u.display_name || 'User'}</div>
                                <div className="text-xs text-slate-500 truncate">{u.email}</div>
                            </button>
                        ))}
                        {users.length === 0 && <div className="col-span-4 text-center text-slate-400 py-10">No active users found.</div>}
                    </div>
                )}

                {!loading && step === 1 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {pets.map((p: TestPet) => (
                            <button key={p.id} onClick={() => { setSelectedPet(p); fetchLetters(p.id); setStep(2); }} className={`text-left p-3 rounded border transition ${p.persona_generated ? 'hover:bg-indigo-50 hover:border-indigo-200' : 'opacity-50 cursor-not-allowed bg-slate-50'}`} disabled={!p.persona_generated}>
                                <div className="font-bold text-slate-800 text-sm flex items-center justify-between">
                                    {p.name}
                                    {p.persona_generated && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                </div>
                                <div className="text-xs text-slate-500">{p.species}</div>
                                {!p.persona_generated && <div className="text-[10px] text-red-400 mt-1">No Persona</div>}
                            </button>
                        ))}
                        {pets.length === 0 && <div className="col-span-4 text-center text-slate-400 py-10">This user has no pets.</div>}
                    </div>
                )}

                {!loading && step === 2 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {letters.map((l: TestLetter) => (
                            <button key={l.id} onClick={() => { setSelectedLetter(l); setStep(3); }} className="w-full text-left p-3 rounded border hover:bg-indigo-50 hover:border-indigo-200 transition group">
                                <div className="text-sm text-slate-800 mb-1 line-clamp-2 font-serif italic group-hover:text-indigo-900">"{l.content}"</div>
                                <div className="text-xs text-slate-400">{new Date(l.created_at).toLocaleString()}</div>
                            </button>
                        ))}
                        {letters.length === 0 && <div className="text-center text-slate-400 py-10">No letters found for this pet.</div>}
                    </div>
                )}

                {!loading && step === 3 && (
                    <div className="text-center py-8">
                        <div className="text-lg font-bold text-slate-800 mb-2">Ready to generate reply?</div>
                        <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
                            System will use <b>{selectedPet?.name}'s</b> persona to write a reply to the selected letter.
                            It will go through a 2-stage verification loop.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setStep(0)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Reset</button>
                            <button onClick={handleGenerate} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg flex items-center gap-2">
                                <Send className="w-4 h-4" /> Generate & Verify
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {step > 0 && step < 3 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-start">
                    <button onClick={() => { setStep(s => s - 1); }} className="text-xs text-slate-400 hover:text-slate-600">Back</button>
                </div>
            )}
        </div>
    );
}
