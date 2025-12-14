import React, { useState, useEffect } from 'react';
import { Search, Edit2, Check, X } from 'lucide-react';
import { callsApi } from './APIcalls';

const UserCreditManager = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ quota: 0 });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await callsApi.getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (user) => {
        setEditingId(user.id);
        setEditForm({ quota: user.quota });
    };

    const handleSave = async (userId) => {
        try {
            await callsApi.updateUserQuota(userId, editForm.quota);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, quota: editForm.quota } : u));
            setEditingId(null);
        } catch (error) {
            alert("Failed to update quota");
        }
    };

    const styles = {
        container: { padding: '1rem' },
        toolbar: { marginBottom: '1.5rem', display: 'flex', gap: '1rem' },
        search: {
            padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db',
            width: '300px', fontSize: '0.95rem'
        },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' },
        th: { textAlign: 'left', padding: '12px 16px', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: '600' },
        td: { padding: '16px', borderBottom: '1px solid #f3f4f6', color: '#374151' },
        input: { padding: '6px', borderRadius: '4px', border: '1px solid #d1d5db', width: '80px' },
        saveBtn: { background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', padding: '4px' },
        cancelBtn: { background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px' },
        editBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
        badge: (status) => ({
            padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '600',
            backgroundColor: status === 'active' ? '#dcfce7' : '#fef3c7',
            color: status === 'active' ? '#166534' : '#92400e'
        })
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={styles.container}>
            <div style={styles.toolbar}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#9ca3af' }} />
                    <input
                        style={{ ...styles.search, paddingLeft: '38px' }}
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>User / Client</th>
                        <th style={styles.th}>Used Minutes</th>
                        <th style={styles.th}>Quota Limit</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredUsers.map(user => (
                        <tr key={user.id}>
                            <td style={styles.td}>
                                <div style={{ fontWeight: '600' }}>{user.name}</div>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{user.email}</div>
                            </td>
                            <td style={styles.td}>{user.used_minutes.toFixed(1)}</td>
                            <td style={styles.td}>
                                {editingId === user.id ? (
                                    <input
                                        type="number"
                                        value={editForm.quota}
                                        onChange={(e) => setEditForm({ ...editForm, quota: parseFloat(e.target.value) })}
                                        style={styles.input}
                                    />
                                ) : (
                                    <span>{user.quota}</span>
                                )}
                            </td>
                            <td style={styles.td}>
                                <span style={styles.badge(user.status)}>{user.status.toUpperCase()}</span>
                            </td>
                            <td style={styles.td}>
                                {editingId === user.id ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => handleSave(user.id)} style={styles.saveBtn}><Check size={18} /></button>
                                        <button onClick={() => setEditingId(null)} style={styles.cancelBtn}><X size={18} /></button>
                                    </div>
                                ) : (
                                    <button onClick={() => handleEditClick(user)} style={styles.editBtn}>
                                        <Edit2 size={16} /> Edit Limit
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserCreditManager;
