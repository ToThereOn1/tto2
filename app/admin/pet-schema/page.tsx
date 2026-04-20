'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Save, X, Loader2 } from 'lucide-react';

interface SchemaField {
    id: string;
    field_name: string;
    label_kr: string;
    label_en: string;
    field_type: 'text' | 'textarea' | 'date' | 'select' | 'file' | 'number';
    is_required: boolean;
    options: any[];
    order_index: number;
    is_active: boolean;
}

export default function PetSchemaPage() {
    const supabase = createClient();
    const [fields, setFields] = useState<SchemaField[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingField, setEditingField] = useState<Partial<SchemaField> | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchFields = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('pet_registration_schema')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) {
            toast.error('Failed to load schema: ' + error.message);
        } else {
            setFields(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchFields();
    }, []);

    const handleSave = async () => {
        if (!editingField) return;

        // Validation
        if (!editingField.field_name || !editingField.label_kr) {
            toast.error('Field Name and Korean Label are required');
            return;
        }

        const payload = {
            ...editingField,
            options: editingField.options || [],
            order_index: editingField.order_index || fields.length * 10 + 10
        };

        const { error } = await supabase
            .from('pet_registration_schema')
            .upsert(payload); // upsert works if id is present

        if (error) {
            toast.error('Failed to save: ' + error.message);
        } else {
            toast.success('Field saved successfully');
            setIsModalOpen(false);
            setEditingField(null);
            fetchFields();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this field?')) return;

        const { error } = await supabase
            .from('pet_registration_schema')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Failed to delete: ' + error.message);
        } else {
            toast.success('Field deleted');
            fetchFields();
        }
    };

    const openEdit = (field: SchemaField) => {
        setEditingField(field);
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingField({
            field_type: 'text',
            is_required: false,
            is_active: true,
            options: [],
        });
        setIsModalOpen(true);
    };

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">펫 등록 스키마 관리</h1>
                    <p className="text-slate-500 text-sm">펫 등록에 필요한 입력 필드를 관리합니다.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    필드 추가
                </button>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase font-medium text-slate-500 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">순서</th>
                                <th className="px-6 py-3">변수명</th>
                                <th className="px-6 py-3">라벨 (한 / 영)</th>
                                <th className="px-6 py-3">유형</th>
                                <th className="px-6 py-3">필수여부</th>
                                <th className="px-6 py-3 text-right">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">데이터를 불러오는 중입니다...</td></tr>
                            ) : fields.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-400">등록된 항목이 없습니다.</td></tr>
                            ) : (
                                fields.map((field) => (
                                    <tr key={field.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs">{field.order_index}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{field.field_name}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-900">{field.label_kr}</span>
                                                <span className="text-xs text-slate-400">{field.label_en}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                                                {field.field_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {field.is_required ? (
                                                <span className="text-emerald-600 font-bold text-xs">필수 항목</span>
                                            ) : (
                                                <span className="text-slate-400 text-xs">선택 항목</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openEdit(field)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(field.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && editingField && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingField.id ? '필드 수정하기' : '새로운 필드 추가'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Variable Name (English)</label>
                                    <input
                                        type="text"
                                        value={editingField.field_name || ''}
                                        onChange={(e) => setEditingField({ ...editingField, field_name: e.target.value })}
                                        className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="e.g. favorite_toy"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Order Index</label>
                                    <input
                                        type="number"
                                        value={editingField.order_index || 0}
                                        onChange={(e) => setEditingField({ ...editingField, order_index: parseInt(e.target.value) })}
                                        className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Label (Korean)</label>
                                    <input
                                        type="text"
                                        value={editingField.label_kr || ''}
                                        onChange={(e) => setEditingField({ ...editingField, label_kr: e.target.value })}
                                        className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="예: 좋아하는 장난감"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Label (English)</label>
                                    <input
                                        type="text"
                                        value={editingField.label_en || ''}
                                        onChange={(e) => setEditingField({ ...editingField, label_en: e.target.value })}
                                        className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                        placeholder="e.g. Favorite Toy"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Input Type</label>
                                    <select
                                        value={editingField.field_type || 'text'}
                                        onChange={(e) => setEditingField({ ...editingField, field_type: e.target.value as any })}
                                        className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                    >
                                        <option value="text">Text (Short)</option>
                                        <option value="textarea">Textarea (Long)</option>
                                        <option value="date">Date</option>
                                        <option value="number">Number</option>
                                        <option value="select">Select (Dropdown)</option>
                                        <option value="file">File Upload</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 pt-6">
                                    <input
                                        type="checkbox"
                                        id="is_required"
                                        checked={editingField.is_required || false}
                                        onChange={(e) => setEditingField({ ...editingField, is_required: e.target.checked })}
                                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <label htmlFor="is_required" className="text-sm font-medium text-slate-700">Required Field</label>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                항목 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
