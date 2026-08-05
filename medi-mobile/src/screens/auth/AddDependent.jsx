import { useState, useRef } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, Pressable,
    StyleSheet, ScrollView, KeyboardAvoidingView,
    Platform, Animated, Modal, SafeAreaView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { validateEgyptianNationalId, validateBirthCertificate, getAgeInfo } from '../../utils/validate'
import TermsModal from '../../components/TermsModal'
import api from '../../api/axios'

// Guardian theme colours (matches CSS --pink-* vars)
const C = {
    bg: '#5a0a3c',
    container: '#ead4ed',
    text: '#35052e',
    border: '#410a35',
    hint: '#7a4060',
}

const RELATIONS = ['mother', 'father', 'daughter', 'son', 'sister', 'brother', 'spouse', 'aunt', 'uncle', 'niece', 'nephew', 'other']

export default function AddDependent() {
    const navigation = useNavigation()

    const [depData, setDepData] = useState({
        dependent_full_name: '', dependent_national_id: '', birth_certificate_number: '',
        dependent_dob: '', dependent_gender: '', dependent_phone_number: '', relation: '', relation_other: '',
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [showTerms, setShowTerms] = useState(false)
    const [showRelationPicker, setShowRelationPicker] = useState(false)
    const [showPhoneTip, setShowPhoneTip] = useState(false)

    const phoneRef = useRef(null)
    const idRef = useRef(null)
    const certRef = useRef(null)
    const dobRef = useRef(null)
    const relationOtherRef = useRef(null)

    const set = (field) => (value) => setDepData(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async () => {
        setError('')
        const { dependent_full_name, dependent_dob, dependent_gender, relation, dependent_national_id, birth_certificate_number } = depData

        if (!dependent_full_name || !dependent_dob || !dependent_gender || !relation) {
            setError('Please fill in all required fields'); return
        }
        if (!dependent_national_id && !birth_certificate_number) {
            setError('Please provide either a national ID or birth certificate number'); return
        }
        if (dependent_national_id) {
            const idErrors = validateEgyptianNationalId(dependent_national_id, dependent_dob, dependent_gender)
            if (idErrors.length > 0) { setError(idErrors[0]); return }
        }
        if (birth_certificate_number) {
            const certErrors = validateBirthCertificate(birth_certificate_number)
            if (certErrors.length > 0) { setError(`Birth certificate: ${certErrors[0]}`); return }
        }
        setShowTerms(true)
    }

    const handleAgree = async () => {
        setShowTerms(false)
        const relation = depData.relation === 'other' ? depData.relation_other : depData.relation
        setLoading(true)
        try {
            await api.post('/dependents', {
                dependent_full_name: depData.dependent_full_name,
                dependent_national_id: depData.dependent_national_id || null,
                birth_certificate_number: depData.birth_certificate_number || null,
                dependent_dob: depData.dependent_dob,
                dependent_gender: depData.dependent_gender,
                phone_number: depData.dependent_phone_number || null,
                relation,
            })
            setSuccess(true)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add dependent')
        } finally {
            setLoading(false)
        }
    }

    const depAgeInfo = getAgeInfo(depData.dependent_dob)
    const relationLabel = depData.relation
        ? depData.relation.charAt(0).toUpperCase() + depData.relation.slice(1)
        : 'Select relation'

    // ── Success screen ────────────────────────────────────────────────────────
    if (success) {
        return (
            <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
                <View style={styles.successWrap}>
                    <View style={[styles.card, { backgroundColor: C.container }]}>
                        <Text style={styles.successIcon}>✅</Text>
                        <Text style={[styles.successTitle, { color: C.text }]}>Dependent Added!</Text>
                        <Text style={[styles.successSub, { color: C.hint }]}>
                            {depData.dependent_full_name} has been added to your account.
                        </Text>
                        <TouchableOpacity
                            style={[styles.backBtn, { backgroundColor: C.border }]}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.backBtnText}>Back to Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        )
    }

    // ── Form screen ───────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={[styles.screen, { backgroundColor: C.bg }]}>
            {/* Top bar */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBarBack}>
                    <Text style={styles.topBarBackText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.topBarTitle}>Add Dependent</Text>
                <View style={{ width: 60 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={[styles.card, { backgroundColor: C.container }]}>
                        <Text style={[styles.title, { color: C.text }]}>Add Dependent</Text>
                        <Text style={[styles.subtitle, { color: C.hint }]}>Add a new dependent to your guardian account</Text>

                        {/* Full Name */}
                        <Field label="Full Name" color={C.text}>
                            <TextInput
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                                value={depData.dependent_full_name}
                                onChangeText={set('dependent_full_name')}
                                returnKeyType="next"
                                onSubmitEditing={() => phoneRef.current?.focus()}
                                placeholderTextColor={C.hint}
                            />
                        </Field>

                        {/* Phone */}
                        <View style={styles.fieldGroup}>
                            <View style={styles.labelRow}>
                                <Text style={[styles.label, { color: C.text }]}>Phone Number</Text>
                                <TouchableOpacity onPress={() => setShowPhoneTip(p => !p)} style={[styles.tipBtn, { borderColor: C.text }]}>
                                    <Text style={[styles.tipBtnText, { color: C.text }]}>?</Text>
                                </TouchableOpacity>
                            </View>
                            {showPhoneTip && (
                                <Text style={[styles.tipText, { color: C.text, borderColor: C.border }]}>
                                    A phone number is needed for the dependent to log in later. If the dependent is too young to have one, their home page can only be accessed through the guardian's sidebar. You can update the phone number anytime from guardian settings.
                                </Text>
                            )}
                            <TextInput
                                ref={phoneRef}
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                                value={depData.dependent_phone_number}
                                onChangeText={(v) => set('dependent_phone_number')(v.replace(/[^\d+]/g, ''))}
                                keyboardType="phone-pad"
                                maxLength={16}
                                returnKeyType="next"
                                onSubmitEditing={() => idRef.current?.focus()}
                                placeholderTextColor={C.hint}
                            />
                        </View>

                        {/* Relation picker */}
                        <Field label="Relation to Dependent" color={C.text}>
                            <TouchableOpacity
                                style={[styles.input, styles.pickerTrigger, { borderColor: C.border }]}
                                onPress={() => setShowRelationPicker(true)}
                            >
                                <Text style={[styles.pickerText, { color: depData.relation ? C.text : C.hint }]}>
                                    {relationLabel}
                                </Text>
                                <Text style={[styles.pickerChevron, { color: C.text }]}>▾</Text>
                            </TouchableOpacity>
                        </Field>

                        {depData.relation === 'other' && (
                            <Field label="Please specify" color={C.text}>
                                <TextInput
                                    ref={relationOtherRef}
                                    style={[styles.input, { borderColor: C.border, color: C.text }]}
                                    value={depData.relation_other}
                                    onChangeText={set('relation_other')}
                                    returnKeyType="next"
                                    onSubmitEditing={() => idRef.current?.focus()}
                                    placeholderTextColor={C.hint}
                                />
                            </Field>
                        )}

                        {/* National ID */}
                        <Field label="National ID Number" color={C.text}>
                            <TextInput
                                ref={idRef}
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                                value={depData.dependent_national_id}
                                onChangeText={(v) => set('dependent_national_id')(v.replace(/\D/g, ''))}
                                keyboardType="number-pad"
                                maxLength={14}
                                placeholder="Leave blank if dependent is a child"
                                placeholderTextColor={C.hint}
                                returnKeyType="next"
                                onSubmitEditing={() => certRef.current?.focus()}
                            />
                            {depData.dependent_national_id ? (
                                <NationalIdHint id={depData.dependent_national_id} dob={depData.dependent_dob} gender={depData.dependent_gender} hintColor={C.hint} />
                            ) : null}
                        </Field>

                        {/* Birth certificate */}
                        <Field
                            label={<>Birth Certificate Number <Text style={styles.labelNote}>(for children without national ID)</Text></>}
                            color={C.text}
                        >
                            <TextInput
                                ref={certRef}
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                                value={depData.birth_certificate_number}
                                onChangeText={set('birth_certificate_number')}
                                placeholder="Leave blank if dependent has national ID"
                                placeholderTextColor={C.hint}
                                returnKeyType="next"
                                onSubmitEditing={() => dobRef.current?.focus()}
                            />
                            {depData.birth_certificate_number ? (
                                <BirthCertHint cert={depData.birth_certificate_number} />
                            ) : null}
                        </Field>

                        {/* DOB */}
                        <Field label="Date of Birth" color={C.text}>
                            <TextInput
                                ref={dobRef}
                                style={[styles.input, { borderColor: C.border, color: C.text }]}
                                value={depData.dependent_dob}
                                onChangeText={set('dependent_dob')}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={C.hint}
                                returnKeyType="done"
                            />
                            {depAgeInfo ? (
                                <Text style={[styles.hint, { color: depAgeInfo.isBirthday ? '#e53e3e' : C.hint, fontWeight: depAgeInfo.isBirthday ? 'bold' : 'normal' }]}>
                                    {depAgeInfo.isBirthday
                                        ? `Happy Birthday! They are ${depAgeInfo.age} today!`
                                        : `They are ${depAgeInfo.age} years old`}
                                </Text>
                            ) : null}
                        </Field>

                        {/* Gender */}
                        <View style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: C.text }]}>Gender</Text>
                            <View style={styles.genderRow}>
                                {[['male', 'Male'], ['female', 'Female'], ['other', 'Other']].map(([v, l]) => (
                                    <TouchableOpacity
                                        key={v}
                                        style={[
                                            styles.genderBtn,
                                            { borderColor: C.border },
                                            depData.dependent_gender === v && { backgroundColor: C.border },
                                        ]}
                                        onPress={() => set('dependent_gender')(v)}
                                    >
                                        <Text style={[
                                            styles.genderBtnText,
                                            { color: depData.dependent_gender === v ? 'white' : C.text },
                                        ]}>
                                            {l}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {error ? (
                            <Text style={styles.error}>{error}</Text>
                        ) : null}

                        <SubmitButton
                            label={loading ? 'Adding...' : 'Add Dependent'}
                            onPress={handleSubmit}
                            disabled={loading}
                            color={C.border}
                        />

                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Text style={[styles.backLink, { color: C.text }]}>← Back to Profile</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Relation picker modal */}
            <Modal visible={showRelationPicker} transparent animationType="slide" onRequestClose={() => setShowRelationPicker(false)}>
                <Pressable style={styles.pickerOverlay} onPress={() => setShowRelationPicker(false)}>
                    <View style={[styles.pickerSheet, { backgroundColor: C.container }]}>
                        <Text style={[styles.pickerTitle, { color: C.text }]}>Relation to Dependent</Text>
                        <ScrollView>
                            {RELATIONS.map(r => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.pickerItem, depData.relation === r && { backgroundColor: C.border + '33' }]}
                                    onPress={() => { set('relation')(r); setShowRelationPicker(false) }}
                                >
                                    <Text style={[styles.pickerItemText, { color: C.text }, depData.relation === r && { fontWeight: '700' }]}>
                                        {r.charAt(0).toUpperCase() + r.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            {showTerms && (
                <TermsModal
                    onAgree={handleAgree}
                    onDecline={() => setShowTerms(false)}
                    accentColor={C.border}
                />
            )}
        </SafeAreaView>
    )
}

// ─── Helper Components ───────────────────────────────────────────────────────
function Field({ label, color, children }) {
    return (
        <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color }]}>{label}</Text>
            {children}
        </View>
    )
}

