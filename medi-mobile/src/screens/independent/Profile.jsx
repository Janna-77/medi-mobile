import { useState, useEffect, useRef } from 'react'
import {
    View, Text, TouchableOpacity, TextInput, ScrollView,
    StyleSheet, Alert, Modal, Pressable, Image, Switch, SafeAreaView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import DoctorAccessPanel from '../../components/DoctorAccessPanel'
import LoadingOverlay from '../../components/LoadingOverlay'

const C = {
    bg: '#141e2d',
    cardBg: 'rgba(255,255,255,0.05)',
    cardBorder: 'rgba(50,100,150,0.22)',
    text: '#d8eaf6',
    textSub: '#5a90b5',
    accent: '#1e90c8',
    accentLabel: '#4ab8d8',
    modalBg: '#0f1928',
    modalBorder: 'rgba(50,100,150,0.35)',
    modalText: '#d8eaf6',
    modalSubtext: '#5a90b5',
}

function validatePassword(pw) {
    const errors = []
    if (pw.length < 8) errors.push('At least 8 characters')
    if (!/[A-Z]/.test(pw)) errors.push('One uppercase letter')
    if (!/[a-z]/.test(pw)) errors.push('One lowercase letter')
    if (!/\d/.test(pw)) errors.push('One number')
    if (!/[^A-Za-z0-9]/.test(pw)) errors.push('One special character')
    return errors
}

export default function IndependentProfile() {
    const navigation = useNavigation()
    const { logout, switchAccount } = useAuth()

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState(null)
    const [accountStatus, setAccountStatus] = useState(null)
    const [doctorVerified, setDoctorVerified] = useState(false)
    const [lightMode, setLightMode] = useState(false)
    const [modeLoading, setModeLoading] = useState(false)
    const [detailModal, setDetailModal] = useState(null)
    const [section, setSection] = useState('doctors')
    const [switchingRole, setSwitchingRole] = useState(null)
    const [avatarUploading, setAvatarUploading] = useState(false)
    const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)

    useEffect(() => {
        AsyncStorage.getItem('medi_mode').then(v => setLightMode(v === 'light'))
        Promise.allSettled([
            api.get('/users/profile'),
            api.get('/upgrade/status'),
        ]).then(([profileRes, statusRes]) => {
            if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data)
            if (statusRes.status === 'fulfilled') setAccountStatus(statusRes.value.data)
        }).finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (!accountStatus?.is_doctor) return
        api.get('/users/profile-doctor')
            .then(res => setDoctorVerified(res.data.verification_status === 'approved'))
            .catch(() => {})
    }, [accountStatus?.is_doctor])

    const handleModeToggle = async () => {
        const newMode = !lightMode
        setLightMode(newMode)
        const modeStr = newMode ? 'light' : 'dark'
        await AsyncStorage.setItem('medi_mode', modeStr)
        setModeLoading(true)
        try { await api.patch('/users/mode', { mode: modeStr }) } catch {}
        finally { setModeLoading(false) }
    }

    const handleAvatarPick = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
        })
        if (result.canceled) return
        const asset = result.assets[0]
        setAvatarUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', { uri: asset.uri, type: 'image/jpeg', name: 'avatar.jpg' })
            const res = await api.post('/users/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            setProfile(prev => ({ ...prev, profile_picture_url: res.data.url }))
        } catch {}
        finally { setAvatarUploading(false) }
    }

    const handleDeletePfp = async () => {
        setAvatarMenuOpen(false)
        try {
            await api.delete('/users/profile-picture')
            setProfile(prev => ({ ...prev, profile_picture_url: null }))
        } catch {}
    }

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: logout },
        ])
    }

    const handleSwitch = async (role) => {
        setSwitchingRole(role)
        try {
            await switchAccount(role)
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to switch')
            setSwitchingRole(null)
        }
    }

    const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

    return (
        <SafeAreaView style={styles.root}>
            <Header role="independent" />
            <View style={{ flex: 1 }}>
            <LoadingOverlay visible={loading} role="independent" />
            <ScrollView contentContainerStyle={styles.content}>

                {/* Avatar + name */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                            if (avatarUploading) return
                            if (profile?.profile_picture_url) setAvatarMenuOpen(true)
                            else handleAvatarPick()
                        }}
                    >
                        <View style={styles.avatarWrap}>
                            {profile?.profile_picture_url ? (
                                <Image source={{ uri: profile.profile_picture_url }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>{avatarUploading ? '…' : initials}</Text>
                                </View>
                            )}
                            <View style={styles.avatarOverlay}>
                                <Text style={{ fontSize: 18 }}>📷</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.profileName}>{profile?.full_name || '—'}</Text>
                    <Text style={styles.profileRole}>Independent Account</Text>
                </View>

                {/* Avatar action modal */}
                <Modal visible={avatarMenuOpen} transparent animationType="fade" onRequestClose={() => setAvatarMenuOpen(false)}>
                    <Pressable style={styles.avatarMenuOverlay} onPress={() => setAvatarMenuOpen(false)}>
                        <View style={styles.avatarMenu}>
                            <TouchableOpacity style={styles.avatarMenuItem} onPress={() => { setAvatarMenuOpen(false); handleAvatarPick() }}>
                                <Text style={styles.avatarMenuText}>Upload new photo</Text>
                            </TouchableOpacity>
                            <View style={styles.avatarMenuDivider} />
                            <TouchableOpacity style={styles.avatarMenuItem} onPress={handleDeletePfp}>
                                <Text style={[styles.avatarMenuText, { color: '#e05252' }]}>Delete photo</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Modal>

                {/* Section tabs */}
                <View style={styles.tabBar}>
                    {[['doctors', 'Doctor Access'], ['account', 'Account']].map(([id, label]) => (
                        <TouchableOpacity
                            key={id}
                            style={[styles.tab, section === id && styles.tabActive]}
                            onPress={() => setSection(id)}
                        >
                            <Text style={[styles.tabText, section === id && styles.tabTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Doctor access */}
                {section === 'doctors' && <DoctorAccessPanel />}

                {/* Account section */}
                {section === 'account' && (
                    <View style={{ gap: 14 }}>

                        <View style={styles.card}>
                            <Text style={styles.sectionLabel}>Appearance</Text>
                            <View style={styles.row}>
                                <Text style={styles.rowText}>{lightMode ? 'Light Mode ☀︎' : 'Dark Mode ⏾'}</Text>
                                <Switch
                                    value={lightMode}
                                    onValueChange={handleModeToggle}
                                    disabled={modeLoading}
                                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: C.accent }}
                                    thumbColor="white"
                                />
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.sectionLabel}>Account Details</Text>
                            {[
                                { label: 'Change Email', modal: 'email' },
                                { label: 'Change Password', modal: 'password' },
                                { label: 'Change Phone Number', modal: 'phone' },
                            ].map(({ label, modal }) => (
                                <ProfileRow key={modal} label={label} onPress={() => setDetailModal(modal)} />
                            ))}
                        </View>

                        {accountStatus && (!accountStatus.is_guardian || !accountStatus.is_doctor) && (
                            <View style={styles.card}>
                                <Text style={styles.sectionLabel}>Add Account Type</Text>
                                {!accountStatus.is_guardian && (
                                    <ProfileRow label="+ Add Guardian Account" onPress={() => navigation.navigate('IndependentAddGuardian')} />
                                )}
                                {!accountStatus.is_doctor && (
                                    <ProfileRow label="+ Add Doctor Account" onPress={() => navigation.navigate('IndependentAddDoctor')} />
                                )}
                            </View>
                        )}

                        {accountStatus && (accountStatus.is_guardian || accountStatus.is_doctor) && (
                            <View style={styles.card}>
                                <Text style={styles.sectionLabel}>Switch Account</Text>
                                {accountStatus.is_guardian && (
                                    <ProfileRow
                                        label={switchingRole === 'guardian' ? 'Switching…' : 'Switch to Guardian'}
                                        onPress={() => handleSwitch('guardian')}
                                        disabled={switchingRole === 'guardian'}
                                    />
                                )}
                                {accountStatus.is_doctor && (
                                    <ProfileRow
                                        label={switchingRole === 'doctor' ? 'Switching…' : `Switch to Doctor${!doctorVerified ? ' (pending)' : ''}`}
                                        onPress={() => doctorVerified ? handleSwitch('doctor') : undefined}
                                        disabled={!doctorVerified || switchingRole === 'doctor'}
                                    />
                                )}
                            </View>
                        )}

                        <View style={styles.card}>
                            <Text style={styles.sectionLabel}>More</Text>
                            <ProfileRow label="Subscriptions" onPress={() => navigation.navigate('Subscriptions', { role: 'independent' })} />
                            <ProfileRow label="Report a Bug" onPress={() => navigation.navigate('ReportSmth')} />
                        </View>

                        <TouchableOpacity onPress={() => navigation.navigate('About')}>
                            <Text style={styles.aboutLink}>About</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
            </View>

            <BottomNav role="independent" />

            {detailModal && (
                <AccountDetailModal
                    type={detailModal}
                    userPhone={profile?.phone_number || ''}
                    onClose={() => setDetailModal(null)}
                />
            )}
        </SafeAreaView>
    )
}

function ProfileRow({ label, onPress, disabled }) {
    return (
        <TouchableOpacity
            style={styles.profileRow}
            onPress={disabled ? undefined : onPress}
            activeOpacity={disabled ? 1 : 0.7}
        >
            <Text style={[styles.profileRowText, disabled && { color: C.textSub }]}>{label}</Text>
            <Text style={{ color: C.textSub, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
    )
}

function AccountDetailModal({ type, userPhone, onClose }) {
    const [form, setForm] = useState({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [emailStep, setEmailStep] = useState(1)
    const [countdown, setCountdown] = useState(0)
    const [timerKey, setTimerKey] = useState(0)

    useEffect(() => {
        if (emailStep !== 2) return
        setCountdown(120)
        const interval = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(interval); return 0 }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(interval)
    }, [emailStep, timerKey])

    const handleSendCode = async () => {
        setLoading(true); setError('')
        try {
            await api.post('/users/email/request', { new_email: form.new_email, password: form.password })
            setEmailStep(2)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send code')
        } finally { setLoading(false) }
    }

    const handleResend = async () => {
        setLoading(true); setError('')
        try {
            await api.post('/users/email/request', { new_email: form.new_email, password: form.password })
            setTimerKey(k => k + 1)
            setForm(f => ({ ...f, code: '' }))
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend')
        } finally { setLoading(false) }
    }

    const handleSubmit = async () => {
        setLoading(true); setError('')
        try {
            if (type === 'email') {
                await api.patch('/users/email', { new_email: form.new_email, code: form.code })
                setSuccess('Email updated successfully')
            } else if (type === 'password') {
                await api.patch('/users/password', { old_password: form.old_password, new_password: form.new_password })
                setSuccess('Password updated successfully')
            } else if (type === 'phone') {
                await api.patch('/users/phone', { new_phone: form.new_phone, password: form.password })
                setSuccess('Phone number updated successfully')
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update')
        } finally { setLoading(false) }
    }

    const newPw = form.new_password || ''
    const pwErrors = validatePassword(newPw)
    const pwStrength = newPw ? 5 - pwErrors.length : 0
    const pwColor = pwStrength <= 2 ? '#e53e3e' : pwStrength <= 3 ? '#dd6b20' : '#38a169'
    const titles = { email: 'Change Email', password: 'Change Password', phone: 'Change Phone Number' }
    const formatCountdown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={mStyles.overlay} onPress={onClose}>
                <Pressable style={mStyles.box} onPress={() => {}}>
                    <Text style={mStyles.title}>{titles[type]}</Text>

                    {success ? (
                        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                            <Text style={{ fontSize: 36, marginBottom: 10 }}>✅</Text>
                            <Text style={[mStyles.text, { fontWeight: '700', marginBottom: 20 }]}>{success}</Text>
                            <TouchableOpacity style={mStyles.primaryBtn} onPress={onClose}>
                                <Text style={mStyles.primaryBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={{ gap: 12, marginBottom: 16 }}>

                                {type === 'email' && emailStep === 1 && (
                                    <>
                                        <TextInput
                                            style={mStyles.input}
                                            placeholder="New email address"
                                            placeholderTextColor={C.modalSubtext}
                                            value={form.new_email || ''}
                                            onChangeText={v => setForm({ ...form, new_email: v })}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                        />
                                        <TextInput
                                            style={mStyles.input}
                                            placeholder="Your password"
                                            placeholderTextColor={C.modalSubtext}
                                            value={form.password || ''}
                                            onChangeText={v => setForm({ ...form, password: v })}
                                            secureTextEntry
                                        />
                                    </>
                                )}

                                {type === 'email' && emailStep === 2 && (
                                    <>
                                        <Text style={{ color: C.modalSubtext, fontSize: 13 }}>
                                            A code was sent to{' '}
                                            <Text style={{ fontWeight: '700', color: C.modalText }}>{form.new_email}</Text>
                                        </Text>
                                        <OtpInput value={form.code || ''} onChange={code => setForm({ ...form, code })} />
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: 12, color: countdown > 0 ? '#718096' : '#e53e3e' }}>
                                                {countdown > 0 ? `Expires in ${formatCountdown(countdown)}` : 'Code expired'}
                                            </Text>
                                            <TouchableOpacity onPress={handleResend} disabled={loading || countdown > 0}>
                                                <Text style={{ fontSize: 12, color: countdown > 0 ? '#aaa' : C.accent }}>Resend</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}

                                {type === 'password' && (
                                    <>
                                        <TextInput
                                            style={mStyles.input}
                                            placeholder="Current password"
                                            placeholderTextColor={C.modalSubtext}
                                            value={form.old_password || ''}
                                            onChangeText={v => setForm({ ...form, old_password: v })}
                                            secureTextEntry
                                        />
                                        <TextInput
                                            style={mStyles.input}
                                            placeholder="New password"
                                            placeholderTextColor={C.modalSubtext}
                                            value={newPw}
                                            onChangeText={v => setForm({ ...form, new_password: v })}
                                            secureTextEntry
                                        />
                                        {newPw.length > 0 && (
                                            <View>
                                                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                                                    {[1, 2, 3, 4, 5].map(i => (
                                                        <View key={i} style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: i <= pwStrength ? pwColor : C.modalBorder }} />
                                                    ))}
                                                </View>
                                                <Text style={{ fontSize: 12, color: pwColor }}>
                                                    {pwStrength <= 2 ? 'Weak' : pwStrength <= 3 ? 'Medium' : 'Strong'}
                                                </Text>
                                                {pwErrors.map(e => (
                                                    <Text key={e} style={{ fontSize: 11, color: '#718096', marginTop: 2 }}>• {e}</Text>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                )}

                                {type === 'phone' && (
                                    <>
                                        {!!userPhone && (
                                            <Text style={{ color: C.modalSubtext, fontSize: 12 }}>Current: {userPhone}</Text>
                                        )}
                                        <TextInput
                                            style={mStyles.input}
                                            placeholder="New phone number"
                                            placeholderTextColor={C.modalSubtext}
                                            value={form.new_phone || ''}
                                            onChangeText={v => setForm({ ...form, new_phone: v.replace(/[^\d+]/g, '') })}
                                            keyboardType="phone-pad"
                                            maxLength={16}
                                        />
                                        <TextInput
                                            style={mStyles.input}
                                            placeholder="Your password"
                                            placeholderTextColor={C.modalSubtext}
                                            value={form.password || ''}
                                            onChangeText={v => setForm({ ...form, password: v })}
                                            secureTextEntry
                                        />
                                    </>
                                )}
                            </View>

                            {!!error && <Text style={{ color: '#e53e3e', fontSize: 13, marginBottom: 12 }}>{error}</Text>}

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity style={[mStyles.btn, mStyles.cancelBtn]} onPress={onClose}>
                                    <Text style={{ color: C.modalSubtext, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
                                </TouchableOpacity>

                                {type === 'email' && emailStep === 1 ? (
                                    <TouchableOpacity
                                        style={[mStyles.btn, mStyles.primaryBtn, loading && { opacity: 0.7 }]}
                                        onPress={handleSendCode}
                                        disabled={loading}
                                    >
                                        <Text style={mStyles.primaryBtnText}>{loading ? 'Sending…' : 'Send Code'}</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[mStyles.btn, mStyles.primaryBtn, loading && { opacity: 0.7 }]}
                                        onPress={handleSubmit}
                                        disabled={loading}
                                    >
                                        <Text style={mStyles.primaryBtnText}>
                                            {loading ? 'Saving…' : type === 'email' ? 'Verify & Update' : 'Save'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    )
}

function OtpInput({ value, onChange }) {
    const refs = useRef([])
    const digits = (value || '').split('').concat(Array(6).fill('')).slice(0, 6)

    const handleChange = (i, text) => {
        const digit = text.replace(/\D/g, '').slice(-1)
        const next = [...digits]; next[i] = digit
        onChange(next.join(''))
        if (digit && i < 5) refs.current[i + 1]?.focus()
    }

    const handleKeyPress = (i, e) => {
        if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
            const next = [...digits]; next[i - 1] = ''
            onChange(next.join(''))
            refs.current[i - 1]?.focus()
        }
    }

    return (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            {[0, 1, 2, 3, 4, 5].map(i => (
                <TextInput
                    key={i}
                    ref={el => refs.current[i] = el}
                    style={mStyles.otpBox}
                    value={digits[i]}
                    onChangeText={text => handleChange(i, text)}
                    onKeyPress={e => handleKeyPress(i, e)}
                    keyboardType="numeric"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                />
            ))}
        </View>
    )
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { padding: 20, paddingBottom: 48 },
    avatarSection: { alignItems: 'center', marginBottom: 28, gap: 12 },
    avatarWrap: {
        width: 80, height: 80, borderRadius: 40, overflow: 'hidden',
        shadowColor: '#0078b4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarPlaceholder: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#006fa6',
        alignItems: 'center', justifyContent: 'center',
    },
    avatarInitials: { color: 'white', fontSize: 26, fontWeight: '700' },
    avatarOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center', justifyContent: 'center',
    },
    profileName: { color: C.text, fontSize: 20, fontFamily: 'Calistoga' },
    profileRole: { color: C.accent, fontSize: 12, fontWeight: '500', letterSpacing: 0.5 },
    avatarMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    avatarMenu: {
        backgroundColor: C.modalBg, borderRadius: 14, overflow: 'hidden',
        width: 200, borderWidth: 1, borderColor: C.modalBorder,
    },
    avatarMenuItem: { padding: 16 },
    avatarMenuText: { color: C.text, fontSize: 14 },
    avatarMenuDivider: { height: 1, backgroundColor: C.modalBorder },
    tabBar: {
        flexDirection: 'row', backgroundColor: 'rgba(13,31,51,0.8)',
        borderRadius: 14, padding: 4, marginBottom: 20,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: C.accent },
    tabText: { color: C.textSub, fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: 'white' },
    card: {
        backgroundColor: C.cardBg, borderRadius: 18, padding: 18,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    sectionLabel: {
        color: C.accentLabel, fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
        fontFamily: 'Georgia',
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowText: { color: C.text, fontWeight: '600', fontSize: 14 },
    profileRow: {
        paddingVertical: 13, paddingHorizontal: 4,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    profileRowText: { color: C.text, fontSize: 14, fontWeight: '500' },
    aboutLink: { color: C.accent, fontSize: 14, textDecorationLine: 'underline', paddingVertical: 2 },
    logoutBtn: {
        padding: 16, borderWidth: 1, borderColor: 'rgba(229,62,62,0.2)',
        borderRadius: 14, backgroundColor: 'rgba(229,62,62,0.08)', alignItems: 'center',
    },
    logoutText: { color: '#e53e3e', fontSize: 14, fontWeight: '700' },
})

const mStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(8,28,47,0.6)', justifyContent: 'center', alignItems: 'center' },
    box: {
        backgroundColor: C.modalBg, borderRadius: 20, padding: 28,
        width: 340, maxWidth: '90%', borderWidth: 1, borderColor: C.modalBorder,
    },
    title: { color: C.modalText, fontWeight: '700', fontSize: 17, marginBottom: 20 },
    text: { color: C.modalText, fontSize: 14 },
    input: {
        borderWidth: 1.5, borderColor: C.modalBorder, borderRadius: 8,
        padding: 11, fontSize: 14, color: C.modalText, backgroundColor: 'rgba(0,0,0,0.2)',
    },
    btn: { flex: 1, padding: 11, borderRadius: 10, alignItems: 'center' },
    cancelBtn: { borderWidth: 1.5, borderColor: C.modalBorder, backgroundColor: 'rgba(0,0,0,0.2)' },
    primaryBtn: { backgroundColor: C.accent, borderRadius: 10, padding: 11, alignItems: 'center' },
    primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
    otpBox: {
        width: 44, height: 52, borderRadius: 8, borderWidth: 1.5,
        borderColor: C.modalBorder, backgroundColor: 'rgba(0,0,0,0.2)',
        color: C.modalText, fontSize: 20, fontWeight: '700',
    },
})
