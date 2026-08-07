import { useState, useEffect } from 'react'
import {
    View, Text, TouchableOpacity, TextInput, ScrollView,
    SafeAreaView, Modal, Pressable, DeviceEventEmitter,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Svg, { Path, Polyline, Line, Circle } from 'react-native-svg'
import Header from '../../components/Header'
import LoadingOverlay from '../../components/LoadingOverlay'
import api from '../../api/axios'
import { useTheme } from '../../context/ThemeContext'

function makeC(theme) {
    return {
        bg: theme.pageBg,
        cardBg: theme.cardBg,
        cardBorder: theme.cardBorder,
        cardBorderActive: theme.cardBorderActive,
        text: theme.textPrimary,
        textSub: theme.textSecondary,
        textMuted: theme.textMuted,
        accent: theme.accent,
        modalBg: theme.modalBg,
        modalBorder: theme.modalBorder,
        modalText: theme.modalText,
        modalSub: theme.modalSubtext,
    }
}

function getInitials(name) {
    const parts = (name || '').trim().split(/\s+/)
    if (parts.length === 1) return (parts[0][0] || '?').toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function fmt(d) {
    return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

const FILTER_LABELS = { all: 'All', independent: 'Independent', dependent: 'Dependent' }

export default function DoctorPatients() {
    const navigation = useNavigation()
    const { theme } = useTheme()
    const C = makeC(theme)

    const [patients, setPatients] = useState([])
    const [pending, setPending] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [filterOpen, setFilterOpen] = useState(false)

    const fetchAll = () => {
        setLoading(true)
        Promise.all([
            api.get('/doctors/patients'),
            api.get('/doctors/pending'),
        ]).then(([patientsRes, pendingRes]) => {
            setPatients(patientsRes.data)
            setPending(pendingRes.data)
        }).catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        fetchAll()
        const sub = DeviceEventEmitter.addListener('doctor_access_changed', fetchAll)
        return () => sub.remove()
    }, [])

    // After acting from this screen, mark the matching notification as read
    const markRelatedNotifRead = (accessId) => {
        api.get('/notifications').then(res => {
            const match = res.data.find(n =>
                n.message.startsWith('ACCESS_REQUEST:') &&
                n.message.split(':')[1] === String(accessId) &&
                !n.is_read
            )
            if (match) api.patch(`/notifications/${match.notification_id}/read`).catch(() => {})
        }).catch(() => {})
    }

    const handleApprove = async (accessId) => {
        try {
            await api.patch(`/doctors/access/${accessId}/approve`)
            setPending(prev => prev.filter(r => r.access_id !== accessId))
            markRelatedNotifRead(accessId)
            fetchAll()
        } catch { /* silent */ }
    }

    const handleDeny = async (accessId) => {
        try {
            await api.patch(`/doctors/access/${accessId}/deny`)
            setPending(prev => prev.filter(r => r.access_id !== accessId))
            markRelatedNotifRead(accessId)
        } catch { /* silent */ }
    }

    const handleRemove = async (accessId) => {
        try {
            await api.patch(`/doctors/access/${accessId}/revoke`)
            setPatients(prev => prev.filter(p => p.access_id !== accessId))
        } catch { /* silent */ }
    }

    const filtered = patients.filter(p => {
        const matchSearch = !search || p.full_name?.toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'all' || p.patient_type === filter
        return matchSearch && matchFilter
    })

    const isFiltered = !!search || filter !== 'all'

    const filterStroke = filter !== 'all' ? 'white' : C.text

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <Header role="doctor" />
            <LoadingOverlay visible={loading} role="doctor" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Search + filter row */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    <View style={{ flex: 1 }}>
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Search patients…"
                            placeholderTextColor={C.textMuted}
                            style={{
                                backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
                                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                                paddingLeft: 38, color: C.text, fontSize: 14,
                            }}
                        />
                        <View style={{ position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center' }}>
                            <Svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <Circle cx="11" cy="11" r="8" stroke={C.textMuted} strokeWidth="2" />
                                <Line x1="21" y1="21" x2="16.65" y2="16.65" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" />
                            </Svg>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={() => setFilterOpen(true)}
                        activeOpacity={0.8}
                        style={{
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                            paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12,
                            backgroundColor: filter !== 'all' ? '#5a1e96' : C.cardBg,
                            borderWidth: 1, borderColor: filter !== 'all' ? 'transparent' : C.cardBorder,
                        }}
                    >
                        <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <Line x1="4" y1="6" x2="20" y2="6" stroke={filterStroke} strokeWidth="2.2" strokeLinecap="round" />
                            <Line x1="8" y1="12" x2="16" y2="12" stroke={filterStroke} strokeWidth="2.2" strokeLinecap="round" />
                            <Line x1="11" y1="18" x2="13" y2="18" stroke={filterStroke} strokeWidth="2.2" strokeLinecap="round" />
                        </Svg>
                        <Text style={{ color: filterStroke, fontSize: 13, fontWeight: '600' }}>
                            {FILTER_LABELS[filter]}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Pending requests */}
                {pending.length > 0 && (
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                            Pending Requests ({pending.length})
                        </Text>
                        <View style={{ gap: 8 }}>
                            {pending.map(r => (
                                <PendingCard key={r.access_id} request={r} onApprove={handleApprove} onDeny={handleDeny} />
                            ))}
                        </View>
                    </View>
                )}

                {/* Patient list */}
                {!loading && filtered.length === 0 ? (
                    <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 48, alignItems: 'center' }}>
                        <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
                            <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <Circle cx="9" cy="7" r="4" stroke={C.accent} strokeWidth="1.5" />
                            <Path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" />
                            <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" />
                        </Svg>
                        <Text style={{ color: C.text, fontWeight: '600', marginBottom: 6, fontSize: 15, textAlign: 'center' }}>
                            {isFiltered ? 'No patients match your search' : 'No patients yet'}
                        </Text>
                        <Text style={{ color: C.textSub, fontSize: 13, textAlign: 'center' }}>
                            {isFiltered ? 'Check your spelling' : 'Patients will appear once they grant you access'}
                        </Text>
                    </View>
                ) : (
                    <>
                        {isFiltered && !loading && (
                            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                                Patients ({filtered.length})
                            </Text>
                        )}
                        {!isFiltered && patients.length > 0 && (
                            <Text style={{ fontSize: 11, fontWeight: '700', color: C.textSub, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
                                All Patients ({patients.length})
                            </Text>
                        )}
                        <View style={{ gap: 8 }}>
                            {filtered.map(p => (
                                <PatientCard
                                    key={p.access_id}
                                    patient={p}
                                    onPress={() => navigation.navigate('PatientView', { patientId: p.patient_id, patientName: p.full_name, patientType: p.patient_type, guardianName: p.guardian_name })}
                                    onRemove={handleRemove}
                                />
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>

            {/* Filter dropdown modal */}
            <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setFilterOpen(false)}>
                    <View style={{ position: 'absolute', top: 120, right: 16, backgroundColor: C.modalBg, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', minWidth: 160 }}>
                        {Object.entries(FILTER_LABELS).map(([key, label], i) => (
                            <TouchableOpacity
                                key={key}
                                onPress={() => { setFilter(key); setFilterOpen(false) }}
                                style={{
                                    paddingHorizontal: 16, paddingVertical: 12,
                                    backgroundColor: filter === key ? 'rgba(100,50,180,0.08)' : 'transparent',
                                    borderBottomWidth: i < 2 ? 1 : 0,
                                    borderBottomColor: C.cardBorder,
                                }}
                            >
                                <Text style={{ color: filter === key ? C.accent : C.text, fontSize: 13, fontWeight: filter === key ? '700' : '500' }}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    )
}

// ─── Pending card ─────────────────────────────────────────────────────────────

function PendingCard({ request, onApprove, onDeny }) {
    const { theme } = useTheme()
    const C = makeC(theme)
    const [appLoading, setAppLoading] = useState(false)
    const [denyLoading, setDenyLoading] = useState(false)
    const initials = getInitials(request.full_name)
    const badge = request.patient_type === 'dependent' ? 'Dependent' : 'Independent'

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.cardBg, borderWidth: 1, borderColor: 'rgba(100,50,180,0.28)', borderRadius: 14, padding: 14 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(100,50,180,0.12)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text style={{ color: C.accent, fontSize: 13, fontWeight: '700' }}>{initials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 13, marginBottom: 2 }} numberOfLines={1}>
                    {request.full_name}
                    {request.guardian_name
                        ? <Text style={{ fontWeight: '400', color: C.textMuted, fontSize: 11 }}> · {request.guardian_name}</Text>
                        : null}
                </Text>
                <Text style={{ color: C.textMuted, fontSize: 11 }}>{badge} · Pending approval</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
                <TouchableOpacity
                    disabled={appLoading}
                    onPress={async () => { setAppLoading(true); await onApprove(request.access_id); setAppLoading(false) }}
                    activeOpacity={0.8}
                    style={{ backgroundColor: '#5a1e96', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, opacity: appLoading ? 0.7 : 1 }}
                >
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>{appLoading ? '…' : 'Approve'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    disabled={denyLoading}
                    onPress={async () => { setDenyLoading(true); await onDeny(request.access_id); setDenyLoading(false) }}
                    activeOpacity={0.8}
                    style={{ borderWidth: 1.5, borderColor: 'rgba(229,62,62,0.4)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, opacity: denyLoading ? 0.7 : 1 }}
                >
                    <Text style={{ color: '#e53e3e', fontSize: 12, fontWeight: '600' }}>{denyLoading ? '…' : 'Deny'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

// ─── Patient card ─────────────────────────────────────────────────────────────

function PatientCard({ patient, onPress, onRemove }) {
    const { theme } = useTheme()
    const C = makeC(theme)
    const [expanded, setExpanded] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)
    const initials = getInitials(patient.full_name)
    const badge = patient.patient_type === 'dependent' ? 'Dependent' : 'Independent'

    return (
        <View>
            <TouchableOpacity
                onPress={() => setExpanded(e => !e)}
                activeOpacity={0.8}
                style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    backgroundColor: C.cardBg, borderWidth: 1,
                    borderColor: expanded ? C.cardBorderActive : C.cardBorder,
                    borderRadius: 14,
                    borderBottomLeftRadius: expanded ? 0 : 14,
                    borderBottomRightRadius: expanded ? 0 : 14,
                    padding: 14,
                }}
            >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#5a1e96', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>{initials}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: C.text, fontWeight: '600', fontSize: 13, marginBottom: 2 }} numberOfLines={1}>{patient.full_name}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 11 }}>{badge}{patient.guardian_name ? ` · ${patient.guardian_name}` : ''}</Text>
                </View>
                <View style={{ flexShrink: 0, transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}>
                    <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <Polyline points="9 18 15 12 9 6" stroke={C.textMuted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </Svg>
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={{
                    backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorderActive,
                    borderTopWidth: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, padding: 12,
                }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: C.textMuted, fontSize: 11 }}>Added {fmt(patient.granted_at)}</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                onPress={onPress}
                                activeOpacity={0.8}
                                style={{ backgroundColor: '#5a1e96', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
                            >
                                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>View</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setConfirmRemove(true)}
                                activeOpacity={0.8}
                                style={{ borderWidth: 1.5, borderColor: 'rgba(229,62,62,0.4)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 }}
                            >
                                <Text style={{ color: '#e53e3e', fontSize: 12, fontWeight: '600' }}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Remove confirmation modal */}
            <Modal visible={confirmRemove} transparent animationType="fade" onRequestClose={() => setConfirmRemove(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setConfirmRemove(false)}>
                    <Pressable onPress={() => { }} style={{ backgroundColor: C.modalBg, borderRadius: 18, padding: 28, width: 300, borderWidth: 1, borderColor: C.modalBorder }}>
                        <Text style={{ color: C.modalText, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Remove Patient?</Text>
                        <Text style={{ color: C.modalSub, fontSize: 13, marginBottom: 20, lineHeight: 20 }}>
                            Remove <Text style={{ fontWeight: '700' }}>{patient.full_name}</Text> from your patient list? They can re-add you later.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                onPress={() => setConfirmRemove(false)}
                                activeOpacity={0.8}
                                style={{ flex: 1, padding: 11, borderRadius: 10, borderWidth: 1, borderColor: C.modalBorder, alignItems: 'center' }}
                            >
                                <Text style={{ color: C.modalSub, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { onRemove(patient.access_id); setConfirmRemove(false) }}
                                activeOpacity={0.8}
                                style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: 'rgba(229,62,62,0.9)', alignItems: 'center' }}
                            >
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    )
}