function NationalIdHint({ id, dob, gender, hintColor }) {
    if (!id) return null
    if (id.length < 14) return <Text style={[styles.hint, { color: hintColor }]}>{id.length}/14 digits</Text>
    const errors = validateEgyptianNationalId(id, dob, gender)
    if (errors.length === 0) return <Text style={[styles.hint, { color: '#38a169' }]}>✓ Valid national ID</Text>
    return <Text style={[styles.hint, { color: '#e53e3e' }]}>✗ {errors[0]}</Text>
}

function BirthCertHint({ cert }) {
    if (!cert) return null
    const errors = validateBirthCertificate(cert)
    if (errors.length === 0) return <Text style={[styles.hint, { color: '#38a169' }]}>✓ Valid birth certificate number</Text>
    return <Text style={[styles.hint, { color: '#e53e3e' }]}>✗ {errors[0]}</Text>
}

function SubmitButton({ label, onPress, disabled, color }) {
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
                style={[styles.submitBtn, { backgroundColor: color }, disabled && { opacity: 0.7 }]}
            >
                <Text style={styles.submitBtnText}>{label}</Text>
            </Pressable>
        </Animated.View>
    )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    screen: { flex: 1 },

    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    topBarBack: { width: 60 },
    topBarBackText: { color: 'white', fontSize: 14 },
    topBarTitle: { color: 'white', fontSize: 16, fontWeight: '700' },

    scroll: { flexGrow: 1, padding: 20, paddingBottom: 40 },

    card: {
        borderRadius: 20, padding: 32, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25, shadowRadius: 32, elevation: 10,
    },
    title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
    subtitle: { fontSize: 13, textAlign: 'center', marginTop: -4 },

    fieldGroup: { gap: 5 },
    label: { fontSize: 14, fontWeight: 'bold' },
    labelNote: { fontWeight: '400', fontSize: 12 },
    input: {
        backgroundColor: 'white', borderRadius: 8,
        borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14,
        fontSize: 14,
    },
    hint: { fontSize: 11, marginTop: 3 },

    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    tipBtn: {
        width: 16, height: 16, borderRadius: 8,
        borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
    },
    tipBtnText: { fontSize: 10, fontWeight: 'bold' },
    tipText: {
        borderRadius: 8, borderWidth: 1,
        padding: 10, fontSize: 12, lineHeight: 18,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },

    pickerTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pickerText: { fontSize: 14 },
    pickerChevron: { fontSize: 14 },

    genderRow: { flexDirection: 'row', gap: 8 },
    genderBtn: {
        flex: 1, paddingVertical: 11, borderRadius: 8,
        borderWidth: 1.5, alignItems: 'center',
        backgroundColor: 'white',
    },
    genderBtnText: { fontSize: 14, fontWeight: '500' },

    error: { color: 'red', fontSize: 13, textAlign: 'center' },

    submitBtn: { borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
    submitBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },

    backLink: { fontSize: 13, textAlign: 'center', textDecorationLine: 'underline', marginTop: 4 },

    // Success
    successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    successIcon: { fontSize: 48, textAlign: 'center' },
    successTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 8 },
    successSub: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 20 },
    backBtn: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
    backBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },

    // Picker modal
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
    pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
    pickerItem: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, marginBottom: 2 },
    pickerItemText: { fontSize: 15 },
})
