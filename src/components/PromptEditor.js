// src/components/SystemPrompts.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Edit, X, RefreshCw, FileText } from 'lucide-react';

const SystemPrompts = () => {
    const [prompts, setPrompts] = useState([]);
    const [selectedPrompt, setSelectedPrompt] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    // Fetch all prompts on load
    useEffect(() => {
        fetchPrompts();
    }, []);

    const fetchPrompts = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${baseURL}/api/system-prompts/`);
            setPrompts(res.data);
        } catch (error) {
            console.error("Error fetching prompts", error);
            showMessage("Failed to load prompts", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPrompt = (prompt) => {
        setSelectedPrompt(prompt);
        setEditContent(prompt.content);
        setMessage(null);
    };

    const handleSave = async () => {
        if (!selectedPrompt) return;
        setSaving(true);
        try {
            const res = await axios.patch(`${baseURL}/api/system-prompts/${selectedPrompt.id}/`, {
                content: editContent
            });
            
            // Update local list
            const updatedList = prompts.map(p => p.id === selectedPrompt.id ? res.data : p);
            setPrompts(updatedList);
            setSelectedPrompt(res.data);
            showMessage("Prompt updated successfully!", "success");
        } catch (error) {
            console.error("Error updating prompt", error);
            showMessage("Failed to update prompt", "error");
        } finally {
            setSaving(false);
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    // --- Styles ---
    const styles = {
        container: { display: 'flex', height: '85vh', gap: '20px', padding: '20px', fontFamily: 'Segoe UI, sans-serif' },
        sidebar: { width: '300px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflowY: 'auto', padding: '15px' },
        editor: { flex: 1, background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', padding: '20px' },
        listItem: { padding: '12px', cursor: 'pointer', borderRadius: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' },
        textArea: { flex: 1, width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e0e0e0', fontSize: '16px', fontFamily: 'monospace', resize: 'none', lineHeight: '1.5', outline: 'none' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
        button: { padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' },
        saveBtn: { background: '#f9bb2b', color: '#07455c' },
        msg: { padding: '10px', borderRadius: '8px', marginBottom: '10px', textAlign: 'center', fontWeight: 'bold' }
    };

    return (
        <div style={styles.container}>
            {/* Sidebar List */}
            <div style={styles.sidebar}>
                <h3 style={{marginBottom: '15px', color: '#07455c'}}>System Prompts</h3>
                {loading ? <p>Loading...</p> : prompts.map(p => (
                    <div 
                        key={p.id} 
                        style={{
                            ...styles.listItem, 
                            background: selectedPrompt?.id === p.id ? '#eaf2f8' : 'transparent',
                            border: selectedPrompt?.id === p.id ? '1px solid #1c7d95' : '1px solid transparent'
                        }}
                        onClick={() => handleSelectPrompt(p)}
                    >
                        <FileText size={18} color="#1c7d95" />
                        <span style={{fontWeight: '500', color: '#333'}}>{p.name}</span>
                    </div>
                ))}
            </div>

            {/* Editor Area */}
            <div style={styles.editor}>
                {selectedPrompt ? (
                    <>
                        <div style={styles.header}>
                            <div>
                                <h2 style={{margin: 0, color: '#07455c'}}>{selectedPrompt.name}</h2>
                                <small style={{color: '#888'}}>Last updated: {new Date(selectedPrompt.updated_at).toLocaleString()}</small>
                            </div>
                            <button 
                                style={{...styles.button, ...styles.saveBtn, opacity: saving ? 0.7 : 1}} 
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? <RefreshCw className="spin" size={18}/> : <Save size={18}/>}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                        {message && (
                            <div style={{
                                ...styles.msg, 
                                background: message.type === 'success' ? '#d4edda' : '#f8d7da',
                                color: message.type === 'success' ? '#155724' : '#721c24'
                            }}>
                                {message.text}
                            </div>
                        )}

                        <textarea 
                            style={styles.textArea}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            spellCheck="false"
                        />
                    </>
                ) : (
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999'}}>
                        Select a prompt from the list to edit
                    </div>
                )}
            </div>
            <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default SystemPrompts;