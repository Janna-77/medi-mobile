import { useState, useEffect } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, Modal,
    ScrollView, Alert, StyleSheet, Pressable,
} from 'react-native'
import api from '../api/axios'

const C = {
    cardBg:      'rgba(255,255,255,0.05)',
    cardBorder:  'rgba(50,100,150,0.22)',
    text:        '#d8eaf6',
    textSub:     '#5a90b5',
    textMuted:   '#3d6882',
    accent:      '#1e90c8',
    inputBg:     'rgba(255,255,255,0.07)',
    inputBorder: 'rgba(50,100,150,0.35)',
    modalBg:     '#0f1928',
}

const SUMMARY_LABELS = {
    SOAP: 'SOAP Note',
    referral: 'Referral Letter',
    report: 'Medical Report',
}

export default function DoctorAccessPanel() {
    const [accessList, setAccessList] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [loading, setLoading] = useState(true)
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState('')

    const [optionsModal, setOptionsModal] = useState(null)
    const [modalHiddenItems, setModalHiddenItems] = useState([])
    const [generatedTypes, setGeneratedTypes] = useState([])
    const [privacyLoading, setPrivacyLoading] = useState(false)

    useEffect(() => { fetchAccess() }, [])

    const fetchAccess = async () => {
        try {
            const res = await api.get('/doctors/access')
            setAccessList(res.data)
        } catch { setError('Failed to load access list') }
        finally { setLoading(false) }
    }

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
            await api.post('/doctors/access', { doctor_user_id: doctorUserId })
            setSearchResults([]); setSearchQuery('')
            fetchAccess()
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send request')
        }
    }

    const handleRevoke = (accessId) => {
        Alert.alert("Remove Doctor", "Remove this doctor's access?", [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    try {
                        await api.patch(`/doctors/access/${accessId}/revoke`)
                        setAccessList(prev => prev.filter(a => a.access_id !== accessId))
                    } catch { setError('Failed to revoke access') }
                }
            }
        ])
    }

    const handleOpenOptions = async (access) => {
        setOptionsModal(access)
        setModalHiddenItems(access.hidden_items || [])
        const res = await api.get('/summary/generated-types').catch(() => null)
        setGeneratedTypes(res?.data || [])
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
        <View style={{ gap: 14 }}>

            {/* Search */}
            <View style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Text style={styles.cardTitle}>Add a Doctor</Text>
                    <DisclaimerTooltip />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        placeholder="Name, specialization, or clinic"
                        placeholderTextColor={C.textMuted}
                        style={styles.input}
                        returnKeyType="search"
                        autoCapitalize="none"
                    />
                    <TouchableOpacity
                        onPress={handleSearch}
                        disabled={searching}
                        style={[styles.searchBtn, searching && { opacity: 0.6 }]}
                    >
                        <Text style={styles.searchBtnText}>{searching ? '…' : 'Search'}</Text>
                    </TouchableOpacity>
                </View>

                {filteredResults.length > 0 && (
                    <View style={{ marginTop: 12, gap: 8 }}>
                        {filteredResults.map(doc => (
                            <View key={doc.user_id} style={styles.resultRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.doctorName}>Dr. {doc.full_name}</Text>
                                    <Text style={styles.doctorMeta}>
                                        {doc.specialization}{doc.clinic_name ? ` · ${doc.clinic_name}` : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity style={styles.requestBtn} onPress={() => handleGrant(doc.user_id)}>
                                    <Text style={styles.requestBtnText}>Request</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Access list */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Doctors with Access</Text>

                {loading ? (
                    <Text style={styles.emptyText}>Loading…</Text>
                ) : accessList.length === 0 ? (
                    <Text style={[styles.emptyText, { color: C.textMuted }]}>No doctors have access yet</Text>
                ) : (
                    <View style={{ gap: 10, marginTop: 12 }}>
                        {accessList.map(access => (
                            <View key={access.access_id} style={styles.accessRow}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                                        <Text style={styles.doctorName}>Dr. {access.doctor_name}</Text>
                                        {access.status === 'pending' && (
                                            <View style={styles.badgePending}><Text style={styles.badgeText}>Pending</Text></View>
                                        )}
                                        {access.hidden_items?.length > 0 && (
                                            <View style={styles.badgePartial}><Text style={styles.badgeText}>Partial</Text></View>
                                        )}
                                    </View>
                                    <Text style={styles.doctorMeta}>
                                        {access.specialization}{access.clinic_name ? ` · ${access.clinic_name}` : ''}
                                    </Text>
                                </View>
                                {access.status === 'approved' && (
                                    <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
                                        <TouchableOpacity style={styles.optionsBtn} onPress={() => handleOpenOptions(access)}>
                                            <Text style={styles.optionsBtnText}>Options</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.removeBtn} onPress={() => handleRevoke(access.access_id)}>
                                            <Text style={styles.removeBtnText}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {optionsModal && (
                <OptionsModal
                    doctorName={optionsModal.doctor_name}
                    hiddenItems={modalHiddenItems}
                    generatedTypes={generatedTypes}
                    onToggle={(item) => setModalHiddenItems(prev =>
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

function OptionsModal({ doctorName, hiddenItems, generatedTypes, onToggle, onSave, onClose, loading }) {
    const allItems = [
        { key: 'records', label: 'Medical Records' },
        { key: 'phone',   label: 'Phone Number' },
        ...generatedTypes.map(t => ({ key: t, label: SUMMARY_LABELS[t] || t })),
    ]

    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={mStyles.overlay} onPress={onClose}>
                <Pressable style={mStyles.box} onPress={() => {}}>
                    <Text style={mStyles.title}>Privacy Options</Text>
                    <Text style={mStyles.subtitle}>Dr. {doctorName}</Text>
                    <Text style={mStyles.hint}>Toggle items to hide them from this doctor.</Text>

                    <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                        <View style={{ gap: 8, marginBottom: 20 }}>
                            {allItems.map(item => {
                                const isHidden = hiddenItems.includes(item.key)
                                return (
                                    <TouchableOpacity
                                        key={item.key}
                                        onPress={() => onToggle(item.key)}
                                        style={[mStyles.privacyRow, isHidden && mStyles.privacyRowHidden]}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[mStyles.privacyLabel, isHidden && { color: '#e53e3e' }]}>{item.label}</Text>
                                        <View style={[mStyles.privacyBadge, isHidden && mStyles.privacyBadgeHidden]}>
                                            <Text style={[mStyles.privacyBadgeText, isHidden && { color: '#e53e3e' }]}>
                                                {isHidden ? 'Hidden' : 'Visible'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </ScrollView>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity style={[mStyles.btn, mStyles.cancelBtn]} onPress={onClose}>
                            <Text style={{ color: C.textSub, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[mStyles.btn, mStyles.saveBtn, loading && { opacity: 0.7 }]}
                            onPress={onSave}
                            disabled={loading}
                        >
                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>{loading ? 'Saving…' : 'Save'}</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    )
}

function DisclaimerTooltip() {
    const [visible, setVisible] = useState(false)
    return (
        <View style={{ position: 'relative' }}>
            <TouchableOpacity onPress={() => setVisible(v => !v)} style={styles.tooltipBtn}>
                <Text style={styles.tooltipBtnText}>i</Text>
            </TouchableOpacity>
            {visible && (
                <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>
                        Adding a doctor gives them access to your records and summaries. Use Options to hide specific items per doctor.
                    </Text>
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: C.cardBg, borderRadius: 18, padding: 18,
        borderWidth: 1, borderColor: C.cardBorder,
    },
    cardTitle: { color: C.text, fontWeight: '700', fontSize: 14 },
    input: {
        flex: 1, padding: 11, borderRadius: 10,
        borderWidth: 1.5, borderColor: C.inputBorder,
        backgroundColor: C.inputBg, color: C.text, fontSize: 14,
    },
    searchBtn: {
        backgroundColor: '#006fa6', borderRadius: 10,
        paddingHorizontal: 16, paddingVertical: 11, justifyContent: 'center',
    },
    searchBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
    resultRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(0,168,232,0.06)', borderRadius: 10,
        padding: 12, borderWidth: 1, borderColor: C.cardBorder,
    },
    accessRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(0,168,232,0.06)', borderRadius: 12,
        padding: 13, borderWidth: 1, borderColor: C.cardBorder,
    },
    doctorName: { color: C.text, fontWeight: '600', fontSize: 13 },
    doctorMeta: { color: C.textSub, fontSize: 12, marginTop: 2 },
    requestBtn: {
        backgroundColor: '#006fa6', borderRadius: 8,
        paddingHorizontal: 12, paddingVertical: 7,
    },
    requestBtnText: { color: 'white', fontWeight: '600', fontSize: 12 },
    optionsBtn: {
        borderWidth: 1.5, borderColor: 'rgba(0,168,232,0.4)', borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 6,
    },
    optionsBtnText: { color: '#007bb5', fontWeight: '600', fontSize: 12 },
    removeBtn: {
        borderWidth: 1.5, borderColor: 'rgba(229,62,62,0.4)', borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 6,
    },
    removeBtnText: { color: '#e53e3e', fontWeight: '600', fontSize: 12 },
    badgePending: { backgroundColor: '#ed8936', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
    badgePartial: { backgroundColor: '#718096', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
    badgeText:   { color: 'white', fontSize: 10, fontWeight: '700' },
    emptyText:   { color: C.textSub, textAlign: 'center', fontSize: 13, paddingVertical: 16 },
    errorText:   { color: '#e53e3e', fontSize: 13, textAlign: 'center', marginTop: 12 },
    tooltipBtn: {
        width: 16, height: 16, borderRadius: 8,
        borderWidth: 1.5, borderColor: C.textSub,
        alignItems: 'center', justifyContent: 'center',
    },
    tooltipBtnText: { color: C.textSub, fontSize: 10, fontWeight: '700' },
    tooltip: {
        position: 'absolute', top: 20, left: 0,
        backgroundColor: 'rgba(14,22,36,0.97)', borderRadius: 8,
        padding: 10, width: 220, zIndex: 999,
        borderWidth: 1, borderColor: C.inputBorder,
    },
    tooltipText: { color: 'white', fontSize: 12, lineHeight: 18 },
})

const mStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(14,22,36,0.6)', justifyContent: 'center', alignItems: 'center' },
    box: {
        backgroundColor: C.modalBg, borderRadius: 20, padding: 28,
        width: 340, maxWidth: '90%', borderWidth: 1, borderColor: C.inputBorder,
    },
    title:    { color: C.text, fontWeight: '700', fontSize: 16, marginBottom: 4 },
    subtitle: { color: C.textSub, fontSize: 13, marginBottom: 8 },
    hint:     { color: C.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 14 },
    privacyRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 12, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    },
    privacyRowHidden: { backgroundColor: 'rgba(229,62,62,0.06)', borderColor: 'rgba(229,62,62,0.3)' },
    privacyLabel: { fontSize: 14, color: C.text },
    privacyBadge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
        backgroundColor: 'rgba(56,161,105,0.15)', borderWidth: 1, borderColor: 'rgba(154,230,180,0.4)',
    },
    privacyBadgeHidden: { backgroundColor: 'rgba(229,62,62,0.1)', borderColor: 'rgba(254,178,178,0.4)' },
    privacyBadgeText:   { fontSize: 11, fontWeight: '700', color: '#38a169' },
    btn:       { flex: 1, padding: 11, borderRadius: 10, alignItems: 'center' },
    cancelBtn: { borderWidth: 1.5, borderColor: C.cardBorder, backgroundColor: 'rgba(0,0,0,0.2)' },
    saveBtn:   { backgroundColor: C.accent },
})
