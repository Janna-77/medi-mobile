import { useState, useEffect } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, Image,
    StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import supabase from '../../lib/supabase'

const SCHEME = {
    doctor:      { bg: '#3b1f5e', container: '#ead6f7', text: '#1e0f33', border: '#3b1f5e' },
    guardian:    { bg: '#5a0a3c', container: '#ead4ed', text: '#35052e', border: '#410a35' },
    independent: { bg: '#081c2f', container: '#d6e8f7', text: '#0d1f33', border: '#1a3c5e' },
}

export default function Verification() {
    const navigation = useNavigation()
    const route = useRoute()
    const { login } = useAuth()

    const { formData, certificate, type } = route.params || {}

    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [attempts, setAttempts] = useState(0)
    const [expiresAt] = useState(() => Date.now() + 2 * 60 * 1000)
    const [timeLeft, setTimeLeft] = useState(120)
    const [canResend, setCanResend] = useState(false)
    const [lockedOut, setLockedOut] = useState(false)
    const [lockExpiresAt, setLockExpiresAt] = useState(null)
    const [lockTimer, setLockTimer] = useState(60)

    const scheme = SCHEME[formData?.role] || SCHEME.independent

    // Main 2-minute countdown
    useEffect(() => {
        if (lockedOut) return
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
            setTimeLeft(remaining)
            if (remaining === 0) {
                setCanResend(true)
                clearInterval(interval)
            }
        }, 500)
        return () => clearInterval(interval)
    }, [lockedOut, expiresAt])

    // Lockout countdown
    useEffect(() => {
        if (!lockedOut || !lockExpiresAt) return
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000))
            setLockTimer(remaining)
            if (remaining === 0) {
                setLockedOut(false)
                setLockTimer(60)
                clearInterval(interval)
            }
        }, 500)
        return () => clearInterval(interval)
    }, [lockedOut, lockExpiresAt])

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    const handleResend = async () => {
        if (!canResend) return
        try {
            const { error } = await supabase.auth.signInWithOtp({ email: formData.email })
            if (error) throw error
            setTimeLeft(120)
            setCanResend(false)
            setCode('')
            setError('')
            setAttempts(0)
        } catch (err) {
            setError('Failed to resend code')
        }
    }

    const handleVerify = async () => {
        if (!code || code.length !== 8) {
            setError('Please enter the 8-digit code')
            return
        }
        setLoading(true)
        setError('')

        try {
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email: formData.email,
                token: code,
                type: 'email',
            })
            if (verifyError) throw verifyError
        } catch (verifyErr) {
            const newAttempts = attempts + 1
            setAttempts(newAttempts)
            if (newAttempts >= 3) {
                setLockedOut(true)
                setLockExpiresAt(Date.now() + 60 * 1000)
            } else {
                setError(verifyErr.message || 'Incorrect code')
            }
            setLoading(false)
            return
        }

        try {
            let response
            if (formData.role === 'doctor') {
                const data = new FormData()
                Object.entries(formData).forEach(([key, value]) => {
                    if (value) data.append(key, value)
                })
                if (certificate) {
                    data.append('certificate', {
                        uri: certificate.uri,
                        type: certificate.mimeType || 'application/octet-stream',
                        name: certificate.name || 'certificate',
                    })
                }
                response = await api.post('/auth/register', data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })
            } else {
                response = await api.post('/auth/register', formData)
            }

            const { token, userId, role } = response.data
            login(token, role, userId)

            if (role === 'doctor') navigation.navigate('DoctorHome')
            else if (role === 'guardian') navigation.navigate('GuardianHome')
            else navigation.navigate('IndependentHome')
        } catch (registerErr) {
            setError(registerErr.response?.data?.error || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    if (lockedOut) {
        return (
            <View style={[styles.screen, { backgroundColor: scheme.bg }]}>
                <View style={[styles.card, { backgroundColor: scheme.container }]}>
                    <Text style={[styles.lockTitle, { color: scheme.text }]}>
                        Too many incorrect attempts.
                    </Text>
                    <Text style={[styles.lockSub, { color: scheme.text }]}>
                        Please try again in
                    </Text>
                    <Text style={[styles.lockTimer, { color: scheme.border }]}>
                        {formatTime(lockTimer)}
                    </Text>
                </View>
            </View>
        )
    }

    return (
        <View style={[styles.screen, { backgroundColor: scheme.bg }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, width: '100%' }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.card, { backgroundColor: scheme.container }]}>
                        <Image
                            source={require('../../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />

                        <Text style={[styles.title, { color: scheme.text }]}>
                            Verify your email
                        </Text>
                        <Text style={[styles.subtitle, { color: scheme.text }]}>
                            We sent an 8-digit code to{' '}
                            <Text style={{ fontWeight: 'bold' }}>{formData?.email}</Text>
                        </Text>

                        <TextInput
                            style={[styles.codeInput, { borderColor: scheme.border, color: scheme.text }]}
                            value={code}
                            onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                            placeholder="00000000"
                            placeholderTextColor={scheme.border + '88'}
                            keyboardType="number-pad"
                            maxLength={8}
                            returnKeyType="go"
                            onSubmitEditing={handleVerify}
                        />

                        {error ? (
                            <Text style={styles.error}>{error}</Text>
                        ) : null}

                        <Text style={[styles.timerText, { color: scheme.text }]}>
                            Code expires in{' '}
                            <Text style={{ fontWeight: 'bold', color: timeLeft < 30 ? 'red' : scheme.border }}>
                                {formatTime(timeLeft)}
                            </Text>
                        </Text>

                        <TouchableOpacity
                            style={[styles.verifyBtn, { backgroundColor: scheme.border, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleVerify}
                            disabled={loading}
                        >
                            <Text style={styles.verifyBtnText}>
                                {loading ? 'Verifying...' : 'Verify'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleResend} disabled={!canResend}>
                            <Text style={[styles.resendText, { color: canResend ? scheme.border : '#aaa' }]}>
                                {canResend ? 'Resend code' : 'Resend available after timer expires'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: {
        borderRadius: 20, padding: 36, width: '100%', maxWidth: 380,
        gap: 16, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 32, elevation: 10,
    },
    logo: { width: 70, height: 70, marginBottom: 8 },
    title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
    subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    codeInput: {
        width: '100%', paddingVertical: 16, paddingHorizontal: 12,
        borderRadius: 10, borderWidth: 2, backgroundColor: 'white',
        fontSize: 28, textAlign: 'center', letterSpacing: 12,
    },
    error: { color: 'red', fontSize: 13, textAlign: 'center' },
    timerText: { fontSize: 13, textAlign: 'center' },
    verifyBtn: {
        width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    },
    verifyBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
    resendText: { fontSize: 13, textAlign: 'center' },
    // Lockout screen
    lockTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
    lockSub: { fontSize: 14, textAlign: 'center', marginBottom: 8 },
    lockTimer: { fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
})
