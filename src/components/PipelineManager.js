import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Sliders,
    Mic,
    Clock,
    Shield,
    Cpu,
    Volume2,
    Save,
    RotateCcw,
    Play,
    Plus,
    Trash2,
    Download,
    Upload,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Sparkles,
    ArrowLeft,
    Tag,
    Zap,
} from 'lucide-react';
import { callsApi } from './APIcalls';

const DEFAULT_CONFIG = {
    stt: {
        provider: 'deepgram',
        deepgram_model: 'nova-3',
        deepgram_language: 'he',
        deepgram_endpointing_ms: 450,
        deepgram_utterance_end_ms: 1000,
        deepgram_smart_format: true,
        deepgram_vad_events: true,
        scribe_model_id: 'scribe_v3_live',
        scribe_language: 'he',
        scribe_vad_silence_secs: 0.7,
        scribe_audio_format: 'pcm_8000',
        scribe_filter_background_audio: false,
        fallback_to_deepgram: true,
        audio_gain: 1.0,
        keyterms: [],
        replace_rules: [],
    },
    turn_taking: {
        speculative_turn: true,
        speculative_tts: false,
        speculative_silence_sec: 0.15,
        early_release_silence_sec: 0.95,
        early_release_question_sec: 0.75,
        early_release_short_sec: 0.70,
        endpoint_fallback_silence_sec: 0.90,
        incomplete_extra_wait_sec: 0.80,
        number_extra_wait_sec: 1.80,
        soft_commit_wait_sec: 0.45,
    },
    barge_in: {
        enabled: true,
        protect_words: 3,
        min_words: 2,
        vad_frames: 25,
        echo_shield_sec: 0.6,
        disable_first_message_interruptions: true,
        voice_rms: 225,
        run_rms: 325,
        greeting_delay_sec: 0.0,
    },
    llm_pipeline: {
        temperature: 0.0,
        max_tokens: 160,
        history_items: 100,
        hedge_after: 1.6,
        race: false,
        first_token_timeout: 4.5,
        stall_timeout: 3.0,
    },
    tts_pipeline: {
        prebuffer_ms: 40,
        playout_lead_sec: 0.5,
        first_comma_words: 99,
        merge_rest_sec: 0.45,
        elevenlabs_previous_text: true,
    },
    limits: {
        silence_end_call_timeout_sec: 20.0,
        max_call_sec: 600.0,
        skip_turn_checkin_sec: 9.0,
    },
};

