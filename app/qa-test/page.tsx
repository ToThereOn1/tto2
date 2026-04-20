"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, Bug, Play, AlertTriangle, CheckCircle2, Zap, Star, MessageSquare } from "lucide-react";

type LogEntry = {
    id: string;
    message: string;
    type: "info" | "success" | "error";
    timestamp: Date;
    details?: any;
};

const MAX_LOGS = 100;

export default function QADashboard() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isRunning, setIsRunning] = useState<Record<string, boolean>>({});
    const [aiTestPetId, setAiTestPetId] = useState('');
    const [aiSecret, setAiSecret] = useState('');
    const logEndRef = useRef<HTMLDivElement>(null);

    // Optimized logging function that slices the array to prevent React from freezing
    const addLog = useCallback((message: string, type: "info" | "success" | "error" = "info", details?: any) => {
        setLogs(prev => {
            const newLog: LogEntry = {
                id: Math.random().toString(36).substring(7),
                message,
                type,
                timestamp: new Date(),
                details
            };
            const updated = [...prev, newLog];
            return updated.slice(-MAX_LOGS); // Keep only the latest 100 logs
        });
    }, []);

    // Auto-scroll to bottom of logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs.length]);

    const runTest = async (testId: string, name: string, testFn: () => Promise<void>) => {
        if (isRunning[testId]) return;

        setIsRunning(prev => ({ ...prev, [testId]: true }));
        addLog(`Started Test: ${name}`, "info");

        try {
            await testFn();
            addLog(`✅ Passed: ${name}`, "success");
        } catch (error: any) {
            addLog(`❌ Failed: ${name} - ${error.message || "Unknown error"}`, "error", error);

            addLog(`📡 Error captured`, "info");
        } finally {
            setIsRunning(prev => ({ ...prev, [testId]: false }));
        }
    };

    // ==========================================
    // AI Content Test Helpers
    // ==========================================

    const runAiAction = async (action: 'feed' | 'reply' | 'eval', petId: string) => {
        const testId = `ai-${action}`
        if (isRunning[testId]) return
        if (!petId.trim()) {
            addLog('ERROR: Pet ID is required', 'error')
            return
        }
        if (!aiSecret.trim()) {
            addLog('ERROR: CRON_SECRET is required', 'error')
            return
        }

        setIsRunning(prev => ({ ...prev, [testId]: true }))
        addLog(`AI Test [${action}] started for pet: ${petId}`, 'info')

        try {
            const res = await fetch('/api/admin/test-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiSecret}`,
                },
                body: JSON.stringify({ action, petId }),
            })

            const data = await res.json()

            if (!res.ok || !data.success) {
                throw new Error(data.error || `HTTP ${res.status}`)
            }

            const r = data.result

            if (action === 'feed') {
                addLog(`Feed generated — Day ${r.tothereonDay} | ${r.eventType} | ${r.zone}`, 'success', r)
                addLog(r.content, 'info')
            } else if (action === 'reply') {
                addLog(`Reply generated — Status: ${r.status} | Tokens: ${r.tokens?.total ?? 'n/a'}`, 'success', r)
                addLog(`User letter: ${r.userLetterContent?.slice(0, 80)}...`, 'info')
                addLog(`Pet reply: ${r.replyContent?.slice(0, 120)}...`, 'info')
            } else if (action === 'eval') {
                const scores = r.eval?.scores
                const overall = scores?.overall ?? '?'
                addLog(
                    `Eval complete — Overall: ${overall}/10 | Persona: ${scores?.persona_consistency}/10 | Authenticity: ${scores?.emotional_authenticity}/10`,
                    overall >= 6 ? 'success' : 'error',
                    r.eval
                )
                if (r.eval?.issues?.length) {
                    r.eval.issues.forEach((issue: string) => addLog(`Issue: ${issue}`, 'error'))
                }
                if (r.eval?.suggestions?.length) {
                    r.eval.suggestions.forEach((s: string) => addLog(`Suggestion: ${s}`, 'info'))
                }
            }
        } catch (error: any) {
            addLog(`AI Test [${action}] failed: ${error.message}`, 'error')
        } finally {
            setIsRunning(prev => ({ ...prev, [testId]: false }))
        }
    }

    // ==========================================
    // QA Test Definitions
    // ==========================================

    const tests = [
        {
            id: "sentry-hard-crash",
            name: "Trigger Sentry Exception",
            icon: <Bug className="w-5 h-5 text-red-500" />,
            fn: async () => {
                throw new Error("Sentry QA Test: Synthetic Fatal Error");
            }
        },
        {
            id: "auth-check",
            name: "Test Auth API",
            icon: <Play className="w-5 h-5" />,
            fn: async () => {
                const res = await fetch("/api/auth/session");
                if (!res.ok) throw new Error(`Auth API returned ${res.status}`);
                const data = await res.json();
                addLog(`Auth Response: ${JSON.stringify(data).substring(0, 50)}...`, "info");
            }
        },
        {
            id: "pet-fetch",
            name: "Test Fetch Pets",
            icon: <Play className="w-5 h-5" />,
            fn: async () => {
                // Testing Supabase client connection (assuming anonymous/not logged in could fail)
                const res = await fetch("/api/user/pets", { method: "POST" }); // Intentionally throwing method error or fetch error for QA
                if (!res.ok) throw new Error(`Pets API returned ${res.status}: Ensure you are logged in`);
            }
        },
        {
            id: "letter-error",
            name: "Test Letter Quota Error",
            icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
            fn: async () => {
                const res = await fetch("/api/letters/send", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ petId: "fake-uuid-0000-0000", content: "Test" })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(`Letter send failed as expected: ${JSON.stringify(err)}`);
                }
            }
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
            <div className="max-w-6xl mx-auto space-y-8">

                <header>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">System QA Dashboard</h1>
                    <p className="text-slate-500 mt-2">
                        Execute system flows and simulate hard crashes. All failed tests are automatically forwarded to Sentry.io with Session Replays.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {tests.map(test => (
                        <button
                            key={test.id}
                            onClick={() => runTest(test.id, test.name, test.fn)}
                            disabled={isRunning[test.id]}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all text-left flex flex-col justify-between group disabled:opacity-60 disabled:pointer-events-none"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-purple-50 transition-colors">
                                    {test.icon}
                                </div>
                                {isRunning[test.id] && <Loader2 className="w-5 h-5 animate-spin text-purple-600" />}
                            </div>
                            <h3 className="font-semibold text-slate-800">{test.name}</h3>
                        </button>
                    ))}
                </div>

                {/* AI Content Testing */}
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-1">AI Content Testing</h2>
                    <p className="text-sm text-slate-400 mb-4">
                        Requires a pet with a completed Deep Remembrance persona. Use{' '}
                        <code className="bg-slate-100 px-1 rounded text-xs">scripts/seed-test-pet.ts</code>{' '}
                        to create one.
                    </p>

                    <div className="flex flex-col gap-2 mb-4">
                        <input
                            type="text"
                            value={aiTestPetId}
                            onChange={e => setAiTestPetId(e.target.value)}
                            placeholder="Pet UUID..."
                            className="px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                        <input
                            type="password"
                            value={aiSecret}
                            onChange={e => setAiSecret(e.target.value)}
                            placeholder="CRON_SECRET..."
                            className="px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-purple-300"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                            onClick={() => runAiAction('feed', aiTestPetId)}
                            disabled={isRunning['ai-feed'] || !aiTestPetId.trim() || !aiSecret.trim()}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isRunning['ai-feed'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            Generate Feed
                        </button>

                        <button
                            onClick={() => runAiAction('reply', aiTestPetId)}
                            disabled={isRunning['ai-reply'] || !aiTestPetId.trim() || !aiSecret.trim()}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-50 text-green-700 font-semibold text-sm hover:bg-green-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isRunning['ai-reply'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                            Generate Reply
                        </button>

                        <button
                            onClick={() => runAiAction('eval', aiTestPetId)}
                            disabled={isRunning['ai-eval'] || !aiTestPetId.trim() || !aiSecret.trim()}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-700 font-semibold text-sm hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isRunning['ai-eval'] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                            Evaluate Quality
                        </button>
                    </div>
                </section>

                {/* Log Viewer - Rate Limited to MAX_LOGS */}
                <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800 flex flex-col h-[500px]">
                    <div className="bg-slate-950 px-6 py-4 flex justify-between items-center border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-slate-400 text-sm ml-4 font-mono">system.log ({logs.length}/{MAX_LOGS})</span>
                        </div>
                        <button
                            onClick={() => setLogs([])}
                            className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded border border-slate-700 hover:border-slate-500 transition-colors"
                        >
                            Clear Logs
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2">
                        {logs.length === 0 ? (
                            <div className="text-slate-600 text-center mt-20">System idle. Awaiting test execution...</div>
                        ) : (
                            logs.map(log => (
                                <div key={log.id} className="flex items-start gap-4">
                                    <span className="text-slate-600 shrink-0">
                                        [{log.timestamp.toLocaleTimeString()}]
                                    </span>
                                    <span className={`
                                        ${log.type === 'error' ? 'text-red-400' : ''}
                                        ${log.type === 'success' ? 'text-green-400' : ''}
                                        ${log.type === 'info' ? 'text-slate-300' : ''}
                                        break-all
                                    `}>
                                        {log.type === 'error' ? <AlertTriangle className="w-4 h-4 inline mr-2 align-text-bottom" /> : null}
                                        {log.type === 'success' ? <CheckCircle2 className="w-4 h-4 inline mr-2 align-text-bottom text-green-500" /> : null}
                                        {log.message}
                                    </span>
                                </div>
                            ))
                        )}
                        <div ref={logEndRef} />
                    </div>
                </div>

            </div>
        </div>
    );
}
