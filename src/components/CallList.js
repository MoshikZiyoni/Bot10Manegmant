import { useState, useEffect, useRef } from 'react';
// The user's code uses Link, but in this environment, a standard <a> tag is used for navigation.
// import { Link } from 'react-router-dom';
import { PhoneIncoming, PhoneOutgoing, Search, Filter, Download, ChevronDown, Loader2, ArrowUp, ArrowDown } from 'lucide-react'; // Import ArrowUp and ArrowDown
import axios from 'axios';
import { Link } from 'react-router-dom';

const CallList = () => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(() => {
        return parseInt(sessionStorage.getItem('callList_page') || '1', 10);
    });
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [customDaysInput, setCustomDaysInput] = useState('');
    const customDaysTimeout = useRef();
    const [exporting, setExporting] = useState(false);
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const [filters, setFilters] = useState(() => {
        try {
            const storedFilters = sessionStorage.getItem('callList_filters');
            if (storedFilters) {
                return JSON.parse(storedFilters);
            }
        } catch (e) {
            console.error('Error parsing stored filters:', e);
        }
        return {
            direction: '',
            status: '',
            search: '',
            has_offer: '',
            created_within_days: ''
        };
    });
    const [showFilters, setShowFilters] = useState(() => {
        try {
            const storedFilters = JSON.parse(sessionStorage.getItem('callList_filters') || '{}');
            return Object.values(storedFilters).some(v => v !== '');
        } catch (e) {
            return false;
        }
    });
    const [sortOrder, setSortOrder] = useState(() => {
        return sessionStorage.getItem('callList_sortOrder') || 'desc';
    });
    const [lastSelectedCallId, setLastSelectedCallId] = useState(() => {
        return sessionStorage.getItem('callList_lastSelectedCallId') || null;
    });
    const [viewedCallIds, setViewedCallIds] = useState(() => {
        try {
            const stored = localStorage.getItem('callList_viewedIds');
            return stored ? JSON.parse(stored).map(String) : [];
        } catch (e) {
            return [];
        }
    });
    const activeRowRef = useRef(null);

    const [selectedCalls, setSelectedCalls] = useState([]);
    const [terminating, setTerminating] = useState(false);
    // Import callsApi logic
    // We need to import callsApi. Since it's exported from APIcalls.js as 'callsApi', we likely need to fix imports or just use the default export if attached to it. 
    // Looking at file 2, APIcalls.js exports `callsApi` as a named export and `api` (axios instance) as default. 
    // We should probably check the imports in CallList.js, but I'll assume I can just use `api` for now if `callsApi` isn't imported, 
    // OR better, let's update imports in a separate step or assume it is available. 
    // Wait, the file 1 (CallList.js) imports `axios` directly but doesn't seem to import `callsApi` from `./APIcalls`. 
    // It makes raw axios calls. I should stick to that pattern or import `callsApi`. 
    // To be consistent with existing code in CallList.js which uses `axios` and `baseURL`, I will initially implement the termination call using `axios` directly for reliability 
    // unless I verify `callsApi` is imported. It is NOT imported in line 1-6. 
    // However, I just added `terminateMultipleCalls` to `APIcalls.js`. To use it, I should import `callsApi`.

    // I will add the logic functions here. I will need to update imports in a separate step to import { callsApi } from './APIcalls'.

    const handleSelectCall = (id) => {
        setSelectedCalls(prev =>
            prev.includes(id) ? prev.filter(callId => callId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedCalls.length === calls.length) {
            setSelectedCalls([]);
        } else {
            setSelectedCalls(calls.map(call => call.id));
        }
    };

    const handleTerminateSelected = async () => {
        if (!window.confirm(`Are you sure you want to terminate ${selectedCalls.length} calls?`)) return;

        setTerminating(true);
        try {
            // We use the same endpoint logic as in APIcalls.js
            // Since `callsApi` is not imported yet in the file view I saw, I will use axios directly for now to match the file's style,
            // OR I can add the import. Adding the import is cleaner.
            // I'll assume I'll add the import in the next step.
            // For now, let's use the code that assumes `callsApi` is available or implement it inline.
            // Let's implement inline to reduce dependencies on imports I haven't fixed yet, 
            // but actually, using `callsApi` is better.

            // Inline implementation matching APIcalls.js logic:
            const promises = selectedCalls.map(id => axios.post(`${baseURL}/api/admin/calls/${id}/terminate/`));
            await Promise.allSettled(promises);

            // Refresh calls
            fetchCalls();
            setSelectedCalls([]);
            alert('Selected calls have been processed for termination.');
        } catch (error) {
            console.error('Error terminating calls:', error);
            alert('Failed to terminate some calls.');
        } finally {
            setTerminating(false);
        }
    };

    const handleCallClick = (callId) => {
        const strId = String(callId);
        sessionStorage.setItem('callList_shouldRestore', 'true');
        sessionStorage.setItem('callList_lastSelectedCallId', strId);
        setViewedCallIds(prev => {
            const stringifiedPrev = prev.map(String);
            if (stringifiedPrev.includes(strId)) return prev;
            const updated = [...stringifiedPrev, strId];
            localStorage.setItem('callList_viewedIds', JSON.stringify(updated));
            return updated;
        });
    };

    // --- Brand Colors ---
    const brandColors = {
        yellow: '#f9bb2b',
        darkBlue: '#07455c',
        neutral: '#fefef9',
        accentBlue: '#1c7d95',
    };

    useEffect(() => {
        fetchCalls();
    }, [page, filters.direction, filters.status, filters.created_within_days, sortOrder]); // Add sortOrder to dependencies

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchCalls();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [filters.search, filters.has_offer]);

    useEffect(() => {
        sessionStorage.setItem('callList_page', page);
    }, [page]);

    useEffect(() => {
        sessionStorage.setItem('callList_filters', JSON.stringify(filters));
    }, [filters]);

    useEffect(() => {
        sessionStorage.setItem('callList_sortOrder', sortOrder);
    }, [sortOrder]);

    useEffect(() => {
        if (!loading && calls.length > 0 && lastSelectedCallId) {
            if (activeRowRef.current) {
                setTimeout(() => {
                    activeRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }, [loading, calls, lastSelectedCallId]);


    const fetchCalls = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page });
            if (filters.direction) params.append('direction', filters.direction);
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);
            if (filters.has_offer) params.append('has_offer', filters.has_offer);
            if (filters.created_within_days && filters.created_within_days !== 'custom') {
                params.append('created_within_days', filters.created_within_days);
            }
            // Add sorting parameter
            if (sortOrder) {
                params.append('ordering', sortOrder === 'asc' ? 'created_at' : '-created_at');
            }

            const response = await axios.get(`${baseURL}/api/calls/?${params.toString()}`);
            setCalls(response.data.results || []);
            setTotalPages(Math.ceil((response.data.count || 0) / 10));
            setTotalResults(response.data.count || 0);
        } catch (error) {
            console.error('Error fetching calls:', error);
            setCalls([]);
            setTotalResults(0);
        } finally {
            setLoading(false);
        }
    };

    // This effect syncs the custom input field with the filter value.
    useEffect(() => {
        const isPredefined = ['', 'today', '7', '30', '90', 'custom'].includes(filters.created_within_days);
        if (isPredefined && filters.created_within_days !== 'custom') {
            setCustomDaysInput('');
        } else if (!isPredefined) {
            setCustomDaysInput(filters.created_within_days);
        }
    }, [filters.created_within_days]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        if (name !== 'search' && name !== 'has_offer') {
            setPage(1);
        }
    };

    const handleClearFilters = () => {
        const emptyFilters = {
            direction: '',
            status: '',
            search: '',
            has_offer: '',
            created_within_days: ''
        };
        setFilters(emptyFilters);
        setPage(1);
        sessionStorage.removeItem('callList_filters');
        sessionStorage.setItem('callList_page', '1');
    };

    const handleCustomDaysChange = (e) => {
        const val = e.target.value;
        setCustomDaysInput(val);
        clearTimeout(customDaysTimeout.current);
        customDaysTimeout.current = setTimeout(() => {
            setFilters(prev => ({ ...prev, created_within_days: val }));
            setPage(1);
        }, 1000);
    };

    const handleSortToggle = () => {
        // Toggle sort order: 'desc' -> 'asc' -> '' (no sort) -> 'desc'
        setSortOrder(prevSortOrder => {
            if (prevSortOrder === 'desc') return 'asc';
            if (prevSortOrder === 'asc') return '';
            return 'desc';
        });
        setPage(1); // Reset to page 1 when sorting changes
    };

    const getExportUrl = () => {
        const params = new URLSearchParams();
        if (filters.direction) params.append('direction', filters.direction);
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);
        if (filters.has_offer) params.append('has_offer', filters.has_offer);
        if (filters.created_within_days && filters.created_within_days !== 'custom') {
            params.append('created_within_days', filters.created_within_days);
        }
        if (sortOrder) {
            params.append('ordering', sortOrder === 'asc' ? 'created_at' : '-created_at');
        }
        return `${baseURL}/api/export-calls-excel/?${params.toString()}`;
    };

    const handleExportExcel = async () => {
        setExporting(true);
        try {
            const url = getExportUrl();
            const response = await axios.get(url, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const downloadLink = document.createElement('a');
            downloadLink.href = window.URL.createObjectURL(blob);
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'calls_export.xlsx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
                if (filenameMatch && filenameMatch[1]) filename = filenameMatch[1];
            }
            downloadLink.setAttribute('download', filename);
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            window.URL.revokeObjectURL(downloadLink.href);
        } catch (error) {
            console.error('Error exporting calls:', error);
            alert('Failed to export calls. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const getPaginationPages = (currentPage, totalPages) => {
        const pages = [];
        const numPageLinks = 5;
        const sidePages = Math.floor(numPageLinks / 2);

        let startPage = Math.max(1, currentPage - sidePages);
        let endPage = Math.min(totalPages, currentPage + sidePages);

        if (endPage - startPage + 1 < numPageLinks) {
            if (startPage === 1) {
                endPage = Math.min(totalPages, startPage + numPageLinks - 1);
            } else if (endPage === totalPages) {
                startPage = Math.max(1, totalPages - numPageLinks + 1);
            }
        }

        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) {
                pages.push('...');
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push('...');
            }
            pages.push(totalPages);
        }

        return pages;
    };

    // --- STYLES OBJECT ---
    const styles = {
        page: { fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", backgroundColor: brandColors.neutral, color: brandColors.darkBlue, minHeight: '100vh', padding: '2rem' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
        title: { fontSize: '2.5rem', fontWeight: '600', color: brandColors.darkBlue, margin: 0 },
        newCallButton: { padding: '12px 24px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: brandColors.yellow, color: brandColors.darkBlue, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', transition: 'background-color 0.2s' },
        controlsContainer: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', marginBottom: '2rem' },
        topControls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' },
        searchInput: { position: 'relative', flexGrow: 1 },
        searchInputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: brandColors.accentBlue },
        searchInputEl: { width: '100%', padding: '12px 12px 12px 40px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '8px', outline: 'none' },
        filterButton: { padding: '12px 20px', fontSize: '1rem', backgroundColor: 'transparent', color: brandColors.darkBlue, border: `1px solid ${brandColors.accentBlue}`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
        filtersPanel: { borderTop: '1px solid #e0e0e0', marginTop: '1.5rem', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' },
        filterGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
        filterLabel: { fontWeight: '500', fontSize: '0.9rem', color: brandColors.accentBlue },
        filterSelect: { padding: '10px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '8px' },
        customDaysGroup: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
        tableContainer: { backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' },
        tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
        resultsCount: { color: brandColors.accentBlue, fontWeight: '500' },
        exportButton: { padding: '10px 18px', fontSize: '0.9rem', backgroundColor: brandColors.accentBlue, color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', },
        table: { width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' },
        tableTh: { padding: '12px 15px', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: brandColors.accentBlue, textTransform: 'uppercase', borderBottom: `2px solid #e0e0e0` },
        tableRow: { backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', transition: 'transform 0.2s' },
        tableRowHighlighted: { backgroundColor: '#fffbeb', boxShadow: '0 4px 12px rgba(249, 187, 43, 0.25)', transition: 'transform 0.2s', transform: 'translateY(-2px)' },
        tableTd: { padding: '15px', border: 'none', borderBottom: '1px solid #f0f0f0' },
        iconTd: { display: 'flex', alignItems: 'center', gap: '10px' },
        statusBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'capitalize' },
        viewLink: { textDecoration: 'none', color: brandColors.accentBlue, fontWeight: 'bold' },
        paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 0' },
        pageButton: { background: '#fff', border: '1px solid #ccc', borderRadius: '6px', minWidth: '40px', height: '40px', cursor: 'pointer', margin: '0 4px', color: brandColors.darkBlue, display: 'flex', justifyContent: 'center', alignItems: 'center' },
        paginationEllipsis: { margin: '0 8px', color: '#ccc' },
        activePage: { backgroundColor: brandColors.darkBlue, color: 'white', borderColor: brandColors.darkBlue },
        loader: { textAlign: 'center', padding: '4rem', fontSize: '1.2rem', color: brandColors.accentBlue, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' },
        spinner: { animation: 'spin 1s linear infinite' },
        noResults: { textAlign: 'center', padding: '4rem', fontSize: '1.2rem', color: brandColors.accentBlue },
        sortArrow: { cursor: 'pointer', marginLeft: '5px', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' },
    };

    const getStatusStyle = (status) => {
        const base = styles.statusBadge;
        switch (status) {
            case 'completed': return { ...base, color: '#27ae60', backgroundColor: '#eafaf1' };
            case 'failed': return { ...base, color: '#c0392b', backgroundColor: '#f9ebea' };
            case 'in_progress': return { ...base, color: '#2980b9', backgroundColor: '#eaf2f8' };
            case 'canceled': return { ...base, color: '#f39c12', backgroundColor: '#fef5e7' };
            case 'busy': return { ...base, color: '#8e44ad', backgroundColor: '#f4ecf7' };
            case 'no_answer': return { ...base, color: '#8e44ad', backgroundColor: '#f4ecf7' };
            case 'voicemail_detected': return { ...base, color: '#f1c40f', backgroundColor: '#fef9e7' };
            default: return { ...base, color: '#7f8c8d', backgroundColor: '#f4f6f7' };
        }
    };

    const isCustomDate = !['', 'today', '7', '30', '90'].includes(filters.created_within_days);
    const dateDropdownValue = isCustomDate ? 'custom' : filters.created_within_days;

    return (
        <div style={styles.page}>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .calls-table tbody tr:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.08); }`}</style>
            <header style={styles.header}>
                <h1 style={styles.title}>Call History</h1>
                {/* <Link to="/calls/new" style={styles.newCallButton}>New Call</Link> */}
            </header>

            <div style={styles.controlsContainer}>
                <div style={styles.topControls}>
                    <div style={styles.searchInput}>
                        <Search size={18} style={styles.searchInputIcon} />
                        <input style={styles.searchInputEl} type="text" placeholder="Search by phone number..." name="search" value={filters.search} onChange={handleFilterChange} />
                    </div>
                    <button style={styles.filterButton} onClick={() => setShowFilters(!showFilters)}>
                        <Filter size={16} /> Filters <ChevronDown size={16} style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                    </button>
                    {Object.values(filters).some(v => v !== '') && (
                        <button 
                            style={{ ...styles.filterButton, backgroundColor: '#e74c3c', color: '#fff', border: 'none' }} 
                            onClick={handleClearFilters}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
                {showFilters && (
                    <div style={styles.filtersPanel}>
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Direction</label>
                            <select style={styles.filterSelect} name="direction" value={filters.direction} onChange={handleFilterChange}>
                                <option value="">All</option><option value="in">Incoming</option><option value="out">Outgoing</option>
                            </select>
                        </div>
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Created Within</label>
                            <select style={styles.filterSelect} name="created_within_days" value={dateDropdownValue} onChange={handleFilterChange}>
                                <option value="">Any time</option><option value="today">Today</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option><option value="custom">Custom...</option>
                            </select>
                            {dateDropdownValue === "custom" && (
                                <div style={styles.customDaysGroup}>
                                    <input type="number" min="1" placeholder="Days" value={customDaysInput} onChange={handleCustomDaysChange} style={{ ...styles.filterSelect, width: '80px', marginTop: '4px' }} />
                                    <span style={{ color: brandColors.accentBlue }}>days</span>
                                </div>
                            )}
                        </div>
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Status</label>
                            <select style={styles.filterSelect} name="status" value={filters.status} onChange={handleFilterChange}>
                                <option value="">All</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="canceled">Canceled</option><option value="busy">Busy</option><option value="no_answer">No Answer</option><option value="voicemail_detected">Voice Mail</option>
                            </select>
                        </div>
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Keyword / Offer</label>
                            <input
                                type="text"
                                style={styles.filterSelect}
                                name="has_offer"
                                placeholder="e.g. טיולים, הצעה..."
                                value={filters.has_offer || ''}
                                onChange={handleFilterChange}
                            />
                        </div>
                    </div>
                )}
            </div>

            <div style={styles.tableContainer}>
                <div style={styles.tableHeader}>
                    <div style={styles.resultsCount}>{loading ? ' ' : `${totalResults} results found`}</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {selectedCalls.length > 0 && (
                            <button
                                style={{ ...styles.exportButton, backgroundColor: '#c0392b', border: 'none' }}
                                onClick={handleTerminateSelected}
                                disabled={terminating}
                            >
                                {terminating ? <Loader2 size={16} style={styles.spinner} /> : <PhoneOutgoing size={16} style={{ transform: 'rotate(135deg)' }} />}
                                {terminating ? 'Terminating...' : `Terminate Selected (${selectedCalls.length})`}
                            </button>
                        )}
                        <button style={styles.exportButton} onClick={handleExportExcel} disabled={exporting || calls.length === 0}>
                            {exporting ? <Loader2 size={16} style={styles.spinner} /> : <Download size={16} />}
                            {exporting ? 'Exporting...' : 'Export to Excel'}
                        </button>
                    </div>
                </div>
                {loading ? (
                    <div style={styles.loader}><Loader2 size={24} style={styles.spinner} /> Loading calls...</div>
                ) : calls.length > 0 ? (
                    <table style={styles.table}>
                        <thead><tr>
                            <th style={{ ...styles.tableTh, width: '40px' }}>
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={calls.length > 0 && selectedCalls.length === calls.length}
                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                            </th>
                            <th style={styles.tableTh}>Phone Number</th><th style={styles.tableTh}>Direction</th>
                            <th style={styles.tableTh}>Status</th><th style={styles.tableTh}>Duration</th>
                            <th style={styles.tableTh}>
                                Created At
                                <span style={styles.sortArrow} onClick={handleSortToggle}>
                                    {sortOrder === 'desc' ? <ArrowDown size={14} /> : sortOrder === 'asc' ? <ArrowUp size={14} /> : <ChevronDown size={14} />}
                                </span>
                            </th>
                            <th style={styles.tableTh}>Record</th>
                            <th style={styles.tableTh}>Actions</th>
                        </tr></thead>
                        <tbody>{calls.map(call => {
                            const isLastSelected = String(call.id) === String(lastSelectedCallId);
                            const isViewed = viewedCallIds.includes(String(call.id));
                            const r2AudioUrl = call.recording_url || (call.call_sid ? `https://pub-41c4983bb0df4ea290ddc778bb8d8081.r2.dev/recording_${String(call.call_sid).replace(/[:/\\]/g, '_')}.mp3` : null);
                            return (
                                <tr 
                                    key={call.id} 
                                    ref={isLastSelected ? activeRowRef : null}
                                    style={isLastSelected ? styles.tableRowHighlighted : styles.tableRow}
                                >
                                    <td style={{
                                        ...styles.tableTd,
                                        ...(isLastSelected ? { borderLeft: `4px solid ${brandColors.yellow}` } : {})
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedCalls.includes(call.id)}
                                            onChange={() => handleSelectCall(call.id)}
                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                        />
                                    </td>
                                    <td style={{
                                        ...styles.tableTd,
                                        fontWeight: isViewed ? 'normal' : '600',
                                        color: isViewed ? '#7f8c8d' : brandColors.darkBlue
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {!isViewed && (
                                                <span 
                                                    style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor: brandColors.accentBlue,
                                                        display: 'inline-block'
                                                    }}
                                                    title="New call"
                                                />
                                            )}
                                            {call.phone_number}
                                        </div>
                                    </td>
                                    <td style={{
                                        ...styles.tableTd,
                                        color: isViewed ? '#7f8c8d' : 'inherit'
                                    }}>
                                        <div style={styles.iconTd}>
                                            {call.direction === 'in' ? (
                                                <PhoneIncoming size={18} color={isViewed ? '#95a5a6' : '#27ae60'} />
                                            ) : (
                                                <PhoneOutgoing size={18} color={isViewed ? '#95a5a6' : '#2980b9'} />
                                            )}
                                            {call.direction === 'in' ? 'Incoming' : 'Outgoing'}
                                        </div>
                                    </td>
                                    <td style={{
                                        ...styles.tableTd,
                                        opacity: isViewed ? 0.75 : 1
                                    }}>
                                        <span style={getStatusStyle(call.status)}>
                                            {call.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td style={{
                                        ...styles.tableTd,
                                        color: isViewed ? '#7f8c8d' : 'inherit'
                                    }}>{call.billable_minutes} min</td>
                                    <td style={{
                                        ...styles.tableTd,
                                        color: isViewed ? '#7f8c8d' : 'inherit'
                                    }}>{call.formatted_created_at}</td>
                                    <td style={styles.tableTd}>
                                        {r2AudioUrl ? (
                                            <audio
                                                controls
                                                preload="none"
                                                src={r2AudioUrl}
                                                style={{ height: '32px', maxWidth: '210px', borderRadius: '20px' }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '0.85rem', color: '#95a5a6' }}>N/A</span>
                                        )}
                                    </td>
                                    <td style={styles.tableTd}>
                                        <Link 
                                            to={`/calls/${call.id}`} 
                                            onClick={() => handleCallClick(call.id)} 
                                            style={styles.viewLink}
                                        >
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}</tbody>
                    </table>
                ) : (
                    <div style={styles.noResults}>No calls found matching your criteria.</div>
                )}
            </div>

            {totalPages > 1 && !loading && (
                <div style={styles.paginationContainer}>
                    <button style={{ ...styles.pageButton, padding: '8px 12px' }} onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</button>
                    {getPaginationPages(page, totalPages).map((p, index) =>
                        p === '...' ? (
                            <span key={`ellipsis-${index}`} style={styles.paginationEllipsis}>...</span>
                        ) : (
                            <button key={p} onClick={() => setPage(p)} style={page === p ? { ...styles.pageButton, ...styles.activePage } : styles.pageButton}>
                                {p}
                            </button>
                        )
                    )}
                    <button style={{ ...styles.pageButton, padding: '8px 12px' }} onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</button>
                </div>
            )}
        </div>
    );
};

export default CallList;