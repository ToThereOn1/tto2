
'use client';
import { useState } from 'react';

export default function TestReplyPage() {
    const [letterId, setLetterId] = useState('');
    const [petId, setPetId] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    async function trigger() {
        setLoading(true);
        setResult(null);
        try {
            const res = await fetch('/api/letters/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ letterId, petId, forceTrigger: true }),
            });
            const data = await res.json();
            setResult(data);
        } catch (e: any) {
            setResult({ error: e.message });
        }
        setLoading(false);
    }

    return (
        <div style={{ padding: 32, fontFamily: 'monospace' }}>
            <h2>[DEV] Reply Generation Trigger (Phase 5)</h2>
            <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Letter UUID (User sent letter)</label>
                <input
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    value={letterId}
                    onChange={e => setLetterId(e.target.value)}
                    style={{ display: 'block', padding: 8, width: 400, border: '1px solid #ccc' }}
                />
            </div>
            <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Pet UUID</label>
                <input
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    value={petId}
                    onChange={e => setPetId(e.target.value)}
                    style={{ display: 'block', padding: 8, width: 400, border: '1px solid #ccc' }}
                />
            </div>
            <button
                onClick={trigger}
                disabled={loading}
                style={{
                    padding: '12px 24px',
                    background: loading ? '#ccc' : '#0070f3',
                    color: 'white',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
            >
                {loading ? '생성 중 (Claude 4.5 PendingWait)...' : '답장 즉시 생성'}
            </button>

            {result && (
                <div style={{ marginTop: 24, borderTop: '1px solid #eaeaea', paddingTop: 24 }}>
                    <h3>Result:</h3>
                    <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, overflowX: 'auto' }}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
