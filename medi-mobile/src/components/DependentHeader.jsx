import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { isBiometricAvailable } from '../utils/webauthn'

export default function DependentHeader({ dependentId, showBack, showSettings }) {
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)

    const [showAuthModal, setShowAuthModal] = useState(false)
    const [password, setPassword] = useState('')
    const [authError, setAuthError] = useState('')
    const [maxTimer, setMaxTimer] = useState(20)
    const [timer, setTimer] = useState(20)
    const [timerActive, setTimerActive] = useState(false)
    const [biometricSupported, setBiometricSupported] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem(`dep_timer_${dependentId}`)
        if (saved !== null) { setMaxTimer(Number(saved)); setTimer(Number(saved)) }
    }, [dependentId])

    useEffect(() => {
        let lastY = window.scrollY
        const onScroll = () => {
            const y = window.scrollY
            if (y > lastY && y > 10) setCollapsed(true)
            else if (y < lastY) setCollapsed(false)
            lastY = y
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        if (!timerActive) return
        if (timer === 0) { setShowAuthModal(false); setTimerActive(false); setTimer(maxTimer); return }
        const t = setTimeout(() => setTimer(timer - 1), 1000)
        return () => clearTimeout(t)
    }, [timer, timerActive, maxTimer])

    useEffect(() => { isBiometricAvailable().then(setBiometricSupported) }, [])

    const openSettings = () => {
        setShowAuthModal(true); setTimerActive(true); setTimer(maxTimer)
        setPassword(''); setAuthError('')
    }

    const handleAuth = async () => {
        try {
            await api.post('/auth/verifyGuardianPassword', { password })
            setShowAuthModal(false); setTimerActive(false)
            navigate(`/dependent/${dependentId}/settings`)
        } catch { setAuthError('Incorrect password') }
    }

    const handleBiometricAuth = () => {
        setShowAuthModal(false); setTimerActive(false)
        navigate(`/dependent/${dependentId}/settings`)
    }

    const closeModal = () => {
        setShowAuthModal(false); setTimerActive(false)
        setTimer(maxTimer); setPassword(''); setAuthError('')
    }

    return (
        <>
            <div style={{ height: '60px', flexShrink: 0 }} />

            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center', padding: '0 16px',
                background: 'var(--dep-topbar-bg)',
                backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                borderBottom: '1px solid var(--dep-topbar-border)',
                zIndex: 100,
                opacity: collapsed ? 0 : 1,
                pointerEvents: collapsed ? 'none' : 'all',
                transition: 'opacity 0.3s ease',
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {showBack && (
                        <button
                            onClick={() => navigate(`/dependent/${dependentId}/home`)}
                            style={{
                                width: '30px', height: '30px', borderRadius: '9px', border: 'none',
                                background: 'rgba(134,239,172,0.25)',
                                outline: '1px solid rgba(134,239,172,0.5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--dep-text-secondary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                    )}
                </div>

                <img
                    src="/logo.png" alt="Medi"
                    onClick={() => navigate(`/dependent/${dependentId}/home`)}
                    style={{ height: '60px', display: 'block', cursor: 'pointer' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {showSettings && (
                        <button
                            onClick={openSettings}
                            style={{
                                width: '30px', height: '30px', borderRadius: '9px', border: 'none',
                                background: 'rgba(134,239,172,0.25)',
                                outline: '1px solid rgba(134,239,172,0.5)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dep-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {collapsed && (
                <button
                    onClick={() => setCollapsed(false)}
                    aria-label="Show header"
                    style={{
                        position: 'fixed', top: '8px', right: '16px', zIndex: 101,
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'var(--dep-topbar-bg)',
                        border: '1px solid var(--dep-topbar-border)',
                        backdropFilter: 'blur(8px)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dep-text-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                    </svg>
                </button>
            )}

            {showAuthModal && (
                <>
                    <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(5,46,22,0.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 200 }} />
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        background: 'var(--dep-modal-bg)', borderRadius: '20px', padding: '32px',
                        width: '320px', maxWidth: 'calc(100vw - 40px)', zIndex: 300,
                        boxShadow: '0 12px 40px rgba(22,163,74,0.15)',
                        border: '1px solid var(--dep-modal-border)',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        textAlign: 'center',
                    }}>
                        <p style={{ color: 'var(--dep-modal-text)', fontWeight: '700', fontSize: '16px', margin: '0 0 6px' }}>
                            Guardian Approval Required
                        </p>
                        <p style={{ color: '#e53e3e', fontWeight: '700', fontSize: '22px', margin: '0 0 20px' }}>{timer}s</p>

                        <input
                            type="password"
                            placeholder="Guardian password"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setAuthError('') }}
                            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                            style={{
                                width: '100%', padding: '11px 14px', borderRadius: '8px', marginBottom: '10px',
                                border: '1.5px solid var(--dep-modal-border)', background: 'var(--dep-modal-input-bg)',
                                color: 'var(--dep-modal-text)', fontSize: '14px', outline: 'none',
                                boxSizing: 'border-box', fontFamily: 'inherit',
                            }}
                        />
                        {authError && <p style={{ color: '#e53e3e', fontSize: '12px', margin: '0 0 10px' }}>{authError}</p>}

                        {biometricSupported && (
                            <button
                                onClick={handleBiometricAuth}
                                style={{
                                    width: '100%', padding: '11px', borderRadius: '10px', marginBottom: '8px',
                                    border: '1.5px solid var(--dep-modal-border)', background: 'var(--dep-modal-input-bg)',
                                    color: 'var(--dep-modal-subtext)', fontWeight: '600', cursor: 'pointer',
                                    fontSize: '13px', fontFamily: 'inherit',
                                }}
                            >
                                🔒 Use Biometric
                            </button>
                        )}

                        <button
                            onClick={handleAuth}
                            style={{
                                width: '100%', padding: '11px', borderRadius: '10px', marginBottom: '8px',
                                border: '1.5px solid #1b684e', background: '#eafff2',
                                color: '#1b684e', fontWeight: '700', cursor: 'pointer',
                                fontSize: '14px', fontFamily: 'inherit',
                                boxShadow: 'none',
                            }}
                        >
                            Confirm
                        </button>
                        <button
                            onClick={closeModal}
                            style={{ background: 'none', border: 'none', color: 'var(--dep-text-muted)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                            Cancel
                        </button>
                    </div>
                </>
            )}
        </>
    )
}
