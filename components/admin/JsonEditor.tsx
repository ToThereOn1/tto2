
'use client';


import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, RotateCcw } from 'lucide-react';

// Using a native textarea for JSON editing to avoid dependency issues

interface JsonEditorProps {
    configKey: string;     // e.g. 'worldview_config'
    configType: string;    // e.g. 'worldview'
    defaultData: object;   // Initial data if nothing in DB
    title: string;
    description?: string;
}

export default function JsonEditor({ configKey, configType, defaultData, title, description }: JsonEditorProps) {
    const supabase = createClient();
    const [jsonData, setJsonData] = useState<object>(defaultData);
    const [jsonString, setJsonString] = useState<string>(JSON.stringify(defaultData, null, 2));
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Fetch config
    const fetchConfig = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('admin_configs')
            .select('config_data')
            .eq('config_type', configKey) // Use configKey as the unique type identifier
            .maybeSingle();

        if (error) {
            console.error('Error fetching config:', error);
            toast.error('Failed to load configuration');
        } else if (data) {
            setJsonData(data.config_data);
            setJsonString(JSON.stringify(data.config_data, null, 2));
        } else {
            // No data found, use default
            console.log('No config found, using default');
            setJsonData(defaultData);
            setJsonString(JSON.stringify(defaultData, null, 2));
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async () => {
        if (jsonError) {
            toast.error('Cannot save invalid JSON');
            return;
        }

        setSaving(true);

        // Since config_type is not unique index by default, we should be careful. 
        // But for this purpose, we assume one entry per configKey.
        // We need to 'upsert' based on a unique constraint or just update if exists.
        // admin_configs definition doesn't show unique constraint on config_type, but let's try upserting by id if we had it, or just matching config_type provided we handle duplicates.
        // Better: Check if exists first (which we did in fetch), or use onConflict if we create a unique index.
        // Since we cannot change schema, we will try to update if exists, insert if not.

        // Check if row exists to get ID
        const { data: existing } = await supabase.from('admin_configs').select('id').eq('config_type', configKey).maybeSingle();

        let error;
        if (existing) {
            const result = await supabase
                .from('admin_configs')
                .update({
                    config_data: jsonData,
                    updated_at: new Date().toISOString(),
                    version: '1.0' // Hardcode version for now as it is required
                })
                .eq('id', existing.id);
            error = result.error;
        } else {
            const result = await supabase
                .from('admin_configs')
                .insert({
                    config_type: configKey,
                    config_data: jsonData,
                    version: '1.0',
                    is_active: true
                });
            error = result.error;
        }

        if (error) {
            console.error('Error saving config:', error);
            toast.error('Failed to save configuration');
        } else {
            toast.success('Configuration saved successfully!');
        }
        setSaving(false);
    };

    const handleJsonStringChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setJsonString(val);
        try {
            const parsed = JSON.parse(val);
            setJsonData(parsed);
            setJsonError(null);
        } catch (err: any) {
            setJsonError(err.message);
        }
    };

    if (loading) {
        return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-150px)]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    {description && <p className="text-sm text-slate-500">{description}</p>}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchConfig}
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Reload"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition-all text-sm"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50/30 flex flex-col">
                {jsonError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-mono">
                        Invalid JSON: {jsonError}
                    </div>
                )}
                <textarea
                    value={jsonString}
                    onChange={handleJsonStringChange}
                    className="flex-1 w-full bg-white border border-slate-200 rounded-lg p-4 font-mono text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                    spellCheck={false}
                />
            </div>
        </div>
    );
}
