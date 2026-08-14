import { useState, useEffect } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as DocumentPicker from 'expo-document-picker'
import api from '../api/axios'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

// ── Defined outside component so they never remount on re-render (fixes keyboard dismiss) ──

function LockHeader({ C, lightMode, otherRoles, onSwitchRole, onLogout, switchingRole }) {
    const [ddOpen, setDdOpen] = useState(false)
    const switchColor = lightMode ? '#1a0033' : '#ece0ff'

    return (
        <View style={[s.header, { backgroundColor: C.topbarBg, borderBottomColor: C.topbarBorder }]}>
            {/* Left: switch account */}
            <View style={s.headerLeft}>
                {otherRoles.length > 0 && (
                    <>
                        <TouchableOpacity
                            onPress={() => setDdOpen(o => !o)}
                            activeOpacity={0.75}
                            style={[s.switchBtn, { borderColor: switchColor }]}
                        >
                            <Text style={[s.switchBtnText, { color: switchColor }]}>Switch</Text>
                            <Text style={[s.switchChevron, { color: switchColor }]}>
                                {ddOpen ? '▼' : '▲'}
                            </Text>
                        </TouchableOpacity>
                        {ddOpen && (
                            <View style={[s.dropdown, { backgroundColor: C.cardBg, borderColor: C.cardBorder }]}>
                                {otherRoles.map(r => (
                                    <TouchableOpacity
                                        key={r}
                                        onPress={() => { setDdOpen(false); onSwitchRole(r) }}
                                        disabled={!!switchingRole}
                                        style={s.ddItem}
                                    >
                                        <Text style={[s.ddItemText, { color: C.textPrimary }]}>
                                            {switchingRole === r ? 'Switching…' : r.charAt(0).toUpperCase() + r.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Center: logo — absolutely positioned so it's always truly centered */}
            <View style={s.logoWrap} pointerEvents="none">
                <Image
                    source={require('../../assets/logo.png')}
                    style={s.logo}
                    resizeMode="contain"
                />
            </View>

            {/* Right: logout */}
            <TouchableOpacity onPress={onLogout} activeOpacity={0.7} style={s.logoutBtn}>
                <Text style={[s.logoutText, { color: lightMode ? '#3f0707' : '#b59999' }]}>
                    Log out
                </Text>
            </TouchableOpacity>
        </View>
    )
}

function LockWrapper({ icon, title, subtitle, C, lightMode, otherRoles, onSwitchRole, onLogout, switchingRole, children }) {
    return (
        <SafeAreaView style={[s.root, { backgroundColor: C.bg }]} edges={['top']}>
            <LockHeader
                C={C}
                lightMode={lightMode}
                otherRoles={otherRoles}
                onSwitchRole={onSwitchRole}
                onLogout={onLogout}
                switchingRole={switchingRole}
            />
            <ScrollView
                contentContainerStyle={s.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={[s.card, { backgroundColor: C.cardBg, borderColor: C.cardBorder }]}>
                    <Text style={s.icon}>{icon}</Text>
                    <Text style={[s.title, { color: C.textPrimary }]}>{title}</Text>
                    <Text style={[s.subtitle, { color: C.textSub }]}>{subtitle}</Text>
                    {children}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function MedicalLicenceExpiryLock({ children }) {
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

    const [otherRoles, setOtherRoles] = useState([])
    const [switchingRole, setSwitchingRole] = useState(null)

    const { theme, mode } = useTheme()
    const { logout, switchAccount } = useAuth()
    const navigation = useNavigation()

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

    // Decode token to find other roles this user has
    useEffect(() => {
        AsyncStorage.getItem('medi_token').then(token => {
            if (!token) return
            try {
                const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
                const decoded = JSON.parse(atob(b64))
                const roles = []
                if (decoded.is_independent) roles.push('independent')
                if (decoded.is_guardian) roles.push('guardian')
                // doctor is the current role — excluded
                setOtherRoles(roles)
            } catch { }
        }).catch(() => { })
    }, [])

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: logout },
        ])
    }

    const roleHome = { independent: 'IndependentHome', guardian: 'GuardianHome', doctor: 'DoctorHome' }

    const handleSwitchRole = async (role) => {
        setSwitchingRole(role)
        try {
            await switchAccount(role)
            navigation.reset({ index: 0, routes: [{ name: roleHome[role] }] })
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to switch')
        } finally {
            setSwitchingRole(null)
        }
    }

    const pickCertificate = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/*'],
            copyToCacheDirectory: true,
        })
        if (!result.canceled && result.assets?.[0]) {
            setCertificate(result.assets[0])
        }
    }

    const handleUpload = async () => {
        if (!certificate || !expiryDate.trim()) {
            setUploadError('Please upload your certificate and enter the new expiry date')
            return
        }
        setUploadError('')
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('certificate', {
                uri: certificate.uri,
                type: certificate.mimeType || 'application/octet-stream',
                name: certificate.name,
            })
            formData.append('licence_expiry_date', expiryDate.trim())
            await api.patch('/upgrade/doctor/update-licence', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
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
                medical_license_number: licenceNumber.trim(),
            })
            setVerifySuccess(true)
            setTimeout(() => setStatus('valid'), 1500)
        } catch (err) {
            setVerifyError(err.response?.data?.error || 'Verification failed')
        } finally {
            setVerifying(false)
        }
    }

    if (status === 'valid') return children
    if (status === 'loading') return <View style={{ flex: 1, backgroundColor: theme?.pageBg ?? '#141e2d' }} />

    const lightMode = mode === 'light'

    const C = {
        bg: theme?.pageBg ?? '#141e2d',
        topbarBg: theme?.topbarBg ?? 'rgba(14,22,36,0.95)',
        topbarBorder: theme?.topbarBorder ?? 'rgba(100,50,160,0.35)',
        cardBg: theme?.cardBg ?? 'rgba(255,255,255,0.05)',
        cardBorder: theme?.cardBorder ?? 'rgba(120,60,180,0.22)',
        textPrimary: theme?.textPrimary ?? '#ede8ff',
        textSub: theme?.textSecondary ?? '#b898e0',
        inputBg: theme?.inputBg ?? 'rgba(255,255,255,0.07)',
        inputBorder: theme?.inputBorder ?? 'rgba(120,60,180,0.38)',
    }

    const wrapperProps = { C, lightMode, otherRoles, onSwitchRole: handleSwitchRole, onLogout: handleLogout, switchingRole }

    if (status === 'expired') {
        return (
            <LockWrapper
                {...wrapperProps}
                icon="🔒"
                title="Medical Licence Expired"
                subtitle="Your medical licence has expired or is missing. Upload your renewed licence and enter the new expiry date to regain access."
            >
                {uploadSuccess ? (
                    <View style={s.successBox}>
                        <Text style={s.successText}>✓ Licence updated! Restoring access…</Text>
                    </View>
                ) : (
                    <>
                        <View style={s.field}>
                            <Text style={[s.label, { color: C.textPrimary }]}>New Expiry Date</Text>
                            <TextInput
                                value={expiryDate}
                                onChangeText={setExpiryDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={C.textSub}
                                style={[s.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.textPrimary }]}
                            />
                        </View>
                        <View style={s.field}>
                            <Text style={[s.label, { color: C.textPrimary }]}>Upload Renewed Licence</Text>
                            <TouchableOpacity
                                onPress={pickCertificate}
                                activeOpacity={0.75}
                                style={[s.filePicker, { backgroundColor: C.inputBg, borderColor: C.inputBorder }]}
                            >
                                <Text style={[s.filePickerText, { color: C.textSub }]}>
                                    {certificate ? `✓ ${certificate.name}` : '📎 Tap to upload'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {!!uploadError && <Text style={s.errorText}>{uploadError}</Text>}
                        <TouchableOpacity
                            onPress={handleUpload}
                            disabled={uploading}
                            activeOpacity={0.8}
                            style={[s.btn, { opacity: uploading ? 0.7 : 1 }]}
                        >
                            <Text style={s.btnText}>{uploading ? 'Uploading…' : 'Submit Renewed Licence'}</Text>
                        </TouchableOpacity>
                    </>
                )}
            </LockWrapper>
        )
    }

    if (status === 'monthly_verification') {
        return (
            <LockWrapper
                {...wrapperProps}
                icon="🩺"
                title="Monthly Verification Required"
                subtitle="In line with Medi's terms, licensed practitioners must verify their credentials every 30 days. Enter your medical licence number to continue."
            >
                {verifySuccess ? (
                    <View style={s.successBox}>
                        <Text style={s.successText}>✓ Verified! Restoring access…</Text>
                    </View>
                ) : (
                    <>
                        <View style={s.field}>
                            <Text style={[s.label, { color: C.textPrimary }]}>Medical Licence Number</Text>
                            <TextInput
                                value={licenceNumber}
                                onChangeText={setLicenceNumber}
                                placeholder="Enter your licence number"
                                placeholderTextColor={C.textSub}
                                returnKeyType="done"
                                onSubmitEditing={handleVerify}
                                style={[s.input, { backgroundColor: C.inputBg, borderColor: C.inputBorder, color: C.textPrimary }]}
                            />
                        </View>
                        {!!verifyError && <Text style={s.errorText}>{verifyError}</Text>}
                        <TouchableOpacity
                            onPress={handleVerify}
                            disabled={verifying}
                            activeOpacity={0.8}
                            style={[s.btn, { opacity: verifying ? 0.7 : 1 }]}
                        >
                            <Text style={s.btnText}>{verifying ? 'Verifying…' : 'Verify & Continue'}</Text>
                        </TouchableOpacity>
                    </>
                )}
            </LockWrapper>
        )
    }

    return children
}

const s = StyleSheet.create({
    root: { flex: 1 },
    // header
    header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1, zIndex: 10 },
    headerLeft: { minWidth: 60, zIndex: 20 },
    logoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    logo: { width: 60, height: 60 },
    switchBtn: { height: 30, borderRadius: 9, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
    switchBtnText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
    switchChevron: { fontSize: 9 },
    dropdown: { position: 'absolute', top: 34, left: 0, borderWidth: 1, borderRadius: 10, overflow: 'hidden', minWidth: 130, zIndex: 30 },
    ddItem: { paddingVertical: 12, paddingHorizontal: 14 },
    ddItemText: { fontSize: 13, fontWeight: '600' },
    logoutBtn: { width: 50, height: 30, borderRadius: 9, backgroundColor: 'rgba(229,62,62,0.12)', borderWidth: 1, borderColor: 'rgba(229,62,62,0.45)', justifyContent: 'center', alignItems: 'center' },
    logoutText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.2 },
    // content
    scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: { width: '100%', maxWidth: 420, borderRadius: 20, borderWidth: 1, padding: 32, gap: 16, alignItems: 'center' },
    icon: { fontSize: 44 },
    title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
    subtitle: { fontSize: 13, lineHeight: 21, textAlign: 'center' },
    field: { width: '100%', gap: 6 },
    label: { fontSize: 13, fontWeight: '600' },
    input: { borderWidth: 1.5, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 14, fontSize: 14, width: '100%' },
    filePicker: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center' },
    filePickerText: { fontSize: 13 },
    errorText: { color: '#e53e3e', fontSize: 13, alignSelf: 'flex-start' },
    btn: { width: '100%', backgroundColor: '#6030a0', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
    btnText: { color: 'white', fontSize: 14, fontWeight: '700' },
    successBox: { backgroundColor: 'rgba(56,161,105,0.12)', borderWidth: 1, borderColor: 'rgba(56,161,105,0.3)', borderRadius: 10, padding: 16, width: '100%' },
    successText: { color: '#38a169', fontWeight: '700', textAlign: 'center' },
})
