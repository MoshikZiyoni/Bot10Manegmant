import { useState, useRef, useMemo } from 'react';
import { Phone, Upload, FileText, Eye, EyeOff, RefreshCcw, Loader2, CheckCircle, AlertTriangle, XCircle, ChevronLeft, ChevronRight, Send, User, PhoneOutgoing, UserSquareIcon, ReceiptText } from 'lucide-react';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
// Imports for papaparse and xlsx are changed to use a CDN to resolve the bundling error.
import Papa from 'https://esm.sh/papaparse';
import * as XLSX from 'https://esm.sh/xlsx';
import { Link } from 'react-router-dom';

// To use this component, you'll need to install the following libraries:
// npm install axios lucide-react

const NewCall = () => {

    // --- STATE MANAGEMENT ---
    const [userName, setUserName] = useState('');
    const [prompt, setPrompt] = useState('');
    const [gender, setGender] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isCalling, setIsCalling] = useState(false);
    const [callStatus, setCallStatus] = useState(null); // { type: 'success'/'error', message: '...' }
    const { user } = useAuth0();
    const userEmail = user?.email;
    const [file, setFile] = useState(null);
    const [fileData, setFileData] = useState(null); // { headers: [], data: [], ... }
    const [isParsing, setIsParsing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [error, setError] = useState(null);
    const [quotaModalOpen, setQuotaModalOpen] = useState(false);
    const [bulkGender, setBulkGender] = useState('');
    const [bulkPrompt, setBulkPrompt] = useState('');
    const [showPreview, setShowPreview] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const fileInputRef = useRef(null);

    // --- CONSTANTS ---
    const ROWS_PER_PAGE = 15;
    const MAX_FILE_SIZE_MB = 10;
    const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    const brandColors = {
        yellow: '#f9bb2b',
        darkBlue: '#07455c',
        neutral: '#fefef9',
        accentBlue: '#1c7d95',
    };

    // --- EVENT HANDLERS ---

    /**
     * Handles the submission of the single call form.
     */
    const handleSingleCall = async (e) => {
        e.preventDefault();
        if (phoneNumber.length < 8 || phoneNumber.length > 10) {
            setCallStatus({ type: 'error', message: 'Phone number must be between 8 and 10 digits.' });
            return;
        }
        setIsCalling(true);
        setCallStatus(null);
        try {
            const fullNumber = `+972${phoneNumber}`;
            const payload = {
                phone_number: fullNumber,
                user_name: userName || undefined,
                email: userEmail,
                prompt: prompt || undefined,
                gender: gender || undefined,
            };
            const response = await axios.post(`${baseURL}/outbound-call/`, payload);
            setCallStatus({ type: 'success', message: `Call initiated successfully! SID: ${response.data.call_sid}` });
            setPhoneNumber('');
            setUserName('');
            setPrompt('');
            setGender('');
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to initiate call.';
            if (
                errorMessage === "Quota exceeded or expired. Please contact support."
            ) {
                setQuotaModalOpen(true);
            } else {
                setCallStatus({ type: 'error', message: errorMessage });
            }
        } finally {
            setIsCalling(false);
        }
    };

    const handleGenderChange = (event) => {
        setGender(event.target.value);
    };

    /**
     * Handles file selection and initiates parsing.
     */
    const handleFileSelect = (selectedFile) => {
        if (!selectedFile) return;
        handleReset();
        setFile(selectedFile);
        setIsParsing(true);
        const validExtensions = ['csv', 'xls', 'xlsx'];
        const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
        if (!validExtensions.includes(fileExtension) || selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setError(`Invalid file. Please upload a CSV or Excel file under ${MAX_FILE_SIZE_MB}MB.`);
            setIsParsing(false);
            setFile(null);
            return;
        }
        parseFile(selectedFile, fileExtension);
        setTimeout(() => {
        const footerElement = document.querySelector('.app-footer');
        if (footerElement) {
            footerElement.scrollIntoView({
                behavior: 'smooth',
                block: 'end' // Scrolls the element into view at the end of the scrollable area
            });
        }
    }, 100);
    };

    /**
     * Parses the uploaded file based on its extension.
     */
    const parseFile = async (fileToParse, extension) => {
        try {
            let parsedResult;
            if (extension === 'csv') {
                parsedResult = await parseCSV(fileToParse);
            } else {
                parsedResult = await parseExcel(fileToParse);
            }
            if (!parsedResult.data || parsedResult.data.length === 0) {
                throw new Error('No data found in the file.');
            }
            setFileData({
                ...parsedResult,
                name: fileToParse.name,
                size: (fileToParse.size / 1024).toFixed(2) + ' KB',
                type: extension.toUpperCase()
            });
            setShowPreview(true);
        } catch (err) {
            setError(err.message || 'Failed to parse file. Please check the format.');
            setFile(null);
        } finally {
            setIsParsing(false);
        }
    };

    /**
     * Handles sending the bulk call data to the server.
     */
    const handleBulkCall = async () => {
        if (!file) {
            setError("No file selected to send.");
            return;
        }
        setIsSending(true);
        setUploadStatus(null);
        setError(null);
        const formData = new FormData();
        formData.append('file', file, 'email');
        formData.append('email', user?.email);
        if (bulkGender) formData.append('gender', bulkGender);
        if (bulkPrompt) formData.append('prompt', bulkPrompt);
        try {
            const response = await axios.post(`${baseURL}/bulk-calls/`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUploadStatus({
                type: 'success',
                message: `File uploaded! Job ID: ${response.data.job_id}. Total calls: ${response.data.total_calls}.`
            });
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Failed to send file data.';
            if (
                errorMessage === "Quota exceeded or expired. Please contact support."
            ) {
                setQuotaModalOpen(true);
            } else {
                setUploadStatus({ type: 'error', message: errorMessage });
            }
        } finally {
            setIsSending(false);
        }
    };
    /**
     * Resets the file upload section state.
     */
    const handleReset = () => {
        setFile(null);
        setFileData(null);
        setIsParsing(false);
        setIsSending(false);
        setUploadStatus(null);
        setError(null);
        setCurrentPage(1);
        setBulkPrompt('');
        setBulkGender('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // --- PARSING LOGIC ---
    const parseCSV = (file) => new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length) return reject(new Error('CSV parsing error. Check file for malformed rows.'));
                const cleanedData = results.data.map(row => Object.keys(row).reduce((acc, key) => ({ ...acc, [key.trim()]: row[key] }), {}));
                resolve({ data: cleanedData, headers: Object.keys(cleanedData[0] || {}) });
            },
            error: (err) => reject(new Error(err.message))
        });
    });

    const parseExcel = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);
                resolve({ data: json, headers: Object.keys(json[0] || {}) });
            } catch (err) {
                reject(new Error('Could not read Excel file. It might be corrupted or in an unsupported format.'));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.readAsBinaryString(file);
    });

    // --- STYLES OBJECT ---
    const styles = {
        page: { fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", backgroundColor: brandColors.neutral, color: brandColors.darkBlue, minHeight: '100vh', padding: '2rem' },
        header: { textAlign: 'center', marginBottom: '3rem' },
        title: { fontSize: '2.5rem', fontWeight: '600', color: brandColors.darkBlue, margin: '0 0 0.5rem 0' },
        subtitle: { fontSize: '1.1rem', color: brandColors.accentBlue, margin: 0 },
        main: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '2.5rem', maxWidth: '1000px', margin: '0 auto' },
        card: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
        cardTitle: { fontSize: '1.5rem', fontWeight: '500', color: brandColors.darkBlue, margin: 0, display: 'flex', alignItems: 'center' },
        formGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
        label: { fontWeight: '500', fontSize: '0.9rem', color: brandColors.accentBlue },
        inputGroup: { display: 'flex' },
        inputPrefix: { padding: '0 12px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRight: 'none', borderRadius: '8px 0 0 8px', display: 'flex', alignItems: 'center', color: '#555', fontSize: '1rem' },
        input: { flex: 1, padding: '12px 14px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' },
        inputWithPrefix: { borderRadius: '0 8px 8px 0' },
        textarea: { padding: '12px 14px', fontSize: '1rem', border: '1px solid #ccc', borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', minHeight: '80px', resize: 'vertical' },
        buttonPrimary: { width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 'bold', backgroundColor: brandColors.yellow, color: brandColors.darkBlue, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'background-color 0.2s, transform 0.1s', marginTop: '1rem' },
        buttonDisabled: { backgroundColor: '#cccccc', color: '#666666', cursor: 'not-allowed' },
        bulkHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        resetButton: { background: 'none', border: `1px solid ${brandColors.accentBlue}`, color: brandColors.accentBlue, padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '500' },
        dropzone: { border: `2px dashed ${brandColors.accentBlue}`, borderRadius: '12px', padding: '2.5rem', textAlign: 'center', backgroundColor: '#fafcff', cursor: 'pointer', transition: 'background-color 0.2s, border-color 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
        dropzoneParsing: { borderColor: brandColors.darkBlue, backgroundColor: '#eaf2f8' },
        dropzoneText: { margin: 0, color: brandColors.darkBlue, fontSize: '1rem' },
        dropzoneSubtext: { margin: 0, color: brandColors.accentBlue, fontSize: '0.85rem' },
        statusMessage: { padding: '12px 16px', borderRadius: '8px', border: '1px solid', display: 'flex', alignItems: 'center', fontSize: '0.95rem' },
        previewContainer: { border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fafafa', padding: '1rem', marginTop: '1rem' },
        previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #e0e0e0', marginBottom: '1rem' },
        fileInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
        fileName: { fontWeight: '600', color: brandColors.darkBlue, margin: 0 },
        fileMeta: { fontSize: '0.8rem', color: brandColors.accentBlue, margin: 0 },
        toggleButton: { background: 'none', border: '1px solid #bdc3c7', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: brandColors.darkBlue },
        tableWrapper: { overflowX: 'auto', maxHeight: '450px', border: '1px solid #ddd', borderRadius: '4px' },
        table: { width: '100%', borderCollapse: 'collapse' },
        tableHead: { position: 'sticky', top: 0, backgroundColor: '#f1f3f5', zIndex: 1 },
        tableTh: { padding: '12px 10px', textAlign: 'left', fontWeight: '600', fontSize: '0.8rem', color: brandColors.darkBlue, textTransform: 'uppercase', borderBottom: `2px solid ${brandColors.accentBlue}` },
        tableRow: { borderBottom: '1px solid #e9ecef' },
        tableTd: { padding: '10px', fontSize: '0.9rem', color: brandColors.darkBlue, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' },
        tableTdIndex: { padding: '10px', fontSize: '0.85rem', color: brandColors.accentBlue, textAlign: 'center', backgroundColor: '#f8f9fa' },
        pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem' },
        pageButton: { background: '#fff', border: '1px solid #ccc', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: brandColors.darkBlue },
        pageInfo: { fontSize: '0.9rem', color: brandColors.accentBlue },
        sendButton: { marginTop: '1.5rem', backgroundColor: brandColors.accentBlue, color: 'white' },
        spinner: { animation: 'spin 1s linear infinite' },
        '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } }
    };

    // --- RENDER LOGIC & COMPONENTS ---

    const memoizedPreview = useMemo(() => {
        if (!fileData) return null;
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
        const paginatedData = fileData.data.slice(startIndex, startIndex + ROWS_PER_PAGE);
        const totalPages = Math.ceil(fileData.data.length / ROWS_PER_PAGE);

        return (
            <div style={styles.previewContainer}>
                <div style={styles.previewHeader}>
                    <div style={styles.fileInfo}><FileText size={20} color={brandColors.accentBlue} />
                        <div><p style={styles.fileName}>{fileData.name}</p><p style={styles.fileMeta}>{fileData.type} &bull; {fileData.size} &bull; {fileData.data.length} rows</p></div>
                    </div>
                    <button onClick={() => setShowPreview(!showPreview)} style={styles.toggleButton}>{showPreview ? <EyeOff size={16} /> : <Eye size={16} />}<span>{showPreview ? 'Hide' : 'Show'}</span></button>
                </div>
                {showPreview && (
                    <><div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead style={styles.tableHead}><tr><th style={styles.tableTh}>#</th>{fileData.headers.map((header) => <th key={header} style={styles.tableTh}>{header}</th>)}</tr></thead>
                            <tbody>{paginatedData.map((row, index) => (<tr key={startIndex + index} style={styles.tableRow}><td style={styles.tableTdIndex}>{startIndex + index + 1}</td>{fileData.headers.map((header) => (<td key={header} style={styles.tableTd}>{String(row[header] || '–')}</td>))}</tr>))}</tbody>
                        </table>
                    </div>
                        {totalPages > 1 && (<div style={styles.pagination}><button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} style={styles.pageButton}><ChevronLeft size={16} /> Previous</button><span style={styles.pageInfo}>Page {currentPage} of {totalPages}</span><button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} style={styles.pageButton}>Next <ChevronRight size={16} /></button></div>)}</>
                )}
            </div>
        );
    }, [fileData, currentPage, showPreview, brandColors]);

    const StatusMessage = ({ type, message }) => {
        const icons = { success: <CheckCircle color="#27ae60" />, error: <AlertTriangle color="#c0392b" />, info: <AlertTriangle color={brandColors.accentBlue} /> };
        const statusStyles = { success: { backgroundColor: '#eafaf1', color: '#27ae60', borderColor: '#a3e4c8' }, error: { backgroundColor: '#f9ebea', color: '#c0392b', borderColor: '#f5b7b1' }, info: { backgroundColor: '#eaf2f8', color: brandColors.accentBlue, borderColor: '#aed6f1' } };
        return (<div style={{ ...styles.statusMessage, ...statusStyles[type] }}>{icons[type]}<p style={{ margin: 0, marginLeft: '10px' }}>{message}</p></div>);
    };

    return (
        <div style={styles.page}>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <header style={styles.header}><h1 style={styles.title}>Outbound Call Center</h1><p style={styles.subtitle}>Initiate single calls or upload a file for bulk calling campaigns.</p></header>
            {quotaModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: '#fff',
                        borderRadius: '16px',
                        padding: '2.5rem 2rem',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        maxWidth: '400px',
                        textAlign: 'center',
                        position: 'relative'
                    }}>
                        <XCircle size={28} color="#c0392b" style={{ marginBottom: '1rem' }} />
                        <h2 style={{ color: '#c0392b', marginBottom: '1rem' }}>Quota Exceeded</h2>
                        <p style={{ color: '#555', marginBottom: '1.5rem' }}>
                            Your call quota has expired or been exceeded.<br />
                            Please <Link to="/contact">contact support</Link> to continue using the service.
                        </p>
                        <button
                            onClick={() => setQuotaModalOpen(false)}
                            style={{
                                background: '#f9bb2b',
                                color: '#07455c',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            <main style={styles.main}>
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}><Phone size={22} style={{ marginRight: '10px' }} />Make a Single Call</h2>
                    <form onSubmit={handleSingleCall} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={styles.formGroup}>
                            <label htmlFor="phoneNumber" style={styles.label}>
                                <PhoneOutgoing size={18} style={{ marginRight: '8px' }} />
                                Phone Number*
                            </label>
                            <div style={styles.inputGroup}><span style={styles.inputPrefix}>+972</span><input id="phoneNumber" type="tel" style={{ ...styles.input, ...styles.inputWithPrefix }} placeholder="50 123 4567" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))} required /></div>
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="userName" style={styles.label}>
                                <UserSquareIcon size={18} style={{ marginRight: '8px' }} />
                                Name (Optional)</label>
                            <input id="userName" type="text" style={styles.input} placeholder="e.g., Donald Trump" value={userName} onChange={(e) => setUserName(e.target.value)} />
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="gender" style={{ ...styles.label, display: 'flex', alignItems: 'center' }}>
                                <User size={18} style={{ marginRight: '8px' }} />
                                Gender (Optional)
                            </label>
                            <select
                                id="gender"
                                style={styles.input}
                                value={gender}
                                onChange={handleGenderChange}
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="prompt" style={styles.label}>
                                <ReceiptText size={18} style={{ marginRight: '8px' }} />
                                Prompt (Optional)</label>
                            <textarea id="prompt" style={styles.textarea} placeholder="Enter a custom prompt for the call..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                        </div>
                        <button type="submit" disabled={isCalling || !phoneNumber} style={{ ...styles.buttonPrimary, ...((isCalling || !phoneNumber) ? styles.buttonDisabled : {}) }}>
                            {isCalling ? <Loader2 size={20} style={styles.spinner} /> : 'Initiate Call'}
                        </button>
                    </form>
                    {callStatus && <StatusMessage type={callStatus.type} message={callStatus.message} />}
                </div>
                <div style={styles.card}>
                    <div style={styles.bulkHeader}><h2 style={styles.cardTitle}><Upload size={22} style={{ marginRight: '10px' }} />Bulk Calling from File</h2>{file && (<button onClick={handleReset} style={styles.resetButton}><RefreshCcw size={14} /> Reset</button>)}</div>

                    {!fileData && (
                        <div style={isParsing ? { ...styles.dropzone, ...styles.dropzoneParsing } : styles.dropzone} onClick={() => fileInputRef.current.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files && e.dataTransfer.files[0]) { handleFileSelect(e.dataTransfer.files[0]); } }}>
                            <input type="file" ref={fileInputRef} onChange={(e) => handleFileSelect(e.target.files[0])} accept=".csv,.xls,.xlsx" style={{ display: 'none' }} />
                            {isParsing ? (<><Loader2 size={32} style={styles.spinner} color={brandColors.accentBlue} /><p style={styles.dropzoneText}>Parsing file...</p></>) : (<><Upload size={32} color={brandColors.accentBlue} /><p style={styles.dropzoneText}><strong>Drag & drop a file here</strong> or click to select</p><p style={styles.dropzoneSubtext}>Supports CSV, XLS, XLSX up to 10MB</p></>)}
                        </div>
                    )}
                    {error && <StatusMessage type="error" message={error} />}
                    {memoizedPreview}
                    {fileData && !uploadStatus && (
                        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap', flexDirection: 'column' }}>
                            <div style={{ minWidth: 180 }}>
                                <label htmlFor="bulkGender" style={styles.label}>
                                    <User size={18} style={{ marginRight: '8px' }} />
                                    Gender (Optional)
                                </label>
                                <select
                                    id="bulkGender"
                                    style={styles.input}
                                    value={bulkGender}
                                    onChange={e => setBulkGender(e.target.value)}
                                >
                                    <option value="">-- Select --</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: 220 }}>
                                <label htmlFor="bulkPrompt" style={styles.label}>
                                    <ReceiptText size={18} style={{ marginRight: '8px' }} />
                                    Prompt (Optional)
                                </label>
                                <div style={{ color: '#888', fontSize: '0.95em', marginBottom: 4 }}>
                                    Enter a custom prompt for all calls...
                                </div>
                                <textarea
                                    id="bulkPrompt"
                                    style={styles.textarea}
                                    value={bulkPrompt}
                                    onChange={e => setBulkPrompt(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    {fileData && !uploadStatus && (
                        <button onClick={handleBulkCall} disabled={isSending} style={{ ...styles.buttonPrimary, ...styles.sendButton, ...((isSending) ? styles.buttonDisabled : {}) }}>
                            {isSending ? <Loader2 size={20} style={styles.spinner} /> : <Send size={18} />}
                            {isSending ? 'Sending...' : `Send ${fileData.data.length} Records`}
                        </button>
                    )}
                    {uploadStatus && <StatusMessage type={uploadStatus.type} message={uploadStatus.message} />}
                </div>
            </main>
        </div>
    );
};

export default NewCall;
