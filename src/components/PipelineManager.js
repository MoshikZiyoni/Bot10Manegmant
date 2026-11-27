import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Sliders,
    Mic,
    Clock,
    Cpu,
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
    HelpCircle,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    Tag,
    Zap,
    MessageSquareOff,
    ArrowLeft,
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
        scribe_vad_silence_secs: 0.4,
        scribe_audio_format: 'pcm_8000',
        scribe_filter_background_audio: false,
        fallback_to_deepgram: true,
        audio_gain: 1.35,
        keyterms: [],
        replace_rules: [],
    },
    turn_taking: {
        speculative_turn: true,
        speculative_tts: false,
        speculative_silence_sec: 0.35,
        early_release_silence_sec: 0.95,
        early_release_question_sec: 0.75,
        early_release_short_sec: 0.70,
        endpoint_fallback_silence_sec: 0.90,
        incomplete_extra_wait_sec: 0.80,
        number_extra_wait_sec: 3.0,
        soft_commit_wait_sec: 0.45,
    },
    barge_in: {
        enabled: true,
        protect_words: 2,
        protect_sec: 2.5,
        min_words: 4,
        vad_frames: 25,
        echo_shield_sec: 0.6,
        disable_first_message_interruptions: true,
        voice_rms: 225,
        run_rms: 325,
        greeting_delay_sec: 1.0,
        ignore_phrases: [],
    },
    llm_pipeline: {
        temperature: 0.4,
        max_tokens: 160,
        history_items: 100,
        hedge_after: 0.55,
        race: false,
        first_token_timeout: 4.5,
        stall_timeout: 3.0,
    },
    tts_pipeline: {
        prebuffer_ms: 40,
        playout_lead_sec: 0.5,
        first_comma_words: 3,
        merge_rest_sec: 0.45,
        elevenlabs_previous_text: true,
    },
    limits: {
        silence_end_call_timeout_sec: 20.0,
        max_call_sec: 600.0,
        skip_turn_checkin_sec: 9.0,
    },
};

const FIELD_HELP = {
    deepgram_endpointing_ms: {
        what: 'כמה מילישניות של שקט Deepgram מחכה לפני שהוא מחליט שהלקוח סיים משפט.',
        up: 'מחכה יותר לפני שחרור משפט — פחות קטיעות, אבל תגובה מעט איטית יותר.',
        down: 'תגובה מהירה יותר, אבל עלול לשבור משפט אם הלקוח עוצר לקחת אוויר.',
    },
    deepgram_utterance_end_ms: {
        what: 'זמן שקט מרבי (במילישניות) ש-Deepgram מחכה במקרה של רעש רקע כדי לסגור דיבור.',
        up: 'סבלני יותר ברעשי רקע.',
        down: 'סוגר את הדיבור מהר יותר.',
    },
    audio_gain: {
        what: 'הגברה דיגיטלית של קול הלקוח לפני שליחה לתמלול (1.0 = עוצמה מקורית).',
        up: 'עוזר כשהלקוח נשמע חלש, אבל גבוה מדי עלול להגביר רעשי קו ולעוות מילים.',
        down: 'פחות עיוותים בקו חזק, אבל לקוחות שקטים עלולים להישמע חלש.',
    },
    scribe_vad_silence_secs: {
        what: 'משך השקט בשניות לפני ש-ElevenLabs Scribe סוגר משפט.',
        up: 'פחות קטיעות באמצע מחשבה, תגובה איטית יותר.',
        down: 'תגובה זריזה יותר.',
    },
    greeting_delay_sec: {
        what: 'השהייה בשניות מרגע שהשיחה נפתחת ועד שהבוט אומר את משפט הפתיחה ("היי...").',
        up: 'נותן לקו להתייצב וללקוח לומר "הלו" ראשון לפני שהבוט מתחיל.',
        down: 'הבוט מדבר מיד עם המענה (אם 0 — עלול להיבלע חצי משפט בתחילת שיחה).',
    },
    protect_sec: {
        what: 'כמה שניות מתחילת כל תשובה של הבוט אסור ללקוח לקטוע אותו (חסימת קטיעה).',
        up: 'הבוט יסיים יותר מהמשפט בלי להיעצר מהדים או מרעשי רקע.',
        down: 'הלקוח יכול לעצור את הבוט מוקדם יותר באמצע הדיבור.',
    },
    min_words: {
        what: 'כמה מילים משמעותיות הלקוח חייב לומר כדי שהבוט יעצור (Barge-In).',
        up: 'חוסם קטיעות מקריות ממילים בודדות או רעש — צריך משפט של ממש כדי לעצור.',
        down: 'עצירה מיידית כבר במילה-שתיים של הלקוח.',
    },
    voice_rms: {
        what: 'סף עוצמת השמע המינימלי בקו שממנו המערכת מזהה שהלקוח מדבר (בזמן האזנה).',
        up: 'הבוט פחות רגיש לרעשי רקע/נשימות, אבל לקוח שמדבר חלש עלול לא להיקלט.',
        down: 'רגיש מאוד לכל לחישה, אבל רעש רחוב או רוח עלולים להיראות כדיבור.',
    },
    run_rms: {
        what: 'סף עוצמת השמע בזמן שהבוט עצמו מדבר — מונע מההד של הבוט לקטוע את עצמו.',
        up: 'הגנה חזקה יותר נגד הד (Echo), דורש קול ברור יותר מהלקוח כדי לקטוע.',
        down: 'קל יותר לקטוע את הבוט, אבל הד בקו עלול לגרום לעצירות שווא.',
    },
    vad_frames: {
        what: 'כמה פריימים רצופים של דיבור (כל פריים = 20ms) נדרשים כדי להפעיל קטיעה.',
        up: 'מונע קטיעה מצפצופים קצרים או שיעול.',
        down: 'תגובת עצירה מהירה יותר.',
    },
    echo_shield_sec: {
        what: 'מגן הד קשיח בתחילת השמעה, למניעת זיהוי עצמי של קול הבוט כקטיעה.',
        up: 'מונע קטיעות שווא בקווים עם הד.',
        down: 'מאפשר קטיעה מהירה יותר בתחילת המשפט.',
    },
    protect_words: {
        what: 'גיבוי לפי מספר מילים מוגנות כשאין דריסת שניות מפורשת (-1 = חסום כל התשובה).',
        up: 'מגן על יותר מילים בתחילת התשובה.',
        down: 'פחות הגנה.',
    },
    early_release_silence_sec: {
        what: 'כמה שניות שקט לאחר משפט רגיל לפני שהבוט משחרר את התשובה המוכנה.',
        up: 'פחות סיכוי לקטוע לקוח שעוצר לחשוב, שיחה איטית יותר.',
        down: 'תגובה מהירה מאוד, סיכון לקטוע לקוח באמצע מחשבה.',
    },
    early_release_question_sec: {
        what: 'כמה שניות שקט כשהלקוח שאל שאלה (3+ מילים).',
        up: 'מחכה יותר גם אחרי שאלה.',
        down: 'עונה מהר יותר לשאלות.',
    },
    early_release_short_sec: {
        what: 'כמה שניות שקט אחרי תשובה קצרה וברורה ("כן", "מעולה").',
        up: 'איטי יותר.',
        down: 'ממשיך מהר יותר.',
    },
    number_extra_wait_sec: {
        what: 'זמן המתנה נוסף כשהלקוח מכתיב ספרות של מספר טלפון (שלא יקטע באמצע המספר).',
        up: 'נותן ללקוח הרבה זמן להכתיב מספר בחלקים.',
        down: 'קצר יותר — עלול לענות לפני שהלקוח סיים את כל הספרות.',
    },
    speculative_silence_sec: {
        what: 'אחרי כמה שניות שקט המודל מתחיל להכין תשובה ברקע (עוד לפני השחרור).',
        up: 'פחות קריאות LLM מיותרות שנזרקות לפח.',
        down: 'תשובה מוכנה מוקדם יותר, יותר קריאות ספקולטיביות.',
    },
    temperature: {
        what: 'רמת היצירתיות והגיוון של ה-LLM (0 = צמוד לחוקים, 1 = יצירתי יותר).',
        up: 'ניסוחים מגוונים יותר, סיכון קטן לסטייה מהוראות.',
        down: 'תשובות עקביות ומדויקות יותר.',
    },
    hedge_after: {
        what: 'אחרי כמה שניות המערכת שולחת בקשת גיבוי מקבילה אם ה-LLM עוד לא ענה.',
        up: 'פחות בקשות כפולות, שיהוי ארוך יותר במקרה של תקיעה.',
        down: 'מבטיח תגובה מהירה גם אם שרת אחד איטי.',
    },
    silence_end_call_timeout_sec: {
        what: 'אחרי כמה שניות של דממה מוחלטת משני הצדדים הבוט מנתק את השיחה.',
        up: 'מחכה יותר לפני ניתוק.',
        down: 'מנתק מהר יותר כשהשיחה ננטשת.',
    },
    max_call_sec: {
        what: 'אורך שיחה מקסימלי בשניות כהגנה משיחות תקועות.',
        up: 'מאפשר שיחות ארוכות יותר.',
        down: 'קוטע שיחה מוקדם יותר.',
    },
};

