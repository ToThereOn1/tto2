'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Save, X } from 'lucide-react';
import { updatePersona } from '@/app/admin/personas/actions';

interface Persona {
    id: string;
    pet_id: string;
    created_at: string;
    persona_profile: any;
    pets: {
        name: string;
        species: string;
        relationship: string | null;
    } | null;
}

export default function PersonasTable({ personas }: { personas: Persona[] }) {
    const [search, setSearch] = useState('');
    const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
    const [jsonText, setJsonText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filtered = personas.filter(p =>
        p.pets?.name.toLowerCase().includes(search.toLowerCase()) ||
        p.pets?.species.toLowerCase().includes(search.toLowerCase())
    );

    const openModal = (persona: Persona) => {
        setSelectedPersona(persona);
        setJsonText(JSON.stringify(persona.persona_profile, null, 2));
        setError(null);
    };

    const handleSave = async () => {
        if (!selectedPersona) return;

        try {
            setIsSaving(true);
            setError(null);

            // Validate JSON
            let parsed;
            try {
                parsed = JSON.parse(jsonText);
            } catch (e) {
                throw new Error('Invalid JSON format');
            }

            await updatePersona(selectedPersona.id, parsed);

            toast.success('Persona updated successfully');
            setSelectedPersona(null); // Close modal on success? Or keep open? Let's close.
        } catch (err: any) {
            console.error('Save error:', err);
            setError(err.message || 'Failed to save');
            toast.error('Failed to update persona');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header / Search */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <input
                    type="text"
                    placeholder="Search by pet name or species..."
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm w-80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="text-sm text-slate-500">
                    Total: {personas.length}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Pet Name</th>
                            <th className="px-6 py-3">Species</th>
                            <th className="px-6 py-3">Personality Keywords</th>
                            <th className="px-6 py-3">Generated At</th>
                            <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.map((persona) => {
                            // Handle both old format (core_traits) and new DeepPersonaAnalysis format (temperament.big_five)
                            const profile = persona.persona_profile;
                            const isNewFormat = !!profile?.temperament?.big_five;

                            const summary = isNewFormat
                                ? (profile?.uniqueness?.one_sentence_essence || profile?.relationship_dynamics?.family_role?.description || 'No summary')
                                : (profile?.personality_summary || 'No summary');

                            const traits = isNewFormat
                                ? Object.entries(profile?.temperament?.big_five || {})
                                    .sort(([, a], [, b]) => (b as number) - (a as number))
                                    .slice(0, 3)
                                    .map(([k, v]) => `${k}:${v}`)
                                    .join(', ') || '-'
                                : (profile?.core_traits?.join(', ') || '-');

                            return (
                                <tr key={persona.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {persona.pets?.name || 'Unknown'}
                                        <div className="text-xs text-slate-400 font-normal mt-0.5">
                                            {persona.pets?.relationship || 'Pet'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 capitalize">
                                        {persona.pets?.species || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={summary}>
                                        <div className="font-medium text-slate-700 mb-1">
                                            {traits}
                                        </div>
                                        <div className="text-xs text-slate-400 truncate">
                                            {summary}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                        {format(new Date(persona.created_at), 'yyyy-MM-dd HH:mm')}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => openModal(persona)}
                                            className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                                        >
                                            Edit JSON
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    No personas found matching "{search}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            {selectedPersona && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">
                                    Edit Persona: {selectedPersona.pets?.name}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Edit the JSON directly. Be careful with syntax.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setSelectedPersona(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-0 relative">
                            <textarea
                                className="w-full h-full p-4 font-mono text-sm bg-slate-50 focus:outline-none resize-none text-slate-800 leading-relaxed"
                                value={jsonText}
                                onChange={(e) => setJsonText(e.target.value)}
                                spellCheck={false}
                            />
                            {error && (
                                <div className="absolute bottom-4 left-4 right-4 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm border border-red-100 shadow-sm animate-in slide-in-from-bottom-2">
                                    Error: {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
