import React, { useState, useEffect, useCallback } from 'react';
import {
    Volume2,
    CheckCircle2,
    Save,
    Play,
    RotateCcw,
    Sliders,
    AlertCircle,
    Loader2,
    ShieldCheck,
    Plus,
    Trash2,
    Upload,
} from 'lucide-react';
import { callsApi } from './APIcalls';

const MODELS_BY_PROVIDER = {
    elevenlabs: ['eleven_v4_turbo', 'eleven_flash_v2_5', 'eleven_turbo_v2_5', 'eleven_multilingual_v2'],
    gemini: ['gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'],
    openai: ['gpt-4o-mini-tts', 'tts-1', 'tts-1-hd'],
};

const VOICES_BY_PROVIDER = {
    elevenlabs: [
        { id: '1lQHwFERGYJo2wuE0K6Q', label: 'Default (.env)' },
        { id: 'tVwKBgN4V4YNXrLZSLKc', label: 'Shevil (גל)' },
    ],
    gemini: [
        { id: 'Charon', label: 'Charon' },
        { id: 'Aoede', label: 'Aoede' },
        { id: 'Puck', label: 'Puck' },
        { id: 'Kore', label: 'Kore' },
        { id: 'Fenrir', label: 'Fenrir' },
        { id: 'Zephyr', label: 'Zephyr' },
        { id: 'Orus', label: 'Orus' },
        { id: 'Leda', label: 'Leda' },
    ],
    openai: [
        { id: 'coral', label: 'coral' },
        { id: 'ash', label: 'ash' },
        { id: 'alloy', label: 'alloy' },
        { id: 'sage', label: 'sage' },
        { id: 'onyx', label: 'onyx' },
        { id: 'nova', label: 'nova' },
    ],
};

