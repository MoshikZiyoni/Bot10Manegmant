import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import axios from 'axios';

function NewCall() {
    const navigate = useNavigate();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [callerId, setCallerId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [callStatus, setCallStatus] = useState(null);
    const [uploadStatus, setUploadStatus] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const baseURL = process.env.REACT_APP_API_URL || '';

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file type and size
        const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!validTypes.includes(file.type)) {
            setError('Please upload a valid CSV or Excel file');
            return;
        }

        // Check file size (e.g., 5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setError('File size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        // Add encoding type to help server handle the file correctly
        formData.append('encoding', 'utf-8');

        try {
            const response = await axios.post(`${baseURL}/bulk-calls/`, formData, {
                // const response = await axios.post('https://web-production-7204.up.railway.app/bulk-calls/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setUploadStatus({
                success: true,
                message: 'File uploaded successfully',
                jobId: response.data.job_id,
                totalCalls: response.data.total_calls,
            });

        } catch (error) {
            console.error('Error uploading file:', error);
            const errorMessage = error.response?.data?.message ||
                'Failed to upload file. Please ensure the file is properly encoded in UTF-8 format.';
            setError(errorMessage);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!phoneNumber) {
            setError('Phone number is required');
            return;
        }
        if (phoneNumber.length < 8 || phoneNumber.length > 10) {
            setError('Phone number must be 8 to 10 digits');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Add +972 prefix before sending
            const fullNumber = `+972${phoneNumber}`;
            const response = await axios.post(`${baseURL}/outbound-call/`, {
                phone_number: fullNumber,
                caller_id: callerId || undefined
            });

            setCallStatus({
                success: true,
                message: 'Call initiated successfully',
                callSid: response.data.call_sid,
                callId: response.data.id
            });

            setTimeout(() => {
                navigate(`/calls/${response.data.id}`);
            }, 2000);

        } catch (error) {
            console.error('Error initiating call:', error);
            setError(error.response?.data?.message || 'Failed to initiate call. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="new-call">
            <h2>Initiate New Call</h2>

            {callStatus && callStatus.success && (
                <div className="call-success-message">
                    <p>{callStatus.message}</p>
                    <p>Call ID: {callStatus.callSid}</p>
                    <p>Redirecting to call details...</p>
                </div>
            )}

            {!callStatus && (
                <div className="new-call-form-container">
                    <form onSubmit={handleSubmit} className="new-call-form">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="phoneNumber">Phone Number*</label>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ padding: '0 6px', background: '#eee', border: '1px solid #ccc', borderRight: 'none', borderRadius: '4px 0 0 4px' }}>+972</span>
                                <input
                                    type="tel"
                                    id="phoneNumber"
                                    value={phoneNumber}
                                    onChange={(e) => {
                                        // Only allow digits, max 10 digits
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setPhoneNumber(val);
                                    }}
                                    placeholder="Enter number (e.g. 501234567)"
                                    style={{ borderRadius: '0 4px 4px 0' }}
                                    required
                                />
                            </div>
                            <small>Enter the phone number without the +972 prefix (e.g., 501234567)</small>
                        </div>

                        {/* <div className="form-group">
                            <label htmlFor="callerId">Caller ID (Optional)</label>
                            <input
                                type="tel"
                                id="callerId"
                                value={callerId}
                                onChange={(e) => setCallerId(e.target.value)}
                                placeholder="+1234567890"
                            />
                            <small>The number that will be displayed to the recipient</small>
                        </div> */}

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Initiating Call...' : 'Start Call'}
                            <Phone size={16} />
                        </button>
                    </form>
                    <div className="bulk-upload-section">
                        <h3>Bulk Upload</h3>
                        <div className="form-group">
                            <label htmlFor="fileUpload">Upload CSV/Excel File</label>
                            <input
                                type="file"
                                id="fileUpload"
                                accept=".csv,.xls,.xlsx"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                ref={fileInputRef}
                            />
                            <small>Upload a file containing columns for name and phone number</small>
                        </div>

                        {isUploading && (
                            <div className="upload-status">
                                <p>Uploading file...</p>
                            </div>
                        )}

                        {uploadStatus && uploadStatus.success && (
                            <div className="upload-success-message">
                                <p>{uploadStatus.message}</p>
                                <p>Job ID: {uploadStatus.jobId}</p>
                                <p>Total calls to be made: {uploadStatus.totalCalls}</p>
                            </div>
                        )}
                    </div>
                    <div className="call-instructions">
                        <h3>How it works</h3>
                        <ol>
                            <li>Enter the phone number you want to call</li>
                            <li>Optionally set a caller ID that will be shown to the recipient</li>
                            <li>Click "Start Call" to initiate the outbound call via Twilio</li>
                            <li>You'll be redirected to the call details page once the call is connected</li>
                        </ol>
                        <p><strong>Note:</strong> Standard call rates may apply based on your Twilio plan.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NewCall;