const PipelineManager = ({ onNavigateTab }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingStt, setTestingStt] = useState(false);
    const [activeStage, setActiveStage] = useState('stt'); // 'stt' | 'turn_taking' | 'barge_in' | 'llm_tts'
    const [profileId, setProfileId] = useState('global');
    const [profiles, setProfiles] = useState([]);
    const [source, setSource] = useState('env');
    const [sttProviders, setSttProviders] = useState([]);
    const [speedPresets, setSpeedPresets] = useState([]);
    const [keywordPresets, setKeywordPresets] = useState({});
    const [activeLlm, setActiveLlm] = useState(null);
    const [activeTts, setActiveTts] = useState(null);

    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [dirty, setDirty] = useState(false);
    const [toast, setToast] = useState(null);
    const [sttTestResult, setSttTestResult] = useState(null);

    // Keywords Studio state
    const [newKeyword, setNewKeyword] = useState('');
    const [newBoost, setNewBoost] = useState('');
    const [showBulkPaste, setShowBulkPaste] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [replaceFrom, setReplaceFrom] = useState('');
    const [replaceTo, setReplaceTo] = useState('');

    // New Bot Profile modal/inline
    const [showNewProfile, setShowNewProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const importInputRef = useRef(null);

    const showMessage = (type, text) => {
        setToast({ type, text });
    };

    const loadProfile = useCallback(async (targetProfile = 'global') => {
        setLoading(true);
        setSttTestResult(null);
        try {
            const data = await callsApi.getPipelineSetting(targetProfile);
            setProfileId(data.profile || targetProfile);
            setSource(data.source || 'env');
            setProfiles(data.profiles || []);
            setSttProviders(data.stt_providers || []);
            setSpeedPresets(data.speed_presets || []);
            setKeywordPresets(data.keyword_presets || {});
            setActiveLlm(data.active_llm || null);
            setActiveTts(data.active_tts || null);
            setConfig({
                ...DEFAULT_CONFIG,
                ...(data.config || {}),
                stt: { ...DEFAULT_CONFIG.stt, ...(data.config?.stt || {}) },
                turn_taking: { ...DEFAULT_CONFIG.turn_taking, ...(data.config?.turn_taking || {}) },
                barge_in: { ...DEFAULT_CONFIG.barge_in, ...(data.config?.barge_in || {}) },
                llm_pipeline: { ...DEFAULT_CONFIG.llm_pipeline, ...(data.config?.llm_pipeline || {}) },
                tts_pipeline: { ...DEFAULT_CONFIG.tts_pipeline, ...(data.config?.tts_pipeline || {}) },
                limits: { ...DEFAULT_CONFIG.limits, ...(data.config?.limits || {}) },
            });
            setDirty(false);
        } catch (err) {
            console.error('Failed to load pipeline config:', err);
            showMessage('error', 'שגיאה בטעינת הגדרות ה-Pipeline מהשרת.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProfile('global');
    }, [loadProfile]);

    const updateSection = (section, patch) => {
        setConfig((prev) => ({
            ...prev,
            [section]: { ...prev[section], ...patch },
        }));
        setDirty(true);
    };

    const stt = config.stt;
    const isDeepgram = stt.provider === 'deepgram';
    const currentProvSpec = sttProviders.find((p) => p.id === stt.provider);
    const activeDgModel = stt.deepgram_model || 'nova-3';
    const isNova3 = isDeepgram && activeDgModel.toLowerCase().startsWith('nova-3');
    const supportsBoost = isDeepgram && !isNova3;
    const maxKeyterms = isDeepgram ? 100 : 50;

    const getStandardBanner = () => {
        if (!isDeepgram) {
            return {
                title: 'תקן ElevenLabs Scribe Realtime (keyterms)',
                text: 'Scribe תומך בעד 50 מונחי מפתח (keyterms) נקיים ללא משקל (:boost). אידיאלי לשמות מותגים, שמות פרטיים ומונחים מקצועיים.',
                color: '#7c3aed',
                bg: '#f5f3ff',
                border: '#ddd6fe',
            };
        }
        if (isNova3) {
            return {
                title: 'תקן Deepgram Nova-3 (keyterm)',
                text: 'Nova-3 משתמש בפרמטר keyterm (עד 100 ביטויים). יש להזין מילים או ביטויים נקיים ללא ניקוד וללא משקל מספרי (:2).',
                color: '#0369a1',
                bg: '#f0f9ff',
                border: '#bae6fd',
            };
        }
        return {
            title: 'תקן Deepgram Nova-2 (keywords + boost)',
            text: 'Nova-2 משתמש בפרמטר keywords ותומך בחיזוק משקל בפורמט מילה:משקל (למשל בוט טן:2).',
            color: '#0f766e',
            bg: '#f0fdfa',
            border: '#99f6e4',
        };
    };

    const handleAddKeyword = () => {
        const raw = newKeyword.trim();
        if (!raw) return;
        let entry = raw;
        if (supportsBoost && newBoost.trim()) {
            const cleanBase = raw.split(':')[0].trim();
            entry = `${cleanBase}:${newBoost.trim()}`;
        } else if (!supportsBoost && raw.includes(':')) {
            const parts = raw.split(':');
            if (!Number.isNaN(Number(parts[parts.length - 1]))) {
                entry = parts.slice(0, -1).join(':').trim();
            }
        }
        const current = stt.keyterms || [];
        if (current.includes(entry)) {
            setNewKeyword('');
            return;
        }
        if (current.length >= maxKeyterms) {
            showMessage('error', `הגעת למגבלה של ${maxKeyterms} מילות מפתח עבור מודל זה.`);
            return;
        }
        updateSection('stt', { keyterms: [...current, entry] });
        setNewKeyword('');
        setNewBoost('');
    };

    const handleRemoveKeyword = (term) => {
        updateSection('stt', {
            keyterms: (stt.keyterms || []).filter((t) => t !== term),
        });
    };

    const handleApplyBulkPaste = () => {
        const items = bulkText
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        if (items.length === 0) {
            setShowBulkPaste(false);
            return;
        }
        const existing = new Set(stt.keyterms || []);
        const next = [...(stt.keyterms || [])];
        for (const item of items) {
            let normalized = item;
            if (!supportsBoost && item.includes(':')) {
                const idx = item.lastIndexOf(':');
                if (!Number.isNaN(Number(item.slice(idx + 1)))) {
                    normalized = item.slice(0, idx).trim();
                }
            }
            if (normalized && !existing.has(normalized) && next.length < maxKeyterms) {
                existing.add(normalized);
                next.push(normalized);
            }
        }
        updateSection('stt', { keyterms: next });
        setBulkText('');
        setShowBulkPaste(false);
        showMessage('success', `נוספו מילות מפתח (סה״כ ${next.length}/${maxKeyterms}).`);
    };

    const handleApplyKeywordPreset = (presetKey) => {
        const preset = keywordPresets[presetKey];
        if (!preset) return;
        updateSection('stt', { keyterms: [...(preset.keyterms || [])].slice(0, maxKeyterms) });
        showMessage('info', `נטען סט מילות מפתח: ${preset.label}`);
    };

    const handleAddReplaceRule = () => {
        const f = replaceFrom.trim();
        const t = replaceTo.trim();
        if (!f || !t) return;
        const rule = `${f}:${t}`;
        const cur = stt.replace_rules || [];
        if (!cur.includes(rule)) {
            updateSection('stt', { replace_rules: [...cur, rule] });
        }
        setReplaceFrom('');
        setReplaceTo('');
    };

    const handleApplySpeedPreset = (preset) => {
        updateSection('turn_taking', preset.turn_taking || {});
        if (preset.stt_patch) {
            updateSection('stt', preset.stt_patch);
        }
        showMessage('info', `הוחל פרופיל מהירות: ${preset.label}`);
    };

    const handleTestSTT = async () => {
        setTestingStt(true);
        setSttTestResult(null);
        try {
            const res = await callsApi.testSTTSetting({ stt: config.stt });
            setSttTestResult(res);
            showMessage('success', `✅ חיבור ${res.provider} (${res.model}) אומת בלייב תוך ${res.latency_ms}ms!`);
        } catch (err) {
            const errTxt = err?.response?.data?.error || err.message || 'בדיקת ה-STT נכשלה.';
            setSttTestResult({ ok: false, error: errTxt });
            showMessage('error', `❌ ${errTxt}`);
        } finally {
            setTestingStt(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const currentProf = profiles.find((p) => p.id === profileId);
            const res = await callsApi.updatePipelineSetting({
                profile: profileId,
                profile_label: currentProf?.label || profileId,
                config,
            });
            if (res.success) {
                setSource(res.source || 'redis');
                setProfiles(res.profiles || profiles);
                if (res.config) setConfig(res.config);
                setDirty(false);
                showMessage('success', `✅ הגדרות ה-Pipeline לפרופיל "${currentProf?.label || profileId}" נשמרו והופעלו לשיחה הבאה!`);
            }
        } catch (err) {
            showMessage('error', `❌ שמירה נכשלה: ${err?.response?.data?.error || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('לאפס את הפרופיל הנוכחי לברירת המחדל (.env)?')) return;
        setSaving(true);
        try {
            const res = await callsApi.updatePipelineSetting({
                profile: profileId,
                reset: true,
            });
            if (res.success) {
                setSource('env');
                setProfiles(res.profiles || profiles);
                if (res.config) setConfig(res.config);
                setDirty(false);
                showMessage('success', 'ההגדרות אופסו לברירת המחדל (.env).');
            }
        } catch (err) {
            showMessage('error', 'שגיאה באיפוס ההגדרות.');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateProfile = async () => {
        const cleanLabel = newProfileName.trim();
        if (!cleanLabel) return;
        const slug = cleanLabel
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '_')
            .replace(/^_+|_+$/g, '') || `bot_${Date.now().toString(36)}`;
        setSaving(true);
        try {
            const res = await callsApi.updatePipelineSetting({
                profile: slug,
                profile_label: cleanLabel,
                config,
            });
            if (res.success) {
                setProfiles(res.profiles || []);
                setProfileId(slug);
                setSource('redis');
                setDirty(false);
                setNewProfileName('');
                setShowNewProfile(false);
                showMessage('success', `✅ נוצר פרופיל בוט חדש: "${cleanLabel}"`);
            }
        } catch (err) {
            showMessage('error', 'שגיאה ביצירת פרופיל חדש.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!window.confirm(`למחוק את הפרופיל "${profileId}"?`)) return;
        try {
            const res = await callsApi.updatePipelineSetting({
                profile: profileId,
                delete_profile: true,
            });
            if (res.success) {
                setProfiles(res.profiles || []);
                loadProfile('global');
                showMessage('success', 'הפרופיל נמחק.');
            }
        } catch (err) {
            showMessage('error', err?.response?.data?.error || 'שגיאה במחיקת הפרופיל.');
        }
    };

    const handleExportJson = () => {
        const blob = new Blob([JSON.stringify({ profile: profileId, config }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pipeline-${profileId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportJson = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result || '{}'));
                const importedCfg = parsed.config || parsed;
                if (!importedCfg.stt && !importedCfg.turn_taking) {
                    showMessage('error', 'קובץ JSON לא תקין עבור הגדרות Pipeline.');
                    return;
                }
                setConfig((prev) => ({
                    stt: { ...prev.stt, ...(importedCfg.stt || {}) },
                    turn_taking: { ...prev.turn_taking, ...(importedCfg.turn_taking || {}) },
                    barge_in: { ...prev.barge_in, ...(importedCfg.barge_in || {}) },
                    llm_pipeline: { ...prev.llm_pipeline, ...(importedCfg.llm_pipeline || {}) },
                    tts_pipeline: { ...prev.tts_pipeline, ...(importedCfg.tts_pipeline || {}) },
                    limits: { ...prev.limits, ...(importedCfg.limits || {}) },
                }));
                setDirty(true);
                showMessage('success', 'הקובץ יובא! לחץ "שמור והפעל" כדי להחיל.');
            } catch {
                showMessage('error', 'נכשל בפענוח קובץ ה-JSON.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    if (loading) {
        return (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 12px' }} />
                טוען את מרכז השליטה של ה-Pipeline...
            </div>
        );
    }

    const activeProfileMeta = profiles.find((p) => p.id === profileId);
    const stdBanner = getStandardBanner();
    const keytermsList = stt.keyterms || [];
    const pct = Math.min(100, Math.round((keytermsList.length / maxKeyterms) * 100));

    const stages = [
        {
            id: 'stt',
            num: '1',
            title: 'תמלול (STT) ו-Keywords',
            icon: Mic,
            summary: `${isDeepgram ? `Deepgram ${stt.deepgram_model}` : `Scribe ${stt.scribe_model_id}`} · ${keytermsList.length} מילות מפתח`,
            accent: '#2563eb',
        },
        {
            id: 'turn_taking',
            num: '2',
            title: 'תזמון שיחה וספקולציה',
            icon: Clock,
            summary: `שחרור ${config.turn_taking.early_release_silence_sec}s · ספקולציה ${config.turn_taking.speculative_turn ? 'ON' : 'OFF'}`,
            accent: '#7c3aed',
        },
        {
            id: 'barge_in',
            num: '3',
            title: 'קטיעה ואודיו (Barge-In / VAD)',
            icon: Shield,
            summary: `${config.barge_in.enabled ? `פעיל (${config.barge_in.protect_words < 0 ? 'כל התשובה' : `${config.barge_in.protect_words} מילים`})` : 'כבוי'} · RMS ${config.barge_in.voice_rms}`,
            accent: '#059669',
        },
        {
            id: 'llm_tts',
            num: '4',
            title: 'זרימת LLM / TTS וגבולות',
            icon: Cpu,
            summary: `${activeLlm?.provider || 'LLM'}/${activeLlm?.model || ''} ➔ ${activeTts?.provider || 'TTS'}`,
            accent: '#d97706',
        },
    ];

    const s = {
        wrap: { direction: 'rtl', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
        hero: {
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 65%, #1e1b4b 100%)',
            color: '#fff',
            borderRadius: '16px',
            padding: '1.35rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
        },
        heroTop: {
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
        },
        badge: (mode) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 11px',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: mode === 'redis' ? 'rgba(16, 185, 129, 0.2)' : mode === 'global_inherited' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(148, 163, 184, 0.25)',
            color: mode === 'redis' ? '#6ee7b7' : mode === 'global_inherited' ? '#93c5fd' : '#cbd5e1',
        }),
        btnPrimary: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '9px 18px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
        },
        btnGhostDark: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 13px',
            borderRadius: '9px',
            border: '1px solid rgba(255,255,255,0.2)',
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: '#f8fafc',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
        },
        profileBar: {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255,255,255,0.12)',
        },
        profileChip: (active) => ({
            padding: '6px 13px',
            borderRadius: '999px',
            border: active ? '1.5px solid #60a5fa' : '1px solid rgba(255,255,255,0.2)',
            backgroundColor: active ? 'rgba(37, 99, 235, 0.35)' : 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontWeight: active ? 700 : 500,
            fontSize: '0.82rem',
            cursor: 'pointer',
        }),
        pipelineGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.85rem',
        },
        stageCard: (active, accent) => ({
            padding: '1rem 1.1rem',
            borderRadius: '14px',
            border: active ? `2px solid ${accent}` : '1px solid #e2e8f0',
            backgroundColor: active ? '#f8fafc' : '#fff',
            cursor: 'pointer',
            textAlign: 'right',
            transition: 'all 0.15s ease',
            boxShadow: active ? `0 6px 18px -4px ${accent}28` : '0 1px 3px rgba(0,0,0,0.04)',
        }),
        panel: {
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.35rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.15rem',
        },
        fieldGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
        },
        fieldBox: {
            padding: '0.9rem 1rem',
            borderRadius: '11px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
        },
        input: {
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#fff',
            fontSize: '0.88rem',
            boxSizing: 'border-box',
        },
        label: { fontSize: '0.83rem', fontWeight: 700, color: '#1e293b' },
        hint: { fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 },
    };

    const renderToggle = (checked, onChange, label, hint) => (
        <label style={{ ...s.fieldBox, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div>
                <div style={s.label}>{label}</div>
                {hint && <div style={s.hint}>{hint}</div>}
            </div>
            <input
                type="checkbox"
                checked={!!checked}
                onChange={(e) => onChange(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer', flexShrink: 0 }}
            />
        </label>
    );

    const renderNumberField = (label, hint, value, onChange, { min = 0, max = 100, step = 0.1, unit = '' } = {}) => (
        <div style={s.fieldBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={s.label}>{label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', direction: 'ltr' }}>
                    {value}{unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={Number(value ?? min)}
                onChange={(e) => onChange(step >= 1 ? parseInt(e.target.value, 10) : parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#2563eb' }}
            />
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={value ?? min}
                onChange={(e) => {
                    const v = step >= 1 ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
                    if (!Number.isNaN(v)) onChange(v);
                }}
                style={{ ...s.input, direction: 'ltr', padding: '5px 8px', fontSize: '0.82rem' }}
            />
            {hint && <div style={s.hint}>{hint}</div>}
        </div>
    );

    return (
        <div style={s.wrap}>
            {/* Top Hero & Bot Profile Selector */}
            <div style={s.hero}>
                <div style={s.heroTop}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <Sliders size={22} color="#60a5fa" />
                            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                                מרכז שליטה ב-Pipeline ותמלול (STT)
                            </h2>
                            <span style={s.badge(source)}>
                                {source === 'redis' ? 'Redis Live' : source === 'global_inherited' ? 'ירושה מ-Global' : 'ברירת מחדל (.env)'}
                            </span>
                            {dirty && (
                                <span style={{ ...s.badge('dirty'), backgroundColor: 'rgba(245, 158, 11, 0.25)', color: '#fcd34d' }}>
                                    ● שינויים לא שמורים
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.83rem', color: '#cbd5e1', marginTop: '4px' }}>
                            שליטה מלאה על מנוע התמלול, Keywords לפי תקן ספק, תזמון תגובה, קטיעה (Barge-In) וזרימת שיחה — לכל בוט בנפרד.
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="button" onClick={handleExportJson} style={s.btnGhostDark} title="ייצוא הגדרות לבוט אחר">
                            <Download size={15} />
                            ייצוא JSON
                        </button>
                        <button type="button" onClick={() => importInputRef.current?.click()} style={s.btnGhostDark} title="ייבוא הגדרות מקובץ">
                            <Upload size={15} />
                            ייבוא
                        </button>
                        <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJson} />
                        <button type="button" onClick={handleReset} disabled={saving} style={s.btnGhostDark}>
                            <RotateCcw size={15} />
                            איפוס
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving} style={s.btnPrimary}>
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            {saving ? 'שומר...' : 'שמור והפעל לשיחה הבאה'}
                        </button>
                    </div>
                </div>

                {/* Bot Profile Switcher */}
                <div style={s.profileBar}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>פרופיל בוט:</span>
                    {profiles.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => loadProfile(p.id)}
                            style={s.profileChip(profileId === p.id)}
                        >
                            {p.label} {p.has_override ? '✓' : ''}
                        </button>
                    ))}
                    {!showNewProfile ? (
                        <button
                            type="button"
                            onClick={() => setShowNewProfile(true)}
                            style={{ ...s.profileChip(false), borderStyle: 'dashed', color: '#93c5fd' }}
                        >
                            <Plus size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                            בוט חדש
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="שם הבוט (למשל: נדל״ן)"
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                style={{ padding: '5px 10px', borderRadius: '8px', border: 'none', fontSize: '0.82rem', color: '#0f172a' }}
                            />
                            <button type="button" onClick={handleCreateProfile} style={{ ...s.btnPrimary, padding: '6px 12px', fontSize: '0.78rem' }}>
                                צור
                            </button>
                            <button type="button" onClick={() => setShowNewProfile(false)} style={{ ...s.btnGhostDark, padding: '6px 10px', fontSize: '0.78rem' }}>
                                ביטול
                            </button>
                        </div>
                    )}
                    {activeProfileMeta && !activeProfileMeta.builtin && (
                        <button
                            type="button"
                            onClick={handleDeleteProfile}
                            style={{ ...s.btnGhostDark, color: '#fca5a5', borderColor: 'rgba(248,113,113,0.4)', marginRight: 'auto' }}
                        >
                            <Trash2 size={14} />
                            מחק פרופיל
                        </button>
                    )}
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    backgroundColor: toast.type === 'success' ? '#ecfdf5' : toast.type === 'error' ? '#fef2f2' : '#eff6ff',
                    color: toast.type === 'success' ? '#065f46' : toast.type === 'error' ? '#991b1b' : '#1e40af',
                    border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : toast.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
                }}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{toast.text}</span>
                </div>
            )}

            {/* 4-Stage Visual Pipeline Map */}
            <div style={s.pipelineGrid}>
                {stages.map((st) => {
                    const Icon = st.icon;
                    const active = activeStage === st.id;
                    return (
                        <button
                            key={st.id}
                            type="button"
                            onClick={() => setActiveStage(st.id)}
                            style={s.stageCard(active, st.accent)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.9rem',
                                    fontWeight: 800,
                                    color: active ? st.accent : '#0f172a',
                                }}>
                                    <Icon size={17} />
                                    {st.num}. {st.title}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
                                {st.summary}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* STAGE 1: STT & KEYWORDS */}
            {activeStage === 'stt' && (
                <div style={s.panel}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                                בחירת מנוע תמלול (STT) והגדרות מודל
                            </h3>
                            <div style={s.hint}>בחר בין Deepgram (מהירות יציבה + Nova-3/Nova-2) לבין ElevenLabs Scribe Realtime</div>
                        </div>
                        <button
                            type="button"
                            onClick={handleTestSTT}
                            disabled={testingStt}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '7px',
                                padding: '8px 16px',
                                borderRadius: '9px',
                                border: '1px solid #2563eb',
                                backgroundColor: '#eff6ff',
                                color: '#1d4ed8',
                                fontWeight: 700,
                                fontSize: '0.84rem',
                                cursor: 'pointer',
                            }}
                        >
                            {testingStt ? <Loader2 className="animate-spin" size={15} /> : <Play size={15} />}
                            {testingStt ? 'בודק חיבור WebSocket...' : 'בדוק חיבור STT בלייב'}
                        </button>
                    </div>

                    {sttTestResult && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            fontSize: '0.83rem',
                            backgroundColor: sttTestResult.ok ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${sttTestResult.ok ? '#bbf7d0' : '#fecaca'}`,
                            color: sttTestResult.ok ? '#166534' : '#991b1b',
                        }}>
                            {sttTestResult.ok
                                ? `✅ חיבור WebSocket תקין! ספק: ${sttTestResult.provider} · מודל: ${sttTestResult.model} · שיהוי לחיצת יד: ${sttTestResult.latency_ms}ms · תקן מונחים: ${sttTestResult.keyterm_mode} (${sttTestResult.keyterm_count} מונחים)`
                                : `❌ שגיאה: ${sttTestResult.error}`}
                        </div>
                    )}

                    {/* Provider Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                        {[
                            {
                                id: 'deepgram',
                                title: 'Deepgram STT',
                                sub: 'Nova-3 / Nova-2 · שליטה מלאה ב-Endpointing ו-Keywords',
                            },
                            {
                                id: 'scribe_realtime',
                                title: 'ElevenLabs Scribe Realtime',
                                sub: 'scribe_v3_live / scribe_v2_realtime · זיהוי עברית טבעי + VAD',
                            },
                        ].map((prov) => {
                            const spec = sttProviders.find((p) => p.id === prov.id);
                            const active = stt.provider === prov.id;
                            const hasKey = spec ? spec.has_key : true;
                            return (
                                <div
                                    key={prov.id}
                                    onClick={() => updateSection('stt', { provider: prov.id })}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                        backgroundColor: active ? '#eff6ff' : '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>{prov.title}</div>
                                        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '3px' }}>{prov.sub}</div>
                                    </div>
                                    <span style={{
                                        padding: '3px 9px',
                                        borderRadius: '999px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        backgroundColor: hasKey ? '#dcfce7' : '#fee2e2',
                                        color: hasKey ? '#166534' : '#991b1b',
                                    }}>
                                        {hasKey ? 'Key פעיל' : 'חסר Key'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Provider-specific Model & Timing Controls */}
                    {isDeepgram ? (
                        <div style={s.fieldGrid}>
                            <div style={s.fieldBox}>
                                <label style={s.label}>מודל Deepgram</label>
                                <select
                                    value={stt.deepgram_model}
                                    onChange={(e) => updateSection('stt', { deepgram_model: e.target.value })}
                                    style={s.input}
                                >
                                    {(currentProvSpec?.models || ['nova-3', 'nova-3-general', 'nova-2', 'nova-2-phonecall']).map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <div style={s.hint}>Nova-3 משתמש ב-keyterm; Nova-2 תומך ב-keywords עם :boost.</div>
                            </div>

                            <div style={s.fieldBox}>
                                <label style={s.label}>שפה (Language)</label>
                                <select
                                    value={stt.deepgram_language}
                                    onChange={(e) => updateSection('stt', { deepgram_language: e.target.value })}
                                    style={s.input}
                                >
                                    <option value="he">עברית (he)</option>
                                    <option value="en">אנגלית (en)</option>
                                    <option value="multi">רב-לשוני (multi)</option>
                                    <option value="ru">רוסית (ru)</option>
                                    <option value="ar">ערבית (ar)</option>
                                </select>
                                <div style={s.hint}>ברירת המחדל לשיחות בישראל היא he.</div>
                            </div>

                            {renderNumberField(
                                'Endpointing (ms)',
                                'כמה ms שקט לפני ש-Deepgram סוגר משפט (speech_final).',
                                stt.deepgram_endpointing_ms,
                                (v) => updateSection('stt', { deepgram_endpointing_ms: v }),
                                { min: 150, max: 2000, step: 50, unit: 'ms' }
                            )}

                            {renderNumberField(
                                'Utterance End (ms)',
                                'זמן המתנה מרבי לזיהוי סוף דיבור מוחלט.',
                                stt.deepgram_utterance_end_ms,
                                (v) => updateSection('stt', { deepgram_utterance_end_ms: v }),
                                { min: 500, max: 3000, step: 100, unit: 'ms' }
                            )}

                            {renderNumberField(
                                'הגבר שמע ל-STT (Audio Gain)',
                                'הגברת עוצמת המיקרופון לפני שליחה ל-Deepgram (1.0 = מקור).',
                                stt.audio_gain,
                                (v) => updateSection('stt', { audio_gain: v }),
                                { min: 0.5, max: 3.0, step: 0.1, unit: 'x' }
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {renderToggle(stt.deepgram_smart_format, (v) => updateSection('stt', { deepgram_smart_format: v }), 'Smart Format', 'פיסוק ועיצוב מספרים אוטומטי.')}
                                {renderToggle(stt.deepgram_vad_events, (v) => updateSection('stt', { deepgram_vad_events: v }), 'VAD Events', 'קבלת אירועי התחלת/סיום דיבור מ-Deepgram.')}
                            </div>
                        </div>
                    ) : (
                        <div style={s.fieldGrid}>
                            <div style={s.fieldBox}>
                                <label style={s.label}>מודל Scribe</label>
                                <select
                                    value={stt.scribe_model_id}
                                    onChange={(e) => updateSection('stt', { scribe_model_id: e.target.value })}
                                    style={s.input}
                                >
                                    {(currentProvSpec?.models || ['scribe_v3_live', 'scribe_v2_realtime']).map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                <div style={s.hint}>scribe_v3_live הוא המודל המהיר והעדכני ביותר של ElevenLabs.</div>
                            </div>

                            <div style={s.fieldBox}>
                                <label style={s.label}>שפה ופורמט שמע</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        value={stt.scribe_language}
                                        onChange={(e) => updateSection('stt', { scribe_language: e.target.value })}
                                        style={s.input}
                                    >
                                        <option value="he">עברית (he)</option>
                                        <option value="en">אנגלית (en)</option>
                                        <option value="ru">רוסית (ru)</option>
                                        <option value="ar">ערבית (ar)</option>
                                    </select>
                                    <select
                                        value={stt.scribe_audio_format}
                                        onChange={(e) => updateSection('stt', { scribe_audio_format: e.target.value })}
                                        style={s.input}
                                    >
                                        <option value="pcm_8000">pcm_8000 (טלפוניה נקי)</option>
                                        <option value="pcm_16000">pcm_16000</option>
                                    </select>
                                </div>
                            </div>

                            {renderNumberField(
                                'VAD Silence Threshold (שניות)',
                                'משך השקט לפני ש-Scribe מבצע commit למשפט.',
                                stt.scribe_vad_silence_secs,
                                (v) => updateSection('stt', { scribe_vad_silence_secs: v }),
                                { min: 0.2, max: 2.0, step: 0.05, unit: 's' }
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {renderToggle(stt.scribe_filter_background_audio, (v) => updateSection('stt', { scribe_filter_background_audio: v }), 'סינון רעשי רקע', 'מומלץ לכבות בקווי טלפון רועשים אם מילים שקטות נחתכות.')}
                                {renderToggle(stt.fallback_to_deepgram, (v) => updateSection('stt', { fallback_to_deepgram: v }), 'Fallback אוטומטי ל-Deepgram', 'אם Scribe מתנתק פעמיים, עוברים אוטומטית ל-Deepgram.')}
                            </div>
                        </div>
                    )}

                    {/* Keywords / Keyterms Studio */}
                    <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Tag size={18} color={stdBanner.color} />
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                    ניהול Keywords / Keyterms לפי תקן הספק
                                </h4>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    color: pct >= 90 ? '#dc2626' : '#334155',
                                    backgroundColor: '#f1f5f9',
                                    padding: '4px 10px',
                                    borderRadius: '999px',
                                }}>
                                    {keytermsList.length} / {maxKeyterms} מונחים
                                </span>
                                <div style={{ width: '90px', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${pct}%`,
                                        height: '100%',
                                        backgroundColor: pct >= 90 ? '#dc2626' : stdBanner.color,
                                        transition: 'width 0.2s',
                                    }} />
                                </div>
                            </div>
                        </div>

                        {/* Standard Explanation Banner */}
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: stdBanner.bg,
                            border: `1px solid ${stdBanner.border}`,
                            color: stdBanner.color,
                            fontSize: '0.81rem',
                        }}>
                            <strong>{stdBanner.title}:</strong> {stdBanner.text}
                        </div>

                        {/* Presets + Bulk Paste */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>סטים מוכנים:</span>
                            {Object.entries(keywordPresets).map(([key, p]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleApplyKeywordPreset(key)}
                                    style={{
                                        padding: '5px 11px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#fff',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        color: key === 'empty' ? '#dc2626' : '#1e293b',
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setShowBulkPaste((v) => !v)}
                                style={{
                                    padding: '5px 11px',
                                    borderRadius: '8px',
                                    border: '1px solid #93c5fd',
                                    backgroundColor: '#eff6ff',
                                    color: '#1d4ed8',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    marginRight: 'auto',
                                }}
                            >
                                + הדבקה מרוכזת (Bulk)
                            </button>
                        </div>

                        {showBulkPaste && (
                            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={s.hint}>הדבק מילים או ביטויים מופרדים בפסיקים או בשורות חדשות:</div>
                                <textarea
                                    rows={3}
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder="למשל: בוט טן, עומר, סוכן קולי, CRM"
                                    style={{ ...s.input, fontFamily: 'inherit' }}
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" onClick={handleApplyBulkPaste} style={{ ...s.btnPrimary, padding: '6px 14px', fontSize: '0.8rem' }}>
                                        הוסף לרשימה
                                    </button>
                                    <button type="button" onClick={() => setShowBulkPaste(false)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        סגור
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Add Single Keyword */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                                placeholder="הקלד מילת מפתח או שם (למשל: בשביל הזהב) ולחץ Enter..."
                                style={{ ...s.input, flex: 1, minWidth: '220px' }}
                            />
                            {supportsBoost && (
                                <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="10"
                                    value={newBoost}
                                    onChange={(e) => setNewBoost(e.target.value)}
                                    placeholder="Boost (למשל 2)"
                                    style={{ ...s.input, width: '130px', direction: 'ltr' }}
                                />
                            )}
                            <button
                                type="button"
                                onClick={handleAddKeyword}
                                style={{ ...s.btnPrimary, padding: '8px 16px' }}
                            >
                                <Plus size={16} />
                                הוסף
                            </button>
                        </div>

                        {/* Chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', padding: '10px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', minHeight: '52px' }}>
                            {keytermsList.length === 0 ? (
                                <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                                    אין מילות מפתח מוגדרות (מצב תמלול טבעי נקי).
                                </span>
                            ) : (
                                keytermsList.map((term) => (
                                    <span
                                        key={term}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 10px',
                                            borderRadius: '999px',
                                            backgroundColor: '#fff',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '0.81rem',
                                            fontWeight: 600,
                                            color: '#0f172a',
                                        }}
                                    >
                                        <span>{term}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveKeyword(term)}
                                            style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontWeight: 700, lineHeight: 1 }}
                                            title="הסר"
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))
                            )}
                        </div>

                        {/* Deepgram Replace Rules */}
                        {isDeepgram && (
                            <div style={{ marginTop: '6px', padding: '12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                <div style={{ ...s.label, marginBottom: '6px' }}>חוקי החלפה אוטומטית ב-Deepgram (Replace: שגוי ➔ תקין)</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                    <input
                                        type="text"
                                        value={replaceFrom}
                                        onChange={(e) => setReplaceFrom(e.target.value)}
                                        placeholder="מילה שגויה בתמלול"
                                        style={{ ...s.input, flex: 1, minWidth: '150px' }}
                                    />
                                    <ArrowLeft size={18} style={{ alignSelf: 'center', color: '#64748b' }} />
                                    <input
                                        type="text"
                                        value={replaceTo}
                                        onChange={(e) => setReplaceTo(e.target.value)}
                                        placeholder="תיקון רצוי"
                                        style={{ ...s.input, flex: 1, minWidth: '150px' }}
                                    />
                                    <button type="button" onClick={handleAddReplaceRule} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                                        הוסף חוק
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {(stt.replace_rules || []).map((r) => (
                                        <span key={r} style={{ padding: '3px 9px', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid #cbd5e1', fontSize: '0.78rem', display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                            <code>{r}</code>
                                            <button type="button" onClick={() => updateSection('stt', { replace_rules: stt.replace_rules.filter((x) => x !== r) })} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>×</button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STAGE 2: TURN TAKING & SPECULATION */}
            {activeStage === 'turn_taking' && (
                <div style={s.panel}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                            תזמון שיחה, השהיות וספקולציה (Turn-Taking)
                        </h3>
                        <div style={s.hint}>קובע כמה מהר הבוט מתחיל לחשוב ומתי הוא משחרר את התשובה ללקוח.</div>
                    </div>

                    {/* Speed Presets */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                        {speedPresets.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleApplySpeedPreset(preset)}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    border: '1px solid #ddd6fe',
                                    backgroundColor: '#faf5ff',
                                    textAlign: 'right',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ fontWeight: 800, color: '#6d28d9', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Zap size={15} />
                                    {preset.label}
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '4px' }}>{preset.description}</div>
                            </button>
                        ))}
                    </div>

                    <div style={s.fieldGrid}>
                        {renderToggle(config.turn_taking.speculative_turn, (v) => updateSection('turn_taking', { speculative_turn: v }), 'ספקולציית LLM (Speculative Turn)', 'מכין טיוטת תשובה ב-RAM כבר בהפסקה קצרה של הלקוח.')}
                        {renderToggle(config.turn_taking.speculative_tts, (v) => updateSection('turn_taking', { speculative_tts: v }), 'ספקולציית TTS מלאה', 'מכין גם אודיו מראש (מקצר שיהוי, עשוי לצרוך תווים אם הלקוח ממשיך).')}
                        {renderNumberField('שקט להתחלת ספקולציה', 'שניות שקט מה-partial האחרון לפני הכנת טיוטה.', config.turn_taking.speculative_silence_sec, (v) => updateSection('turn_taking', { speculative_silence_sec: v }), { min: 0.05, max: 1.5, step: 0.05, unit: 's' })}
                        {renderNumberField('שחרור מוקדם (משפט רגיל)', 'שניות שקט לשחרור תשובה מוכנה בלי לחכות ל-final.', config.turn_taking.early_release_silence_sec, (v) => updateSection('turn_taking', { early_release_silence_sec: v }), { min: 0.3, max: 2.5, step: 0.05, unit: 's' })}
                        {renderNumberField('שחרור מוקדם (שאלה)', 'כאשר הלקוח שאל שאלה של 3+ מילים.', config.turn_taking.early_release_question_sec, (v) => updateSection('turn_taking', { early_release_question_sec: v }), { min: 0.3, max: 2.0, step: 0.05, unit: 's' })}
                        {renderNumberField('שחרור מוקדם (תשובה קצרה)', 'משפט קצר ומלא (כן, מעולה, תודה).', config.turn_taking.early_release_short_sec, (v) => updateSection('turn_taking', { early_release_short_sec: v }), { min: 0.3, max: 2.0, step: 0.05, unit: 's' })}
                        {renderNumberField('Endpoint Fallback Silence', 'גיבוי אם ה-STT לא שלח commit בזמן.', config.turn_taking.endpoint_fallback_silence_sec, (v) => updateSection('turn_taking', { endpoint_fallback_silence_sec: v }), { min: 0.4, max: 3.0, step: 0.05, unit: 's' })}
                        {renderNumberField('תוספת המתנה למשפט לא גמור', 'כשמשפט מסתיים ב-"כי", "אבל", פסיק וכד׳.', config.turn_taking.incomplete_extra_wait_sec, (v) => updateSection('turn_taking', { incomplete_extra_wait_sec: v }), { min: 0.2, max: 3.0, step: 0.1, unit: 's' })}
                        {renderNumberField('תוספת המתנה להכתבת מספר', 'מחכה בין קבוצות ספרות של מספר טלפון.', config.turn_taking.number_extra_wait_sec, (v) => updateSection('turn_taking', { number_extra_wait_sec: v }), { min: 0.5, max: 4.0, step: 0.1, unit: 's' })}
                        {renderNumberField('Soft Commit Wait', 'המתנה לאחר is_final ללא speech_final.', config.turn_taking.soft_commit_wait_sec, (v) => updateSection('turn_taking', { soft_commit_wait_sec: v }), { min: 0.1, max: 2.0, step: 0.05, unit: 's' })}
                    </div>
                </div>
            )}

            {/* STAGE 3: BARGE-IN & VAD */}
            {activeStage === 'barge_in' && (
                <div style={s.panel}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                            שליטה בקטיעה (Barge-In) ורגישות שמע (VAD)
                        </h3>
                        <div style={s.hint}>כוונון עדין מתי הלקוח יכול לקטוע את הבוט ומה סף עוצמת הקול לזיהוי דיבור.</div>
                    </div>

                    <div style={s.fieldGrid}>
                        {renderToggle(config.barge_in.enabled, (v) => updateSection('barge_in', { enabled: v }), 'אפשר קטיעה (Barge-In)', 'האם הלקוח יכול לעצור את הבוט באמצע משפט.')}
                        {renderToggle(config.barge_in.disable_first_message_interruptions, (v) => updateSection('barge_in', { disable_first_message_interruptions: v }), 'נעל קטיעה במשפט פתיחה', 'מונע קטיעה של ברכת הפתיחה בגלל רעש קו ראשוני.')}
                        {renderNumberField('הגנת מילים ראשונות (Protect Words)', 'מספר מילים מוגנות בתחילת משפט (-1 = חסום כל התשובה).', config.barge_in.protect_words, (v) => updateSection('barge_in', { protect_words: v }), { min: -1, max: 20, step: 1 })}
                        {renderNumberField('מינימום מילים לקטיעה', 'כמה מילים הלקוח צריך לומר כדי לקטוע את הבוט.', config.barge_in.min_words, (v) => updateSection('barge_in', { min_words: v }), { min: 1, max: 6, step: 1 })}
                        {renderNumberField('מגן הד (Echo Shield)', 'זמן חסימה בתחילת דיבור למניעת קטיעה מהד של הבוט.', config.barge_in.echo_shield_sec, (v) => updateSection('barge_in', { echo_shield_sec: v }), { min: 0.0, max: 2.5, step: 0.1, unit: 's' })}
                        {renderNumberField('VAD Frames לקטיעה', 'מספר פריימים רצופים של קול (20ms כל אחד) לקטיעה.', config.barge_in.vad_frames, (v) => updateSection('barge_in', { vad_frames: v }), { min: 5, max: 60, step: 1 })}
                        {renderNumberField('סף עוצמת קול (VOICE_RMS)', 'רגישות מיקרופון לזיהוי דיבור (נמוך = רגיש יותר).', config.barge_in.voice_rms, (v) => updateSection('barge_in', { voice_rms: v }), { min: 80, max: 1000, step: 15 })}
                        {renderNumberField('סף רצף דיבור (RUN_RMS)', 'עוצמת שמע לזיהוי דיבור רציף בזמן השמעת בוט.', config.barge_in.run_rms, (v) => updateSection('barge_in', { run_rms: v }), { min: 100, max: 1200, step: 15 })}
                        {renderNumberField('דיליי למשפט פתיחה', 'השהייה בשניות לפני שהבוט אומר הלו בתחילת שיחה.', config.barge_in.greeting_delay_sec, (v) => updateSection('barge_in', { greeting_delay_sec: v }), { min: 0, max: 5, step: 0.1, unit: 's' })}
                    </div>
                </div>
            )}

            {/* STAGE 4: LLM / TTS PIPELINE & LIMITS */}
            {activeStage === 'llm_tts' && (
                <div style={s.panel}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                        <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>מנוע LLM פעיל כעת</div>
                                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                    {activeLlm ? `${activeLlm.provider} / ${activeLlm.model}` : 'ברירת מחדל'}
                                </div>
                            </div>
                            {onNavigateTab && (
                                <button type="button" onClick={() => onNavigateTab('llm')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                                    החלף מודל LLM
                                </button>
                            )}
                        </div>
                        <div style={{ padding: '1rem', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>מנוע TTS פעיל כעת</div>
                                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                    {activeTts ? `${activeTts.provider} / ${activeTts.model}` : 'ברירת מחדל'}
                                </div>
                            </div>
                            {onNavigateTab && (
                                <button type="button" onClick={() => onNavigateTab('tts')} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                                    החלף מנוע קול
                                </button>
                            )}
                        </div>
                    </div>

                    <h4 style={{ margin: '0.25rem 0 0', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={16} color="#4f46e5" /> פרמטרי זרימת LLM
                    </h4>
                    <div style={s.fieldGrid}>
                        {renderNumberField('Temperature', 'יצירתיות המודל (0.0 = מדויק ועקבי).', config.llm_pipeline.temperature, (v) => updateSection('llm_pipeline', { temperature: v }), { min: 0, max: 1.5, step: 0.05 })}
                        {renderNumberField('Max Tokens לתשובה', 'מגבלת אורך תגובה בודדת.', config.llm_pipeline.max_tokens, (v) => updateSection('llm_pipeline', { max_tokens: v }), { min: 50, max: 1000, step: 10 })}
                        {renderNumberField('היסטוריית שיחה (Turns)', 'כמה הודעות אחרונות נשלחות ל-LLM.', config.llm_pipeline.history_items, (v) => updateSection('llm_pipeline', { history_items: v }), { min: 6, max: 150, step: 2 })}
                        {renderNumberField('Hedge Timeout (שניות)', 'מתי לפתוח בקשת גיבוי מקבילה אם ה-LLM איטי.', config.llm_pipeline.hedge_after, (v) => updateSection('llm_pipeline', { hedge_after: v }), { min: 0, max: 6, step: 0.2, unit: 's' })}
                        {renderNumberField('First Token Timeout', 'זמן מרבי לטוקן ראשון לפני מעבר ל-fallback.', config.llm_pipeline.first_token_timeout, (v) => updateSection('llm_pipeline', { first_token_timeout: v }), { min: 1.5, max: 12, step: 0.5, unit: 's' })}
                        {renderToggle(config.llm_pipeline.race, (v) => updateSection('llm_pipeline', { race: v }), 'מצב Race (ראשי מול גיבוי)', 'מריץ את המודל הראשי והגיבוי יחד ולוקח את המהיר מביניהם.')}
                    </div>

                    <h4 style={{ margin: '0.25rem 0 0', fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Volume2 size={16} color="#059669" /> הזרמת TTS וגבולות שיחה
                    </h4>
                    <div style={s.fieldGrid}>
                        {renderNumberField('TTS Prebuffer (ms)', 'חציצה ראשונית לפני התחלת ניגון.', config.tts_pipeline.prebuffer_ms, (v) => updateSection('tts_pipeline', { prebuffer_ms: v }), { min: 0, max: 250, step: 10, unit: 'ms' })}
                        {renderNumberField('Playout Lead (שניות)', 'כמה שניות קדימה מזרימים ל-Telnyx נגד jitter.', config.tts_pipeline.playout_lead_sec, (v) => updateSection('tts_pipeline', { playout_lead_sec: v }), { min: 0.2, max: 1.5, step: 0.05, unit: 's' })}
                        {renderNumberField('מיזוג משפטים (Merge Rest)', 'איחוד המשך המשפט לבקשת TTS אחת לאינטונציה טבעית.', config.tts_pipeline.merge_rest_sec, (v) => updateSection('tts_pipeline', { merge_rest_sec: v }), { min: 0, max: 1.5, step: 0.05, unit: 's' })}
                        {renderToggle(config.tts_pipeline.elevenlabs_previous_text, (v) => updateSection('tts_pipeline', { elevenlabs_previous_text: v }), 'ElevenLabs Previous Text', 'שולח את הטקסט הקודם לשמירת רצף אינטונציה.')}
                        {renderNumberField('ניתוק בשתיקה (שניות)', 'כמה שניות של דממה מוחלטת לפני שהבוט מנתק.', config.limits.silence_end_call_timeout_sec, (v) => updateSection('limits', { silence_end_call_timeout_sec: v }), { min: 8, max: 60, step: 1, unit: 's' })}
                        {renderNumberField('אורך שיחה מקסימלי (שניות)', 'תקרת זמן לשיחה בודדת.', config.limits.max_call_sec, (v) => updateSection('limits', { max_call_sec: v }), { min: 60, max: 1800, step: 30, unit: 's' })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PipelineManager;
