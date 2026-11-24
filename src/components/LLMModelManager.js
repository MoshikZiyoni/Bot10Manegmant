import React, { useState, useEffect } from 'react';
import { Cpu, Zap, CheckCircle2, Save, Play, RotateCcw, Sliders, AlertCircle } from 'lucide-react';
import { callsApi } from './APIcalls';

const REASONING_OPTIONS = [
    { value: 'off', label: 'Off (enabled: false)' },
    { value: 'low', label: 'Low (effort: low — GPT-OSS)' },
    { value: 'minimal', label: 'Minimal (effort: minimal)' },
    { value: 'none', label: 'None (effort: none)' },
    { value: 'on', label: 'On (enabled: true)' },
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
    const [saving, setSaving] = useState(false);
    const [benchLoading, setBenchLoading] = useState(false);
    const [benchOutput, setBenchOutput] = useState('');
    const [statusMsg, setStatusMsg] = useState(null);

    const [source, setSource] = useState('env');
    const [presets, setPresets] = useState([]);
    const [providers, setProviders] = useState([]);

    const [activeConfig, setActiveConfig] = useState(null);
    const [provider, setProvider] = useState('openrouter');
    const [model, setModel] = useState('');
    const [fallbackProvider, setFallbackProvider] = useState('together');
    const [fallbackModel, setFallbackModel] = useState('');
    const [hedgeAfter, setHedgeAfter] = useState(0.55);
    const [temperature, setTemperature] = useState(0.4);
    const [orOrderText, setOrOrderText] = useState('');
    const [orAllowFallbacks, setOrAllowFallbacks] = useState(true);
    const [reasoningMode, setReasoningMode] = useState('off');

    const applyConfigToForm = (cfg, src) => {
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
        setOrOrderText(Array.isArray(order) ? order.join(', ') : '');
        setOrAllowFallbacks(extra?.provider?.allow_fallbacks !== false);
        setReasoningMode(extractReasoningMode(extra, cfg.model));
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await callsApi.getLLMSetting();
            setPresets(data.presets || []);
            setProviders(data.providers || []);
            applyConfigToForm(data.config, data.source);
        } catch (err) {
            console.error('Failed to load LLM settings:', err);
            setStatusMsg({ type: 'error', text: 'Failed to load LLM settings from backend.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const showToast = (type, text) => {
        setStatusMsg({ type, text });
        setTimeout(() => {
            setStatusMsg(prev => (prev?.text === text ? null : prev));
        }, 4000);
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
        setSaving(true);
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
                showToast('success', `Switched to ${preset.label}! Active on the next call.`);
            }
        } catch (err) {
            console.error('Preset switch error:', err);
            showToast('error', err?.response?.data?.error || 'Failed to switch model.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCustom = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            let extraBody = {};
            if (provider === 'openrouter') {
                const orderList = orOrderText
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);
                extraBody = {
                    reasoning: buildReasoningObject(reasoningMode),
                };
                if (orderList.length > 0) {
                    extraBody.provider = {
                        order: orderList,
                        allow_fallbacks: Boolean(orAllowFallbacks),
                    };
                }
            }
            const payload = {
                provider,
                model: model.trim(),
                fallback_provider: fallbackProvider.trim(),
                fallback_model: fallbackModel.trim(),
                hedge_after: parseFloat(hedgeAfter) || 0.55,
                temperature: parseFloat(temperature) || 0.4,
                openrouter_extra_body: extraBody,
            };
            const res = await callsApi.updateLLMSetting(payload);
            if (res.success) {
                applyConfigToForm(res.config, res.source);
                showToast('success', `Saved & activated ${res.config.provider}/${res.config.model}!`);
            }
        } catch (err) {
            console.error('Save custom model error:', err);
            showToast('error', err?.response?.data?.error || 'Failed to save custom configuration.');
        } finally {
            setSaving(false);
        }
    };

    const handleResetToEnv = async () => {
        if (!window.confirm('Reset LLM configuration back to server ENV defaults?')) return;
        setSaving(true);
        try {
            const res = await callsApi.updateLLMSetting({ reset: true });
            if (res.success) {
                applyConfigToForm(res.config, res.source);
                showToast('success', 'Reset to server ENV defaults.');
            }
        } catch (err) {
            showToast('error', 'Failed to reset configuration.');
        } finally {
            setSaving(false);
        }
    };

    const handleRunBenchmark = async () => {
        setBenchLoading(true);
        setBenchOutput('Running 3x live latency benchmark from backend server (takes ~25-45s)...');
        try {
            const targetModel = provider === 'openrouter' && model ? model : 'deepseek/deepseek-v4.1-flash-1017';
            const tableText = await callsApi.runProviderBenchmark(targetModel, 3);
            setBenchOutput(typeof tableText === 'string' ? tableText : JSON.stringify(tableText, null, 2));
        } catch (err) {
            setBenchOutput(`Benchmark failed: ${err?.response?.data?.error || err.message}`);
        } finally {
            setBenchLoading(false);
        }
    };

    if (loading) {
        return <div style={{ padding: '2rem', color: '#6b7280' }}>Loading AI Model settings...</div>;
    }

    const activeOrder = activeConfig?.openrouter_extra_body?.provider?.order || [];

    return (
        <div style={styles.container}>
            {/* Active Banner */}
            <div style={styles.banner}>
                <div>
                    <div style={styles.bannerTop}>
                        <span style={styles.badge(source === 'redis')}>
                            {source === 'redis' ? 'ACTIVE · SAVED IN ADMIN UI' : 'ACTIVE · ENV DEFAULT'}
                        </span>
                        <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                            Takes effect immediately on every new call
                        </span>
                    </div>
                    <h2 style={styles.bannerTitle}>
                        <Cpu size={24} />
                        {activeConfig?.provider} / {activeConfig?.model}
                    </h2>
                    <p style={styles.bannerSub}>
                        {activeOrder.length > 0 && `OpenRouter order: [${activeOrder.join(' → ')}] · `}
                        Fallback: {activeConfig?.fallback_provider || 'none'}
                        {activeConfig?.fallback_model ? `/${activeConfig.fallback_model}` : ''} ·
                        Hedge: {activeConfig?.hedge_after}s · Temp: {activeConfig?.temperature}
                    </p>
                </div>
                <button
                    onClick={handleResetToEnv}
                    disabled={saving || source === 'env'}
                    style={styles.resetBtn(source === 'env')}
                    title="Clear Admin UI override and revert to .env defaults"
                >
                    <RotateCcw size={16} />
                    Reset to ENV
                </button>
            </div>

            {statusMsg && (
                <div style={styles.toast(statusMsg.type)}>
                    {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{statusMsg.text}</span>
                </div>
            )}

            {/* One-Click Presets */}
            <div>
                <h3 style={styles.sectionTitle}>
                    <Zap size={18} color="#f59e0b" />
                    Quick One-Click Switch
                </h3>
                <div style={styles.presetGrid}>
                    {presets.map(preset => {
                        const active = isPresetActive(preset);
                        return (
                            <button
                                key={preset.id}
                                onClick={() => handleSelectPreset(preset)}
                                disabled={saving}
                                style={styles.presetCard(active)}
                            >
                                <div style={styles.presetHeader}>
                                    <span style={styles.presetName}>{preset.label}</span>
                                    {active && <CheckCircle2 size={18} color="#2563eb" />}
                                </div>
                                <div style={styles.presetModel}>
                                    {preset.provider} · {preset.model}
                                </div>
                                {preset.badge && (
                                    <div style={styles.presetBadge(active)}>{preset.badge}</div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Custom Model Configuration */}
            <form onSubmit={handleSaveCustom} style={styles.formCard}>
                <h3 style={styles.sectionTitle}>
                    <Sliders size={18} color="#4f46e5" />
                    Custom Model &amp; Routing
                </h3>

                <div style={styles.formGrid}>
                    <div style={styles.field}>
                        <label style={styles.label}>Primary Provider</label>
                        <select
                            value={provider}
                            onChange={e => setProvider(e.target.value)}
                            style={styles.input}
                        >
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.label} {p.has_key ? '✓' : '(no API key)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Primary Model ID</label>
                        <input
                            type="text"
                            value={model}
                            onChange={e => setModel(e.target.value)}
                            placeholder="e.g. deepseek/deepseek-v4.1-flash-1017 or openai/gpt-oss-120b"
                            required
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Fallback Provider</label>
                        <select
                            value={fallbackProvider}
                            onChange={e => setFallbackProvider(e.target.value)}
                            style={styles.input}
                        >
                            <option value="">None (disabled)</option>
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.label} {p.has_key ? '✓' : '(no key)'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Fallback Model ID</label>
                        <input
                            type="text"
                            value={fallbackModel}
                            onChange={e => setFallbackModel(e.target.value)}
                            placeholder="e.g. deepseek-ai/DeepSeek-V4.1-Flash-1017"
                            style={styles.input}
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Hedge After (seconds)</label>
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

                {provider === 'openrouter' && (
                    <div style={styles.orBox}>
                        <div style={styles.formGrid}>
                            <div style={styles.field}>
                                <label style={styles.label}>OpenRouter Provider Order (comma-separated)</label>
                                <input
                                    type="text"
                                    value={orOrderText}
                                    onChange={e => setOrOrderText(e.target.value)}
                                    placeholder="wafer/mxfp4, inference-net/us, nebius/fp4"
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Reasoning Mode</label>
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
                        </div>
                        <label style={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={orAllowFallbacks}
                                onChange={e => setOrAllowFallbacks(e.target.checked)}
                            />
                            Allow OpenRouter fallbacks if primary providers are unavailable
                        </label>
                    </div>
                )}

                <div style={{ marginTop: '1rem', display: 'flex', gap: '12px' }}>
                    <button type="submit" disabled={saving} style={styles.saveBtn}>
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save & Activate Model'}
                    </button>
                </div>
            </form>

            {/* Live Cloud Benchmark */}
            <div style={styles.benchCard}>
                <div style={styles.benchHeader}>
                    <div>
                        <h3 style={{ ...styles.sectionTitle, margin: 0 }}>
                            <Play size={18} color="#10b981" />
                            Live Server Latency Benchmark (3x per provider)
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
                            Tests the active voice prompt directly from your Railway server against OpenRouter providers.
                        </p>
                    </div>
                    <button
                        onClick={handleRunBenchmark}
                        disabled={benchLoading}
                        style={styles.benchBtn}
                    >
                        <Play size={16} />
                        {benchLoading ? 'Benchmarking...' : `Benchmark ${provider === 'openrouter' && model ? model : 'DeepSeek'}`}
                    </button>
                </div>
                {benchOutput && (
                    <pre style={styles.benchPre}>{benchOutput}</pre>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    banner: {
        padding: '1.5rem',
        borderRadius: '14px',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    bannerTop: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
    badge: (isCustom) => ({
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: '700',
        backgroundColor: isCustom ? '#2563eb' : '#475569',
        color: 'white',
        letterSpacing: '0.5px',
    }),
    bannerTitle: {
        margin: 0,
        fontSize: '1.35rem',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    bannerSub: { margin: '6px 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' },
    resetBtn: (disabled) => ({
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.25)',
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: 'white',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.85rem',
        fontWeight: '600',
    }),
    toast: (type) => ({
        padding: '12px 16px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.9rem',
        fontWeight: '500',
        backgroundColor: type === 'success' ? '#ecfdf5' : '#fef2f2',
        color: type === 'success' ? '#065f46' : '#991b1b',
        border: `1px solid ${type === 'success' ? '#a7f3d0' : '#fecaca'}`,
    }),
    sectionTitle: {
        margin: '0 0 12px 0',
        fontSize: '1.05rem',
        fontWeight: '700',
        color: '#111827',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    presetGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '12px',
    },
    presetCard: (active) => ({
        textAlign: 'left',
        padding: '14px',
        borderRadius: '12px',
        border: active ? '2px solid #2563eb' : '1px solid #e5e7eb',
        backgroundColor: active ? '#eff6ff' : '#ffffff',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'all 0.15s ease',
    }),
    presetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
    presetName: { fontWeight: '700', fontSize: '0.92rem', color: '#111827' },
    presetModel: { fontSize: '0.78rem', color: '#4b5563', fontFamily: 'monospace' },
    presetBadge: (active) => ({
        marginTop: '4px',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: active ? '#1d4ed8' : '#059669',
    }),
    formCard: {
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '12px',
    },
    field: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '0.8rem', fontWeight: '600', color: '#374151' },
    input: {
        padding: '8px 10px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        backgroundColor: 'white',
        fontSize: '0.88rem',
    },
    orBox: {
        marginTop: '12px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: '#eef2ff',
        border: '1px solid #c7d2fe',
    },
    checkboxLabel: {
        marginTop: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.83rem',
        color: '#374151',
        cursor: 'pointer',
    },
    saveBtn: {
        padding: '10px 18px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#2563eb',
        color: 'white',
        fontWeight: '600',
        fontSize: '0.9rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
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
        display: 'flex',
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
