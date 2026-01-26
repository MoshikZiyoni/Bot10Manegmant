import React, { useState, useEffect } from 'react';
import { callsApi } from './APIcalls';

const VoiceSelector = () => {
    const [currentVoice, setCurrentVoice] = useState('Puck');
    const [voices, setVoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    // Fetch current setting on mount
    useEffect(() => {
        callsApi.getVoiceSetting()
            .then(data => {
                if (data.voice_id) {
                    setCurrentVoice(data.voice_id);
                    setVoices(data.voices || ["Puck", "Charon", "Aoede", "Fenrir", "Kore"]);
                }
            })
            .catch(err => console.error("Failed to fetch voice setting:", err));
    }, []);

    const handleChange = (e) => {
        const newVoice = e.target.value;
        setCurrentVoice(newVoice);
        setLoading(true);
        setStatus('Saving...');

        callsApi.updateVoiceSetting(newVoice)
            .then(data => {
                setLoading(false);
                if (data.success) {
                    setStatus('Saved!');
                    setTimeout(() => setStatus(''), 2000);
                } else {
                    setStatus('Error saving.');
                }
            })
            .catch(err => {
                console.error("Error updating voice:", err);
                setLoading(false);
                setStatus('Error.');
            });
    };

    return (
        <div style={styles.container}>
            <h3 style={styles.label}>AI Voice Settings</h3>
            <div style={styles.controlGroup}>
                <select
                    value={currentVoice}
                    onChange={handleChange}
                    disabled={loading}
                    style={styles.select}
                >
                    {voices.map(voice => (
                        <option key={voice} value={voice}>{voice}</option>
                    ))}
                </select>
                {status && <span style={styles.status}>{status}</span>}
            </div>
            <p style={styles.hint}>
                Selected voice will be used for the next call.
            </p>
        </div>
    );
};

// Basic inline styles - customize as needed
const styles = {
    container: {
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        maxWidth: '400px',
        margin: '20px 0',
        border: '1px solid #e9ecef'
    },
    label: {
        margin: '0 0 10px 0',
        fontSize: '16px',
        color: '#333'
    },
    controlGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    select: {
        padding: '8px 12px',
        borderRadius: '4px',
        border: '1px solid #ced4da',
        fontSize: '14px',
        minWidth: '150px'
    },
    status: {
        fontSize: '12px',
        color: '#28a745',
        fontWeight: '500'
    },
    hint: {
        margin: '10px 0 0 0',
        fontSize: '12px',
        color: '#6c757d'
    }
};

export default VoiceSelector;
