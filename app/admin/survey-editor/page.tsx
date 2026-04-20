'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Save, X, Loader2, GripVertical } from 'lucide-react';

interface SurveyQuestion {
    id: string;
    question_key: string;
    question_text_kr: string;
    question_text_en: string;
    type: 'text' | 'choice' | 'scale' | 'yesno';
    options: any[];
    category: string;
    order_index: number;
    is_active: boolean;
}

export default function SurveyEditorPage() {
    const supabase = createClient();
    const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingQuestion, setEditingQuestion] = useState<Partial<SurveyQuestion> | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchQuestions = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('survey_questions')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) {
            toast.error('Failed to load questions: ' + error.message);
        } else {
            setQuestions(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const handleSave = async () => {
        if (!editingQuestion) return;

        if (!editingQuestion.question_text_kr) {
            toast.error('Question text (KR) is required');
            return;
        }

        if (!editingQuestion.question_key) {
            toast.error('Question Key is required');
            return;
        }

        const payload = {
            ...editingQuestion,
            options: editingQuestion.options || [],
            order_index: editingQuestion.order_index || questions.length * 10 + 10
        };

        const { error } = await supabase
            .from('survey_questions')
            .upsert(payload);

        if (error) {
            toast.error('Failed to save: ' + error.message);
        } else {
            toast.success('Question saved');
            setIsModalOpen(false);
            setEditingQuestion(null);
            fetchQuestions();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this question?')) return;

        const { error } = await supabase
            .from('survey_questions')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Failed to delete: ' + error.message);
        } else {
            toast.success('Question deleted');
            fetchQuestions();
        }
    };

    const moveQuestion = async (index: number, direction: 'up' | 'down') => {
        const newQuestions = [...questions];
        if (direction === 'up' && index > 0) {
            [newQuestions[index], newQuestions[index - 1]] = [newQuestions[index - 1], newQuestions[index]];
        } else if (direction === 'down' && index < newQuestions.length - 1) {
            [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
        } else {
            return;
        }

        // Optimistic UI update
        setQuestions(newQuestions);

        // Update DB
        const updates = newQuestions.map((q, i) => ({
            id: q.id,
            order_index: (i + 1) * 10,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase.from('survey_questions').upsert(updates);
        if (error) {
            toast.error('Failed to reorder: ' + error.message);
            fetchQuestions(); // Revert
        }
    };

    const openCreate = () => {
        setEditingQuestion({
            question_key: 'Q' + (questions.length + 1).toString().padStart(2, '0'),
            type: 'text',
            category: 'general',
            is_active: true,
            options: [],
        });
        setIsModalOpen(true);
    };

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-100px)] flex flex-col pb-10">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">설문 문항 관리</h1>
                    <p className="text-slate-500 text-sm">기억 스캔을 위한 설문 문항을 생성 및 수정합니다.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    새 문항 추가
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {loading ? (
                    <div className="p-12 text-center text-slate-400">데이터를 불러오는 중입니다...</div>
                ) : questions.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        등록된 데이터가 없습니다. 새 항목을 추가해주세요.
                    </div>
                ) : (
                    questions.map((q, idx) => (
                        <div key={q.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 items-start group hover:border-blue-300 transition-all">
                            <div className="flex flex-col gap-1 pt-1">
                                <button
                                    onClick={() => moveQuestion(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30"
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => moveQuestion(idx, 'down')}
                                    disabled={idx === questions.length - 1}
                                    className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30"
                                >
                                    <ArrowDown className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${q.category === 'personality' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                        q.category === 'memory' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                            'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                        {q.category}
                                    </span>
                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">
                                        {q.type}
                                    </span>
                                    <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded font-mono">
                                        {q.question_key}
                                    </span>
                                </div>
                                <h3 className="font-bold text-slate-800 text-base mb-0.5">{q.question_text_kr}</h3>
                                <p className="text-sm text-slate-500 font-serif italic">{q.question_text_en}</p>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => { setEditingQuestion(q); setIsModalOpen(true); }}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(q.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && editingQuestion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingQuestion.id ? '설문 문항 수정하기' : '새로운 질문 작성하기'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Question Key (Unique)</label>
                                    <input
                                        type="text"
                                        value={editingQuestion.question_key || ''}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, question_key: e.target.value })}
                                        className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                        placeholder="Q01"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Order Index</label>
                                    <input
                                        type="number"
                                        value={editingQuestion.order_index || 0}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, order_index: parseInt(e.target.value) })}
                                        className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Question (Korean)</label>
                                <input
                                    type="text"
                                    value={editingQuestion.question_text_kr || ''}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text_kr: e.target.value })}
                                    className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="질문 내용을 입력하세요"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Question (English)</label>
                                <input
                                    type="text"
                                    value={editingQuestion.question_text_en || ''}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text_en: e.target.value })}
                                    className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                    placeholder="Enter question in English"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                                    <select
                                        value={editingQuestion.type || 'text'}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, type: e.target.value as any })}
                                        className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                    >
                                        <option value="text">Text (Open ended)</option>
                                        <option value="choice">Multiple Choice</option>
                                        <option value="scale">Scale (1-5)</option>
                                        <option value="yesno">Yes / No</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                                    <select
                                        value={editingQuestion.category || 'general'}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                                        className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                                    >
                                        <option value="general">General</option>
                                        <option value="personality">Personality</option>
                                        <option value="memory">Memory</option>
                                        <option value="preference">Preference</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Order Index</label>
                                <input
                                    type="number"
                                    value={editingQuestion.order_index || 0}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, order_index: parseInt(e.target.value) })}
                                    className="w-full text-sm border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                            </div>

                            {/* Options Editor (Simple JSON for now) */}
                            {['choice', 'scale'].includes(editingQuestion.type || '') && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Options (JSON)</label>
                                    <textarea
                                        value={JSON.stringify(editingQuestion.options || [], null, 2)}
                                        onChange={(e) => {
                                            try {
                                                setEditingQuestion({ ...editingQuestion, options: JSON.parse(e.target.value) });
                                            } catch (err) {
                                                // Ignore parse error while typing
                                            }
                                        }}
                                        className="w-full text-xs font-mono border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none h-32"
                                        placeholder='[{"label":"Option 1", "value":"1"}]'
                                    />
                                    <p className="text-[10px] text-slate-400">Enter valid JSON array for options.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                            >
                                취소하기
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                내용 저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
