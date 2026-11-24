import React, { useState, useEffect, useCallback } from 'react';
import {
    Cpu,
    Zap,
    CheckCircle2,
    Save,
    Play,
    RotateCcw,
    Sliders,
    AlertCircle,
    RefreshCw,
    Loader2,
    ShieldCheck,
} from 'lucide-react';
import { callsApi } from './APIcalls';

const REASONING_OPTIONS = [
    { value: 'off', label: 'כבוי (הכי מהיר לשיחות · enabled: false)' },
    { value: 'low', label: 'נמוך (מומלץ ל-GPT-OSS · effort: low)' },
    { value: 'minimal', label: 'מינימלי (effort: minimal)' },
    { value: 'none', label: 'ללא (effort: none)' },
    { value: 'on', label: 'מופעל (enabled: true)' },
];

function extractReasoningMode(extraBody, model) {
    const r = extraBody?.reasoning;
    if (r && typeof r === 'object') {
        if (r.effort) return String(r.effort).toLowerCase();
        if (r.enabled === true) return 'on';
        if (r.enabled === false) return 'off';
    }
    return (model || '').toLowerCase().includes('gpt-oss') ? 'low' : 'off';
}

function buildReasoningObject(mode) {
    if (mode === 'on') return { enabled: true };
    if (mode === 'off') return { enabled: false };
    return { effort: mode };
}

