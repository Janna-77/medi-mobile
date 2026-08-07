import { useState, useEffect } from 'react'
import api from '../api/axios'

export default function MedicalCertificateExpiryLock({ children }) {
    const [status, setStatus] = useState('loading')

    const [certificate, setCertificate] = useState(null)
    const [expiryDate, setExpiryDate] = useState('')
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [uploadSuccess, setUploadSuccess] = useState(false)

    const [licenceNumber, setLicenceNumber] = useState('')
    const [verifying, setVerifying] = useState(false)
    const [verifyError, setVerifyError] = useState('')
    const [verifySuccess, setVerifySuccess] = useState(false)

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await api.get('/users/profile')
                const { licence_expiry_date, licence_verified_at, verification_status } = res.data

                if (verification_status === 'pending') { setStatus('valid'); return }

                if (!licence_expiry_date || new Date(licence_expiry_date) < new Date()) {
                    setStatus('expired'); return
                }

                const thirtyDaysAgo = new Date()
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                if (!licence_verified_at || new Date(licence_verified_at) < thirtyDaysAgo) {
                    setStatus('monthly_verification'); return
                }

                setStatus('valid')
            } catch (err) {
                console.error(err)
                setStatus('expired')
            }
        }
        checkStatus()
    }, [])

    const handleUpload = async () => {
        if (!certificate || !expiryDate) {
            setUploadError('Please upload your certificate and enter the new expiry date')
            return
        }
        setUploadError('')
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('certificate', certificate)
            formData.append('licence_expiry_date', expiryDate)
            await api.patch('/upgrade/doctor/update-licence', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setUploadSuccess(true)
            setTimeout(() => setStatus('valid'), 1500)
        } catch (err) {
            setUploadError(err.response?.data?.error || 'Failed to update licence')
        } finally {
            setUploading(false)
        }
    }

    const handleVerify = async () => {
        if (!licenceNumber.trim()) {
            setVerifyError('Please enter your medical licence number')
            return
        }
        setVerifyError('')
        setVerifying(true)
        try {
            await api.post('/upgrade/doctor/verify-monthly', {
                medical_license_number: licenceNumber.trim()
            })
            setVerifySuccess(true)
            setTimeout(() => setStatus('valid'), 1500)
        } catch (err) {
            setVerifyError(err.response?.data?.error || 'Verification failed')
        } finally {
            setVerifying(false)
        }
    }

    const inputStyle = {
        padding: '11px 14px', borderRadius: '8px',
        border: '1.5px solid var(--doc-input-border)',
        background: 'var(--doc-input-bg)',
        color: 'var(--doc-text-primary)',
        fontSize: '14px', outline: 'none',
        width: '100%', boxSizing: 'border-box',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
    }

    const Wrapper = ({ icon, title, subtitle, children: inner }) => (
        <div style={{
            minHeight: '100vh',
            background: 'var(--doc-page-bg)',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 20px', position: 'relative', overflow: 'hidden',
        }}>
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'var(--doc-beam)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{
                position: 'relative', zIndex: 1,
                background: 'var(--doc-card-bg)',
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--doc-card-border)',
                borderRadius: '20px', padding: '40px 32px',
                width: '100%', maxWidth: '420px',
                boxShadow: '0 8px 32px rgba(100,50,180,0.12)',
                display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center',
            }}>
                <p style={{ fontSize: '44px', margin: 0 }}>{icon}</p>
                <h2 style={{ color: 'var(--doc-text-primary)', margin: 0, fontSize: '18px', fontWeight: '700' }}>{title}</h2>
                <p style={{ color: 'var(--doc-text-secondary)', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>{subtitle}</p>
                {inner}
            </div>
        </div>
    )

    if (status === 'loading') return children

    if (status === 'expired') {
        return (
            <Wrapper
                icon="🔒"
                title="Medical Licence Expired"
                subtitle="Your medical licence has expired or is missing. Upload your renewed certificate and enter the new expiry date to regain access."
            >
                {uploadSuccess ? (
                    <div style={{ background: 'rgba(56,161,105,0.12)', border: '1px solid rgba(56,161,105,0.3)', borderRadius: '10px', padding: '16px' }}>
                        <p style={{ color: '#38a169', fontWeight: '700', margin: 0 }}>✓ Licence updated! Restoring access…</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                            <label style={{ color: 'var(--doc-text-primary)', fontSize: '13px', fontWeight: '600' }}>New Expiry Date</label>
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={(e) => setExpiryDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                            <label style={{ color: 'var(--doc-text-primary)', fontSize: '13px', fontWeight: '600' }}>Upload Renewed Certificate</label>
                            <label style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                padding: '14px', borderRadius: '8px',
                                border: '2px dashed var(--doc-input-border)',
                                background: 'var(--doc-input-bg)',
                                cursor: 'pointer', color: 'var(--doc-text-secondary)', fontSize: '13px',
                            }}>
                                <input type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={(e) => setCertificate(e.target.files[0])} />
                                {certificate ? `✓ ${certificate.name}` : '📎 Click to upload'}
                            </label>
                        </div>
                        {uploadError && <p style={{ color: '#e53e3e', fontSize: '13px', margin: 0 }}>{uploadError}</p>}
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            style={{
                                background: 'linear-gradient(135deg, #5a1e96 0%, #8b5cf6 100%)',
                                color: 'white', border: 'none', borderRadius: '10px',
                                padding: '13px', fontSize: '14px', fontWeight: '700',
                                cursor: uploading ? 'not-allowed' : 'pointer',
                                opacity: uploading ? 0.7 : 1,
                                fontFamily: 'inherit',
                                boxShadow: '0 4px 14px rgba(100,50,180,0.28)',
                            }}
                        >
                            {uploading ? 'Uploading…' : 'Submit Renewed Certificate'}
                        </button>
                    </>
                )}
            </Wrapper>
        )
    }

    if (status === 'monthly_verification') {
        return (
            <Wrapper
                icon="🩺"
                title="Monthly Verification Required"
                subtitle="In line with Medi's terms, licensed practitioners must verify their credentials every 30 days. Enter your medical licence number to continue."
            >
                {verifySuccess ? (
                    <div style={{ background: 'rgba(56,161,105,0.12)', border: '1px solid rgba(56,161,105,0.3)', borderRadius: '10px', padding: '16px' }}>
                        <p style={{ color: '#38a169', fontWeight: '700', margin: 0 }}>✓ Verified! Restoring access…</p>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                            <label style={{ color: 'var(--doc-text-primary)', fontSize: '13px', fontWeight: '600' }}>Medical Licence Number</label>
                            <input
                                type="text"
                                placeholder="Enter your licence number"
                                value={licenceNumber}
                                onChange={(e) => setLicenceNumber(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                                style={inputStyle}
                            />
                        </div>
                        {verifyError && <p style={{ color: '#e53e3e', fontSize: '13px', margin: 0 }}>{verifyError}</p>}
                        <button
                            onClick={handleVerify}
                            disabled={verifying}
                            style={{
                                background: 'linear-gradient(135deg, #5a1e96 0%, #8b5cf6 100%)',
                                color: 'white', border: 'none', borderRadius: '10px',
                                padding: '13px', fontSize: '14px', fontWeight: '700',
                                cursor: verifying ? 'not-allowed' : 'pointer',
                                opacity: verifying ? 0.7 : 1,
                                fontFamily: 'inherit',
                                boxShadow: '0 4px 14px rgba(100,50,180,0.28)',
                            }}
                        >
                            {verifying ? 'Verifying…' : 'Verify & Continue'}
                        </button>
                    </>
                )}
            </Wrapper>
        )
    }

    return children
}