const InfoTip = ({ helpKey, defaultVal }) => {
    const [open, setOpen] = useState(false);
    const info = FIELD_HELP[helpKey];
    if (!info) return null;
    return (
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                onBlur={() => setTimeout(() => setOpen(false), 180)}
                style={{
                    border: 'none',
                    background: open ? '#e4e4e7' : 'transparent',
                    color: '#71717a',
                    borderRadius: '999px',
                    width: '20px',
                    height: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                }}
                title="הסבר"
            >
                <HelpCircle size={14} />
            </button>
            {open && (
                <div
                    style={{
                        position: 'absolute',
                        top: '26px',
                        right: 0,
                        zIndex: 50,
                        width: '280px',
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: '#18181b',
                        color: '#fafafa',
                        fontSize: '0.77rem',
                        lineHeight: 1.5,
                        boxShadow: '0 12px 30px rgba(0,0,0,0.28)',
                        textAlign: 'right',
                    }}
                >
                    <div style={{ fontWeight: 700, marginBottom: '6px', color: '#fff' }}>{info.what}</div>
                    {info.up && <div style={{ color: '#a7f3d0', marginBottom: '3px' }}>⬆️ <strong>העלאה:</strong> {info.up}</div>}
                    {info.down && <div style={{ color: '#fde68a', marginBottom: '4px' }}>⬇️ <strong>הורדה:</strong> {info.down}</div>}
                    {defaultVal !== undefined && (
                        <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #3f3f46', color: '#d4d4d8', fontSize: '0.73rem' }}>
                            ברירת מחדל (.env/DB): <strong style={{ direction: 'ltr', display: 'inline-block' }}>{String(defaultVal)}</strong>
                        </div>
                    )}
                </div>
            )}
        </span>
    );
};

