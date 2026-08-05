import { useState, useRef } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, Pressable,
    StyleSheet, ImageBackground, ScrollView, KeyboardAvoidingView,
    Platform, Animated, Modal, I18nManager,
} from 'react-native'
import { Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import * as Updates from 'expo-updates'
import * as DocumentPicker from 'expo-document-picker'
import { validateEmail, validatePassword } from '../../utils/validate'
import TermsModal from '../../components/TermsModal'
import supabase from '../../lib/supabase'

const ACCENT = '#6a50a0'

export default function SignUpDoctor() {
    const navigation = useNavigation()
    const { t, i18n } = useTranslation()

    const [formData, setFormData] = useState({
        full_name: '', email: '', phone_number: '', password: '',
        medical_license_number: '', licence_expiry_date: '', specialization: '', clinic_name: '',
    })
    const [certificate, setCertificate] = useState(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showTerms, setShowTerms] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const emailRef = useRef(null)
    const phoneRef = useRef(null)
    const licenseRef = useRef(null)
    const expiryRef = useRef(null)
    const specRef = useRef(null)
    const clinicRef = useRef(null)
    const passwordRef = useRef(null)

    const set = (field) => (value) => setFormData(prev => ({ ...prev, [field]: value }))

    const pickCertificate = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            })
            if (!result.canceled && result.assets?.length > 0) {
                setCertificate(result.assets[0])
            }
        } catch {
            setError('Failed to pick file')
        }
    }

    const handleSubmit = async () => {
        setError('')
        const { full_name, email, phone_number, password, medical_license_number } = formData
        if (!full_name || !email || !phone_number || !password || !medical_license_number) {
            setError('Please fill in all required fields'); return
        }
        if (!validateEmail(email)) { setError('Please enter a valid email address'); return }
        const passwordErrors = validatePassword(password)
        if (passwordErrors.length > 0) { setError(`Password must have: ${passwordErrors.join(', ')}`); return }
        setShowTerms(true)
    }

    const handleAgree = async () => {
        setShowTerms(false)
        setLoading(true)
        try {
            const { error: otpErr } = await supabase.auth.signInWithOtp({ email: formData.email })
            if (otpErr) throw otpErr
            navigation.navigate('Verification', {
                formData: { ...formData, role: 'doctor' },
                certificate,
                type: 'register',
            })
        } catch (err) {
            setError(err.message || 'Failed to send verification code')
        } finally {
            setLoading(false)
        }
    }

    return (
        <ImageBackground
            source={require('../../../assets/login-bg.jpg')}
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
                    <Image
                        source={require('../../../assets/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />

                    <View style={styles.card}>
                        <Text style={styles.title}>{t('common.create_account')}</Text>
                        <Text style={styles.subtitle}>{t('signup_doctor.subtitle')}</Text>

                        {/* Full Name */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>{t('common.full_name')}</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.full_name}
                                onChangeText={set('full_name')}
                                maxLength={41}
                                returnKeyType="next"
                                onSubmitEditing={() => emailRef.current?.focus()}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />
                        </View>

                        {/* Email */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>{t('common.email')}</Text>
                            <TextInput
                                ref={emailRef}
                                style={styles.input}
                                value={formData.email}
                                onChangeText={set('email')}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                returnKeyType="next"
                                onSubmitEditing={() => phoneRef.current?.focus()}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />
                        </View>

                        {/* Phone */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>{t('common.phone_number')}</Text>
                            <TextInput
                                ref={phoneRef}
                                style={styles.input}
                                value={formData.phone_number}
                                onChangeText={(v) => set('phone_number')(v.replace(/[^\d+]/g, ''))}
                                keyboardType="phone-pad"
                                maxLength={16}
                                returnKeyType="next"
                                onSubmitEditing={() => licenseRef.current?.focus()}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />
                        </View>

                        {/* License number */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>{t('signup_doctor.license')}</Text>
                            <TextInput
                                ref={licenseRef}
                                style={styles.input}
                                value={formData.medical_license_number}
                                onChangeText={set('medical_license_number')}
                                returnKeyType="next"
                                onSubmitEditing={() => expiryRef.current?.focus()}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />
                        </View>

                        {/* Licence expiry */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>{t('signup_doctor.expiry')}</Text>
                            <TextInput
                                ref={expiryRef}
                                style={styles.input}
                                value={formData.licence_expiry_date}
                                onChangeText={set('licence_expiry_date')}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                returnKeyType="next"
                                onSubmitEditing={() => specRef.current?.focus()}
                            />
                        </View>

                        {/* Specialization */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>{t('signup_doctor.specialization')}</Text>
                            <TextInput
                                ref={specRef}
                                style={styles.input}
                                value={formData.specialization}
                                onChangeText={set('specialization')}
                                returnKeyType="next"
                                onSubmitEditing={() => clinicRef.current?.focus()}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />
                        </View>

                        {/* Clinic */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>{t('signup_doctor.clinic')}</Text>
                            <TextInput
                                ref={clinicRef}
                                style={styles.input}
                                value={formData.clinic_name}
                                onChangeText={set('clinic_name')}
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                            />
                        </View>

                        {/* Password */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>{t('common.password')}</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    ref={passwordRef}
                                    style={[styles.input, { flex: 1 }]}
                                    value={formData.password}
                                    onChangeText={set('password')}
                                    secureTextEntry={!showPassword}
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmit}
                                    placeholderTextColor="rgba(255,255,255,0.5)"
                                />
                                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                                    <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                            <PasswordStrength password={formData.password} />
                        </View>

                        {/* Certificate upload */}
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>{t('signup_doctor.upload_label')}</Text>
                            <TouchableOpacity style={styles.uploadBtn} onPress={pickCertificate}>
                                <Text style={styles.uploadBtnText}>
                                    {certificate
                                        ? `✓ ${certificate.name}`
                                        : `📎 ${t('signup_doctor.upload_btn')}`}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.requiredNote}>{t('signup_doctor.required_note')}</Text>

                        {error ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <SubmitButton
                            label={loading ? t('common.sending') : t('common.continue')}
                            onPress={handleSubmit}
                            disabled={loading}
                        />

                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.linkText}>
                                {t('common.already_have_account')}{' '}
                                <Text style={styles.linkBold}>{t('common.login')}</Text>
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('SignupChoice')}>
                            <Text style={styles.linkText}>{t('common.back')}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {showTerms && (
                <TermsModal
                    onAgree={handleAgree}
                    onDecline={() => setShowTerms(false)}
                    accentColor={ACCENT}
                />
            )}
        </ImageBackground>
    )
}

// ─── LangSwitcher ────────────────────────────────────────────────────────────
function LangSwitcher({ i18n, t }) {
    const [open, setOpen] = useState(false)
    const changeLanguage = async (code) => {
        setOpen(false)
        const needsFlip = (code === 'ar') !== I18nManager.isRTL
        await i18n.changeLanguage(code)
        I18nManager.forceRTL(code === 'ar')
        if (needsFlip) await Updates.reloadAsync()
    }
    return (
        <>
            <TouchableOpacity style={styles.langBtn} onPress={() => setOpen(true)}>
                <Text style={styles.langBtnText}>🌐 {t('lang.change')}</Text>
            </TouchableOpacity>
            <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.langOverlay} onPress={() => setOpen(false)}>
                    <View style={styles.langMenu}>
                        {[['en', 'English'], ['fr', 'Français'], ['ar', 'العربية']].map(([code, label]) => (
                            <TouchableOpacity
                                key={code}
                                style={[styles.langItem, i18n.language === code && styles.langItemActive]}
                                onPress={() => changeLanguage(code)}
                            >
                                <Text style={[styles.langItemText, i18n.language === code && { fontWeight: '700' }]}>{label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </>
    )
}

// ─── Helper Components ───────────────────────────────────────────────────────
function PasswordStrength({ password }) {
    if (!password) return null
    const errors = validatePassword(password)
    const strength = 5 - errors.length
    const color = strength <= 2 ? '#fc8181' : strength <= 3 ? '#f6ad55' : '#68d391'
    const label = strength <= 2 ? 'Weak' : strength <= 3 ? 'Medium' : 'Strong'
    return (
        <View style={{ marginTop: 6 }}>
            <View style={styles.strengthBars}>
                {[1, 2, 3, 4, 5].map(i => (
                    <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength ? color : 'rgba(255,255,255,0.3)' }]} />
                ))}
            </View>
            <Text style={[styles.hint, { color, fontWeight: 'bold' }]}>{label}</Text>
            {errors.map(e => <Text key={e} style={styles.hint}>• {e}</Text>)}
        </View>
    )
}

function SubmitButton({ label, onPress, disabled }) {
    const scale = useRef(new Animated.Value(1)).current
    const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()
    return (
        <Animated.View style={{ transform: [{ scale }], width: '100%', marginTop: 8 }}>
            <Pressable
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                disabled={disabled}
                style={[styles.submitBtn, disabled && { opacity: 0.7 }]}
            >
                <Text style={styles.submitBtnText}>{label}</Text>
            </Pressable>
        </Animated.View>
    )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    bg: { flex: 1 },
    scroll: { flexGrow: 1, alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
    logo: { width: 90, height: 90, marginBottom: 12 },

    card: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 24, padding: 32,
        width: '100%', maxWidth: 420, gap: 14,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3, shadowRadius: 40, elevation: 10,
    },
    title: {
        color: 'white', fontSize: 22, fontWeight: '700', textAlign: 'center',
        textShadowColor: 'rgba(138,106,163,0.6)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 12,
    },
    subtitle: { color: '#be98f3', fontSize: 14, textAlign: 'center', marginTop: -4 },

    fieldGroup: { gap: 5 },
    label: { color: 'white', fontSize: 14, fontWeight: '600' },
    input: {
        backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
        paddingVertical: 14, paddingHorizontal: 16,
        color: 'white', fontSize: 15,
    },
    hint: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 3 },

    passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    eyeBtn: { padding: 10 },
    eyeText: { fontSize: 18 },

    uploadBtn: {
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', borderStyle: 'dashed',
        borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16,
        backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center',
    },
    uploadBtnText: { color: 'white', fontSize: 14 },

    requiredNote: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: -4 },

    strengthBars: { flexDirection: 'row', gap: 6, marginBottom: 5 },
    strengthBar: { height: 4, flex: 1, borderRadius: 2 },

    errorBox: {
        backgroundColor: 'rgba(255,60,60,0.1)', borderRadius: 10,
        borderWidth: 1, borderColor: 'rgba(255,60,60,0.4)', padding: 10,
    },
    errorText: { color: '#ffb3b3', fontSize: 14, textAlign: 'center', fontWeight: '600' },

    submitBtn: { backgroundColor: 'white', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    submitBtnText: { color: '#1a1a1a', fontSize: 16, fontWeight: '700' },

    linkText: { color: 'white', fontSize: 14, textAlign: 'center', marginTop: 4 },
    linkBold: { fontWeight: 'bold', textDecorationLine: 'underline' },

    // LangSwitcher
    langBtn: {
        position: 'absolute', top: 48, right: 20, zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12,
        paddingVertical: 10, paddingHorizontal: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    },
    langBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
    langOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 100, paddingRight: 20 },
    langMenu: {
        backgroundColor: 'rgba(15,25,45,0.97)', borderRadius: 12, overflow: 'hidden', minWidth: 160,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    langItem: { paddingVertical: 13, paddingHorizontal: 18 },
    langItemActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
    langItemText: { color: 'white', fontSize: 15 },
})
