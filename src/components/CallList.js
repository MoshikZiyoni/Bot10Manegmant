import React, { useState, useEffect, useRef } from 'react';
// The user's code uses Link, but in this environment, a standard <a> tag is used for navigation.
// import { Link } from 'react-router-dom';
import { PhoneIncoming, PhoneOutgoing, Search, Filter, Download, ChevronDown, Loader2, X } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const CallList = () => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const searchTimeout = useRef();
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [customDaysInput, setCustomDaysInput] = useState('');
    const customDaysTimeout = useRef();
    const [exporting, setExporting] = useState(false);
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const [filters, setFilters] = useState({
        direction: '',
        status: '',
        search: '',
        has_offer: '',
        created_within_days: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    // --- Brand Colors ---
    const brandColors = {
        yellow: '#f9bb2b',
        darkBlue: '#07455c',
        neutral: '#fefef9',
        accentBlue: '#1c7d95',
    };

    useEffect(() => {
        fetchCalls();
    }, [page, filters.direction, filters.status, filters.has_offer, filters.created_within_days]);
    
    useEffect(() => {
        // Debounce search input
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => {
            if (page === 1) {
                 fetchCalls();
            } else {
                 setPage(1); // Setting page will trigger fetchCalls
            }
        }, 400);
    }, [filters.search]);


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
        if (name !== 'search') {
             setPage(1);
        }
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

    const getExportUrl = () => {
        const params = new URLSearchParams();
        if (filters.direction) params.append('direction', filters.direction);
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);
        if (filters.has_offer) params.append('has_offer', filters.has_offer);
        if (filters.created_within_days && filters.created_within_days !== 'custom') {
            params.append('created_within_days', filters.created_within_days);
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
        tableTd: { padding: '15px', border: 'none', borderBottom: '1px solid #f0f0f0' },
        iconTd: { display: 'flex', alignItems: 'center', gap: '10px' },
        statusBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'capitalize' },
        viewLink: { textDecoration: 'none', color: brandColors.accentBlue, fontWeight: 'bold' },
        paginationContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem 0' },
        pageButton: { background: '#fff', border: '1px solid #ccc', borderRadius: '6px', minWidth: '40px', height: '40px', cursor: 'pointer', margin: '0 4px', color: brandColors.darkBlue, display: 'flex', justifyContent: 'center', alignItems: 'center' },
        paginationEllipsis: { margin: '0 8px', color: '#ccc'},
        activePage: { backgroundColor: brandColors.darkBlue, color: 'white', borderColor: brandColors.darkBlue },
        loader: { textAlign: 'center', padding: '4rem', fontSize: '1.2rem', color: brandColors.accentBlue, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' },
        spinner: { animation: 'spin 1s linear infinite' },
        noResults: { textAlign: 'center', padding: '4rem', fontSize: '1.2rem', color: brandColors.accentBlue },
    };
    
    const getStatusStyle = (status) => {
        const base = styles.statusBadge;
        switch(status) {
            case 'completed': return {...base, color: '#27ae60', backgroundColor: '#eafaf1'};
            case 'failed': return {...base, color: '#c0392b', backgroundColor: '#f9ebea'};
            case 'in_progress': return {...base, color: '#2980b9', backgroundColor: '#eaf2f8'};
            case 'canceled': return {...base, color: '#f39c12', backgroundColor: '#fef5e7'};
            case 'busy': return {...base, color: '#8e44ad', backgroundColor: '#f4ecf7'};
            default: return {...base, color: '#7f8c8d', backgroundColor: '#f4f6f7'};
        }
    };
    
    const isCustomDate = !['', 'today', '7', '30', '90'].includes(filters.created_within_days);
    const dateDropdownValue = isCustomDate ? 'custom' : filters.created_within_days;

    return (
        <div style={styles.page}>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .calls-table tbody tr:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.08); }`}</style>
            <header style={styles.header}>
                <h1 style={styles.title}>Call History</h1>
                <Link to="/calls/new" style={styles.newCallButton}>New Call</Link>
            </header>

            <div style={styles.controlsContainer}>
                <div style={styles.topControls}>
                    <div style={styles.searchInput}>
                        <Search size={18} style={styles.searchInputIcon}/>
                        <input style={styles.searchInputEl} type="text" placeholder="Search by phone number..." name="search" value={filters.search} onChange={handleFilterChange}/>
                    </div>
                    <button style={styles.filterButton} onClick={() => setShowFilters(!showFilters)}>
                        <Filter size={16}/> Filters <ChevronDown size={16} style={{transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s'}}/>
                    </button>
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
                                     <input type="number" min="1" placeholder="Days" value={customDaysInput} onChange={handleCustomDaysChange} style={{...styles.filterSelect, width: '80px', marginTop: '4px'}}/>
                                     <span style={{color: brandColors.accentBlue}}>days</span>
                                </div>
                            )}
                        </div>
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Status</label>
                            <select style={styles.filterSelect} name="status" value={filters.status} onChange={handleFilterChange}>
                                <option value="">All</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="canceled">Canceled</option><option value="busy">Busy</option>
                            </select>
                        </div>
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Has Offer</label>
                             <select style={styles.filterSelect} name="has_offer" value={filters.has_offer} onChange={handleFilterChange}>
                                <option value="">All</option><option value="true">Yes</option><option value="false">No</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div style={styles.tableContainer}>
                <div style={styles.tableHeader}>
                    <div style={styles.resultsCount}>{loading ? ' ' : `${totalResults} results found`}</div>
                    <button style={styles.exportButton} onClick={handleExportExcel} disabled={exporting || calls.length === 0}>
                        {exporting ? <Loader2 size={16} style={styles.spinner} /> : <Download size={16} />}
                        {exporting ? 'Exporting...' : 'Export to Excel'}
                    </button>
                </div>
                {loading ? (
                     <div style={styles.loader}><Loader2 size={24} style={styles.spinner}/> Loading calls...</div>
                ) : calls.length > 0 ? (
                    <table style={styles.table}>
                        <thead><tr>
                            <th style={styles.tableTh}>Phone Number</th><th style={styles.tableTh}>Direction</th>
                            <th style={styles.tableTh}>Status</th><th style={styles.tableTh}>Duration</th>
                            <th style={styles.tableTh}>Created At</th><th style={styles.tableTh}>Actions</th>
                        </tr></thead>
                        <tbody>{calls.map(call => (
                            <tr key={call.id} style={styles.tableRow}>
                                <td style={styles.tableTd}>{call.phone_number}</td>
                                <td style={styles.tableTd}>
                                    <div style={styles.iconTd}>
                                    {call.direction === 'in' ? <PhoneIncoming size={18} color="#27ae60"/> : <PhoneOutgoing size={18} color="#2980b9"/>}
                                    {call.direction === 'in' ? 'Incoming' : 'Outgoing'}
                                    </div>
                                </td>
                                <td style={styles.tableTd}><span style={getStatusStyle(call.status)}>{call.status.replace(/_/g, ' ')}</span></td>
                                <td style={styles.tableTd}>{(call.total_duration / 60).toFixed(2)} min</td>
                                <td style={styles.tableTd}>{call.formatted_created_at}</td>
                                <td style={styles.tableTd}><Link to={`/calls/${call.id}`} style={styles.viewLink}>View Details</Link></td>
                            </tr>
                        ))}</tbody>
                    </table>
                ) : (
                    <div style={styles.noResults}>No calls found matching your criteria.</div>
                )}
            </div>

             {totalPages > 1 && !loading && (
                 <div style={styles.paginationContainer}>
                     <button style={{...styles.pageButton, padding: '8px 12px'}} onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</button>
                     {getPaginationPages(page, totalPages).map((p, index) =>
                        p === '...' ? (
                            <span key={`ellipsis-${index}`} style={styles.paginationEllipsis}>...</span>
                        ) : (
                            <button key={p} onClick={() => setPage(p)} style={page === p ? {...styles.pageButton, ...styles.activePage} : styles.pageButton}>
                                {p}
                            </button>
                        )
                    )}
                     <button style={{...styles.pageButton, padding: '8px 12px'}} onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</button>
                 </div>
             )}
        </div>
    );
};

export default CallList;
