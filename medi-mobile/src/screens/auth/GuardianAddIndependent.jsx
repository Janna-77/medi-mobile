import { useState, useRef } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, Pressable,
    StyleSheet, ScrollView, KeyboardAvoidingView,
    Platform, Animated, SafeAreaView,
} from 'react-native'
import { Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { validateEgyptianNationalId, getAgeInfo } from '../../utils/validate'
import api from '../../api/axios'
import TermsModal from '../../components/TermsModal'

const C = { bg: '#5a0a3c', container: '#ead4ed', text: '#35052e', border: '#410a35', hint: '#7a4060' }

export default function GuardianAddIndependent() {
    const navigation = useNavigation()
    const [formData, setFormData] = useState({ national_id_number: '', dob: '', gender: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [showTerms, setShowTerms] = useState(false)

    const dobRef = useRef(null)

    const set = (field) => (value) => setFormData(prev => ({ ...prev, [field]: value }))

    const handleSubmit = () => {
        setError('')
        if (!formData.national_id_number || !formData.dob || !formData.gender) { setError('Please fill in all fields'); return }
        const idErrors = validateEgyptianNationalId(formData.national_id_number, formData.dob, formData.gender)
        if (idErrors.length > 0) { setError(idErrors[0]); return }
        setShowTerms(true)
    }

    const handleAgree = async () => {
        setShowTerms(false)
        setLoading(true)
        try {
            await api.post('/upgrade/guardian/add-independent', formData)
            setSuccess(true)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    const ageInfo = getAgeInfo(formData.dob)

    const idErrors = formData.national_id_number.length === 14
        ? validateEgyptianNationalId(formData.national_id_number, formData.dob, formData.gender)
        : null

    if (success) {
        return (
            <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
                <View style={styles.successWrap}>
                    <View style={[styles.card, { backgroundColor: C.container }]}>
                        <Text style={styles.successIcon}>✅</Text>
                        <Text style={[styles.successTitle, { color: C.text }]}>Independent account created!</Text>
                        <Text style={[styles.successSub, { color: C.hint }]}>You can now switch to it from the sidebar.</Text>
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
            <TopBar title="Add Independent Account" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                    <View style={[styles.card, { backgroundColor: C.container }]}>
                        <Text style={[styles.title, { color: C.text }]}>Add Independent Account</Text>
                        <Text style={[styles.subtitle, { color: C.hint }]}>We need a few extra details not registered under your guardian account</Text>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>National ID Number</Text>
                            <TextInput
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                                value={formData.national_id_number}
                                onChangeText={(v) => set('national_id_number')(v.replace(/\D/g, ''))}
                                keyboardType="number-pad"
                                maxLength={14}
                                returnKeyType="next"
                                onSubmitEditing={() => dobRef.current?.focus()}
                                placeholderTextColor={C.hint}
                            />
                            {formData.national_id_number.length > 0 && (
                                <Text style={[styles.hint, {
                                    color: formData.national_id_number.length < 14 ? C.hint
                                        : idErrors?.length === 0 ? '#38a169' : '#e53e3e'
                                }]}>
                                    {formData.national_id_number.length < 14
                                        ? `${formData.national_id_number.length}/14 digits`
                                        : idErrors?.length === 0 ? '✓ Valid national ID' : `✗ ${idErrors[0]}`}
                                </Text>
                            )}
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Date of Birth</Text>
                            <TextInput
                                ref={dobRef}
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                                value={formData.dob}
                                onChangeText={set('dob')}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={C.hint}
                                returnKeyType="done"
                            />
                            {ageInfo ? <Text style={[styles.hint, { color: ageInfo.isBirthday ? '#e53e3e' : C.hint, fontWeight: ageInfo.isBirthday ? 'bold' : 'normal' }]}>{ageInfo.isBirthday ? `Happy Birthday! You are ${ageInfo.age} today!` : `You are ${ageInfo.age} years old`}</Text> : null}
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Gender</Text>
                            <View style={styles.genderRow}>
                                {[['male', 'Male'], ['female', 'Female'], ['other', 'Other']].map(([v, l]) => (
                                    <TouchableOpacity key={v} style={[styles.genderBtn, { borderColor: C.border }, formData.gender === v && { backgroundColor: C.border }]} onPress={() => set('gender')(v)}>
                                        <Text style={[styles.genderBtnText, { color: formData.gender === v ? 'white' : C.text }]}>{l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {error ? <Text style={styles.error}>{error}</Text> : null}
                        <SubmitButton label={loading ? 'Creating...' : 'Create Independent Account'} onPress={handleSubmit} disabled={loading} color={C.border} />
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
    fieldGroup: { gap: 5 },
    label: { fontSize: 14, fontWeight: 'bold' },
    input: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
    hint: { fontSize: 11, marginTop: 3 },
    genderRow: { flexDirection: 'row', gap: 8 },
    genderBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', backgroundColor: 'white' },
    genderBtnText: { fontSize: 14, fontWeight: '500' },
    error: { color: 'red', fontSize: 13, textAlign: 'center' },
    btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    btnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    cancelLink: { fontSize: 13, textAlign: 'center', textDecorationLine: 'underline', marginTop: 4 },
    successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    successIcon: { fontSize: 48, textAlign: 'center' },
    successTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 8 },
    successSub: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 16 },
})