const PipelineManager = ({ onNavigateTab }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingStt, setTestingStt] = useState(false);
    const [activeStage, setActiveStage] = useState('stt'); // 'stt' | 'barge_in' | 'turn_taking' | 'llm_tts'
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [profileId, setProfileId] = useState('global');
    const [profiles, setProfiles] = useState([]);
    const [source, setSource] = useState('env');
    const [sttProviders, setSttProviders] = useState([]);
    const [speedPresets, setSpeedPresets] = useState([]);
    const [keywordPresets, setKeywordPresets] = useState({});
    const [ignorePresets, setIgnorePresets] = useState({});
    const [activeLlm, setActiveLlm] = useState(null);
    const [activeTts, setActiveTts] = useState(null);

    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [envDefaults, setEnvDefaults] = useState(DEFAULT_CONFIG);
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

    // Ignore Phrases state
    const [newIgnorePhrase, setNewIgnorePhrase] = useState('');
    const [showIgnoreBulk, setShowIgnoreBulk] = useState(false);
    const [ignoreBulkText, setIgnoreBulkText] = useState('');

    // New Bot Profile inline
    const [showNewProfile, setShowNewProfile] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const importInputRef = useRef(null);

    const showMessage = (type, text) => {
        setToast({ type, text });
    };

    const mergeWithDefault = (incoming) => ({
        stt: { ...DEFAULT_CONFIG.stt, ...(incoming?.stt || {}) },
        turn_taking: { ...DEFAULT_CONFIG.turn_taking, ...(incoming?.turn_taking || {}) },
        barge_in: { ...DEFAULT_CONFIG.barge_in, ...(incoming?.barge_in || {}) },
        llm_pipeline: { ...DEFAULT_CONFIG.llm_pipeline, ...(incoming?.llm_pipeline || {}) },
        tts_pipeline: { ...DEFAULT_CONFIG.tts_pipeline, ...(incoming?.tts_pipeline || {}) },
        limits: { ...DEFAULT_CONFIG.limits, ...(incoming?.limits || {}) },
    });

    const loadProfile = useCallback(async (targetProfile = 'global') => {
        setLoading(true);
        setSttTestResult(null);
        setShowAdvanced(false);
        try {
            const data = await callsApi.getPipelineSetting(targetProfile);
            setProfileId(data.profile || targetProfile);
            setSource(data.source || 'env');
            setProfiles(data.profiles || []);
            setSttProviders(data.stt_providers || []);
            setSpeedPresets(data.speed_presets || []);
            setKeywordPresets(data.keyword_presets || {});
            setIgnorePresets(data.ignore_phrase_presets || {});
            setActiveLlm(data.active_llm || null);
            setActiveTts(data.active_tts || null);
            setEnvDefaults(mergeWithDefault(data.env_defaults || data.config));
            setConfig(mergeWithDefault(data.config));
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

    // Keywords handlers
    const handleAddKeyword = () => {
        const raw = newKeyword.trim();
        if (!raw) return;
        let entry = raw;
        if (supportsBoost && newBoost.trim()) {
            entry = `${raw.split(':')[0].trim()}:${newBoost.trim()}`;
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
            showMessage('error', `הגעת למגבלה של ${maxKeyterms} מילות מפתח למודל זה.`);
            return;
        }
        updateSection('stt', { keyterms: [...current, entry] });
        setNewKeyword('');
        setNewBoost('');
    };

    const handleApplyBulkPaste = () => {
        const items = bulkText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
        if (!items.length) return setShowBulkPaste(false);
        const existing = new Set(stt.keyterms || []);
        const next = [...(stt.keyterms || [])];
        for (const item of items) {
            let norm = item;
            if (!supportsBoost && item.includes(':')) {
                const idx = item.lastIndexOf(':');
                if (!Number.isNaN(Number(item.slice(idx + 1)))) norm = item.slice(0, idx).trim();
            }
            if (norm && !existing.has(norm) && next.length < maxKeyterms) {
                existing.add(norm);
                next.push(norm);
            }
        }
        updateSection('stt', { keyterms: next });
        setBulkText('');
        setShowBulkPaste(false);
    };

    // Ignore phrases handlers
    const ignoreList = config.barge_in.ignore_phrases || [];
    const handleAddIgnorePhrase = () => {
        const raw = newIgnorePhrase.trim();
        if (!raw) return;
        if (ignoreList.includes(raw)) {
            setNewIgnorePhrase('');
            return;
        }
        updateSection('barge_in', { ignore_phrases: [...ignoreList, raw] });
        setNewIgnorePhrase('');
    };

    const handleApplyIgnoreBulk = () => {
        const items = ignoreBulkText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
        if (!items.length) return setShowIgnoreBulk(false);
        const merged = Array.from(new Set([...ignoreList, ...items]));
        updateSection('barge_in', { ignore_phrases: merged });
        setIgnoreBulkText('');
        setShowIgnoreBulk(false);
    };

    const handleAddReplaceRule = () => {
        const f = replaceFrom.trim();
        const t = replaceTo.trim();
        if (!f || !t) return;
        const rule = `${f}:${t}`;
        if (!(stt.replace_rules || []).includes(rule)) {
            updateSection('stt', { replace_rules: [...(stt.replace_rules || []), rule] });
        }
        setReplaceFrom('');
        setReplaceTo('');
    };

    const handleApplySpeedPreset = (preset) => {
        updateSection('turn_taking', preset.turn_taking || {});
        if (preset.stt_patch) updateSection('stt', preset.stt_patch);
        showMessage('info', `הוחל פרופיל מהירות: ${preset.label}`);
    };

    const handleTestSTT = async () => {
        setTestingStt(true);
        setSttTestResult(null);
        try {
            const res = await callsApi.testSTTSetting({ stt: config.stt });
            setSttTestResult(res);
            showMessage('success', `✅ חיבור ${res.provider} (${res.model}) אומת בלייב תוך ${res.latency_ms}ms.`);
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
                if (res.env_defaults) setEnvDefaults(mergeWithDefault(res.env_defaults));
                if (res.config) setConfig(mergeWithDefault(res.config));
                setDirty(false);
                showMessage('success', `✅ נשמר והופעל עבור "${currentProf?.label || profileId}" לשיחה הבאה.`);
            }
        } catch (err) {
            showMessage('error', `❌ שמירה נכשלה: ${err?.response?.data?.error || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm('לאפס את הפרופיל הנוכחי לברירת המחדל הפעילה (.env / DB)?')) return;
        setSaving(true);
        try {
            const res = await callsApi.updatePipelineSetting({ profile: profileId, reset: true });
            if (res.success) {
                setSource('env');
                setProfiles(res.profiles || profiles);
                if (res.env_defaults) setEnvDefaults(mergeWithDefault(res.env_defaults));
                if (res.config) setConfig(mergeWithDefault(res.config));
                setDirty(false);
                showMessage('success', 'אופס לברירת המחדל הפעילה (.env / DB).');
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
        const slug = cleanLabel.toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/^_+|_+$/g, '') || `bot_${Date.now().toString(36)}`;
        setSaving(true);
        try {
            const res = await callsApi.updatePipelineSetting({ profile: slug, profile_label: cleanLabel, config });
            if (res.success) {
                setProfiles(res.profiles || []);
                setProfileId(slug);
                setSource('redis');
                setDirty(false);
                setNewProfileName('');
                setShowNewProfile(false);
                showMessage('success', `✅ נוצר פרופיל בוט חדש: "${cleanLabel}"`);
            }
        } catch {
            showMessage('error', 'שגיאה ביצירת פרופיל חדש.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!window.confirm(`למחוק את הפרופיל "${profileId}"?`)) return;
        try {
            const res = await callsApi.updatePipelineSetting({ profile: profileId, delete_profile: true });
            if (res.success) {
                setProfiles(res.profiles || []);
                loadProfile('global');
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
                    showMessage('error', 'קובץ JSON לא תקין.');
                    return;
                }
                setConfig(mergeWithDefault(importedCfg));
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
            <div style={{ padding: '4rem', textAlign: 'center', color: '#71717a' }}>
                <Loader2 className="animate-spin" size={26} style={{ margin: '0 auto 10px' }} />
                טוען את הגדרות ה-Pipeline...
            </div>
        );
    }

    const activeProfileMeta = profiles.find((p) => p.id === profileId);
    const keytermsList = stt.keyterms || [];
    const pct = Math.min(100, Math.round((keytermsList.length / maxKeyterms) * 100));

    // ElevenLabs clean design tokens
    const el = {
        page: {
            direction: 'rtl',
            backgroundColor: '#fafafa',
            borderRadius: '14px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            color: '#09090b',
        },
        headerCard: {
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '14px',
            padding: '1.25rem 1.4rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        },
        card: {
            backgroundColor: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '14px',
            padding: '1.35rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        },
        fieldCard: (modified) => ({
            backgroundColor: modified ? '#fefce8' : '#fafafa',
            border: modified ? '1px solid #fde047' : '1px solid #e4e4e7',
            borderRadius: '11px',
            padding: '0.9rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '7px',
        }),
        btnPrimary: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            padding: '9px 18px',
            borderRadius: '9px',
            border: 'none',
            backgroundColor: '#111827',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
        },
        btnSecondary: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 13px',
            borderRadius: '9px',
            border: '1px solid #e4e4e7',
            backgroundColor: '#ffffff',
            color: '#18181b',
            fontWeight: 600,
            fontSize: '0.82rem',
            cursor: 'pointer',
        },
        pill: (active) => ({
            padding: '6px 13px',
            borderRadius: '999px',
            border: active ? '1px solid #18181b' : '1px solid #e4e4e7',
            backgroundColor: active ? '#18181b' : '#ffffff',
            color: active ? '#ffffff' : '#52525b',
            fontWeight: active ? 600 : 500,
            fontSize: '0.81rem',
            cursor: 'pointer',
        }),
        tabBtn: (active) => ({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 15px',
            borderRadius: '10px',
            border: active ? '1px solid #18181b' : '1px solid transparent',
            backgroundColor: active ? '#ffffff' : 'transparent',
            color: active ? '#09090b' : '#71717a',
            fontWeight: active ? 700 : 500,
            fontSize: '0.85rem',
            cursor: 'pointer',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
        }),
        input: {
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #d4d4d8',
            backgroundColor: '#ffffff',
            fontSize: '0.86rem',
            color: '#09090b',
            boxSizing: 'border-box',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.9rem',
        },
    };

    const renderNumberControl = (section, key, label, hint, { min = 0, max = 100, step = 0.1, unit = '' } = {}) => {
        const val = config[section]?.[key];
        const defVal = envDefaults[section]?.[key];
        const isModified = defVal !== undefined && Math.abs(Number(val) - Number(defVal)) > 0.0001;
        return (
            <div style={el.fieldCard(isModified)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#18181b' }}>{label}</span>
                        <InfoTip helpKey={key} defaultVal={`${defVal}${unit}`} />
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#09090b', direction: 'ltr', backgroundColor: '#fff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e4e4e7' }}>
                        {val}{unit}
                    </span>
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={Number(val ?? min)}
                    onChange={(e) => updateSection(section, { [key]: step >= 1 ? parseInt(e.target.value, 10) : parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#18181b' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={val ?? min}
                        onChange={(e) => {
                            const v = step >= 1 ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
                            if (!Number.isNaN(v)) updateSection(section, { [key]: v });
                        }}
                        style={{ ...el.input, width: '92px', padding: '4px 8px', fontSize: '0.8rem', direction: 'ltr' }}
                    />
                    <span style={{ fontSize: '0.73rem', color: isModified ? '#b45309' : '#71717a', fontWeight: isModified ? 600 : 400 }}>
                        {isModified ? `שונה (ברירת מחדל: ${defVal}${unit})` : `ברירת מחדל: ${defVal}${unit}`}
                    </span>
                </div>
                {hint && <div style={{ fontSize: '0.74rem', color: '#71717a', lineHeight: 1.4 }}>{hint}</div>}
            </div>
        );
    };

    const renderToggleControl = (section, key, label, hint) => {
        const checked = !!config[section]?.[key];
        const defVal = !!envDefaults[section]?.[key];
        const isModified = checked !== defVal;
        return (
            <label style={{ ...el.fieldCard(isModified), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ paddingLeft: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#18181b' }}>{label}</span>
                        {isModified && <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 600 }}>(שונה)</span>}
                    </div>
                    {hint && <div style={{ fontSize: '0.74rem', color: '#71717a', marginTop: '2px' }}>{hint}</div>}
                </div>
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => updateSection(section, { [key]: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: '#18181b', cursor: 'pointer', flexShrink: 0 }}
                />
            </label>
        );
    };

    const renderAdvancedAccordion = (children) => (
        <div style={{ border: '1px solid #e4e4e7', borderRadius: '12px', backgroundColor: '#fafafa', overflow: 'hidden' }}>
            <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                style={{
                    width: '100%',
                    padding: '11px 15px',
                    border: 'none',
                    backgroundColor: showAdvanced ? '#f4f4f5' : '#fafafa',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    textAlign: 'right',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} color="#d97706" />
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#27272a' }}>
                        הגדרות מתקדמות (מומלץ לא לגעת אלא אם צריך כוונון עדין)
                    </span>
                </div>
                {showAdvanced ? <ChevronUp size={18} color="#52525b" /> : <ChevronDown size={18} color="#52525b" />}
            </button>
            {showAdvanced && (
                <div style={{ padding: '1rem', borderTop: '1px solid #e4e4e7', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.78rem' }}>
                        שים לב: הפרמטרים כאן מכוונים כבר לפי ה-<code>.env</code> של השרת. רחף או לחץ על סימן ה-<strong>?</strong> ליד כל שדה כדי להבין מה שינוי יעשה.
                    </div>
                    {children}
                </div>
            )}
        </div>
    );

    return (
        <div style={el.page}>
            {/* Header + Bot Profile Selector */}
            <div style={el.headerCard}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <Sliders size={20} color="#18181b" />
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                                הגדרות Pipeline ותמלול (Agent Controls)
                            </h2>
                            <span style={{
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                backgroundColor: source === 'redis' ? '#ecfdf5' : '#f4f4f5',
                                color: source === 'redis' ? '#047857' : '#52525b',
                                border: `1px solid ${source === 'redis' ? '#a7f3d0' : '#e4e4e7'}`,
                            }}>
                                {source === 'redis' ? '● פעיל מ-Redis' : source === 'global_inherited' ? 'ירושה מ-Global' : '● ברירת מחדל (.env / DB)'}
                            </span>
                            {dirty && (
                                <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.74rem', fontWeight: 600, backgroundColor: '#fef3c7', color: '#b45309' }}>
                                    ● שינויים לא שמורים
                                </span>
                            )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#71717a', marginTop: '4px' }}>
                            כל הערכים ההתחלתיים נמשכים אוטומטית מה-<code>.env</code> ומה-DB הפעיל. לחץ על <strong>?</strong> ליד כל הגדרה להסבר ברור.
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="button" onClick={handleExportJson} style={el.btnSecondary} title="ייצוא לבוט אחר">
                            <Download size={14} /> ייצוא
                        </button>
                        <button type="button" onClick={() => importInputRef.current?.click()} style={el.btnSecondary} title="ייבוא מקובץ">
                            <Upload size={14} /> ייבוא
                        </button>
                        <input ref={importInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportJson} />
                        <button type="button" onClick={handleReset} disabled={saving} style={el.btnSecondary}>
                            <RotateCcw size={14} /> איפוס ל-.env
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving} style={el.btnPrimary}>
                            {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                            {saving ? 'שומר...' : 'שמור והפעל'}
                        </button>
                    </div>
                </div>

                {/* Bot Profile Bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', paddingTop: '0.85rem', borderTop: '1px solid #f4f4f5' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#71717a' }}>בוט פעיל:</span>
                    {profiles.map((p) => (
                        <button key={p.id} type="button" onClick={() => loadProfile(p.id)} style={el.pill(profileId === p.id)}>
                            {p.label} {p.has_override ? '✓' : ''}
                        </button>
                    ))}
                    {!showNewProfile ? (
                        <button type="button" onClick={() => setShowNewProfile(true)} style={{ ...el.pill(false), borderStyle: 'dashed' }}>
                            <Plus size={13} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                            בוט חדש
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                                type="text"
                                placeholder="שם הבוט..."
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                style={{ ...el.input, width: '160px', padding: '5px 9px', fontSize: '0.8rem' }}
                            />
                            <button type="button" onClick={handleCreateProfile} style={{ ...el.btnPrimary, padding: '6px 12px', fontSize: '0.78rem' }}>צור</button>
                            <button type="button" onClick={() => setShowNewProfile(false)} style={{ ...el.btnSecondary, padding: '6px 10px', fontSize: '0.78rem' }}>ביטול</button>
                        </div>
                    )}
                    {activeProfileMeta && !activeProfileMeta.builtin && (
                        <button type="button" onClick={handleDeleteProfile} style={{ ...el.btnSecondary, color: '#dc2626', marginRight: 'auto' }}>
                            <Trash2 size={14} /> מחק פרופיל
                        </button>
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div style={{
                    padding: '11px 15px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    backgroundColor: toast.type === 'success' ? '#ecfdf5' : toast.type === 'error' ? '#fef2f2' : '#f4f4f5',
                    color: toast.type === 'success' ? '#065f46' : toast.type === 'error' ? '#991b1b' : '#18181b',
                    border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : toast.type === 'error' ? '#fecaca' : '#e4e4e7'}`,
                }}>
                    {toast.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
                    <span>{toast.text}</span>
                </div>
            )}

            {/* ElevenLabs-style Navigation Tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '5px', backgroundColor: '#f4f4f5', borderRadius: '12px', border: '1px solid #e4e4e7' }}>
                <button type="button" onClick={() => { setActiveStage('stt'); setShowAdvanced(false); }} style={el.tabBtn(activeStage === 'stt')}>
                    <Mic size={16} /> 1. תמלול (STT) ו-Keywords
                </button>
                <button type="button" onClick={() => { setActiveStage('barge_in'); setShowAdvanced(false); }} style={el.tabBtn(activeStage === 'barge_in')}>
                    <MessageSquareOff size={16} /> 2. קטיעה ומילים להתעלמות
                </button>
                <button type="button" onClick={() => { setActiveStage('turn_taking'); setShowAdvanced(false); }} style={el.tabBtn(activeStage === 'turn_taking')}>
                    <Clock size={16} /> 3. קצב שיחה ותזמון
                </button>
                <button type="button" onClick={() => { setActiveStage('llm_tts'); setShowAdvanced(false); }} style={el.tabBtn(activeStage === 'llm_tts')}>
                    <Cpu size={16} /> 4. מודל, קול וגבולות
                </button>
            </div>

            {/* TAB 1: STT & KEYWORDS */}
            {activeStage === 'stt' && (
                <div style={el.card}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>מנוע תמלול (Speech-to-Text)</h3>
                            <div style={{ fontSize: '0.8rem', color: '#71717a' }}>בחר ספק תמלול, מודל, ומונחי מפתח לדיוק בשמות ומותגים.</div>
                        </div>
                        <button type="button" onClick={handleTestSTT} disabled={testingStt} style={el.btnSecondary}>
                            {testingStt ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                            {testingStt ? 'בודק חיבור...' : 'בדוק חיבור STT בלייב'}
                        </button>
                    </div>

                    {sttTestResult && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            fontSize: '0.82rem',
                            backgroundColor: sttTestResult.ok ? '#ecfdf5' : '#fef2f2',
                            border: `1px solid ${sttTestResult.ok ? '#a7f3d0' : '#fecaca'}`,
                            color: sttTestResult.ok ? '#065f46' : '#991b1b',
                        }}>
                            {sttTestResult.ok
                                ? `✅ חיבור תקין! ${sttTestResult.provider} / ${sttTestResult.model} · ${sttTestResult.latency_ms}ms · תקן: ${sttTestResult.keyterm_mode} (${sttTestResult.keyterm_count} מונחים)`
                                : `❌ ${sttTestResult.error}`}
                        </div>
                    )}

                    {/* Provider selector */}
                    <div style={el.grid}>
                        {[
                            { id: 'deepgram', title: 'Deepgram', sub: 'Nova-3 / Nova-2 · מהיר, יציב, תומך keyterm / keywords' },
                            { id: 'scribe_realtime', title: 'ElevenLabs Scribe Realtime', sub: 'scribe_v3_live · זיהוי עברית טבעי + עד 50 keyterms' },
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
                                        border: active ? '2px solid #18181b' : '1px solid #e4e4e7',
                                        backgroundColor: active ? '#fafafa' : '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{prov.title}</div>
                                        <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '3px' }}>{prov.sub}</div>
                                    </div>
                                    <span style={{
                                        padding: '3px 9px',
                                        borderRadius: '999px',
                                        fontSize: '0.71rem',
                                        fontWeight: 600,
                                        backgroundColor: hasKey ? '#ecfdf5' : '#fef2f2',
                                        color: hasKey ? '#047857' : '#b91c1c',
                                    }}>
                                        {hasKey ? 'Key פעיל' : 'חסר Key'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Essential STT fields */}
                    <div style={el.grid}>
                        <div style={el.fieldCard(false)}>
                            <label style={{ fontSize: '0.84rem', fontWeight: 700 }}>מודל תמלול</label>
                            <select
                                value={isDeepgram ? stt.deepgram_model : stt.scribe_model_id}
                                onChange={(e) => updateSection('stt', isDeepgram ? { deepgram_model: e.target.value } : { scribe_model_id: e.target.value })}
                                style={el.input}
                            >
                                {(currentProvSpec?.models || (isDeepgram ? ['nova-3', 'nova-3-general', 'nova-2', 'nova-2-phonecall'] : ['scribe_v3_live', 'scribe_v2_realtime'])).map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <span style={{ fontSize: '0.73rem', color: '#71717a' }}>
                                ברירת מחדל: {isDeepgram ? envDefaults.stt.deepgram_model : envDefaults.stt.scribe_model_id}
                            </span>
                        </div>

                        <div style={el.fieldCard(false)}>
                            <label style={{ fontSize: '0.84rem', fontWeight: 700 }}>שפה</label>
                            <select
                                value={isDeepgram ? stt.deepgram_language : stt.scribe_language}
                                onChange={(e) => updateSection('stt', isDeepgram ? { deepgram_language: e.target.value } : { scribe_language: e.target.value })}
                                style={el.input}
                            >
                                <option value="he">עברית (he)</option>
                                <option value="en">אנגלית (en)</option>
                                {isDeepgram && <option value="multi">רב-לשוני (multi)</option>}
                                <option value="ru">רוסית (ru)</option>
                                <option value="ar">ערבית (ar)</option>
                            </select>
                            <span style={{ fontSize: '0.73rem', color: '#71717a' }}>ברירת מחדל: he</span>
                        </div>

                        {isDeepgram
                            ? renderNumberControl('stt', 'deepgram_endpointing_ms', 'מהירות סגירת משפט (Endpointing)', '', { min: 150, max: 2000, step: 50, unit: 'ms' })
                            : renderNumberControl('stt', 'scribe_vad_silence_secs', 'שקט לסגירת משפט (VAD)', '', { min: 0.2, max: 2.0, step: 0.05, unit: 's' })}
                    </div>

                    {/* Keywords Studio */}
                    <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <Tag size={17} color="#18181b" />
                                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>Keywords / Keyterms (מונחים לחיזוק בתמלול)</h4>
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: pct >= 90 ? '#dc2626' : '#52525b', backgroundColor: '#f4f4f5', padding: '3px 10px', borderRadius: '999px' }}>
                                {keytermsList.length} / {maxKeyterms}
                            </span>
                        </div>

                        <div style={{ padding: '9px 13px', borderRadius: '9px', backgroundColor: '#f4f4f5', border: '1px solid #e4e4e7', fontSize: '0.79rem', color: '#3f3f46' }}>
                            {!isDeepgram
                                ? 'תקן ElevenLabs Scribe: פרמטר keyterms — עד 50 מונחים נקיים (ללא :boost).'
                                : isNova3
                                    ? 'תקן Deepgram Nova-3: פרמטר keyterm — עד 100 ביטויים/שמות נקיים ללא ניקוד או :boost.'
                                    : 'תקן Deepgram Nova-2: פרמטר keywords — עד 100 מונחים, תומך במשקל חיזוק (למשל בוט טן:2).'}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#71717a' }}>סטים מוכנים:</span>
                            {Object.entries(keywordPresets).map(([key, p]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => updateSection('stt', { keyterms: [...(p.keyterms || [])].slice(0, maxKeyterms) })}
                                    style={{ ...el.btnSecondary, padding: '5px 10px', fontSize: '0.76rem', color: key === 'empty' ? '#dc2626' : '#18181b' }}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <button type="button" onClick={() => setShowBulkPaste((v) => !v)} style={{ ...el.btnSecondary, padding: '5px 10px', fontSize: '0.76rem', marginRight: 'auto' }}>
                                + הדבקה מרוכזת
                            </button>
                        </div>

                        {showBulkPaste && (
                            <div style={{ padding: '10px', borderRadius: '9px', backgroundColor: '#fafafa', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <textarea rows={3} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="הדבק מילים מופרדות בפסיק או שורה חדשה..." style={el.input} />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" onClick={handleApplyBulkPaste} style={{ ...el.btnPrimary, padding: '6px 12px', fontSize: '0.78rem' }}>הוסף</button>
                                    <button type="button" onClick={() => setShowBulkPaste(false)} style={{ ...el.btnSecondary, padding: '6px 12px', fontSize: '0.78rem' }}>סגור</button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                                placeholder="הקלד מילה או ביטוי ולחץ Enter..."
                                style={{ ...el.input, flex: 1, minWidth: '210px' }}
                            />
                            {supportsBoost && (
                                <input type="number" step="0.5" min="1" max="10" value={newBoost} onChange={(e) => setNewBoost(e.target.value)} placeholder="Boost" style={{ ...el.input, width: '90px', direction: 'ltr' }} />
                            )}
                            <button type="button" onClick={handleAddKeyword} style={el.btnPrimary}>
                                <Plus size={15} /> הוסף
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px', borderRadius: '10px', backgroundColor: '#fafafa', border: '1px solid #e4e4e7', minHeight: '46px' }}>
                            {keytermsList.length === 0 ? (
                                <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>אין מילות מפתח (מצב תמלול נקי).</span>
                            ) : keytermsList.map((term) => (
                                <span key={term} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', backgroundColor: '#fff', border: '1px solid #d4d4d8', fontSize: '0.8rem', fontWeight: 600 }}>
                                    {term}
                                    <button type="button" onClick={() => updateSection('stt', { keyterms: keytermsList.filter((t) => t !== term) })} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontWeight: 700 }}>×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {renderAdvancedAccordion(
                        <>
                            <div style={el.grid}>
                                {renderNumberControl('stt', 'audio_gain', 'הגבר שמע ל-STT (Audio Gain)', '', { min: 0.5, max: 3.0, step: 0.05, unit: 'x' })}
                                {isDeepgram && renderNumberControl('stt', 'deepgram_utterance_end_ms', 'Utterance End (ms)', '', { min: 500, max: 3000, step: 100, unit: 'ms' })}
                                {isDeepgram ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {renderToggleControl('stt', 'deepgram_smart_format', 'Smart Format', 'פיסוק ועיצוב מספרים אוטומטי.')}
                                        {renderToggleControl('stt', 'deepgram_vad_events', 'VAD Events', 'אירועי זיהוי דיבור מ-Deepgram.')}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {renderToggleControl('stt', 'scribe_filter_background_audio', 'סינון רעשי רקע (Scribe)', 'כבוי מומלץ לקווי טלפון.')}
                                        {renderToggleControl('stt', 'fallback_to_deepgram', 'Fallback ל-Deepgram', 'מעבר אוטומטי במקרה של ניתוק.')}
                                    </div>
                                )}
                            </div>
                            {isDeepgram && (
                                <div style={{ padding: '10px', borderRadius: '9px', backgroundColor: '#fafafa', border: '1px solid #e4e4e7' }}>
                                    <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '6px' }}>חוקי החלפה ב-Deepgram (Replace: שגוי ➔ תקין)</div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                        <input type="text" value={replaceFrom} onChange={(e) => setReplaceFrom(e.target.value)} placeholder="מילה שגויה" style={{ ...el.input, flex: 1, minWidth: '140px' }} />
                                        <ArrowLeft size={16} style={{ alignSelf: 'center', color: '#71717a' }} />
                                        <input type="text" value={replaceTo} onChange={(e) => setReplaceTo(e.target.value)} placeholder="תיקון" style={{ ...el.input, flex: 1, minWidth: '140px' }} />
                                        <button type="button" onClick={handleAddReplaceRule} style={el.btnSecondary}>הוסף</button>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {(stt.replace_rules || []).map((r) => (
                                            <span key={r} style={{ padding: '3px 9px', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid #d4d4d8', fontSize: '0.78rem', display: 'inline-flex', gap: '6px' }}>
                                                <code>{r}</code>
                                                <button type="button" onClick={() => updateSection('stt', { replace_rules: stt.replace_rules.filter((x) => x !== r) })} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* TAB 2: BARGE-IN & INTERRUPTION IGNORE PHRASES */}
            {activeStage === 'barge_in' && (
                <div style={el.card}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>קטיעה ומילים להתעלמות בזמן שהבוט מדבר</h3>
                        <div style={{ fontSize: '0.8rem', color: '#71717a' }}>כוונון מתי הלקוח יכול לעצור את הבוט, ואילו מילות הקשבה ("אה כן", "אוקיי") לא יקטעו אותו.</div>
                    </div>

                    {/* Essential Barge-in Controls */}
                    <div style={el.grid}>
                        {renderToggleControl('barge_in', 'enabled', 'אפשר קטיעה (Barge-In)', 'האם הלקוח יכול לעצור את הבוט באמצע משפט.')}
                        {renderToggleControl('barge_in', 'disable_first_message_interruptions', 'נעל קטיעה במשפט פתיחה', 'מונע מרעש קו ראשוני לעצור את הברכה.')}
                        {renderNumberControl('barge_in', 'greeting_delay_sec', 'דיליי לפני משפט פתיחה', 'השהייה בשניות לפני ה-"היי" בתחילת שיחה.', { min: 0, max: 5, step: 0.1, unit: 's' })}
                        {renderNumberControl('barge_in', 'protect_sec', 'חסימת קטיעה בתחילת כל משפט', 'כמה שניות מתחילת משפט של הבוט אסור לקטוע אותו.', { min: 0, max: 10, step: 0.1, unit: 's' })}
                        {renderNumberControl('barge_in', 'min_words', 'מינימום מילים לקטיעה', 'כמה מילים משמעותיות נדרשות כדי לעצור את הבוט.', { min: 1, max: 8, step: 1 })}
                    </div>

                    {/* Interruption Ignore Phrases */}
                    <div style={{ borderTop: '1px solid #e4e4e7', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800 }}>
                                    מילים וביטויים שהבוט מתעלם מהם בזמן שהוא מדבר (Interruption Ignore Terms)
                                </h4>
                                <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '2px' }}>
                                    אם הלקוח אומר ביטויים כאלה (למשל <strong>"אה כן"</strong>, <strong>"אוקיי"</strong>, <strong>"בסדר"</strong>) תוך כדי שהבוט מדבר — הבוט ממשיך לדבר כרגיל ולא נקטע.
                                </div>
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#52525b', backgroundColor: '#f4f4f5', padding: '3px 10px', borderRadius: '999px' }}>
                                {ignoreList.length} ביטויים
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#71717a' }}>תבניות מוכנות:</span>
                            {Object.entries(ignorePresets).map(([key, p]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => updateSection('barge_in', { ignore_phrases: [...(p.phrases || [])] })}
                                    style={{ ...el.btnSecondary, padding: '5px 10px', fontSize: '0.76rem', color: key === 'empty' ? '#dc2626' : '#18181b' }}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <button type="button" onClick={() => setShowIgnoreBulk((v) => !v)} style={{ ...el.btnSecondary, padding: '5px 10px', fontSize: '0.76rem', marginRight: 'auto' }}>
                                + הדבקה מרוכזת
                            </button>
                        </div>

                        {showIgnoreBulk && (
                            <div style={{ padding: '10px', borderRadius: '9px', backgroundColor: '#fafafa', border: '1px solid #e4e4e7', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <textarea rows={2} value={ignoreBulkText} onChange={(e) => setIgnoreBulkText(e.target.value)} placeholder="למשל: אה כן, אוקיי, בסדר גמור, כן כן" style={el.input} />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" onClick={handleApplyIgnoreBulk} style={{ ...el.btnPrimary, padding: '6px 12px', fontSize: '0.78rem' }}>הוסף</button>
                                    <button type="button" onClick={() => setShowIgnoreBulk(false)} style={{ ...el.btnSecondary, padding: '6px 12px', fontSize: '0.78rem' }}>סגור</button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <input
                                type="text"
                                value={newIgnorePhrase}
                                onChange={(e) => setNewIgnorePhrase(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIgnorePhrase())}
                                placeholder='הוסף מילה או ביטוי להתעלמות (למשל: "אה כן", "סבבה", "הבנתי")...'
                                style={{ ...el.input, flex: 1, minWidth: '220px' }}
                            />
                            <button type="button" onClick={handleAddIgnorePhrase} style={el.btnPrimary}>
                                <Plus size={15} /> הוסף
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px', borderRadius: '10px', backgroundColor: '#fafafa', border: '1px solid #e4e4e7', minHeight: '46px' }}>
                            {ignoreList.length === 0 ? (
                                <span style={{ color: '#a1a1aa', fontSize: '0.8rem' }}>אין מילים להתעלמות — כל דיבור מעל מינימום המילים יקטע את הבוט.</span>
                            ) : ignoreList.map((ph) => (
                                <span key={ph} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '999px', backgroundColor: '#fff', border: '1px solid #d4d4d8', fontSize: '0.8rem', fontWeight: 600 }}>
                                    {ph}
                                    <button type="button" onClick={() => updateSection('barge_in', { ignore_phrases: ignoreList.filter((x) => x !== ph) })} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontWeight: 700 }}>×</button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {renderAdvancedAccordion(
                        <div style={el.grid}>
                            {renderNumberControl('barge_in', 'voice_rms', 'סף עוצמת קול (VOICE_RMS)', 'רגישות מיקרופון בזמן האזנה.', { min: 80, max: 1000, step: 15 })}
                            {renderNumberControl('barge_in', 'run_rms', 'סף רצף דיבור (RUN_RMS)', 'סף עוצמה לקטיעה בזמן שהבוט מדבר.', { min: 100, max: 1200, step: 15 })}
                            {renderNumberControl('barge_in', 'vad_frames', 'VAD Frames לקטיעה', 'פריימים רצופים של קול (20ms כ״א).', { min: 5, max: 60, step: 1 })}
                            {renderNumberControl('barge_in', 'echo_shield_sec', 'מגן הד (Echo Shield)', 'חסימת הד בתחילת השמעה.', { min: 0.0, max: 2.5, step: 0.1, unit: 's' })}
                            {renderNumberControl('barge_in', 'protect_words', 'מילים מוגנות (גיבוי)', 'גיבוי אם אין חסימת שניות מוגדרת.', { min: -1, max: 20, step: 1 })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: TURN TAKING */}
            {activeStage === 'turn_taking' && (
                <div style={el.card}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>קצב שיחה והשהיות (Turn-Taking)</h3>
                        <div style={{ fontSize: '0.8rem', color: '#71717a' }}>בחר פרופיל מוכן או התאם כמה זמן הבוט מחכה לפני שהוא משחרר תשובה.</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem' }}>
                        {speedPresets.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleApplySpeedPreset(preset)}
                                style={{ padding: '11px 13px', borderRadius: '11px', border: '1px solid #e4e4e7', backgroundColor: '#fafafa', textAlign: 'right', cursor: 'pointer' }}
                            >
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#18181b' }}>
                                    <Zap size={14} /> {preset.label}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#71717a', marginTop: '3px' }}>{preset.description}</div>
                            </button>
                        ))}
                    </div>

                    <div style={el.grid}>
                        {renderToggleControl('turn_taking', 'speculative_turn', 'חשיבה מקדימה (Speculative Turn)', 'מכין טיוטת תשובה ב-RAM בזמן הפסקה קצרה.')}
                        {renderNumberControl('turn_taking', 'early_release_silence_sec', 'המתנה לשחרור תשובה (משפט רגיל)', '', { min: 0.3, max: 2.5, step: 0.05, unit: 's' })}
                        {renderNumberControl('turn_taking', 'early_release_question_sec', 'המתנה לאחר שאלה', '', { min: 0.3, max: 2.0, step: 0.05, unit: 's' })}
                        {renderNumberControl('turn_taking', 'number_extra_wait_sec', 'המתנה נוספת להכתבת מספר טלפון', '', { min: 0.5, max: 5.0, step: 0.1, unit: 's' })}
                    </div>

                    {renderAdvancedAccordion(
                        <div style={el.grid}>
                            {renderToggleControl('turn_taking', 'speculative_tts', 'Speculative TTS', 'מייצר גם אודיו מראש (עשוי לבזבז תווים אם הלקוח ממשיך).')}
                            {renderNumberControl('turn_taking', 'speculative_silence_sec', 'שקט להתחלת ספקולציה', '', { min: 0.05, max: 1.5, step: 0.05, unit: 's' })}
                            {renderNumberControl('turn_taking', 'early_release_short_sec', 'שחרור תשובה קצרה', '', { min: 0.3, max: 2.0, step: 0.05, unit: 's' })}
                            {renderNumberControl('turn_taking', 'endpoint_fallback_silence_sec', 'Endpoint Fallback', '', { min: 0.4, max: 3.0, step: 0.05, unit: 's' })}
                            {renderNumberControl('turn_taking', 'incomplete_extra_wait_sec', 'תוספת למשפט לא גמור', '', { min: 0.2, max: 3.0, step: 0.1, unit: 's' })}
                            {renderNumberControl('turn_taking', 'soft_commit_wait_sec', 'Soft Commit Wait', '', { min: 0.1, max: 2.0, step: 0.05, unit: 's' })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: LLM / TTS & LIMITS */}
            {activeStage === 'llm_tts' && (
                <div style={el.card}>
                    <div style={el.grid}>
                        <div style={{ ...el.fieldCard(false), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.74rem', color: '#71717a', fontWeight: 600 }}>מודל LLM פעיל</div>
                                <div style={{ fontSize: '0.94rem', fontWeight: 700, marginTop: '2px' }}>{activeLlm ? `${activeLlm.provider} / ${activeLlm.model}` : 'ברירת מחדל'}</div>
                            </div>
                            {onNavigateTab && <button type="button" onClick={() => onNavigateTab('llm')} style={el.btnSecondary}>החלף LLM</button>}
                        </div>
                        <div style={{ ...el.fieldCard(false), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.74rem', color: '#71717a', fontWeight: 600 }}>מנוע TTS פעיל</div>
                                <div style={{ fontSize: '0.94rem', fontWeight: 700, marginTop: '2px' }}>{activeTts ? `${activeTts.provider} / ${activeTts.model}` : 'ברירת מחדל'}</div>
                            </div>
                            {onNavigateTab && <button type="button" onClick={() => onNavigateTab('tts')} style={el.btnSecondary}>החלף TTS</button>}
                        </div>
                    </div>

                    <div style={el.grid}>
                        {renderNumberControl('llm_pipeline', 'temperature', 'יצירתיות המודל (Temperature)', '', { min: 0, max: 1.5, step: 0.05 })}
                        {renderNumberControl('llm_pipeline', 'max_tokens', 'אורך תשובה מרבי (Tokens)', '', { min: 50, max: 1000, step: 10 })}
                        {renderNumberControl('limits', 'silence_end_call_timeout_sec', 'ניתוק אוטומטי בשתיקה', '', { min: 8, max: 60, step: 1, unit: 's' })}
                        {renderNumberControl('limits', 'max_call_sec', 'אורך שיחה מקסימלי', '', { min: 60, max: 1800, step: 30, unit: 's' })}
                    </div>

                    {renderAdvancedAccordion(
                        <div style={el.grid}>
                            {renderNumberControl('llm_pipeline', 'history_items', 'היסטוריית שיחה (Turns)', '', { min: 6, max: 150, step: 2 })}
                            {renderNumberControl('llm_pipeline', 'hedge_after', 'Hedge Timeout', '', { min: 0, max: 6, step: 0.05, unit: 's' })}
                            {renderNumberControl('llm_pipeline', 'first_token_timeout', 'First Token Timeout', '', { min: 1.5, max: 12, step: 0.5, unit: 's' })}
                            {renderToggleControl('llm_pipeline', 'race', 'מצב Race (ראשי מול גיבוי)', 'מריץ שני מודלים במקביל (2x בקשות).')}
                            {renderNumberControl('tts_pipeline', 'prebuffer_ms', 'TTS Prebuffer', '', { min: 0, max: 250, step: 10, unit: 'ms' })}
                            {renderNumberControl('tts_pipeline', 'playout_lead_sec', 'Playout Lead', '', { min: 0.2, max: 1.5, step: 0.05, unit: 's' })}
                            {renderNumberControl('tts_pipeline', 'merge_rest_sec', 'מיזוג משפטים (Merge Rest)', '', { min: 0, max: 1.5, step: 0.05, unit: 's' })}
                            {renderToggleControl('tts_pipeline', 'elevenlabs_previous_text', 'ElevenLabs Previous Text', 'שמירת רצף אינטונציה.')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PipelineManager;
