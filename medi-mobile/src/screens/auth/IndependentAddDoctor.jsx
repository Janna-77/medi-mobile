import { useState, useRef } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, Pressable,
    StyleSheet, ScrollView, KeyboardAvoidingView,
    Platform, Animated, SafeAreaView,
} from 'react-native'
import { Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import api from '../../api/axios'
import TermsModal from '../../components/TermsModal'

const C = { bg: '#081c2f', container: '#d6e8f7', text: '#0d1f33', border: '#1a3c5e', hint: '#4a6080' }

export default function IndependentAddDoctor() {
    const navigation = useNavigation()
    const [formData, setFormData] = useState({
        medical_license_number: '', licence_expiry_date: '', specialization: '', clinic_name: '',
    })
    const [certificate, setCertificate] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [showTerms, setShowTerms] = useState(false)

    const expiryRef = useRef(null)
    const specRef = useRef(null)
    const clinicRef = useRef(null)

    const set = (field) => (value) => setFormData(prev => ({ ...prev, [field]: value }))

    const pickCertificate = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true })
            if (!result.canceled && result.assets?.length > 0) setCertificate(result.assets[0])
        } catch { setError('Failed to pick file') }
    }

    const handleSubmit = () => {
        if (!formData.medical_license_number) { setError('Medical license number is required'); return }
        if (!certificate) { setError('Medical certificate is required'); return }
        setError('')
        setShowTerms(true)
    }

    const handleAgree = async () => {
        setShowTerms(false)
        setLoading(true)
        try {
            const data = new FormData()
            Object.entries(formData).forEach(([k, v]) => v && data.append(k, v))
            data.append('certificate', { uri: certificate.uri, type: certificate.mimeType || 'application/octet-stream', name: certificate.name || 'certificate' })
            await api.post('/upgrade/independent/add-doctor', data, { headers: { 'Content-Type': 'multipart/form-data' } })
            setSuccess(true)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
                <View style={styles.successWrap}>
                    <View style={[styles.card, { backgroundColor: C.container }]}>
                        <Text style={styles.successIcon}>✅</Text>
                        <Text style={[styles.successTitle, { color: C.text }]}>Doctor account submitted!</Text>
                        <Text style={[styles.successSub, { color: C.hint }]}>Pending admin verification.</Text>
                        <TouchableOpacity style={[styles.btn, { backgroundColor: C.border }]} onPress={() => navigation.goBack()}>
                            <Text style={styles.btnText}>Back to Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
            <TopBar title="Add Doctor Account" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                    <View style={[styles.card, { backgroundColor: C.container }]}>
                        <Text style={[styles.title, { color: C.text }]}>Add Doctor Account</Text>
                        <Text style={[styles.subtitle, { color: C.hint }]}>Your independent account info has already been registered</Text>

                        <View style={[styles.disclaimer, { borderColor: C.border }]}>
                            <Text style={[styles.disclaimerText, { color: C.text }]}>
                                ℹ️ By adding a doctor account, patients who grant you access may allow you to view their medical records and summaries. You can manage patient access from your doctor account settings.
                            </Text>
                        </View>

                        <Field label="Medical License Number *" color={C.text}>
                            <TextInput style={[styles.input, { borderColor: C.border, color: C.text }]} value={formData.medical_license_number} onChangeText={set('medical_license_number')} returnKeyType="next" onSubmitEditing={() => expiryRef.current?.focus()} placeholderTextColor={C.hint} />
                        </Field>
                        <Field label="Licence Expiry Date" color={C.text}>
                            <TextInput ref={expiryRef} style={[styles.input, { borderColor: C.border, color: C.text }]} value={formData.licence_expiry_date} onChangeText={set('licence_expiry_date')} placeholder="YYYY-MM-DD" placeholderTextColor={C.hint} returnKeyType="next" onSubmitEditing={() => specRef.current?.focus()} />
                        </Field>
                        <Field label="Specialization" color={C.text}>
                            <TextInput ref={specRef} style={[styles.input, { borderColor: C.border, color: C.text }]} value={formData.specialization} onChangeText={set('specialization')} returnKeyType="next" onSubmitEditing={() => clinicRef.current?.focus()} placeholderTextColor={C.hint} />
                        </Field>
                        <Field label="Clinic Name" color={C.text}>
                            <TextInput ref={clinicRef} style={[styles.input, { borderColor: C.border, color: C.text }]} value={formData.clinic_name} onChangeText={set('clinic_name')} returnKeyType="done" placeholderTextColor={C.hint} />
                        </Field>

                        <Field label="Upload Certificate" color={C.text}>
                            <TouchableOpacity style={[styles.uploadBtn, { borderColor: C.border }]} onPress={pickCertificate}>
                                <Text style={[styles.uploadBtnText, { color: C.text }]}>{certificate ? `✓ ${certificate.name}` : '📎 Tap to upload'}</Text>
                            </TouchableOpacity>
                        </Field>

                        {error ? <Text style={styles.error}>{error}</Text> : null}
                        <SubmitButton label={loading ? 'Submitting...' : 'Submit'} onPress={handleSubmit} disabled={loading} color={C.border} />
                        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={[styles.cancelLink, { color: C.text }]}>← Cancel</Text></TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
            {showTerms && <TermsModal onAgree={handleAgree} onDecline={() => setShowTerms(false)} accentColor={C.border} />}
        </SafeAreaView>
    )
}