const TTSModelManager = () => {
    const [loading, setLoading] = useState(true);
    const [verifyingId, setVerifyingId] = useState(null);
    const [testingOnly, setTestingOnly] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);

    const [source, setSource] = useState('env');
    const [presets, setPresets] = useState([]);
    const [providers, setProviders] = useState([]);
    const [geminiCustomVoices, setGeminiCustomVoices] = useState([]);
    const [savedVoices, setSavedVoices] = useState([]);
    const [activeConfig, setActiveConfig] = useState(null);
    const [previewAudio, setPreviewAudio] = useState(null);

    // Add New Voice state
    const [showAddVoice, setShowAddVoice] = useState(false);
    const [addVoiceMode, setAddVoiceMode] = useState('id'); // 'id' | 'clone'
    const [newVoiceLabel, setNewVoiceLabel] = useState('');
    const [newVoiceIdInput, setNewVoiceIdInput] = useState('');
    const [addingVoice, setAddingVoice] = useState(false);
    const [cloneDisplayName, setCloneDisplayName] = useState('');
    const [cloneSourceFile, setCloneSourceFile] = useState(null);
    const [cloneConsentFile, setCloneConsentFile] = useState(null);
    const [cloningVoice, setCloningVoice] = useState(false);

    // Form state
    const [provider, setProvider] = useState('elevenlabs');
    const [model, setModel] = useState('eleven_v4_turbo');
    const [voiceId, setVoiceId] = useState('1lQHwFERGYJo2wuE0K6Q');
    const [speed, setSpeed] = useState(1.04);
    const [stability, setStability] = useState(0.4);
    const [similarityBoost, setSimilarityBoost] = useState(0.75);
    const [style, setStyle] = useState('');
    const [sampleText, setSampleText] = useState('שלום, זו בדיקת קול מהמערכת.');

    const applyConfigToForm = useCallback((cfg, src) => {
        if (!cfg) return;
        setActiveConfig(cfg);
        setSource(src || 'env');
        setProvider(cfg.provider || 'elevenlabs');
        setModel(cfg.model || '');
        setVoiceId(cfg.voice_id || '');
        setSpeed(cfg.speed ?? 1.0);
        setStability(cfg.stability ?? 0.4);
        setSimilarityBoost(cfg.similarity_boost ?? 0.75);
        setStyle(cfg.style || '');
    }, []);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const data = await callsApi.getTTSSetting();
            setPresets(data.presets || []);
            setProviders(data.providers || []);
            setGeminiCustomVoices(data.gemini_custom_voices || []);
            setSavedVoices(data.saved_voices || []);
            applyConfigToForm(data.config, data.source);
        } catch (err) {
            console.error('Failed to load TTS settings:', err);
            setStatusMsg({ type: 'error', text: 'שגיאה בטעינת הגדרות ה-TTS מהשרת.' });
        } finally {
            setLoading(false);
        }
    }, [applyConfigToForm]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const showToast = (type, text) => {
        setStatusMsg({ type, text });
    };

    const hasProviderKey = (providerId) => {
        const found = providers.find((p) => p.id === providerId);
        return found ? found.has_key : true;
    };

    const isPresetActive = (preset) => {
        if (!activeConfig) return false;
        return (
            activeConfig.provider === preset.provider &&
            activeConfig.model === preset.model &&
            activeConfig.voice_id === preset.voice_id
        );
    };

    const updatePreviewFromLiveTest = (res) => {
        if (res && res.audio_base64 && res.audio_mime) {
            setPreviewAudio({
                src: `data:${res.audio_mime};base64,${res.audio_base64}`,
                ttfb_ms: res.ttfb_ms,
                total_ms: res.total_ms,
                audio_bytes: res.audio_bytes,
            });
        }
    };

    const handleProviderChange = (nextProv) => {
        setProvider(nextProv);
        const defModels = MODELS_BY_PROVIDER[nextProv] || [];
        const defVoices = VOICES_BY_PROVIDER[nextProv] || [];
        if (defModels.length > 0) setModel(defModels[0]);
        if (defVoices.length > 0) setVoiceId(defVoices[0].id);
        if (nextProv === 'gemini') {
            setSpeed(1.0);
            if (!style) setStyle('casual, warm, enthusiastic, friendly, natural Israeli conversational tone');
        } else if (nextProv === 'openai') {
            setSpeed(1.0);
            if (!style) setStyle('Speak naturally in warm, casual Israeli Hebrew.');
        } else {
            setSpeed(1.04);
        }
    };

    const handleSelectPreset = async (preset) => {
        if (verifyingId) return;
        setVerifyingId(preset.id);
        setStatusMsg({ type: 'info', text: `בודק בלייב את ${preset.label}...` });
        try {
            const payload = {
                provider: preset.provider,
                model: preset.model,
                voice_id: preset.voice_id,
                speed: preset.speed ?? 1.0,
                stability: preset.stability ?? 0.4,
                similarity_boost: preset.similarity_boost ?? 0.75,
                style: preset.style || '',
                sample_text: sampleText,
            };
            const res = await callsApi.updateTTSSetting(payload);
            if (res.success) {
                applyConfigToForm(res.config, res.source);
                updatePreviewFromLiveTest(res.live_test);
                const ttfb = res.live_test?.ttfb_ms ? ` (${res.live_test.ttfb_ms}ms)` : '';
                showToast('success', `✅ ${preset.label} אומת בלייב${ttfb} והופעל לשיחה הבאה!`);
            }
        } catch (err) {
            const errTxt = err?.response?.data?.error || 'הבדיקה החיה נכשלה — מנוע ה-TTS לא שונה.';
            showToast('error', `❌ ${errTxt}`);
        } finally {
            setVerifyingId(null);
        }
    };

    const buildCustomPayload = () => ({
        provider,
        model: model.trim(),
        voice_id: voiceId.trim(),
        speed: parseFloat(speed) || 1.0,
        stability: parseFloat(stability) || 0.4,
        similarity_boost: parseFloat(similarityBoost) || 0.75,
        style: style.trim(),
        sample_text: sampleText.trim() || 'שלום, זו בדיקת קול מהמערכת.',
    });

    const handleTestOnly = async () => {
        if (!model.trim() || !voiceId.trim()) {
            showToast('error', 'יש להזין מודל ו-Voice ID לבדיקה.');
            return;
        }
        setTestingOnly(true);
        setStatusMsg({ type: 'info', text: `מייצר דוגמת קול מ-${provider}/${model.trim()}...` });
        try {
            const res = await callsApi.testTTSSetting(buildCustomPayload());
            updatePreviewFromLiveTest(res);
            showToast('success', `✅ הבדיקה הצליחה! TTFB: ${res.ttfb_ms}ms · סה״כ: ${res.total_ms}ms`);
        } catch (err) {
            showToast('error', `❌ הבדיקה נכשלה: ${err?.response?.data?.error || err.message}`);
        } finally {
            setTestingOnly(false);
        }
    };

    const handleSaveCustom = async (e) => {
        e.preventDefault();
        if (!model.trim() || !voiceId.trim()) {
            showToast('error', 'יש למלא מודל ו-Voice ID.');
            return;
        }
        setVerifyingId('custom');
        setStatusMsg({ type: 'info', text: `מאמת ושומר ${provider}/${model.trim()}...` });
        try {
            const res = await callsApi.updateTTSSetting(buildCustomPayload());
            if (res.success) {
                applyConfigToForm(res.config, res.source);
                updatePreviewFromLiveTest(res.live_test);
                const ttfb = res.live_test?.ttfb_ms ? ` (${res.live_test.ttfb_ms}ms)` : '';
                showToast('success', `✅ מנוע ה-TTS אומת${ttfb} ונשמר לשיחה הבאה!`);
            }
        } catch (err) {
            showToast('error', `❌ השמירה נכשלה: ${err?.response?.data?.error || err.message}`);
        } finally {
            setVerifyingId(null);
        }
    };

    const handleReset = async () => {
        setVerifyingId('reset');
        try {
            const res = await callsApi.updateTTSSetting({ reset: true });
            if (res.success) {
                applyConfigToForm(res.config, res.source);
                showToast('success', 'הגדרות ה-TTS אופסו לברירת המחדל (.env).');
            }
        } catch (err) {
            showToast('error', 'שגיאה באיפוס הגדרות ה-TTS.');
        } finally {
            setVerifyingId(null);
        }
    };

    const handleSaveNewVoiceId = async () => {
        const vid = newVoiceIdInput.trim();
        const lbl = newVoiceLabel.trim() || vid;
        if (!vid) {
            showToast('error', 'יש להזין Voice ID להוספה.');
            return;
        }
        setAddingVoice(true);
        try {
            const res = await callsApi.manageTTSVoices({
                action: 'add',
                provider,
                voice_id: vid,
                label: lbl,
            });
            if (res.success) {
                setSavedVoices(res.saved_voices || []);
                setVoiceId(vid);
                setNewVoiceIdInput('');
                setNewVoiceLabel('');
                showToast('success', `✅ הקול "${lbl}" (${vid}) נוסף ונבחר. לחץ "בדוק קול זה" או "אמת ושמור לשיחה הבאה".`);
            }
        } catch (err) {
            showToast('error', `❌ שגיאה בהוספת הקול: ${err?.response?.data?.error || err.message}`);
        } finally {
            setAddingVoice(false);
        }
    };

    const handleDeleteSavedVoice = async (targetVoiceId) => {
        try {
            const res = await callsApi.manageTTSVoices({
                action: 'delete',
                provider,
                voice_id: targetVoiceId,
            });
            if (res.success) {
                setSavedVoices(res.saved_voices || []);
            }
        } catch (err) {
            showToast('error', 'שגיאה במחיקת הקול.');
        }
    };

    const handleCloneGeminiVoice = async () => {
        if (!cloneDisplayName.trim() || !cloneSourceFile || !cloneConsentFile) {
            showToast('error', 'יש למלא שם קול ולהעלות קובץ שמע + קובץ הסכמה.');
            return;
        }
        setCloningVoice(true);
        setStatusMsg({ type: 'info', text: 'יוצר קול משובט חדש ב-Google Gemini...' });
        try {
            const fd = new FormData();
            fd.append('display_name', cloneDisplayName.trim());
            fd.append('model', model.trim() || 'gemini-3.8-flash-lite-tts');
            fd.append('source_audio', cloneSourceFile);
            fd.append('consent_audio', cloneConsentFile);
            const res = await callsApi.cloneGeminiVoice(fd);
            if (res.success) {
                setSavedVoices(res.saved_voices || []);
                setProvider('gemini');
                setVoiceId(res.voice_id);
                setCloneDisplayName('');
                setCloneSourceFile(null);
                setCloneConsentFile(null);
                showToast('success', `✅ הקול המשובט "${res.display_name}" נוצר ב-Google (${res.voice_id})! לחץ "אמת ושמור לשיחה הבאה".`);
            }
        } catch (err) {
            showToast('error', `❌ יצירת הקול נכשלה: ${err?.response?.data?.error || err.message}`);
        } finally {
            setCloningVoice(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
                טוען הגדרות TTS...
            </div>
        );
    }

    const styles = {
        wrap: { direction: 'rtl', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
        banner: {
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#fff',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
        },
        badge: (isRedis) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: isRedis ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.25)',
            color: isRedis ? '#6ee7b7' : '#cbd5e1',
        }),
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1rem',
        },
        card: (active) => ({
            border: active ? '2px solid #2563eb' : '1px solid #e5e7eb',
            backgroundColor: active ? '#eff6ff' : '#fff',
            borderRadius: '12px',
            padding: '1rem',
            cursor: verifyingId ? 'wait' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'all 0.15s ease',
            boxShadow: active ? '0 4px 12px rgba(37,99,235,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
        }),
        chip: (active) => ({
            padding: '5px 11px',
            borderRadius: '8px',
            border: active ? '1px solid #2563eb' : '1px solid #d1d5db',
            backgroundColor: active ? '#dbeafe' : '#f9fafb',
            color: active ? '#1d4ed8' : '#374151',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
        }),
        input: {
            width: '100%',
            padding: '9px 12px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '0.9rem',
            direction: 'ltr',
            textAlign: 'left',
            boxSizing: 'border-box',
        },
        label: { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' },
    };

    return (
        <div style={styles.wrap}>
            {/* Active Banner */}
            <div style={styles.banner}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <Volume2 size={22} color="#60a5fa" />
                        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>מנוע קול פעיל (TTS)</span>
                        <span style={styles.badge(source === 'redis')}>
                            {source === 'redis' ? 'Redis Override (שליטה מהירה)' : 'ברירת מחדל (.env)'}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.92rem', color: '#cbd5e1', direction: 'ltr', textAlign: 'right' }}>
                        <strong>{activeConfig?.provider}</strong> / {activeConfig?.model} · voice:{' '}
                        <code>{activeConfig?.voice_id}</code>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleReset}
                    disabled={Boolean(verifyingId)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    <RotateCcw size={15} />
                    איפוס ל-.env
                </button>
            </div>

            {/* Toast */}
            {statusMsg && (
                <div
                    style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor:
                            statusMsg.type === 'error'
                                ? '#fef2f2'
                                : statusMsg.type === 'success'
                                    ? '#ecfdf5'
                                    : '#eff6ff',
                        border:
                            statusMsg.type === 'error'
                                ? '1px solid #fecaca'
                                : statusMsg.type === 'success'
                                    ? '1px solid #a7f3d0'
                                    : '1px solid #bfdbfe',
                        color:
                            statusMsg.type === 'error'
                                ? '#991b1b'
                                : statusMsg.type === 'success'
                                    ? '#065f46'
                                    : '#1e40af',
                        fontWeight: 500,
                    }}
                >
                    {statusMsg.type === 'error' ? <AlertCircle size={18} /> : <ShieldCheck size={18} />}
                    <span>{statusMsg.text}</span>
                </div>
            )}

            {/* Audio Preview Player */}
            {previewAudio && (
                <div
                    style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#0f172a' }}>
                        <Volume2 size={18} color="#2563eb" />
                        <span>תצוגה מקדימה של הקול</span>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                            (TTFB: {previewAudio.ttfb_ms}ms · {Math.round((previewAudio.audio_bytes || 0) / 1024)}KB)
                        </span>
                    </div>
                    <audio key={previewAudio.src} controls autoPlay src={previewAudio.src} style={{ height: '36px' }} />
                </div>
            )}

            {/* Presets Grid */}
            <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.05rem', color: '#111827' }}>
                    מעבר מהיר בלחיצה (Preset מאומת בלייב)
                </h3>
                <div style={styles.grid}>
                    {presets.map((preset) => {
                        const active = isPresetActive(preset);
                        const busy = verifyingId === preset.id;
                        return (
                            <div
                                key={preset.id}
                                style={styles.card(active)}
                                onClick={() => handleSelectPreset(preset)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 700, color: '#111827' }}>{preset.label}</span>
                                    {busy ? (
                                        <Loader2 size={18} className="animate-spin" color="#2563eb" />
                                    ) : active ? (
                                        <CheckCircle2 size={18} color="#2563eb" />
                                    ) : null}
                                </div>
                                <div style={{ fontSize: '0.83rem', color: '#4b5563' }}>{preset.subtitle_he}</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                    <span style={styles.chip(false)}>{preset.provider_label}</span>
                                    <span style={styles.chip(false)}>{preset.speed_tag}</span>
                                    <span style={styles.chip(false)}>{preset.cost_tag}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Custom Form */}
            <form
                onSubmit={handleSaveCustom}
                style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    backgroundColor: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#111827' }}>
                    <Sliders size={18} color="#2563eb" />
                    <span>התאמה אישית של ספק, מודל וקול</span>
                </div>

                {/* Providers */}
                <div>
                    <label style={styles.label}>ספק TTS</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {providers.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => handleProviderChange(p.id)}
                                style={{
                                    ...styles.chip(provider === p.id),
                                    opacity: p.has_key ? 1 : 0.6,
                                }}
                            >
                                {p.label} {p.has_key ? '✓' : '(חסר מפתח)'}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={styles.label}>Model ID</label>
                        <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            style={styles.input}
                            placeholder="eleven_v4_turbo"
                        />
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                            {(MODELS_BY_PROVIDER[provider] || []).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setModel(m)}
                                    style={styles.chip(model === m)}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={styles.label}>Voice ID / Name</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                type="text"
                                value={voiceId}
                                onChange={(e) => setVoiceId(e.target.value)}
                                style={styles.input}
                                placeholder={
                                    provider === 'gemini'
                                        ? 'לדוגמה: voice_ua1bq0xqehc8 או Charon'
                                        : provider === 'openai'
                                            ? 'לדוגמה: coral, ash, alloy'
                                            : 'ElevenLabs Voice ID (לדוגמה: 1lQHwFERGYJo2wuE0K6Q)'
                                }
                            />
                            <button
                                type="button"
                                onClick={handleTestOnly}
                                disabled={testingOnly || Boolean(verifyingId)}
                                title="בדוק והשמע את ה-Voice ID הזה"
                                style={{
                                    ...styles.chip(false),
                                    whiteSpace: 'nowrap',
                                    padding: '9px 12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                }}
                            >
                                {testingOnly ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                בדוק קול זה
                            </button>
                        </div>
                        {provider === 'gemini' && (
                            <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: '5px' }}>
                                תומך גם בקול מובנה (Charon, Aoede, Puck) וגם בכל Voice ID משובט מגוגל (
                                <code>voice_...</code> כמו <code>voice_ua1bq0xqehc8</code>) — חייב להשתייך לאותו{' '}
                                <code>GOOGLE_API_KEY</code> שמוגדר בשרת.
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px', alignItems: 'center' }}>
                            {[
                                ...(VOICES_BY_PROVIDER[provider] || []),
                                ...(provider === 'gemini' ? geminiCustomVoices : []),
                            ].map((v) => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setVoiceId(v.id)}
                                    style={styles.chip(voiceId === v.id)}
                                >
                                    {v.label}
                                </button>
                            ))}
                            {savedVoices
                                .filter((sv) => sv.provider === provider)
                                .map((sv) => (
                                    <span
                                        key={`saved-${sv.voice_id}`}
                                        style={{
                                            ...styles.chip(voiceId === sv.voice_id),
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        <span onClick={() => setVoiceId(sv.voice_id)} style={{ cursor: 'pointer' }}>
                                            {sv.label}
                                        </span>
                                        <Trash2
                                            size={13}
                                            color="#ef4444"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => handleDeleteSavedVoice(sv.voice_id)}
                                            title="מחק קול שמור"
                                        />
                                    </span>
                                ))}
                            <button
                                type="button"
                                onClick={() => setShowAddVoice((v) => !v)}
                                style={{
                                    ...styles.chip(showAddVoice),
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    borderStyle: 'dashed',
                                }}
                            >
                                <Plus size={14} />
                                הוסף קול חדש
                            </button>
                        </div>

                        {showAddVoice && (
                            <div
                                style={{
                                    marginTop: '10px',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                }}
                            >
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => setAddVoiceMode('id')}
                                        style={styles.chip(addVoiceMode === 'id')}
                                    >
                                        שמירת Voice ID קיים
                                    </button>
                                    {provider === 'gemini' && (
                                        <button
                                            type="button"
                                            onClick={() => setAddVoiceMode('clone')}
                                            style={styles.chip(addVoiceMode === 'clone')}
                                        >
                                            שכפול קול חדש ב-Google (העלאת שמע)
                                        </button>
                                    )}
                                </div>

                                {addVoiceMode === 'id' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={newVoiceLabel}
                                            onChange={(e) => setNewVoiceLabel(e.target.value)}
                                            style={{ ...styles.input, direction: 'rtl', textAlign: 'right' }}
                                            placeholder="שם תצוגה (לדוגמה: Moshik-test)"
                                        />
                                        <input
                                            type="text"
                                            value={newVoiceIdInput}
                                            onChange={(e) => setNewVoiceIdInput(e.target.value)}
                                            style={styles.input}
                                            placeholder="Voice ID (לדוגמה: voice_ua1bq0xqehc8)"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSaveNewVoiceId}
                                            disabled={addingVoice}
                                            style={{
                                                ...styles.chip(true),
                                                alignSelf: 'flex-start',
                                                padding: '8px 14px',
                                            }}
                                        >
                                            {addingVoice ? 'שומר...' : 'הוסף ושמור קול'}
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={cloneDisplayName}
                                            onChange={(e) => setCloneDisplayName(e.target.value)}
                                            style={{ ...styles.input, direction: 'rtl', textAlign: 'right' }}
                                            placeholder="שם הקול החדש (לדוגמה: Moshik)"
                                        />
                                        <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                                            הקלטת קול מקור (WAV/MP3):
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                onChange={(e) => setCloneSourceFile(e.target.files?.[0] || null)}
                                                style={{ display: 'block', marginTop: '4px' }}
                                            />
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                                            הקלטת הסכמה (WAV/MP3):
                                            <input
                                                type="file"
                                                accept="audio/*"
                                                onChange={(e) => setCloneConsentFile(e.target.files?.[0] || null)}
                                                style={{ display: 'block', marginTop: '4px' }}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCloneGeminiVoice}
                                            disabled={cloningVoice}
                                            style={{
                                                ...styles.chip(true),
                                                alignSelf: 'flex-start',
                                                padding: '8px 14px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            {cloningVoice ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                            {cloningVoice ? 'משכפל ב-Google...' : 'צור קול משובט בגוגל'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Provider-specific settings */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    {(provider === 'elevenlabs' || provider === 'openai') && (
                        <div>
                            <label style={styles.label}>מהירות דיבור ({speed})</label>
                            <input
                                type="number"
                                step="0.02"
                                min="0.5"
                                max="2.0"
                                value={speed}
                                onChange={(e) => setSpeed(e.target.value)}
                                style={styles.input}
                            />
                        </div>
                    )}
                    {provider === 'elevenlabs' && (
                        <>
                            <div>
                                <label style={styles.label}>Stability ({stability})</label>
                                <input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    max="1"
                                    value={stability}
                                    onChange={(e) => setStability(e.target.value)}
                                    style={styles.input}
                                />
                            </div>
                            <div>
                                <label style={styles.label}>Similarity Boost ({similarityBoost})</label>
                                <input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    max="1"
                                    value={similarityBoost}
                                    onChange={(e) => setSimilarityBoost(e.target.value)}
                                    style={styles.input}
                                />
                            </div>
                        </>
                    )}
                    {(provider === 'gemini' || provider === 'openai') && (
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={styles.label}>
                                {provider === 'gemini' ? 'סגנון דיבור (speech_metadata.style)' : 'הנחיית קול (instructions)'}
                            </label>
                            <input
                                type="text"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                style={styles.input}
                                placeholder="casual, warm, enthusiastic..."
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label style={styles.label}>טקסט לבדיקת שמע</label>
                    <input
                        type="text"
                        value={sampleText}
                        onChange={(e) => setSampleText(e.target.value)}
                        style={{ ...styles.input, direction: 'rtl', textAlign: 'right' }}
                    />
                </div>

                {!hasProviderKey(provider) && (
                    <div style={{ color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600 }}>
                        ⚠️ שים לב: לא נמצא API Key עבור {provider} במשתני הסביבה של השרת.
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handleTestOnly}
                        disabled={testingOnly || Boolean(verifyingId)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            backgroundColor: '#f9fafb',
                            color: '#111827',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        {testingOnly ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        בדוק והשמע בלייב
                    </button>
                    <button
                        type="submit"
                        disabled={testingOnly || Boolean(verifyingId)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        {verifyingId === 'custom' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        אמת ושמור לשיחה הבאה
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TTSModelManager;