const LLMModelManager = () => {
    const [loading, setLoading] = useState(true);
    const [verifyingId, setVerifyingId] = useState(null);
    const [testingOnly, setTestingOnly] = useState(false);
    const [benchLoading, setBenchLoading] = useState(false);
    const [benchOutput, setBenchOutput] = useState('');
    const [statusMsg, setStatusMsg] = useState(null);

    const [source, setSource] = useState('env');
    const [presets, setPresets] = useState([]);
    const [providers, setProviders] = useState([]);
    const [activeConfig, setActiveConfig] = useState(null);
    const [lastLiveTest, setLastLiveTest] = useState(null);

    // Form state
    const [provider, setProvider] = useState('openrouter');
    const [model, setModel] = useState('');
    const [fallbackProvider, setFallbackProvider] = useState('together');
    const [fallbackModel, setFallbackModel] = useState('');
    const [hedgeAfter, setHedgeAfter] = useState(0.55);
    const [temperature, setTemperature] = useState(0.4);
    const [selectedOrTags, setSelectedOrTags] = useState([]);
    const [orAllowFallbacks, setOrAllowFallbacks] = useState(true);
    const [reasoningMode, setReasoningMode] = useState('off');

    // OpenRouter auto-discovered provider chips
    const [orEndpoints, setOrEndpoints] = useState([]);
    const [orLoading, setOrLoading] = useState(false);
    const [orError, setOrError] = useState('');

    const applyConfigToForm = useCallback((cfg, src) => {
        if (!cfg) return;
        setActiveConfig(cfg);
        setSource(src || 'env');
        setProvider(cfg.provider || 'openrouter');
        setModel(cfg.model || '');
        setFallbackProvider(cfg.fallback_provider || '');
        setFallbackModel(cfg.fallback_model || '');
        setHedgeAfter(cfg.hedge_after ?? 0.55);
        setTemperature(cfg.temperature ?? 0.4);

        const extra = cfg.openrouter_extra_body || {};
        const order = extra?.provider?.order || extra?.provider?.only || [];
        setSelectedOrTags(Array.isArray(order) ? order : []);
        setOrAllowFallbacks(extra?.provider?.allow_fallbacks !== false);
        setReasoningMode(extractReasoningMode(extra, cfg.model));
    }, []);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const data = await callsApi.getLLMSetting();
            setPresets(data.presets || []);
            setProviders(data.providers || []);
            applyConfigToForm(data.config, data.source);
        } catch (err) {
            console.error('Failed to load LLM settings:', err);
            setStatusMsg({ type: 'error', text: 'שגיאה בטעינת הגדרות המודל מהשרת.' });
        } finally {
            setLoading(false);
        }
    }, [applyConfigToForm]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const loadOrEndpoints = useCallback(async (targetModel) => {
        const m = (targetModel || '').trim();
        if (!m || !m.includes('/')) {
            setOrEndpoints([]);
            setOrError('');
            return;
        }
        setOrLoading(true);
        setOrError('');
        try {
            const res = await callsApi.getOpenRouterEndpoints(m);
            setOrEndpoints(res.endpoints || []);
            if (res.error) setOrError(res.error);
        } catch (err) {
            setOrEndpoints([]);
            setOrError(err?.response?.data?.error || 'לא נמצאו ספקים עבור המודל הזה ב-OpenRouter.');
        } finally {
            setOrLoading(false);
        }
    }, []);

    useEffect(() => {
        if (provider !== 'openrouter') {
            setOrEndpoints([]);
            setOrError('');
            return;
        }
        const timer = setTimeout(() => {
            loadOrEndpoints(model);
        }, 350);
        return () => clearTimeout(timer);
    }, [provider, model, loadOrEndpoints]);

    const showToast = (type, text) => {
        setStatusMsg({ type, text });
    };

    const hasProviderKey = (providerId) => {
        const found = providers.find(p => p.id === providerId);
        return found ? found.has_key : true;
    };

    const isPresetActive = (preset) => {
        if (!activeConfig) return false;
        if (activeConfig.provider !== preset.provider || activeConfig.model !== preset.model) {
            return false;
        }
        if (preset.provider === 'openrouter') {
            const activeOrder = activeConfig.openrouter_extra_body?.provider?.order || [];
            const presetOrder = preset.openrouter_extra_body?.provider?.order || [];
            return JSON.stringify(activeOrder) === JSON.stringify(presetOrder);
        }
        return true;
    };

    const handleSelectPreset = async (preset) => {
        if (verifyingId) return;
        setVerifyingId(preset.id);
        setStatusMsg({ type: 'info', text: `בודק בלייב את ${preset.label}...` });
        try {
            const payload = {
                provider: preset.provider,
                model: preset.model,
                fallback_provider: preset.fallback_provider || '',
                fallback_model: preset.fallback_model || '',
                hedge_after: preset.hedge_after ?? 0.55,
                temperature: activeConfig?.temperature ?? 0.4,
                openrouter_extra_body: preset.openrouter_extra_body || {},
            };
            const res = await callsApi.updateLLMSetting(payload);
            if (res.success) {
                applyConfigToForm(res.config, res.source);
                setLastLiveTest(res.live_test || null);
                const ttft = res.live_test?.ttft_ms ? ` (${res.live_test.ttft_ms}ms)` : '';
                showToast('success', `✅ ${preset.label} אומת בלייב${ttft} והופעל לשיחה הבאה!`);
            }
        } catch (err) {
            const errTxt = err?.response?.data?.error || 'הבדיקה החיה נכשלה — המודל הפעיל לא שונה.';
            showToast('error', `❌ ${errTxt}`);
        } finally {
            setVerifyingId(null);
        }
    };

    const buildCustomPayload = () => {
        let extraBody = {};
        if (provider === 'openrouter') {
            extraBody = {
                reasoning: buildReasoningObject(reasoningMode),
            };
            if (selectedOrTags.length > 0) {
                extraBody.provider = {
                    order: selectedOrTags,
                    allow_fallbacks: Boolean(orAllowFallbacks),
                };
            } else {
                extraBody.provider = { allow_fallbacks: true };
            }
        }
        return {
            provider,
            model: model.trim(),
            fallback_provider: fallbackProvider.trim(),
            fallback_model: fallbackModel.trim(),
            hedge_after: parseFloat(hedgeAfter) || 0.55,
            temperature: parseFloat(temperature) || 0.4,
            openrouter_extra_body: extraBody,
        };
    };

    const handleTestOnly = async () => {
        if (!model.trim()) {
            showToast('error', 'יש להזין שם מודל לבדיקה.');
            return;
        }
        setTestingOnly(true);
        setStatusMsg({ type: 'info', text: `מריץ בדיקה חיה על ${provider}/${model.trim()}...` });
        try {
            const res = await callsApi.testLLMSetting(buildCustomPayload());
            setLastLiveTest(res);
            showToast('success', `✅ הבדיקה הצליחה! TTFT: ${res.ttft_ms}ms · ספק: ${res.actual_provider} · תשובה: "${res.sample}"`);
        } catch (err) {
            showToast('error', `❌ הבדיקה נכשלה: ${err?.response?.data?.error || err.message}`);
        } finally {
            setTestingOnly(false);
        }
    };

    const handleSaveCustom = async (e) => {
        e.preventDefault();
        if (!model.trim()) {
            showToast('error', 'יש להזין שם מודל.');
            return;
        }
        setVerifyingId('custom');
        setStatusMsg({ type: 'info', text: `מאמת בלייב את ${provider}/${model.trim()} לפני שמירה...` });
        try {
            const res = await callsApi.updateLLMSetting(buildCustomPayload());
            if (res.success) {
                applyConfigToForm(res.config, res.source);
                setLastLiveTest(res.live_test || null);
                const ttft = res.live_test?.ttft_ms ? ` (${res.live_test.ttft_ms}ms)` : '';
                showToast('success', `✅ אומת בלייב${ttft} ונשמר: ${res.config.provider}/${res.config.model}`);
            }
        } catch (err) {
            const errTxt = err?.response?.data?.error || 'המודל נכשל בבדיקה החיה ולכן לא הופעל.';
            showToast('error', `❌ לא הופעל: ${errTxt}`);
        } finally {
            setVerifyingId(null);
        }
    };

    const handleResetToEnv = async () => {
        if (!window.confirm('לאפס את הגדרת המודל לברירת המחדל של השרת (.env)?')) return;
        setVerifyingId('reset');
        try {
            const res = await callsApi.updateLLMSetting({ reset: true });
            if (res.success) {
                applyConfigToForm(res.config, res.source);
                setLastLiveTest(null);
                showToast('success', 'אופס לברירת המחדל של השרת (.env).');
            }
        } catch (err) {
            showToast('error', 'שגיאה באיפוס ההגדרות.');
        } finally {
            setVerifyingId(null);
        }
    };

    const toggleOrChip = (tag) => {
        setSelectedOrTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleRunBenchmark = async () => {
        setBenchLoading(true);
        setBenchOutput('מריץ בנצ׳מרק 3 פעמים מול השרת שלך (לוקח כ-30-45 שניות)...');
        try {
            const targetModel = provider === 'openrouter' && model ? model.trim() : 'deepseek/deepseek-v4.1-flash-1017';
            const tableText = await callsApi.runProviderBenchmark(targetModel, 3);
            setBenchOutput(typeof tableText === 'string' ? tableText : JSON.stringify(tableText, null, 2));
        } catch (err) {
            setBenchOutput(`Benchmark failed: ${err?.response?.data?.error || err.message}`);
        } finally {
            setBenchLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '2rem', color: '#6b7280' }}>טוען הגדרות מודלים...</div>;
    }

    const activeOrder = activeConfig?.openrouter_extra_body?.provider?.order || [];

    return (
        <div style={styles.container}>
            {/* Active Status Banner */}
            <div style={styles.banner}>
                <div style={{ flex: 1 }}>
                    <div style={styles.bannerTop}>
                        <span style={styles.badge(source === 'redis')}>
                            {source === 'redis' ? 'פעיל · נשמר מהאדמין' : 'פעיל · ברירת מחדל ENV'}
                        </span>
                        {lastLiveTest?.ok && (
                            <span style={styles.verifiedBadge}>
                                <ShieldCheck size={14} />
                                אומת בלייב · {lastLiveTest.ttft_ms}ms
                            </span>
                        )}
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                            נכנס לתוקף מיד בשיחה הבאה בלי restart
                        </span>
                    </div>
                    <h2 style={styles.bannerTitle}>
                        <Cpu size={24} color="#60a5fa" />
                        <span>{activeConfig?.provider} / {activeConfig?.model}</span>
                    </h2>
                    <p style={styles.bannerSub}>
                        {activeOrder.length > 0 && `סדר ספקים: ${activeOrder.join(' → ')} · `}
                        גיבוי: {activeConfig?.fallback_provider || 'ללא'}
                        {activeConfig?.fallback_model ? `/${activeConfig.fallback_model}` : ''} ·
                        Hedge: {activeConfig?.hedge_after}s · Temp: {activeConfig?.temperature}
                    </p>
                </div>
                <button
                    onClick={handleResetToEnv}
                    disabled={Boolean(verifyingId) || source === 'env'}
                    style={styles.resetBtn(source === 'env')}
                >
                    <RotateCcw size={15} />
                    איפוס ל-ENV
                </button>
            </div>

            {statusMsg && (
                <div style={styles.toast(statusMsg.type)}>
                    {statusMsg.type === 'success' ? (
                        <CheckCircle2 size={18} />
                    ) : statusMsg.type === 'info' ? (
                        <Loader2 size={18} />
                    ) : (
                        <AlertCircle size={18} />
                    )}
                    <span>{statusMsg.text}</span>
                </div>
            )}

            {/* Curated Model Cubes Grid */}
            <div>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>
                        <Zap size={18} color="#f59e0b" />
                        כל המודלים המוכנים — לחיצה אחת בודקת בלייב ומפעילה
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        אי אפשר להפעיל מודל תקול: כל לחיצה בודקת תשובה אמיתית לפני שמירה
                    </span>
                </div>

                <div style={styles.cubeGrid}>
                    {presets.map(preset => {
                        const active = isPresetActive(preset);
                        const isChecking = verifyingId === preset.id;
                        const keyMissing = !hasProviderKey(preset.provider);
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleSelectPreset(preset)}
                                disabled={Boolean(verifyingId) || keyMissing}
                                style={styles.cubeCard(active, keyMissing)}
                            >
                                <div style={styles.cubeTop}>
                                    <span style={styles.providerPill(active)}>
                                        {preset.provider_label || preset.provider}
                                    </span>
                                    {isChecking ? (
                                        <span style={styles.checkingPill}>בודק בלייב...</span>
                                    ) : active ? (
                                        <span style={styles.activePill}>
                                            <CheckCircle2 size={14} />
                                            פעיל
                                        </span>
                                    ) : preset.recommended ? (
                                        <span style={styles.recPill}>מומלץ</span>
                                    ) : null}
                                </div>

                                <div style={styles.cubeTitle}>{preset.label}</div>
                                <div style={styles.cubeSub}>
                                    {keyMissing ? 'חסר API Key בשרת עבור ספק זה' : preset.subtitle_he}
                                </div>

                                <div style={styles.cubeModelId}>{preset.model}</div>

                                <div style={styles.cubeFooter}>
                                    {preset.speed_tag && (
                                        <span style={styles.metaChip('#eff6ff', '#1d4ed8')}>⚡ {preset.speed_tag}</span>
                                    )}
                                    {preset.cost_tag && (
                                        <span style={styles.metaChip('#ecfdf5', '#047857')}>💰 {preset.cost_tag}</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Custom Model & Clickable OpenRouter Provider Chips */}
            <form onSubmit={handleSaveCustom} style={styles.formCard}>
                <div style={styles.sectionHeader}>
                    <h3 style={styles.sectionTitle}>
                        <Sliders size={18} color="#4f46e5" />
                        התאמה אישית ובחירת ספקים (ללא צורך לנחש שמות)
                    </h3>
                </div>

                <div style={styles.formGrid}>
                    <div style={styles.field}>
                        <label style={styles.label}>ספק ראשי (Provider)</label>
                        <select
                            value={provider}
                            onChange={e => setProvider(e.target.value)}
                            style={styles.input}
                        >
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.label} {p.has_key ? '✓' : '(חסר מפתח)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>מזהה מודל (Model ID)</label>
                        <input
                            type="text"
                            value={model}
                            onChange={e => setModel(e.target.value)}
                            placeholder="למשל deepseek/deepseek-v4.1-flash-1017 או openai/gpt-oss-120b"
                            required
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>ספק גיבוי (Fallback)</label>
                        <select
                            value={fallbackProvider}
                            onChange={e => setFallbackProvider(e.target.value)}
                            style={styles.input}
                        >
                            <option value="">ללא גיבוי</option>
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.label} {p.has_key ? '✓' : '(חסר מפתח)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>מודל גיבוי</label>
                        <input
                            type="text"
                            value={fallbackModel}
                            onChange={e => setFallbackModel(e.target.value)}
                            placeholder="למשל deepseek-ai/DeepSeek-V4.1-Flash-1017"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Hedge After (שניות)</label>
                        <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="5"
                            value={hedgeAfter}
                            onChange={e => setHedgeAfter(e.target.value)}
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Temperature</label>
                        <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="2"
                            value={temperature}
                            onChange={e => setTemperature(e.target.value)}
                            style={styles.input}
                        />
                    </div>
                </div>

                {/* Clickable OpenRouter Provider Selector */}
                {provider === 'openrouter' && (
                    <div style={styles.orBox}>
                        <div style={styles.orHeader}>
                            <div>
                                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e1b4b' }}>
                                    בחירת ספקים ב-OpenRouter לפי סדר עדיפות (לחיצה מוסיפה/מסירה)
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#4338ca', marginTop: '2px' }}>
                                    {selectedOrTags.length > 0
                                        ? `סדר נבחר: ${selectedOrTags.map((t, i) => `${i + 1}. ${t}`).join('  →  ')}`
                                        : 'לא נבחר ספק ספציפי — OpenRouter יבחר אוטומטית'}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => loadOrEndpoints(model)}
                                disabled={orLoading}
                                style={styles.refreshBtn}
                            >
                                <RefreshCw size={14} />
                                {orLoading ? 'טוען...' : 'רענן ספקים'}
                            </button>
                        </div>

                        {orError && (
                            <div style={styles.orErr}>{orError}</div>
                        )}

                        {orEndpoints.length > 0 && (
                            <div style={styles.chipWrap}>
                                {orEndpoints.map(ep => {
                                    const idx = selectedOrTags.indexOf(ep.tag);
                                    const selected = idx !== -1;
                                    return (
                                        <button
                                            key={ep.tag}
                                            type="button"
                                            onClick={() => toggleOrChip(ep.tag)}
                                            style={styles.orChip(selected)}
                                            title={`Tag: ${ep.tag}`}
                                        >
                                            {selected && <span style={styles.orderNum}>{idx + 1}</span>}
                                            <span style={{ fontWeight: '700' }}>{ep.name}</span>
                                            {ep.quantization && (
                                                <span style={styles.quantTag(selected)}>
                                                    {ep.quantization}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                                                ${ep.price_in}/${ep.price_out}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div style={styles.orBottomRow}>
                            <div style={{ minWidth: '240px', flex: 1 }}>
                                <label style={styles.label}>מצב חשיבה (Reasoning)</label>
                                <select
                                    value={reasoningMode}
                                    onChange={e => setReasoningMode(e.target.value)}
                                    style={styles.input}
                                >
                                    {REASONING_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <label style={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={orAllowFallbacks}
                                    onChange={e => setOrAllowFallbacks(e.target.checked)}
                                />
                                אפשר Fallback אוטומטי ב-OpenRouter אם הספקים שנבחרו עמוסים
                            </label>
                        </div>
                    </div>
                )}

                <div style={styles.actionRow}>
                    <button
                        type="button"
                        onClick={handleTestOnly}
                        disabled={testingOnly || Boolean(verifyingId)}
                        style={styles.testBtn}
                    >
                        <ShieldCheck size={16} />
                        {testingOnly ? 'בודק...' : 'בדוק בלייב (בלי לשמור)'}
                    </button>
                    <button
                        type="submit"
                        disabled={testingOnly || Boolean(verifyingId)}
                        style={styles.saveBtn}
                    >
                        <Save size={16} />
                        {verifyingId === 'custom' ? 'מאמת ושומר...' : 'בדוק בלייב והפעל'}
                    </button>
                </div>
            </form>

            {/* Live Cloud Benchmark */}
            <div style={styles.benchCard}>
                <div style={styles.benchHeader}>
                    <div>
                        <h3 style={{ ...styles.sectionTitle, margin: 0 }}>
                            <Play size={18} color="#10b981" />
                            בדיקת מהירות מלאה מהשרת (3 ריצות לכל ספק)
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#6b7280' }}>
                            בודק את הפרומפט הנוכחי של הבוט ישירות מ-Railway מול כל הספקים הזמינים של המודל.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleRunBenchmark}
                        disabled={benchLoading}
                        style={styles.benchBtn}
                    >
                        <Play size={16} />
                        {benchLoading ? 'מריץ בדיקה...' : `בדוק מהירות (${provider === 'openrouter' && model ? model : 'DeepSeek'})`}
                    </button>
                </div>
                {benchOutput && <pre style={styles.benchPre}>{benchOutput}</pre>}
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    banner: {
        padding: '1.4rem 1.6rem',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.15)',
    },
    bannerTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' },
    badge: (isCustom) => ({
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '0.74rem',
        fontWeight: '700',
        backgroundColor: isCustom ? '#2563eb' : '#475569',
        color: 'white',
    }),
    verifiedBadge: {
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '0.74rem',
        fontWeight: '700',
        backgroundColor: '#059669',
        color: 'white',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
    },
    bannerTitle: {
        margin: 0,
        fontSize: '1.3rem',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        wordBreak: 'break-all',
    },
    bannerSub: { margin: '6px 0 0 0', fontSize: '0.84rem', color: '#cbd5e1' },
    resetBtn: (disabled) => ({
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.25)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        color: 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.84rem',
        fontWeight: '600',
    }),
    toast: (type) => ({
        padding: '12px 16px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.9rem',
        fontWeight: '600',
        backgroundColor: type === 'success' ? '#ecfdf5' : type === 'info' ? '#eff6ff' : '#fef2f2',
        color: type === 'success' ? '#065f46' : type === 'info' ? '#1e40af' : '#991b1b',
        border: `1px solid ${type === 'success' ? '#a7f3d0' : type === 'info' ? '#bfdbfe' : '#fecaca'}`,
    }),
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '12px',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '1.05rem',
        fontWeight: '700',
        color: '#111827',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    cubeGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(235px, 1fr))',
        gap: '12px',
    },
    cubeCard: (active, disabled) => ({
        textAlign: 'left',
        padding: '14px',
        borderRadius: '12px',
        border: active ? '2px solid #2563eb' : '1px solid #e5e7eb',
        backgroundColor: active ? '#eff6ff' : disabled ? '#f3f4f6' : '#ffffff',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        boxShadow: active ? '0 4px 12px rgba(37, 99, 235, 0.14)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
        transition: 'all 0.15s ease',
    }),
    cubeTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' },
    providerPill: (active) => ({
        fontSize: '0.7rem',
        fontWeight: '700',
        padding: '2px 8px',
        borderRadius: '6px',
        backgroundColor: active ? '#dbeafe' : '#f1f5f9',
        color: active ? '#1d4ed8' : '#334155',
    }),
    activePill: {
        fontSize: '0.72rem',
        fontWeight: '700',
        color: '#2563eb',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
    },
    checkingPill: { fontSize: '0.72rem', fontWeight: '700', color: '#d97706' },
    recPill: {
        fontSize: '0.7rem',
        fontWeight: '700',
        padding: '2px 7px',
        borderRadius: '6px',
        backgroundColor: '#fef3c7',
        color: '#92400e',
    },
    cubeTitle: { fontWeight: '700', fontSize: '0.96rem', color: '#0f172a' },
    cubeSub: { fontSize: '0.79rem', color: '#475569', lineHeight: 1.35, minHeight: '2.1em' },
    cubeModelId: {
        fontSize: '0.72rem',
        color: '#64748b',
        fontFamily: 'monospace',
        wordBreak: 'break-all',
    },
    cubeFooter: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '4px' },
    metaChip: (bg, fg) => ({
        fontSize: '0.71rem',
        fontWeight: '600',
        padding: '2px 7px',
        borderRadius: '6px',
        backgroundColor: bg,
        color: fg,
    }),
    formCard: {
        padding: '1.35rem',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        backgroundColor: '#f8fafc',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '12px',
    },
    field: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '0.8rem', fontWeight: '600', color: '#374151' },
    input: {
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        backgroundColor: 'white',
        fontSize: '0.86rem',
    },
    orBox: {
        marginTop: '14px',
        padding: '14px',
        borderRadius: '10px',
        backgroundColor: '#eef2ff',
        border: '1px solid #c7d2fe',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    orHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        flexWrap: 'wrap',
    },
    refreshBtn: {
        padding: '6px 12px',
        borderRadius: '7px',
        border: '1px solid #a5b4fc',
        backgroundColor: 'white',
        color: '#3730a3',
        fontSize: '0.78rem',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    },
    orErr: {
        padding: '8px 10px',
        borderRadius: '7px',
        backgroundColor: '#fef2f2',
        color: '#991b1b',
        fontSize: '0.8rem',
        border: '1px solid #fecaca',
    },
    chipWrap: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    orChip: (selected) => ({
        padding: '6px 11px',
        borderRadius: '999px',
        border: selected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
        backgroundColor: selected ? '#4f46e5' : '#ffffff',
        color: selected ? '#ffffff' : '#1e293b',
        fontSize: '0.78rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.12s ease',
    }),
    orderNum: {
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        color: '#4f46e5',
        fontWeight: '800',
        fontSize: '0.7rem',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantTag: (selected) => ({
        padding: '1px 6px',
        borderRadius: '5px',
        fontSize: '0.68rem',
        fontWeight: '700',
        backgroundColor: selected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
        color: selected ? '#ffffff' : '#475569',
    }),
    orBottomRow: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: '16px',
        flexWrap: 'wrap',
        marginTop: '4px',
    },
    checkboxLabel: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.82rem',
        color: '#312e81',
        cursor: 'pointer',
        paddingBottom: '8px',
    },
    actionRow: { marginTop: '14px', display: 'flex', gap: '10px', flexWrap: 'wrap' },
    testBtn: {
        padding: '10px 16px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        fontWeight: '600',
        fontSize: '0.88rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
    },
    saveBtn: {
        padding: '10px 18px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#2563eb',
        color: 'white',
        fontWeight: '600',
        fontSize: '0.88rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
    },
    benchCard: {
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        backgroundColor: '#ffffff',
    },
    benchHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
    },
    benchBtn: {
        padding: '9px 16px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#059669',
        color: 'white',
        fontWeight: '600',
        fontSize: '0.85rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
    },
    benchPre: {
        marginTop: '12px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        fontSize: '0.78rem',
        overflowX: 'auto',
        lineHeight: 1.5,
    },
};

export default LLMModelManager;
