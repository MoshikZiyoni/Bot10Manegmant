import React, { useEffect, useState } from 'react';
import { X, Check, ExternalLink, RefreshCw, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const modalOverlayStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
};

const modalContentStyle = {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    width: '90%', maxWidth: '900px', height: '80vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

const AlertsManagementModal = ({ onClose, onUpdate }) => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPendingAlerts = async () => {
        setLoading(true);
        try {
            // Fetch only pending reviews
            const response = await fetch('/api/calls/?review_status=pending&limit=100');
            const data = await response.json();
            setCalls(data.results || []);
        } catch (error) {
            console.error("Error fetching alerts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingAlerts();
    }, []);

    const handleStatusUpdate = async (callId, newStatus) => {
        try {
            const response = await fetch(`/api/calls/${callId}/review-status/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Remove the call from the local list immediately for snappier UI
                setCalls(prev => prev.filter(c => c.id !== callId));
                // Trigger parent update to refresh badge count
                if (onUpdate) onUpdate();
            }
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    return (
        <div style={modalOverlayStyle} onClick={onClose}>
            <div style={modalContentStyle} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        ⚠️ Alert Management
                        <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                            {calls.length} Pending
                        </span>
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Content - Table */}
                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-gray-400">Loading...</div>
                    ) : calls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Check size={48} className="text-green-500 mb-2" />
                            <p className="text-lg">All caught up! No pending alerts.</p>
                        </div>
                    ) : (
                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                            <thead className="uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-gray-600">Date</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600">Caller ID</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600">Summary</th>
                                    <th className="px-6 py-4 font-semibold text-gray-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {calls.map((call) => (
                                    <tr key={call.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500">{call.formatted_created_at}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {call.phone_number} <br />
                                            <span className="text-xs text-gray-400">{call.caller_id}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                                            {/* Display snippet of conclusion or "Check Conversation" */}
                                            {call.conclusion ?
                                                (typeof call.conclusion === 'string' ? call.conclusion.substring(0, 50) : 'View details')
                                                : 'Check conversation text...'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">

                                                {/* View Details Link */}
                                                <Link
                                                    to={`/calls/${call.id}`}
                                                    onClick={onClose}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 mr-2"
                                                    title="View Call Details"
                                                >
                                                    <ExternalLink size={18} />
                                                </Link>

                                                {/* Handled (V) Button */}
                                                <button
                                                    onClick={() => handleStatusUpdate(call.id, 'handled')}
                                                    className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-medium transition-colors"
                                                    title="Mark as Handled"
                                                >
                                                    <Check size={18} />
                                                    <span className="hidden sm:inline">Handled</span>
                                                </button>

                                                {/* Dismiss (X) Button */}
                                                <button
                                                    onClick={() => handleStatusUpdate(call.id, 'dismissed')}
                                                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                                                    title="Dismiss / Ignore"
                                                >
                                                    <XCircle size={18} />
                                                    <span className="hidden sm:inline">Dismiss</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertsManagementModal;