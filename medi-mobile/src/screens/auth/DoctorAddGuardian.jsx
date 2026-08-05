import { useState, useRef } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, Pressable,
    StyleSheet, ScrollView, KeyboardAvoidingView,
    Platform, Animated, Modal, SafeAreaView,
} from 'react-native'
import { Image } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { validateEgyptianNationalId, validateBirthCertificate, getAgeInfo } from '../../utils/validate'
import api from '../../api/axios'
import TermsModal from '../../components/TermsModal'

const C = { bg: '#3b1f5e', container: '#ead6f7', text: '#1e0f33', border: '#3b1f5e', hint: '#8060c0' }
const RELATIONS = ['mother', 'father', 'daughter', 'son', 'sister', 'brother', 'aunt', 'uncle', 'niece', 'nephew', 'other']

export default function DoctorAddGuardian() {
    const navigation = useNavigation()
    const [formData, setFormData] = useState({ national_id_number: '', dob: '', gender: '' })
    const [depData, setDepData] = useState({
        dependent_full_name: '', dependent_national_id: '', birth_certificate_number: '',
        dependent_dob: '', dependent_gender: '', relation: '', relation_other: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [showTerms, setShowTerms] = useState(false)
    const [showRelationPicker, setShowRelationPicker] = useState(false)

    const dobRef = useRef(null)
    const depNameRef = useRef(null)
    const depIdRef = useRef(null)
    const certRef = useRef(null)
    const depDobRef = useRef(null)
    const relationOtherRef = useRef(null)

    const set = (field) => (value) => setFormData(prev => ({ ...prev, [field]: value }))
    const setDep = (field) => (value) => setDepData(prev => ({ ...prev, [field]: value }))

    const handleSubmit = () => {
        setError('')
        if (!formData.national_id_number || !formData.dob || !formData.gender) { setError('Please fill in all your personal fields'); return }
        if (!depData.dependent_full_name || !depData.dependent_dob || !depData.dependent_gender || !depData.relation) { setError('Please fill in all dependent fields'); return }
        if (!depData.dependent_national_id && !depData.birth_certificate_number) { setError('Please provide national ID or birth certificate for dependent'); return }
        const idErrors = validateEgyptianNationalId(formData.national_id_number, formData.dob, formData.gender)
        if (idErrors.length > 0) { setError(idErrors[0]); return }
        if (depData.dependent_national_id) {
            const depIdErrors = validateEgyptianNationalId(depData.dependent_national_id, depData.dependent_dob, depData.dependent_gender)
            if (depIdErrors.length > 0) { setError(`Dependent: ${depIdErrors[0]}`); return }
        }
        setShowTerms(true)
    }

    const handleAgree = async () => {
        setShowTerms(false)
        const relation = depData.relation === 'other' ? depData.relation_other : depData.relation
        setLoading(true)
        try {
            await api.post('/upgrade/doctor/add-guardian', { ...formData, ...depData, relation })
            setSuccess(true)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed')
        } finally {
            setLoading(false)
        }
    }

    const ageInfo = getAgeInfo(formData.dob)
    const depAgeInfo = getAgeInfo(depData.dependent_dob)
    const relationLabel = depData.relation ? depData.relation.charAt(0).toUpperCase() + depData.relation.slice(1) : 'Select relation'

    if (success) {
        return (
            <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
                <View style={styles.successWrap}>
                    <View style={[styles.card, { backgroundColor: C.container }]}>
                        <Text style={styles.successIcon}>✅</Text>
                        <Text style={[styles.successTitle, { color: C.text }]}>Guardian account created!</Text>
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
            <TopBar title="Add Guardian Account" onBack={() => navigation.goBack()} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                    <View style={[styles.card, { backgroundColor: C.container }]}>
                        <Text style={[styles.title, { color: C.text }]}>Add Guardian Account</Text>

                        {/* ── Personal section ── */}
                        <Text style={[styles.sectionLabel, { color: C.hint }]}>Your Personal Details</Text>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>National ID Number</Text>
                            <TextInput style={[styles.input, { borderColor: C.border, color: C.text }]} value={formData.national_id_number} onChangeText={(v) => set('national_id_number')(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={14} returnKeyType="next" onSubmitEditing={() => dobRef.current?.focus()} placeholderTextColor={C.hint} />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Date of Birth</Text>
                            <TextInput ref={dobRef} style={[styles.input, { borderColor: C.border, color: C.text }]} value={formData.dob} onChangeText={set('dob')} placeholder="YYYY-MM-DD" placeholderTextColor={C.hint} returnKeyType="next" onSubmitEditing={() => depNameRef.current?.focus()} />
                            {ageInfo ? <Text style={[styles.hint, { color: ageInfo.isBirthday ? '#e53e3e' : C.hint }]}>{ageInfo.isBirthday ? `Happy Birthday! You are ${ageInfo.age} today!` : `You are ${ageInfo.age} years old`}</Text> : null}
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Gender</Text>
                            <GenderToggle value={formData.gender} onChange={set('gender')} C={C} />
                        </View>

                        <View style={styles.divider} />

                        {/* ── Dependent section ── */}
                        <Text style={[styles.sectionLabel, { color: C.hint }]}>Dependent's Details</Text>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Dependent's Full Name</Text>
                            <TextInput ref={depNameRef} style={[styles.input, { borderColor: C.border, color: C.text }]} value={depData.dependent_full_name} onChangeText={setDep('dependent_full_name')} returnKeyType="next" onSubmitEditing={() => depIdRef.current?.focus()} placeholderTextColor={C.hint} />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Your relation to dependent</Text>
                            <TouchableOpacity style={[styles.input, styles.pickerTrigger, { borderColor: C.border }]} onPress={() => setShowRelationPicker(true)}>
                                <Text style={[styles.pickerText, { color: depData.relation ? C.text : C.hint }]}>{relationLabel}</Text>
                                <Text style={{ color: C.text }}>▾</Text>
                            </TouchableOpacity>
                        </View>

                        {depData.relation === 'other' && (
                            <View style={styles.fieldGroup}>
                                <Text style={[styles.label, { color: C.text }]}>Please specify</Text>
                                <TextInput ref={relationOtherRef} style={[styles.input, { borderColor: C.border, color: C.text }]} value={depData.relation_other} onChangeText={setDep('relation_other')} returnKeyType="next" onSubmitEditing={() => depIdRef.current?.focus()} placeholderTextColor={C.hint} />
                            </View>
                        )}

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Dependent's National ID</Text>
                            <TextInput ref={depIdRef} style={[styles.input, { borderColor: C.border, color: C.text }]} value={depData.dependent_national_id} onChangeText={(v) => setDep('dependent_national_id')(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={14} placeholder="Leave blank if child" placeholderTextColor={C.hint} returnKeyType="next" onSubmitEditing={() => certRef.current?.focus()} />
                            <NationalIdHint id={depData.dependent_national_id} dob={depData.dependent_dob} gender={depData.dependent_gender} hintColor={C.hint} />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Birth Certificate Number <Text style={styles.labelNote}>(for children)</Text></Text>
                            <TextInput ref={certRef} style={[styles.input, { borderColor: C.border, color: C.text }]} value={depData.birth_certificate_number} onChangeText={setDep('birth_certificate_number')} placeholder="Leave blank if has national ID" placeholderTextColor={C.hint} returnKeyType="next" onSubmitEditing={() => depDobRef.current?.focus()} />
                            <BirthCertHint cert={depData.birth_certificate_number} />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Dependent's Date of Birth</Text>
                            <TextInput ref={depDobRef} style={[styles.input, { borderColor: C.border, color: C.text }]} value={depData.dependent_dob} onChangeText={setDep('dependent_dob')} placeholder="YYYY-MM-DD" placeholderTextColor={C.hint} returnKeyType="done" />
                            {depAgeInfo ? <Text style={[styles.hint, { color: depAgeInfo.isBirthday ? '#e53e3e' : C.hint }]}>{depAgeInfo.isBirthday ? `Happy Birthday! They are ${depAgeInfo.age} today!` : `They are ${depAgeInfo.age} years old`}</Text> : null}
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Dependent's Gender</Text>
                            <GenderToggle value={depData.dependent_gender} onChange={setDep('dependent_gender')} C={C} />
                        </View>

                        {error ? <Text style={styles.error}>{error}</Text> : null}
                        <SubmitButton label={loading ? 'Creating...' : 'Create Guardian Account'} onPress={handleSubmit} disabled={loading} color={C.border} />
                        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={[styles.cancelLink, { color: C.text }]}>← Cancel</Text></TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showRelationPicker} transparent animationType="slide" onRequestClose={() => setShowRelationPicker(false)}>
                <Pressable style={styles.pickerOverlay} onPress={() => setShowRelationPicker(false)}>
                    <View style={[styles.pickerSheet, { backgroundColor: C.container }]}>
                        <Text style={[styles.pickerTitle, { color: C.text }]}>Relation to Dependent</Text>
                        <ScrollView>{RELATIONS.map(r => (
                            <TouchableOpacity key={r} style={[styles.pickerItem, depData.relation === r && { backgroundColor: C.border + '33' }]} onPress={() => { setDep('relation')(r); setShowRelationPicker(false) }}>
                                <Text style={[styles.pickerItemText, { color: C.text }, depData.relation === r && { fontWeight: '700' }]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                            </TouchableOpacity>
                        ))}</ScrollView>
                    </View>
                </Pressable>
            </Modal>

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

function GenderToggle({ value, onChange, C }) {
    return (
        <View style={styles.genderRow}>
            {[['male', 'Male'], ['female', 'Female'], ['other', 'Other']].map(([v, l]) => (
                <TouchableOpacity key={v} style={[styles.genderBtn, { borderColor: C.border }, value === v && { backgroundColor: C.border }]} onPress={() => onChange(v)}>
                    <Text style={[styles.genderBtnText, { color: value === v ? 'white' : C.text }]}>{l}</Text>
                </TouchableOpacity>
            ))}
        </View>
    )
}

function NationalIdHint({ id, dob, gender, hintColor }) {
    if (!id) return null
    if (id.length < 14) return <Text style={[styles.hint, { color: hintColor }]}>{id.length}/14 digits</Text>
    const errors = validateEgyptianNationalId(id, dob, gender)
    return <Text style={[styles.hint, { color: errors.length === 0 ? '#38a169' : '#e53e3e' }]}>{errors.length === 0 ? '✓ Valid national ID' : `✗ ${errors[0]}`}</Text>
}

function BirthCertHint({ cert }) {
    if (!cert) return null
    const errors = validateBirthCertificate(cert)
    return <Text style={[styles.hint, { color: errors.length === 0 ? '#38a169' : '#e53e3e' }]}>{errors.length === 0 ? '✓ Valid birth certificate number' : `✗ ${errors[0]}`}</Text>
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
    sectionLabel: { fontWeight: 'bold', fontSize: 13 },
    divider: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)', marginVertical: 4 },
    fieldGroup: { gap: 5 },
    label: { fontSize: 14, fontWeight: 'bold' },
    labelNote: { fontWeight: '400', fontSize: 12 },
    input: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
    hint: { fontSize: 11, marginTop: 3 },
    pickerTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pickerText: { fontSize: 14 },
    genderRow: { flexDirection: 'row', gap: 8 },
    genderBtn: { flex: 1, paddingVertical: 11, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', backgroundColor: 'white' },
    genderBtnText: { fontSize: 14, fontWeight: '500' },
    error: { color: 'red', fontSize: 13, textAlign: 'center' },
    btn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    btnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    cancelLink: { fontSize: 13, textAlign: 'center', textDecorationLine: 'underline', marginTop: 4 },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
    pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    pickerItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, marginBottom: 2 },
    pickerItemText: { fontSize: 15 },
    successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    successIcon: { fontSize: 48, textAlign: 'center' },
    successTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 8, marginBottom: 16 },
})
