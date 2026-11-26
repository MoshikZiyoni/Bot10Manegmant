import React, { useState, useEffect, useCallback } from 'react';
import {
    Save,
    Plus,
    Trash2,
    RotateCcw,
    FileText,
    ListChecks,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { callsApi } from './APIcalls';

const GOOGLE_QUICK_TAGS = [
    '<short pause>',
    '<long pause>',
    '<breath>',
    '<heavy breath>',
    '<exhales>',
    '<chuckle>',
    '<laugh>',
    '<giggle>',
    '<sigh>',
    '<gasp>',
    '<throat-clearing>',
    '<phew>',
    '<pff>',
    '<tsk>',
    '<snicker>',
    '<whispers>',
];

const VoicePromptBundleEditor = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [subTab, setSubTab] = useState('core'); // 'core' | 'procedures'
    const [botTarget, setBotTarget] = useState('bot10'); // 'bot10' | 'shevil'
    const [ttsVariant, setTtsVariant] = useState('elevenlabs'); // 'elevenlabs' | 'google'
    const [activeTtsProvider, setActiveTtsProvider] = useState('elevenlabs');
    const [corePrompt, setCorePrompt] = useState('');
    const [corePromptGoogle, setCorePromptGoogle] = useState('');
    const [shevilCorePrompt, setShevilCorePrompt] = useState('');
    const [shevilCorePromptGoogle, setShevilCorePromptGoogle] = useState('');
    const [procedures, setProcedures] = useState([]);
    const [selectedProcId, setSelectedProcId] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [dirty, setDirty] = useState(false);
    const [toast, setToast] = useState(null);

    const loadBundle = useCallback(async () => {
        setLoading(true);
        try {
            const data = await callsApi.getPromptBundle();
            const b = data.bundle || {};
            setCorePrompt(b.core_prompt || '');
            setCorePromptGoogle(b.core_prompt_google || '');
            setShevilCorePrompt(b.shevil_core_prompt || '');
            setShevilCorePromptGoogle(b.shevil_core_prompt_google || '');
            const activeProv = (data.active_tts_provider || 'elevenlabs').toLowerCase();
            setActiveTtsProvider(activeProv);
            setTtsVariant(activeProv === 'gemini' ? 'google' : 'elevenlabs');
            const procs = Array.isArray(b.procedures) ? b.procedures : [];
            setProcedures(procs);
            setSelectedProcId(procs[0]?.id || null);
            setUpdatedAt(data.updated_at || null);
            setDirty(false);
        } catch (err) {
            console.error('Failed to load prompt bundle:', err);
            setToast({ type: 'error', text: 'שגיאה בטעינת הפרומפט והפרוצדורות מה-DB.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBundle();
    }, [loadBundle]);

    const showMessage = (type, text) => {
        setToast({ type, text });
        setTimeout(() => {
            setToast(prev => (prev?.text === text ? null : prev));
        }, 4000);
    };

    const selectedProc = procedures.find(p => p.id === selectedProcId) || null;

    const updateSelectedProc = (patch) => {
        if (!selectedProc) return;
        setProcedures(prev => prev.map(p => (p.id === selectedProc.id ? { ...p, ...patch } : p)));
        setDirty(true);
    };

    const handleAddProcedure = () => {
        const newId = `custom_proc_${Date.now().toString(36)}`;
        const newProc = {
            id: newId,
            name: 'פרוצדורה חדשה',
            description: 'תיאור קצר מתי להפעיל את הפרוצדורה הזו',
            triggers: ['מילת מפתח 1', 'מילת מפתח 2'],
            bot_triggers: [],
            priority: 50,
            sticky_turns: 2,
            enabled: true,
            body: '1. צעד ראשון:\n   למשל: "..."',
        };
        setProcedures(prev => [...prev, newProc]);
        setSelectedProcId(newId);
        setSubTab('procedures');
        setDirty(true);
    };

    const handleDeleteProcedure = (procId) => {
        const target = procedures.find(p => p.id === procId);
        if (!target) return;
        if (!window.confirm(`למחוק את הפרוצדורה "${target.name}"? (המחיקה תישמר רק אחרי לחיצה על שמירה)`)) {
            return;
        }
        const next = procedures.filter(p => p.id !== procId);
        setProcedures(next);
        setSelectedProcId(next[0]?.id || null);
        setDirty(true);
    };

    const handleSave = async () => {
        if (!corePrompt.trim()) {
            showMessage('error', 'פרומפט הליבה לא יכול להיות ריק.');
            return;
        }
        setSaving(true);
        try {
            const res = await callsApi.updatePromptBundle({
                bundle: {
                    version: 1,
                    core_prompt: corePrompt,
                    core_prompt_google: corePromptGoogle,
                    shevil_core_prompt: shevilCorePrompt,
                    shevil_core_prompt_google: shevilCorePromptGoogle,
                    procedures,
                },
            });
            if (res.success) {
                const b = res.bundle || {};
                setCorePrompt(b.core_prompt || '');
                setCorePromptGoogle(b.core_prompt_google || '');
                setShevilCorePrompt(b.shevil_core_prompt || '');
                setShevilCorePromptGoogle(b.shevil_core_prompt_google || '');
                setProcedures(b.procedures || []);
                if (b.procedures?.length && !b.procedures.some(p => p.id === selectedProcId)) {
                    setSelectedProcId(b.procedures[0].id);
                }
                setUpdatedAt(res.updated_at || null);
                setDirty(false);
                showMessage('success', `✅ נשמר ב-DB והופעל (${res.active_procedures_count} פרוצדורות פעילות)!`);
            }
        } catch (err) {
            showMessage('error', err?.response?.data?.error || 'שגיאה בשמירת הפרומפט והפרוצדורות.');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('לאפס את פרומפט הליבה ואת כל הפרוצדורות לברירת המחדל המקורית?')) return;
        setSaving(true);
        try {
            const res = await callsApi.updatePromptBundle({ reset: true });
            if (res.success) {
                const b = res.bundle || {};
                setCorePrompt(b.core_prompt || '');
                setCorePromptGoogle(b.core_prompt_google || '');
                setShevilCorePrompt(b.shevil_core_prompt || '');
                setShevilCorePromptGoogle(b.shevil_core_prompt_google || '');
                setProcedures(b.procedures || []);
                setSelectedProcId(b.procedures?.[0]?.id || null);
                setUpdatedAt(res.updated_at || null);
                setDirty(false);
                showMessage('success', 'אופס לברירת המחדל ונשמר ב-DB.');
            }
        } catch (err) {
            showMessage('error', 'שגיאה באיפוס.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '2rem', color: '#64748b' }}>טוען פרומפט ופרוצדורות מה-DB...</div>;
    }

    const activeCount = procedures.filter(p => p.enabled !== false).length;
    const sortedProcedures = [...procedures].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return (
        <div style={styles.container}>
            {/* Header Bar */}
            <div style={styles.topBar}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h2 style={styles.title}>פרומפט ליבה + פרוצדורות (DB)</h2>
                        <span style={styles.countBadge}>
                            {activeCount} / {procedures.length} פרוצדורות פעילות
                        </span>
                        {dirty && <span style={styles.dirtyBadge}>שינויים לא שמורים</span>}
                    </div>
                    <div style={styles.subInfo}>
                        {updatedAt ? `עודכן לאחרונה: ${new Date(updatedAt).toLocaleString()}` : 'נשמר ב-PostgreSQL + Redis · מתעדכן מיד בכל שיחה חדשה'}
                    </div>
                </div>

                <div style={styles.topActions}>
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={saving}
                        style={styles.resetBtn}
                    >
                        <RotateCcw size={15} />
                        איפוס לברירת מחדל
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        style={styles.saveBtn}
                    >
                        <Save size={16} />
                        {saving ? 'שומר...' : 'שמור ל-DB והפעל'}
                    </button>
                </div>
            </div>

            {toast && (
                <div style={styles.toast(toast.type)}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{toast.text}</span>
                </div>
            )}

            {/* Sub-tabs */}
            <div style={styles.subTabs}>
                <button
                    type="button"
                    onClick={() => setSubTab('core')}
                    style={styles.subTabBtn(subTab === 'core')}
                >
                    <FileText size={16} />
                    פרומפט ליבה (Core Prompt)
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab('procedures')}
                    style={styles.subTabBtn(subTab === 'procedures')}
                >
                    <ListChecks size={16} />
                    פרוצדורות ({procedures.length})
                </button>
            </div>

            {subTab === 'core' ? (() => {
                const activePromptValue =
                    botTarget === 'bot10'
                        ? (ttsVariant === 'google' ? corePromptGoogle : corePrompt)
                        : (ttsVariant === 'google' ? shevilCorePromptGoogle : shevilCorePrompt);

                const setActivePromptValue = (nextVal) => {
                    if (botTarget === 'bot10') {
                        if (ttsVariant === 'google') setCorePromptGoogle(nextVal);
                        else setCorePrompt(nextVal);
                    } else {
                        if (ttsVariant === 'google') setShevilCorePromptGoogle(nextVal);
                        else setShevilCorePrompt(nextVal);
                    }
                    setDirty(true);
                };

                const toggleBtn = (active) => ({
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: active ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: active ? '#eff6ff' : '#ffffff',
                    color: active ? '#1d4ed8' : '#475569',
                    fontWeight: active ? '700' : '600',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                });

                return (
                <div style={styles.coreCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>בוט:</span>
                            <button type="button" style={toggleBtn(botTarget === 'bot10')} onClick={() => setBotTarget('bot10')}>
                                BOT 10
                            </button>
                            <button type="button" style={toggleBtn(botTarget === 'shevil')} onClick={() => setBotTarget('shevil')}>
                                בשביל הזהב
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>תגיות מנוע קול:</span>
                            <button type="button" style={toggleBtn(ttsVariant === 'elevenlabs')} onClick={() => setTtsVariant('elevenlabs')}>
                                ElevenLabs ([...])
                            </button>
                            <button type="button" style={toggleBtn(ttsVariant === 'google')} onClick={() => setTtsVariant('google')}>
                                Google Gemini TTS (&lt;...&gt;)
                            </button>
                            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '999px', backgroundColor: activeTtsProvider === 'gemini' ? '#dcfce7' : '#f1f5f9', color: activeTtsProvider === 'gemini' ? '#166534' : '#475569', fontWeight: 600 }}>
                                פעיל כעת: {activeTtsProvider === 'gemini' ? 'Google Gemini TTS' : activeTtsProvider}
                            </span>
                        </div>
                    </div>

                    {ttsVariant === 'google' && (
                        <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.77rem', color: '#475569', marginBottom: '6px' }}>
                                לחץ להוספת תגית Google Gemini 3.8 TTS לסוף הפרומפט (נכנס לפעולה אוטומטית כשגוגל נבחר במנוע הקול):
                            </div>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                {GOOGLE_QUICK_TAGS.map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => setActivePromptValue(activePromptValue ? `${activePromptValue}\n${tag}` : tag)}
                                        style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.75rem', fontFamily: 'monospace', cursor: 'pointer' }}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={styles.coreHint}>
                        <span>תווים: {activePromptValue.length.toLocaleString()}</span>
                        <span>משתנים שמורים: <code>{'{brand}'}</code>, <code>{'{agent}'}</code>, <code>{'{procedure_index}'}</code></span>
                    </div>
                    <textarea
                        dir="rtl"
                        value={activePromptValue}
                        onChange={e => setActivePromptValue(e.target.value)}
                        spellCheck={false}
                        style={styles.coreTextarea}
                    />
                </div>
                );
            })() : (
                <div style={styles.procLayout}>
                    {/* Procedures Sidebar */}
                    <div style={styles.procSidebar}>
                        <button
                            type="button"
                            onClick={handleAddProcedure}
                            style={styles.addProcBtn}
                        >
                            <Plus size={16} />
                            הוסף פרוצדורה חדשה
                        </button>

                        <div style={styles.procList}>
                            {sortedProcedures.map(proc => {
                                const isSel = proc.id === selectedProcId;
                                const isEnabled = proc.enabled !== false;
                                return (
                                    <button
                                        key={proc.id}
                                        type="button"
                                        onClick={() => setSelectedProcId(proc.id)}
                                        style={styles.procItem(isSel, isEnabled)}
                                    >
                                        <div style={styles.procItemTop}>
                                            <span style={styles.procItemName}>{proc.name}</span>
                                            <span style={styles.prioBadge}>P{proc.priority ?? 50}</span>
                                        </div>
                                        <div style={styles.procItemMeta}>
                                            <span>{(proc.triggers || []).length} טריגרים</span>
                                            <span>{isEnabled ? 'פעיל' : 'כבוי'}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Procedure Editor */}
                    <div style={styles.procEditor}>
                        {selectedProc ? (
                            <>
                                <div style={styles.procEditorHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <h3 style={{ margin: 0, color: '#0f172a' }}>{selectedProc.name}</h3>
                                        <label style={styles.enabledLabel}>
                                            <input
                                                type="checkbox"
                                                checked={selectedProc.enabled !== false}
                                                onChange={e => updateSelectedProc({ enabled: e.target.checked })}
                                            />
                                            פרוצדורה פעילה
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteProcedure(selectedProc.id)}
                                        style={styles.deleteBtn}
                                    >
                                        <Trash2 size={15} />
                                        מחק
                                    </button>
                                </div>

                                <div style={styles.procGrid}>
                                    <div style={styles.field}>
                                        <label style={styles.label}>שם הפרוצדורה</label>
                                        <input
                                            type="text"
                                            value={selectedProc.name || ''}
                                            onChange={e => updateSelectedProc({ name: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>מזהה (ID)</label>
                                        <input
                                            type="text"
                                            value={selectedProc.id || ''}
                                            onChange={e => {
                                                const newVal = e.target.value;
                                                updateSelectedProc({ id: newVal });
                                                setSelectedProcId(newVal);
                                            }}
                                            style={{ ...styles.input, fontFamily: 'monospace' }}
                                        />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>עדיפות (Priority)</label>
                                        <input
                                            type="number"
                                            value={selectedProc.priority ?? 50}
                                            onChange={e => updateSelectedProc({ priority: parseInt(e.target.value, 10) || 50 })}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>Sticky Turns</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={selectedProc.sticky_turns ?? 1}
                                            onChange={e => updateSelectedProc({ sticky_turns: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <div style={styles.field}>
                                    <label style={styles.label}>תיאור (מוזרק לאינדקס הפרומפט הראשי)</label>
                                    <input
                                        dir="rtl"
                                        type="text"
                                        value={selectedProc.description || ''}
                                        onChange={e => updateSelectedProc({ description: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        טריגרים של הלקוח (מופרדים ב-<code>|</code> או בשורה חדשה) — {(selectedProc.triggers || []).length} טריגרים
                                    </label>
                                    <textarea
                                        dir="rtl"
                                        rows={3}
                                        value={(selectedProc.triggers || []).join(' | ')}
                                        onChange={e => {
                                            const list = e.target.value
                                                .replace(/\n/g, '|')
                                                .split('|')
                                                .map(s => s.trim())
                                                .filter(Boolean);
                                            updateSelectedProc({ triggers: list });
                                        }}
                                        style={styles.smallTextarea}
                                    />
                                </div>

                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        טריגרים מדברי הבוט (אופציונלי, מופרדים ב-<code>|</code>)
                                    </label>
                                    <input
                                        dir="rtl"
                                        type="text"
                                        value={(selectedProc.bot_triggers || []).join(' | ')}
                                        onChange={e => {
                                            const list = e.target.value
                                                .split('|')
                                                .map(s => s.trim())
                                                .filter(Boolean);
                                            updateSelectedProc({ bot_triggers: list });
                                        }}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.field}>
                                    <label style={styles.label}>תוכן והנחיות הפרוצדורה (Body)</label>
                                    <textarea
                                        dir="rtl"
                                        rows={10}
                                        value={selectedProc.body || ''}
                                        onChange={e => updateSelectedProc({ body: e.target.value })}
                                        spellCheck={false}
                                        style={styles.bodyTextarea}
                                    />
                                </div>
                            </>
                        ) : (
                            <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>
                                בחר פרוצדורה מהרשימה או הוסף חדשה.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
    topBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '1rem 1.25rem',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
    },
    title: { margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' },
    countBadge: {
        fontSize: '0.76rem',
        fontWeight: '700',
        padding: '3px 10px',
        borderRadius: '999px',
        backgroundColor: '#dbeafe',
        color: '#1d4ed8',
    },
    dirtyBadge: {
        fontSize: '0.76rem',
        fontWeight: '700',
        padding: '3px 10px',
        borderRadius: '999px',
        backgroundColor: '#fef3c7',
        color: '#b45309',
    },
    subInfo: { fontSize: '0.8rem', color: '#64748b', marginTop: '4px' },
    topActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    resetBtn: {
        padding: '9px 14px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        color: '#334155',
        fontWeight: '600',
        fontSize: '0.85rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    },
    saveBtn: {
        padding: '9px 18px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#2563eb',
        color: '#ffffff',
        fontWeight: '700',
        fontSize: '0.88rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
    },
    toast: (type) => ({
        padding: '10px 14px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontWeight: '600',
        fontSize: '0.88rem',
        backgroundColor: type === 'success' ? '#ecfdf5' : '#fef2f2',
        color: type === 'success' ? '#065f46' : '#991b1b',
        border: `1px solid ${type === 'success' ? '#a7f3d0' : '#fecaca'}`,
    }),
    subTabs: { display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' },
    subTabBtn: (active) => ({
        padding: '8px 16px',
        borderRadius: '8px',
        border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
        backgroundColor: active ? '#eff6ff' : '#ffffff',
        color: active ? '#1d4ed8' : '#475569',
        fontWeight: '700',
        fontSize: '0.88rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
    }),
    coreCard: { display: 'flex', flexDirection: 'column', gap: '8px' },
    coreHint: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        color: '#64748b',
        flexWrap: 'wrap',
        gap: '8px',
    },
    coreTextarea: {
        width: '100%',
        minHeight: '520px',
        padding: '14px',
        borderRadius: '10px',
        border: '1px solid #cbd5e1',
        fontSize: '0.92rem',
        lineHeight: 1.6,
        fontFamily: 'Segoe UI, sans-serif',
        boxSizing: 'border-box',
    },
    procLayout: { display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' },
    procSidebar: {
        width: '270px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    addProcBtn: {
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px dashed #2563eb',
        backgroundColor: '#eff6ff',
        color: '#1d4ed8',
        fontWeight: '700',
        fontSize: '0.86rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
    },
    procList: { display: 'flex', flexDirection: 'column', gap: '6px' },
    procItem: (selected, enabled) => ({
        textAlign: 'left',
        padding: '10px 12px',
        borderRadius: '9px',
        border: selected ? '2px solid #2563eb' : '1px solid #e2e8f0',
        backgroundColor: selected ? '#eff6ff' : '#ffffff',
        opacity: enabled ? 1 : 0.55,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    }),
    procItemTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' },
    procItemName: { fontWeight: '700', fontSize: '0.88rem', color: '#0f172a' },
    prioBadge: {
        fontSize: '0.7rem',
        fontWeight: '700',
        padding: '1px 6px',
        borderRadius: '5px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
    },
    procItemMeta: { display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b' },
    procEditor: {
        flex: 1,
        minWidth: '300px',
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    procEditorHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
    },
    enabledLabel: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.84rem',
        fontWeight: '600',
        color: '#334155',
        cursor: 'pointer',
    },
    deleteBtn: {
        padding: '6px 12px',
        borderRadius: '7px',
        border: '1px solid #fecaca',
        backgroundColor: '#fef2f2',
        color: '#b91c1c',
        fontWeight: '600',
        fontSize: '0.8rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
    },
    procGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px',
    },
    field: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '0.79rem', fontWeight: '600', color: '#334155' },
    input: {
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        fontSize: '0.86rem',
    },
    smallTextarea: {
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        fontSize: '0.85rem',
        lineHeight: 1.45,
        fontFamily: 'Segoe UI, sans-serif',
    },
    bodyTextarea: {
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        fontSize: '0.88rem',
        lineHeight: 1.55,
        fontFamily: 'Segoe UI, sans-serif',
    },
};

export default VoicePromptBundleEditor;
