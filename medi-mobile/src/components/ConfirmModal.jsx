export default function ConfirmModal({ message, onConfirm, onCancel, role }) {
    const accentColor = role === 'guardian' ? 'var(--pink-bg)' : role === 'doctor' ? 'var(--purple-bg)' : role === 'independent' ? 'var(--blue-bg)' : 'var(--mint-bg)'
    const containerColor = role === 'guardian' ? 'var(--pink-container)' : role === 'doctor' ? 'var(--purple-container)' : role === 'independent' ? 'var(--blue-container)' : 'var(--mint-container)'
    const textColor = role === 'guardian' ? 'var(--pink-text)' : role === 'doctor' ? 'var(--purple-text)' : role === 'independent' ? 'var(--blue-text)' : 'var(--mint-text)'

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
            <div style={{
                position: 'fixed',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: containerColor,
                borderRadius: '20px',
                padding: '36px',
                width: '320px',
                zIndex: 300,
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}>
                <p style={{ color: textColor, fontWeight: 'bold', fontSize: '16px', marginBottom: '12px' }}>
                    Are you sure?
                </p>
                <p style={{ color: textColor, fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            flex: 1, padding: '11px',
                            backgroundColor: 'transparent',
                            color: textColor,
                            border: `1.5px solid ${accentColor}`,
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1, padding: '11px',
                            backgroundColor: accentColor,
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </>
    )
}