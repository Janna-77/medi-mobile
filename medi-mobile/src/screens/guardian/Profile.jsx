import { useState, useEffect, useRef } from 'react'
import {
    View, Text, TouchableOpacity, TextInput, ScrollView,
    StyleSheet, Alert, Modal, Pressable, Image, Switch, SafeAreaView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import LoadingOverlay from '../../components/LoadingOverlay'

const C = {
    bg:           '#141e2d',
    cardBg:       'rgba(255,255,255,0.05)',
    cardBorder:   'rgba(160,55,105,0.22)',
    text:         '#f2ecf0',
    textSub:      '#b889a4',
    textMuted:    '#e0b6cd',
    accent:       '#ff8cc8',
    accentLabel:  '#f0a0c0',
    modalBg:      '#1a1228',
    modalBorder:  'rgba(160,55,105,0.35)',
    modalText:    '#f5d0e8',
    modalSubtext: '#b56090',
    inputBg:      'rgba(255,255,255,0.07)',
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

export default function GuardianProfile() {
    const navigation = useNavigation()
    const { logout, switchAccount } = useAuth()

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState(null)
    const [accountStatus, setAccountStatus] = useState(null)
    const [dependents, setDependents] = useState([])
    const [lightMode, setLightMode] = useState(false)
    const [modeLoading, setModeLoading] = useState(false)
    const [detailModal, setDetailModal] = useState(null)
    const [section, setSection] = useState('access')
    const [depModal, setDepModal] = useState(null)
    const [switchingRole, setSwitchingRole] = useState(null)
    const [avatarUploading, setAvatarUploading] = useState(false)
    const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)

    useEffect(() => {
        AsyncStorage.getItem('medi_mode').then(v => setLightMode(v === 'light'))
        Promise.allSettled([
            api.get('/users/profile'),
            api.get('/upgrade/status'),
            api.get('/dependents'),
        ]).then(([profileRes, statusRes, depsRes]) => {
            if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data)
            if (statusRes.status === 'fulfilled') setAccountStatus(statusRes.value.data)
            if (depsRes.status === 'fulfilled') setDependents(depsRes.value.data || [])
        }).finally(() => setLoading(false))
    }, [])

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
            <Header role="guardian" />
            <View style={{ flex: 1 }}>
                <LoadingOverlay visible={loading} role="guardian" />
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
                                    <LinearGradient
                                        colors={['#740949', '#a94382']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={styles.avatarPlaceholder}
                                    >
                                        <Text style={styles.avatarInitials}>{avatarUploading ? '…' : initials}</Text>
                                    </LinearGradient>
                                )}
                                <View style={styles.avatarOverlay}>
                                    <Text style={{ fontSize: 18 }}>📷</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.profileName}>{profile?.full_name || '—'}</Text>
                        <Text style={styles.profileRole}>Guardian Account</Text>
                    </View>

                    {/* Avatar action modal */}
                    <Modal visible={avatarMenuOpen} transparent animationType="fade" onRequestClose={() => setAvatarMenuOpen(false)}>
                        <Pressable style={styles.avatarMenuOverlay} onPress={() => setAvatarMenuOpen(false)}>
                            <View style={styles.avatarMenu}>
                                <TouchableOpacity style={styles.avatarMenuItem} onPress={() => { setAvatarMenuOpen(false); handleAvatarPick() }}>
                                    <Text style={styles.avatarMenuItemText}>Upload new photo</Text>
                                </TouchableOpacity>
                                <View style={styles.avatarMenuDivider} />
                                <TouchableOpacity style={styles.avatarMenuItem} onPress={handleDeletePfp}>
                                    <Text style={[styles.avatarMenuItemText, { color: '#e05252' }]}>Delete photo</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Modal>

                    {/* Section tabs */}
                    <View style={styles.tabBar}>
                        {[['access', 'Doctor Access'], ['account', 'Account']].map(([id, label]) => (
                            <TouchableOpacity
                                key={id}
                                style={[styles.tab, section === id && styles.tabActive]}
                                onPress={() => setSection(id)}
                            >
                                <Text style={[styles.tabText, section === id && styles.tabTextActive]}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Doctor Access section */}
                    {section === 'access' && (
                        <GuardianAccessPanel dependents={dependents} navigation={navigation} />
                    )}

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

                            {/* Dependents */}
                            <View style={styles.card}>
                                <View style={styles.row}>
                                    <Text style={styles.sectionLabel}>Your Dependents</Text>
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate('AddDependent')}
                                        style={styles.addBtn}
                                    >
                                        <LinearGradient
                                            colors={['#740949', '#a94382']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={styles.addBtnGrad}
                                        >
                                            <Text style={styles.addBtnText}>+ Add</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                                {dependents.length === 0 ? (
                                    <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                                        <Text style={{ color: C.textSub, fontSize: 14, marginBottom: 4 }}>No dependents yet</Text>
                                        <Text style={{ color: C.textMuted, fontSize: 12 }}>Add a dependent to manage their medical records</Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 2 }}>
                                        {dependents.map(dep => (
                                            <DependentRow key={dep.dependent_id} dep={dep} onPress={() => setDepModal(dep)} />
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Add Account Type */}
                            {accountStatus && (!accountStatus.is_independent || !accountStatus.is_doctor) && (
                                <View style={styles.card}>
                                    <Text style={styles.sectionLabel}>Add Account Type</Text>
                                    {!accountStatus.is_independent && (
                                        <ProfileRow label="+ Add Independent Account" onPress={() => navigation.navigate('GuardianAddIndependent')} />
                                    )}
                                    {!accountStatus.is_doctor && (
                                        <ProfileRow label="+ Add Doctor Account" onPress={() => navigation.navigate('GuardianAddDoctor')} />
                                    )}
                                </View>
                            )}

                            {/* Switch Account */}
                            {accountStatus && (accountStatus.is_independent || accountStatus.is_doctor) && (
                                <View style={styles.card}>
                                    <Text style={styles.sectionLabel}>Switch Account</Text>
                                    {accountStatus.is_independent && (
                                        <ProfileRow
                                            label={switchingRole === 'independent' ? 'Switching…' : 'Switch to Independent'}
                                            onPress={() => handleSwitch('independent')}
                                            disabled={switchingRole === 'independent'}
                                        />
                                    )}
                                    {accountStatus.is_doctor && (
                                        <ProfileRow
                                            label={switchingRole === 'doctor' ? 'Switching…' : 'Switch to Doctor'}
                                            onPress={() => handleSwitch('doctor')}
                                            disabled={switchingRole === 'doctor'}
                                        />
                                    )}
                                </View>
                            )}

                            <View style={styles.card}>
                                <Text style={styles.sectionLabel}>More</Text>
                                <ProfileRow label="Subscriptions" onPress={() => navigation.navigate('Subscriptions', { role: 'guardian' })} />
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

            <BottomNav role="guardian" />

            {detailModal && (
                <AccountDetailModal
                    type={detailModal}
                    userPhone={profile?.phone_number || ''}
                    onClose={() => setDetailModal(null)}
                />
            )}
            {depModal && (
                <DependentModal
                    dep={depModal}
                    onClose={() => setDepModal(null)}
                    onDeleted={(id) => {
                        setDependents(prev => prev.filter(d => d.dependent_id !== id))
                        setDepModal(null)
                    }}
                    onPhoneUpdated={(id, phone) => {
                        setDependents(prev => prev.map(d => d.dependent_id === id ? { ...d, phone_number: phone } : d))
                        setDepModal(null)
                    }}
                />
            )}
        </SafeAreaView>
    )
}

// ─── Dependent row ────────────────────────────────────────────────────────────

function DependentRow({ dep, onPress }) {
    const initials = dep.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
    return (
        <TouchableOpacity onPress={onPress} style={styles.depRow} activeOpacity={0.7}>
            <LinearGradient
                colors={['#740949', '#a94382']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.depAvatar}
            >
                <Text style={styles.depAvatarText}>{initials}</Text>
            </LinearGradient>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.depName} numberOfLines={1}>{dep.full_name}</Text>
                {!!dep.phone_number && (
                    <Text style={styles.depPhone}>{dep.phone_number}</Text>
                )}
            </View>
            <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
        </TouchableOpacity>
    )
}

// ─── Profile row ──────────────────────────────────────────────────────────────

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

// ─── Dependent modal ──────────────────────────────────────────────────────────

function DependentModal({ dep, onClose, onDeleted, onPhoneUpdated }) {
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [error, setError] = useState('')
    const hasPhone = !!dep.phone_number

    const handlePhoneSave = async () => {
        if (!phone.trim()) return
        setLoading(true); setError('')
        try {
            await api.patch(`/dependents/${dep.dependent_id}/phone`, { phone_number: phone.trim() })
            onPhoneUpdated(dep.dependent_id, phone.trim())
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update')
        } finally { setLoading(false) }
    }

    const handleDelete = () => {
        Alert.alert(
            'Delete Dependent',
            `Delete ${dep.full_name}? This will also delete all their medical records.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        setDeleting(true)
                        try {
                            await api.delete(`/dependents/${dep.dependent_id}`)
                            onDeleted(dep.dependent_id)
                        } catch (err) {
                            setError(err.response?.data?.error || 'Failed to delete')
                        } finally { setDeleting(false) }
                    }
                },
            ]
        )
    }

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={mStyles.overlay} onPress={onClose}>
                <Pressable style={mStyles.box} onPress={() => {}}>
                    <Text style={mStyles.title}>{dep.full_name}</Text>
                    <Text style={{ color: C.accent, fontSize: 12, fontWeight: '500', marginBottom: 22 }}>Dependent</Text>

                    {/* Phone section */}
                    <Text style={[mStyles.sectionLabel, { marginBottom: 10 }]}>
                        {hasPhone ? 'Update Phone Number' : 'Add Phone Number'}
                    </Text>
                    {hasPhone && (
                        <Text style={{ fontSize: 12, color: C.modalSubtext, marginBottom: 10 }}>Current: {dep.phone_number}</Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                        <TextInput
                            style={[mStyles.input, { flex: 1 }]}
                            placeholder={hasPhone ? 'New phone number' : 'Phone number'}
                            placeholderTextColor={C.modalSubtext}
                            value={phone}
                            onChangeText={v => setPhone(v.replace(/[^\d+]/g, ''))}
                            keyboardType="phone-pad"
                            maxLength={16}
                        />
                        <TouchableOpacity
                            onPress={handlePhoneSave}
                            disabled={loading || !phone.trim()}
                            style={{ opacity: loading || !phone.trim() ? 0.6 : 1 }}
                        >
                            <LinearGradient
                                colors={['#740949', '#a94382']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={mStyles.saveBtn}
                            >
                                <Text style={mStyles.saveBtnText}>{loading ? '…' : 'Save'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {!!error && <Text style={{ color: '#e53e3e', fontSize: 13, marginBottom: 12 }}>{error}</Text>}

                    <View style={mStyles.divider} />

                    <TouchableOpacity
                        onPress={handleDelete}
                        disabled={deleting}
                        style={[mStyles.deleteBtn, deleting && { opacity: 0.6 }]}
                    >
                        <Text style={mStyles.deleteBtnText}>{deleting ? 'Deleting…' : `Delete ${dep.full_name}`}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onClose} style={mStyles.cancelBtn}>
                        <Text style={{ color: C.modalSubtext, fontSize: 14, fontWeight: '700' }}>Cancel</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

// ─── Account detail modal ─────────────────────────────────────────────────────

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
                            <TouchableOpacity onPress={onClose}>
                                <LinearGradient
                                    colors={['#740949', '#a94382']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={mStyles.primaryBtn}
                                >
                                    <Text style={mStyles.primaryBtnText}>Done</Text>
                                </LinearGradient>
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
                                <TouchableOpacity style={[mStyles.btn, mStyles.cancelBtnRow]} onPress={onClose}>
                                    <Text style={{ color: C.modalSubtext, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
                                </TouchableOpacity>

                                {type === 'email' && emailStep === 1 ? (
                                    <TouchableOpacity
                                        style={[mStyles.btn, loading && { opacity: 0.7 }]}
                                        onPress={handleSendCode}
                                        disabled={loading}
                                    >
                                        <LinearGradient
                                            colors={['#740949', '#a94382']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={mStyles.primaryBtn}
                                        >
                                            <Text style={mStyles.primaryBtnText}>{loading ? 'Sending…' : 'Send Code'}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={[mStyles.btn, loading && { opacity: 0.7 }]}
                                        onPress={handleSubmit}
                                        disabled={loading}
                                    >
                                        <LinearGradient
                                            colors={['#740949', '#a94382']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={mStyles.primaryBtn}
                                        >
                                            <Text style={mStyles.primaryBtnText}>
                                                {loading ? 'Saving…' : type === 'email' ? 'Verify & Update' : 'Save'}
                                            </Text>
                                        </LinearGradient>
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

// ─── OTP Input ────────────────────────────────────────────────────────────────

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

// ─── Guardian access panel ────────────────────────────────────────────────────

const SUMMARY_LABELS_ACCESS = {
    SOAP: 'SOAP Note',
    referral: 'Referral Letter',
    report: 'Medical Report',
}

function GuardianAccessPanel({ dependents }) {
    const [selectedDep, setSelectedDep] = useState(dependents.length === 1 ? dependents[0].dependent_id : '')
    const [accessList, setAccessList] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [loadingAccess, setLoadingAccess] = useState(false)
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState('')
    const [revokeConfirm, setRevokeConfirm] = useState(null)
    const [optionsModal, setOptionsModal] = useState(null)
    const [modalHiddenItems, setModalHiddenItems] = useState([])
    const [generatedTypes, setGeneratedTypes] = useState([])
    const [privacyLoading, setPrivacyLoading] = useState(false)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [disclaimerVisible, setDisclaimerVisible] = useState(false)

    useEffect(() => {
        if (!selectedDep) { setAccessList([]); return }
        setLoadingAccess(true)
        api.get(`/doctors/access?dependent_id=${selectedDep}`)
            .then(res => setAccessList(res.data || []))
            .catch(() => setError('Failed to load access list'))
            .finally(() => setLoadingAccess(false))
    }, [selectedDep])

    const selectedDepName = dependents.find(d => d.dependent_id === selectedDep)?.full_name || ''

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setSearching(true); setError('')
        try {
            const res = await api.get(`/doctors/search?query=${encodeURIComponent(searchQuery)}`)
            setSearchResults(res.data)
        } catch { setError('Search failed') }
        finally { setSearching(false) }
    }

    const handleGrant = async (doctorUserId) => {
        try {
            await api.post('/doctors/access', { doctor_user_id: doctorUserId, dependent_id: selectedDep })
            setSearchResults([]); setSearchQuery('')
            const res = await api.get(`/doctors/access?dependent_id=${selectedDep}`)
            setAccessList(res.data || [])
        } catch (err) { setError(err.response?.data?.error || 'Failed to send request') }
    }

    const handleRevoke = async (accessId) => {
        try {
            await api.patch(`/doctors/access/${accessId}/revoke`)
            setAccessList(prev => prev.filter(a => a.access_id !== accessId))
            setRevokeConfirm(null)
        } catch { setError('Failed to revoke access') }
    }

    const handleOpenOptions = async (access) => {
        setOptionsModal(access)
        setModalHiddenItems(access.hidden_items || [])
        try {
            const res = await api.get(`/summary/generated-types?dependent_id=${selectedDep}`)
            setGeneratedTypes(res.data)
        } catch { setGeneratedTypes([]) }
    }

    const handleSavePrivacy = async () => {
        setPrivacyLoading(true)
        try {
            await api.patch(`/doctors/access/${optionsModal.access_id}/privacy`, { hidden_items: modalHiddenItems })
            setAccessList(prev => prev.map(a =>
                a.access_id === optionsModal.access_id ? { ...a, hidden_items: modalHiddenItems } : a
            ))
            setOptionsModal(null)
        } catch { setError('Failed to save privacy settings') }
        finally { setPrivacyLoading(false) }
    }

    const filteredResults = searchResults.filter(d => !accessList.some(a => a.doctor_user_id === d.user_id))

    return (
        <View style={{ gap: 16 }}>

            {/* Dependent selector */}
            <View style={pStyles.card}>
                <Text style={styles.sectionLabel}>Managing access for</Text>
                {dependents.length === 0 ? (
                    <Text style={{ color: C.textSub, fontSize: 14 }}>No dependents yet</Text>
                ) : (
                    <TouchableOpacity
                        style={pStyles.pickerBtn}
                        onPress={() => setPickerOpen(true)}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: selectedDep ? C.text : C.textSub, fontSize: 14, flex: 1 }}>
                            {selectedDep ? selectedDepName : 'Select a dependent…'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color={C.textSub} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Dependent picker modal */}
            <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
                <Pressable style={mStyles.overlay} onPress={() => setPickerOpen(false)}>
                    <Pressable style={[mStyles.box, { padding: 0, overflow: 'hidden' }]} onPress={() => {}}>
                        <Text style={[mStyles.title, { padding: 20, paddingBottom: 12 }]}>Select a Dependent</Text>
                        <TouchableOpacity
                            style={pStyles.pickerOption}
                            onPress={() => { setSelectedDep(''); setPickerOpen(false) }}
                        >
                            <Text style={{ color: C.modalSubtext, fontSize: 14 }}>Select a dependent…</Text>
                        </TouchableOpacity>
                        {dependents.map(d => (
                            <TouchableOpacity
                                key={d.dependent_id}
                                style={[pStyles.pickerOption, selectedDep === d.dependent_id && pStyles.pickerOptionActive]}
                                onPress={() => { setSelectedDep(d.dependent_id); setPickerOpen(false) }}
                            >
                                <Text style={{ color: selectedDep === d.dependent_id ? 'white' : C.text, fontSize: 14, fontWeight: '500' }}>
                                    {d.full_name}
                                </Text>
                                {selectedDep === d.dependent_id && (
                                    <Ionicons name="checkmark" size={16} color="white" />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[pStyles.pickerOption, { borderTopWidth: 1, borderTopColor: C.modalBorder }]}
                            onPress={() => setPickerOpen(false)}
                        >
                            <Text style={{ color: C.modalSubtext, fontSize: 14, textAlign: 'center', width: '100%' }}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>

            {!selectedDep ? (
                <View style={[pStyles.card, { alignItems: 'center', paddingVertical: 40 }]}>
                    <Ionicons name="lock-closed-outline" size={40} color={C.textMuted} style={{ marginBottom: 12 }} />
                    <Text style={{ color: C.textSub, fontSize: 14 }}>
                        Select a dependent to manage their doctor access
                    </Text>
                </View>
            ) : (
                <>
                    {/* Add a doctor */}
                    <View style={pStyles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Text style={{ color: C.text, fontWeight: '700', fontSize: 14 }}>Add a Doctor</Text>
                            <TouchableOpacity
                                onPress={() => setDisclaimerVisible(v => !v)}
                                style={pStyles.infoBtn}
                            >
                                <Text style={{ color: C.accent, fontSize: 10, fontWeight: '700' }}>i</Text>
                            </TouchableOpacity>
                        </View>
                        {disclaimerVisible && (
                            <View style={pStyles.disclaimerBox}>
                                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, lineHeight: 19 }}>
                                    Adding a doctor grants them access to your dependent's medical history and summaries. Use Options to hide specific items from each doctor.
                                </Text>
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                                style={[pStyles.input, { flex: 1 }]}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onSubmitEditing={handleSearch}
                                placeholder="Name, specialization, or clinic"
                                placeholderTextColor={C.textSub}
                                returnKeyType="search"
                            />
                            <TouchableOpacity onPress={handleSearch} disabled={searching}>
                                <LinearGradient
                                    colors={['#740949', '#a94382']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={pStyles.searchBtn}
                                >
                                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>
                                        {searching ? '…' : 'Search'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {filteredResults.length > 0 && (
                            <View style={{ marginTop: 12, gap: 8 }}>
                                {filteredResults.map(doc => (
                                    <View key={doc.user_id} style={pStyles.docResult}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: C.text, fontWeight: '600', fontSize: 13, marginBottom: 2 }}>Dr. {doc.full_name}</Text>
                                            <Text style={{ color: C.textMuted, fontSize: 11 }}>
                                                {doc.specialization}{doc.clinic_name ? ` · ${doc.clinic_name}` : ''}
                                            </Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleGrant(doc.user_id)}>
                                            <LinearGradient
                                                colors={['#740949', '#a94382']}
                                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                                style={pStyles.grantBtn}
                                            >
                                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>Request Access</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Access list */}
                    <View style={pStyles.card}>
                        <Text style={styles.sectionLabel}>Doctors with Access</Text>
                        {loadingAccess ? (
                            <Text style={{ color: C.textMuted, fontSize: 13 }}>Loading…</Text>
                        ) : accessList.length === 0 ? (
                            <Text style={{ color: C.textSub, fontSize: 14, textAlign: 'center', paddingVertical: 12 }}>No doctors have access yet</Text>
                        ) : (
                            <View style={{ gap: 10 }}>
                                {accessList.map(a => (
                                    <GAccessCard
                                        key={a.access_id}
                                        access={a}
                                        isConfirming={revokeConfirm === a.access_id}
                                        onOpenOptions={() => handleOpenOptions(a)}
                                        onRevoke={() => handleRevoke(a.access_id)}
                                        onConfirmRevoke={() => setRevokeConfirm(a.access_id)}
                                        onCancelRevoke={() => setRevokeConfirm(null)}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                </>
            )}

            {!!error && <Text style={{ color: '#e53e3e', fontSize: 13, textAlign: 'center' }}>{error}</Text>}

            {/* Options modal */}
            {optionsModal && (
                <GAccessOptionsModal
                    doctorName={optionsModal.doctor_name}
                    hiddenItems={modalHiddenItems}
                    generatedTypes={generatedTypes}
                    onToggle={item => setModalHiddenItems(prev =>
                        prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
                    )}
                    onSave={handleSavePrivacy}
                    onClose={() => setOptionsModal(null)}
                    loading={privacyLoading}
                />
            )}
        </View>
    )
}

function GAccessCard({ access, isConfirming, onOpenOptions, onRevoke, onConfirmRevoke, onCancelRevoke }) {
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
    return (
        <View style={[pStyles.accessCard, isConfirming && { borderColor: 'rgba(229,62,62,0.35)' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>Dr. {access.doctor_name}</Text>
                        {access.status === 'pending' && (
                            <View style={pStyles.pendingBadge}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>Pending</Text>
                            </View>
                        )}
                        {access.hidden_items?.length > 0 && (
                            <View style={pStyles.partialBadge}>
                                <Text style={{ color: C.accent, fontSize: 10, fontWeight: '700' }}>Partial access</Text>
                            </View>
                        )}
                    </View>
                    <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>
                        {access.specialization}{access.clinic_name ? ` · ${access.clinic_name}` : ''}
                    </Text>
                    {access.status === 'approved' && access.granted_at && (
                        <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>
                            Granted {fmtDate(access.granted_at)}
                        </Text>
                    )}
                </View>

                {access.status === 'approved' && !isConfirming && (
                    <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
                        <TouchableOpacity onPress={onOpenOptions} style={pStyles.optionsBtn}>
                            <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600' }}>Options</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onConfirmRevoke} style={pStyles.removeBtn}>
                            <Text style={{ color: '#e53e3e', fontSize: 12, fontWeight: '600' }}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {access.status === 'pending' && !isConfirming && (
                    <TouchableOpacity onPress={onConfirmRevoke} style={[pStyles.removeBtn, { flexShrink: 0 }]}>
                        <Text style={{ color: '#e53e3e', fontSize: 12, fontWeight: '600' }}>Remove</Text>
                    </TouchableOpacity>
                )}
            </View>

            {isConfirming && (
                <View style={pStyles.confirmRow}>
                    <Text style={{ color: '#e53e3e', fontSize: 13, flex: 1 }}>
                        Remove Dr. {access.doctor_name}'s access?
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity onPress={onCancelRevoke} style={pStyles.cancelSmallBtn}>
                            <Text style={{ color: C.textMuted, fontSize: 12, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onRevoke} style={pStyles.confirmRemoveBtn}>
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    )
}

function GAccessOptionsModal({ doctorName, hiddenItems, generatedTypes, onToggle, onSave, onClose, loading }) {
    const allItems = [
        { key: 'records', label: 'Medical Records', icon: 'folder-outline' },
        { key: 'phone', label: 'Phone Number', icon: 'call-outline' },
        ...generatedTypes.map(t => ({ key: t, label: SUMMARY_LABELS_ACCESS[t] || t, icon: 'document-text-outline' }))
    ]

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={mStyles.overlay} onPress={onClose}>
                <Pressable style={mStyles.box} onPress={() => {}}>
                    <Text style={mStyles.title}>Privacy Options</Text>
                    <Text style={{ color: C.accent, fontSize: 12, marginBottom: 6 }}>Dr. {doctorName}</Text>
                    <Text style={{ color: C.modalSubtext, fontSize: 12, lineHeight: 18, marginBottom: 16 }}>
                        Toggle items to hide them from this doctor.
                    </Text>
                    <View style={{ gap: 10, marginBottom: 20 }}>
                        {allItems.map(item => {
                            const isHidden = hiddenItems.includes(item.key)
                            return (
                                <TouchableOpacity
                                    key={item.key}
                                    onPress={() => onToggle(item.key)}
                                    style={[pStyles.privacyItem, isHidden && pStyles.privacyItemHidden]}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name={item.icon} size={14} color={isHidden ? '#c53030' : C.text} />
                                        <Text style={{ fontSize: 14, color: isHidden ? '#c53030' : C.text }}>{item.label}</Text>
                                    </View>
                                    <View style={[pStyles.visibilityBadge, isHidden && pStyles.visibilityBadgeHidden]}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: isHidden ? '#c53030' : '#276749' }}>
                                            {isHidden ? 'Hidden' : 'Visible'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[mStyles.btn, mStyles.cancelBtnRow]} onPress={onClose}>
                            <Text style={{ color: C.modalSubtext, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[mStyles.btn, loading && { opacity: 0.7 }]}
                            onPress={onSave}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#740949', '#a94382']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={mStyles.primaryBtn}
                            >
                                <Text style={mStyles.primaryBtnText}>{loading ? 'Saving…' : 'Save'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { padding: 20, paddingBottom: 48 },

    avatarSection: { alignItems: 'center', marginBottom: 28, gap: 12 },
    avatarWrap: {
        width: 80, height: 80, borderRadius: 40, overflow: 'hidden',
        shadowColor: '#b5006e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
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
    avatarMenuItemText: { color: C.text, fontSize: 14 },
    avatarMenuDivider: { height: 1, backgroundColor: C.modalBorder },

    tabBar: {
        flexDirection: 'row', backgroundColor: C.cardBg,
        borderRadius: 14, padding: 4, marginBottom: 20,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: '#a94382' },
    tabText: { color: C.textSub, fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: 'white' },

    card: {
        backgroundColor: C.cardBg, borderRadius: 18, padding: 18,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    sectionLabel: {
        color: C.accentLabel, fontSize: 11, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    rowText: { color: C.text, fontWeight: '600', fontSize: 14 },

    addBtn: { borderRadius: 8, overflow: 'hidden', marginBottom: 14 },
    addBtnGrad: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    addBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },

    depRow: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 12, paddingHorizontal: 4,
        borderBottomWidth: 1, borderBottomColor: C.cardBorder,
    },
    depAvatar: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    depAvatarText: { color: 'white', fontWeight: '700', fontSize: 13 },
    depName: { color: C.text, fontWeight: '600', fontSize: 14, marginBottom: 2 },
    depPhone: { color: C.textMuted, fontSize: 12 },

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
    overlay: { flex: 1, backgroundColor: 'rgba(61,0,40,0.6)', justifyContent: 'center', alignItems: 'center' },
    box: {
        backgroundColor: C.modalBg, borderRadius: 20, padding: 28,
        width: 340, maxWidth: '90%', borderWidth: 1, borderColor: C.modalBorder,
    },
    title: { color: C.modalText, fontWeight: '700', fontSize: 17, marginBottom: 20 },
    text: { color: C.modalText, fontSize: 14 },
    sectionLabel: { color: C.accent, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    input: {
        borderWidth: 1.5, borderColor: C.modalBorder, borderRadius: 8,
        padding: 11, fontSize: 14, color: C.modalText, backgroundColor: 'rgba(0,0,0,0.2)',
    },
    btn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
    cancelBtnRow: { borderWidth: 1.5, borderColor: C.modalBorder, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center', padding: 11 },
    primaryBtn: { padding: 11, alignItems: 'center', borderRadius: 10 },
    primaryBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },
    otpBox: {
        width: 44, height: 52, borderRadius: 8, borderWidth: 1.5,
        borderColor: C.modalBorder, backgroundColor: 'rgba(0,0,0,0.2)',
        color: C.modalText, fontSize: 20, fontWeight: '700',
    },
    saveBtn: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
    divider: { borderTopWidth: 1, borderTopColor: C.modalBorder, marginBottom: 16 },
    deleteBtn: {
        padding: 12, borderRadius: 10,
        backgroundColor: 'rgba(229,62,62,0.08)', borderWidth: 1, borderColor: 'rgba(229,62,62,0.2)',
        alignItems: 'center', marginBottom: 8,
    },
    deleteBtnText: { color: '#e53e3e', fontSize: 14, fontWeight: '700' },
    cancelBtn: {
        padding: 12, borderRadius: 10,
        borderWidth: 1.5, borderColor: C.modalBorder, alignItems: 'center',
    },
})

const pStyles = StyleSheet.create({
    card: {
        backgroundColor: C.cardBg, borderRadius: 18, padding: 18,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    pickerBtn: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1.5, borderColor: C.cardBorder, borderRadius: 10,
        padding: 11, backgroundColor: C.inputBg,
    },
    pickerOption: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        borderTopWidth: 1, borderTopColor: C.modalBorder,
    },
    pickerOptionActive: { backgroundColor: '#740949' },
    input: {
        borderWidth: 1.5, borderColor: C.cardBorder, borderRadius: 10,
        padding: 11, fontSize: 14, color: C.text, backgroundColor: C.inputBg,
    },
    searchBtn: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    docResult: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 12, borderRadius: 10,
        backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.cardBorder,
    },
    grantBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8 },
    infoBtn: {
        width: 16, height: 16, borderRadius: 8,
        borderWidth: 1.5, borderColor: C.accent,
        alignItems: 'center', justifyContent: 'center',
    },
    disclaimerBox: {
        backgroundColor: '#3d0028', borderRadius: 8,
        padding: 10, marginBottom: 12,
    },
    accessCard: {
        backgroundColor: C.inputBg, borderRadius: 12,
        padding: 14, borderWidth: 1, borderColor: C.cardBorder,
    },
    pendingBadge: { backgroundColor: '#ed8936', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
    partialBadge: { backgroundColor: 'rgba(181,0,110,0.12)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
    optionsBtn: {
        borderWidth: 1.5, borderColor: 'rgba(181,0,110,0.3)',
        borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
    },
    removeBtn: {
        borderWidth: 1.5, borderColor: 'rgba(229,62,62,0.4)',
        borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12,
    },
    confirmRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(229,62,62,0.2)',
    },
    cancelSmallBtn: {
        borderWidth: 1.5, borderColor: C.cardBorder,
        borderRadius: 7, paddingVertical: 6, paddingHorizontal: 12,
    },
    confirmRemoveBtn: {
        backgroundColor: '#e53e3e', borderRadius: 7,
        paddingVertical: 6, paddingHorizontal: 12,
    },
    privacyItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 12, borderRadius: 10,
        backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.cardBorder,
    },
    privacyItemHidden: {
        backgroundColor: 'rgba(229,62,62,0.06)', borderColor: 'rgba(229,62,62,0.3)',
    },
    visibilityBadge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
        backgroundColor: 'rgba(56,161,105,0.1)', borderWidth: 1, borderColor: 'rgba(56,161,105,0.3)',
    },
    visibilityBadgeHidden: {
        backgroundColor: 'rgba(229,62,62,0.1)', borderColor: 'rgba(229,62,62,0.3)',
    },
})
