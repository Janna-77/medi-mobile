import {
    View, Text, TextInput, TouchableOpacity, Pressable,
    StyleSheet, ImageBackground, Dimensions, Modal,
    ScrollView, KeyboardAvoidingView, Platform, Animated,
    I18nManager, Linking,
} from 'react-native'
import { Image } from 'react-native'
import { useState, useRef } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import * as Updates from 'expo-updates'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

const { width } = Dimensions.get('window')

const STANDARD_BLUE = '#2596be'
const MINT_ACCENT = '#2d7a5f'

export default function Login() {
    const navigation = useNavigation()
    const { login, switchAccount } = useAuth()
    const { t, i18n } = useTranslation()

    const [mode, setMode] = useState('standard')
    const [formData, setFormData] = useState({ email: '', password: '' })
    const [depData, setDepData] = useState({ phone_number: '', password: '' })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [accountChooser, setAccountChooser] = useState(null)

    const isDep = mode === 'dependent'
    const passwordRef = useRef(null)
    const depPasswordRef = useRef(null)

    const handleLogin = async () => {
        setError('')
        if (!formData.email || !formData.password) {
            setError(t('login.err_fill'))
            return
        }
        setLoading(true)
        try {
            const response = await api.post('/auth/login', formData)
            const { token, userId, role } = response.data

            if (role === 'admin') {
                login(token, role, userId)
                navigation.navigate('Admin')
                return
            }

            // JWT uses base64url — replace url-safe chars before decoding
            const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
            const decoded = JSON.parse(atob(b64))
            const roles = []
            if (decoded.is_independent) roles.push('independent')
            if (decoded.is_guardian) roles.push('guardian')
            if (decoded.is_doctor) roles.push('doctor')

            if (roles.length > 1) {
                // Don't call login() yet — it triggers navigation before the chooser renders
                setAccountChooser({ token, userId, roles })
                return
            }

            login(token, role, userId)
        } catch (err) {
            if (err.response?.data?.error === 'pending_verification') {
                setError(t('login.err_pending'))
            } else {
                setError(err.response?.data?.error || 'Login failed')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleDependentLogin = async () => {
        setError('')
        if (!depData.phone_number || !depData.password) {
            setError(t('login.err_fill'))
            return
        }
        setLoading(true)
        try {
            const response = await api.post('/auth/login-dependent', depData)
            const { token } = response.data
            const decoded = JSON.parse(atob(token.split('.')[1]))
            const { dependentId } = decoded
            login(token, 'dependent', decoded.userId)
            navigation.navigate('DependentHome', { dependentId })
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    const handlePickRole = async (pickedRole) => {
        const { token, userId } = accountChooser
        setAccountChooser(null)
        // login() sets user.role = pickedRole immediately → AppNavigator transitions
        login(token, pickedRole, userId)
        // Exchange for a role-specific token in the background
        try { await switchAccount(pickedRole) } catch { }
    }

    const switchMode = (next) => {
        setMode(next)
        setError('')
        setFormData({ email: '', password: '' })
        setDepData({ phone_number: '', password: '' })
    }

    return (
        <ImageBackground
            source={require('../../../assets/signup-bg.gif')}
            style={styles.bg}
            resizeMode="cover"
        >
            <LangSwitcher i18n={i18n} t={t} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, width: '100%' }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* Logo + Title */}
                    <Image
                        source={require('../../../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>
                        {isDep ? t('login.dep_title') : t('login.title')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isDep ? t('login.dep_subtitle') : t('login.subtitle')}
                    </Text>

                    <View style={styles.card}>
                        {/* Toggle */}
                        <View style={styles.toggle}>
                            <TouchableOpacity
                                style={[styles.toggleTab, !isDep && styles.toggleTabActive]}
                                onPress={() => switchMode('standard')}
                            >
                                <Text style={[styles.toggleText, { color: !isDep ? STANDARD_BLUE : '#f0f0f0' }]}>
                                    {t('login.standard')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleTab, isDep && styles.toggleTabActive]}
                                onPress={() => switchMode('dependent')}
                            >
                                <Text style={[styles.toggleText, { color: isDep ? MINT_ACCENT : '#f0f0f0' }]}>
                                    {t('login.dependent')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {error ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {!isDep ? (
                            <>
                                <View style={styles.field}>
                                    <Text style={styles.label}>{t('login.email_label')}</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={formData.email}
                                        onChangeText={(v) => setFormData(p => ({ ...p, email: v }))}
                                        placeholder="you@example.com"
                                        placeholderTextColor="rgba(255,255,255,0.45)"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        returnKeyType="next"
                                        onSubmitEditing={() => passwordRef.current?.focus()}
                                    />
                                </View>
                                <View style={styles.field}>
                                    <Text style={styles.label}>{t('login.password_label')}</Text>
                                    <TextInput
                                        ref={passwordRef}
                                        style={styles.input}
                                        value={formData.password}
                                        onChangeText={(v) => setFormData(p => ({ ...p, password: v }))}
                                        placeholder="••••••••"
                                        placeholderTextColor="rgba(255,255,255,0.45)"
                                        secureTextEntry
                                        returnKeyType="go"
                                        onSubmitEditing={handleLogin}
                                    />
                                    <Text style={styles.forgotText}>
                                        {t('login.forgot')}{' '}
                                        <Text
                                            style={styles.forgotLink}
                                            onPress={() => Linking.openURL('https://teampassword.com/blog/how-to-find-a-lost-password-from-ages-ago')}
                                        >
                                            {t('login.forgot_link')}
                                        </Text>
                                    </Text>
                                </View>
                                <BigButton
                                    label={loading ? t('login.logging_in') : t('login.log_in')}
                                    onPress={handleLogin}
                                    disabled={loading}
                                    glowColor={STANDARD_BLUE}
                                />
                            </>
                        ) : (
                            <>
                                <View style={styles.field}>
                                    <Text style={styles.label}>{t('login.dep_phone')}</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={depData.phone_number}
                                        onChangeText={(v) => setDepData(p => ({ ...p, phone_number: v.replace(/[^\d+]/g, '') }))}
                                        placeholder="010..."
                                        placeholderTextColor="rgba(255,255,255,0.45)"
                                        keyboardType="phone-pad"
                                        maxLength={16}
                                        returnKeyType="next"
                                        onSubmitEditing={() => depPasswordRef.current?.focus()}
                                    />
                                </View>
                                <View style={styles.field}>
                                    <Text style={styles.label}>{t('login.dep_password')}</Text>
                                    <TextInput
                                        ref={depPasswordRef}
                                        style={styles.input}
                                        value={depData.password}
                                        onChangeText={(v) => setDepData(p => ({ ...p, password: v }))}
                                        placeholder="••••••••"
                                        placeholderTextColor="rgba(255,255,255,0.45)"
                                        secureTextEntry
                                        returnKeyType="go"
                                        onSubmitEditing={handleDependentLogin}
                                    />
                                </View>
                                <BigButton
                                    label={loading ? t('login.dep_logging_in') : t('login.dep_log_in')}
                                    onPress={handleDependentLogin}
                                    disabled={loading}
                                    glowColor={MINT_ACCENT}
                                />
                            </>
                        )}

                        <Text style={styles.footerText}>
                            {isDep ? t('login.dep_help') : (
                                <>
                                    {t('login.no_account')}{' '}
                                    <Text
                                        onPress={() => navigation.navigate('SignupChoice')}
                                        style={styles.footerLink}
                                    >
                                        {t('common.signup')}
                                    </Text>
                                </>
                            )}
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Account chooser modal */}
            <Modal transparent visible={!!accountChooser} animationType="fade" onRequestClose={() => setAccountChooser(null)}>
                <View style={styles.chooserOverlay}>
                    <View style={styles.chooserCard}>
                        <Text style={styles.chooserTitle}>{t('login.choose_account')}</Text>
                        <Text style={styles.chooserDesc}>{t('login.choose_account_desc')}</Text>
                        {accountChooser?.roles.map(r => {
                            const configs = {
                                independent: { glow: STANDARD_BLUE, label: t('login.independent_account') },
                                guardian: { glow: '#99055e', label: t('login.guardian_account') },
                                doctor: { glow: '#6a50a0', label: t('login.doctor_account') },
                            }
                            const { glow, label } = configs[r] || { glow: '#000', label: r }
                            return <RoleButton key={r} onPress={() => handlePickRole(r)} label={label} glowColor={glow} />
                        })}
                    </View>
                </View>
            </Modal>
        </ImageBackground>
    )
}

function BigButton({ label, onPress, disabled, glowColor }) {
    const scale = useRef(new Animated.Value(1)).current
    const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
    return (
        <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} disabled={disabled}>
            <Animated.View style={[styles.bigBtn, { transform: [{ scale }], shadowColor: glowColor, opacity: disabled ? 0.7 : 1 }]}>
                <Text style={styles.bigBtnText}>{label}</Text>
            </Animated.View>
        </Pressable>
    )
}

function RoleButton({ onPress, label, glowColor }) {
    const scale = useRef(new Animated.Value(1)).current
    const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
    return (
        <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
            <Animated.View style={[styles.roleBtn, { transform: [{ scale }], shadowColor: glowColor }]}>
                <Text style={styles.roleBtnText}>{label}</Text>
            </Animated.View>
        </Pressable>
    )
}

function LangSwitcher({ i18n, t }) {
    const [open, setOpen] = useState(false)
    const changeLanguage = async (code) => {
        const needsRTLChange = (code === 'ar') !== I18nManager.isRTL
        i18n.changeLanguage(code)
        setOpen(false)
        if (needsRTLChange) {
            I18nManager.forceRTL(code === 'ar')
            await Updates.reloadAsync()
        }
    }
    return (
        <>
            <TouchableOpacity style={styles.langBtn} onPress={() => setOpen(true)}>
                <Text style={styles.langBtnText}>🌐 {t('lang.change')}</Text>
            </TouchableOpacity>
            <Modal transparent visible={open} onRequestClose={() => setOpen(false)} animationType="fade">
                <TouchableOpacity style={styles.langOverlay} onPress={() => setOpen(false)} activeOpacity={1}>
                    <View style={styles.langDropdown}>
                        {[['en', 'English'], ['fr', 'Français'], ['ar', 'العربية']].map(([code, label]) => (
                            <TouchableOpacity
                                key={code}
                                style={[styles.langOption, i18n.language === code && styles.langOptionActive]}
                                onPress={() => changeLanguage(code)}
                            >
                                <Text style={[styles.langOptionText, i18n.language === code && styles.langOptionTextBold]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    )
}

const styles = StyleSheet.create({
    bg: { flex: 1, alignItems: 'center' },
    scroll: { alignItems: 'center', paddingTop: 90, paddingBottom: 60, paddingHorizontal: 20, gap: 8 },
    logo: { width: 120, height: 120, marginBottom: 4 },
    title: {
        color: 'white', fontSize: 28, fontFamily: 'Calistoga', letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 12,
    },
    subtitle: {
        color: 'white', fontSize: 15, marginBottom: 16,
        textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.20)',
        borderRadius: 24, padding: 36,
        width: Math.min(400, width - 40),
        gap: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 40, elevation: 12,
    },
    toggle: {
        flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 14, padding: 6,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
    toggleTab: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    toggleTabActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
    toggleText: { fontSize: 14, fontWeight: '700' },
    errorBox: {
        backgroundColor: 'rgba(255,60,60,0.1)', borderWidth: 1,
        borderColor: 'rgba(255,60,60,0.4)', borderRadius: 10, padding: 10,
    },
    errorText: { color: '#ffb3b3', fontSize: 14, fontWeight: '600', textAlign: 'center' },
    field: { gap: 8 },
    label: {
        color: 'white', fontSize: 14, fontWeight: '600', letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
    },
    input: {
        paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(0,0,0,0.25)', color: 'white', fontSize: 15,
    },
    forgotText: { color: 'white', fontSize: 13, textAlign: 'right' },
    forgotLink: { fontWeight: 'bold', textDecorationLine: 'underline', color: 'white' },
    bigBtn: {
        backgroundColor: 'white', borderRadius: 14, paddingVertical: 16,
        alignItems: 'center', marginTop: 8,
        shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6,
    },
    bigBtnText: { color: '#1a1a1a', fontSize: 16, fontWeight: '700' },
    footerText: {
        textAlign: 'center', color: 'white', fontSize: 14, marginTop: 8,
        textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
    },
    footerLink: { fontWeight: 'bold', textDecorationLine: 'underline', color: 'white' },
    // Account chooser
    chooserOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    chooserCard: {
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 24,
        padding: 32, width: Math.min(320, width - 40), gap: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 60, elevation: 16,
    },
    chooserTitle: { fontSize: 20, fontWeight: '700', color: '#1a202c', textAlign: 'center' },
    chooserDesc: { fontSize: 14, color: '#4a5568', textAlign: 'center', marginTop: -8 },
    roleBtn: {
        backgroundColor: 'white', borderRadius: 14, paddingVertical: 16, alignItems: 'center',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    },
    roleBtnText: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
    // Lang switcher
    langBtn: {
        position: 'absolute', top: 52, right: 24,
        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
        zIndex: 10,
    },
    langBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
    langOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 100, paddingRight: 24 },
    langDropdown: {
        backgroundColor: 'rgba(15,25,45,0.97)', borderRadius: 12, overflow: 'hidden', minWidth: 160,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 32, elevation: 12,
    },
    langOption: { paddingVertical: 12, paddingHorizontal: 18 },
    langOptionActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
    langOptionText: { color: 'white', fontSize: 15, fontWeight: '500' },
    langOptionTextBold: { fontWeight: '700' },
})