function TopBar({ title, onBack }) {
    return (
        <View style={styles.topBar}>
            <TouchableOpacity onPress={onBack} style={styles.topBarBack}><Text style={styles.topBarBackText}>← Back</Text></TouchableOpacity>
            <Text style={styles.topBarTitle}>{title}</Text>
            <View style={{ width: 60 }} />
        </View>
    )
}

function Field({ label, color, children }) {
    return (
        <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color }]}>{label}</Text>
            {children}
        </View>
    )
}

function SubmitButton({ label, onPress, disabled, color }) {
    const scale = useRef(new Animated.Value(1)).current
    return (
        <Animated.View style={{ transform: [{ scale }], width: '100%', marginTop: 8 }}>
            <Pressable onPress={onPress} onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()} onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()} disabled={disabled} style={[styles.btn, { backgroundColor: color }, disabled && { opacity: 0.7 }]}>
                <Text style={styles.btnText}>{label}</Text>
            </Pressable>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    topBarBack: { width: 60 },
    topBarBackText: { color: 'white', fontSize: 14 },
    topBarTitle: { color: 'white', fontSize: 16, fontWeight: '700' },
    scroll: { flexGrow: 1, padding: 20, paddingBottom: 40, alignItems: 'center' },
    logo: { width: 70, height: 70, marginBottom: 12 },
    card: { borderRadius: 20, padding: 28, width: '100%', maxWidth: 420, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 32, elevation: 10 },
    title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
    subtitle: { fontSize: 13, textAlign: 'center', marginTop: -4 },
    disclaimer: { borderRadius: 10, borderWidth: 1.5, padding: 12, backgroundColor: 'rgba(0,80,160,0.07)' },
    disclaimerText: { fontSize: 12, lineHeight: 20 },
    fieldGroup: { gap: 5 },
    label: { fontSize: 14, fontWeight: 'bold' },
    input: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
    uploadBtn: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 14, alignItems: 'center', backgroundColor: 'white' },
    uploadBtnText: { fontSize: 14 },
    error: { color: 'red', fontSize: 13, textAlign: 'center' },
    btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    btnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    cancelLink: { fontSize: 13, textAlign: 'center', textDecorationLine: 'underline', marginTop: 4 },
    successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    successIcon: { fontSize: 48, textAlign: 'center' },
    successTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 8 },
    successSub: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 16 },
})
