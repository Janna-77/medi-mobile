import { useState, useEffect, useRef } from 'react'
import {
    View, Text, TouchableOpacity, TextInput, ScrollView,
    SafeAreaView, Modal, Pressable, Alert, Share, Linking, Animated, Keyboard, RefreshControl,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Path, Rect, Circle, Polyline } from 'react-native-svg'
import StorageBar from '../../components/StorageBar'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import LoadingOverlay from '../../components/LoadingOverlay'
import api from '../../api/axios'
import { useTheme } from '../../context/ThemeContext'
import { getCache, setCache, clearCache } from '../../utils/pageCache'

const PILL_COLOR = '#740949'

// Persist selected dep + scroll position across navigations
let _cachedDep = null
let _cachedTab = 'records'
const SESSION_SCROLL = new Map()

const ALL_SUMMARY_TYPES = ['report', 'SOAP', 'referral']
const SUMMARY_LABELS = {
    SOAP: 'SOAP Note',
    referral: 'Referral Letter',
    report: 'Medical Report',
}
const SUMMARY_DESCRIPTIONS = {
    SOAP: 'Structures your records into Subjective, Objective, Assessment, and Plan sections — a standard clinical format used during appointments.',
    referral: 'A draft letter addressed to a specialist, outlining the reason for referral and relevant clinical history.',
    report: 'A formal document summarising your records, test results, and detected risk patterns.',
}

function fmt(d) {
    return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

function isThisMonth(dateStr) {
    if (!dateStr) return false
    const d = new Date(dateStr)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

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
        inputBg: theme.inputBg,
        inputBorder: theme.inputBorder,
        modalBg: theme.modalBg,
        modalBorder: theme.modalBorder,
        modalText: theme.modalText,
        modalSub: theme.modalSubtext,
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function GuardianRecords() {
    const { theme } = useTheme()
    const C = makeC(theme)

    const [tab, setTab] = useState(_cachedTab)
    const [dependents, setDependents] = useState([])
    const [selectedDep, setSelectedDep] = useState(_cachedDep)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [loadingDeps, setLoadingDeps] = useState(true)

    const scrollRef = useRef(null)
    const scrollRestored = useRef(false)

    const selectDep = (dep) => {
        _cachedDep = dep
        setSelectedDep(dep)
        setSearchQuery('')
    }
    const switchTab = (t) => {
        _cachedTab = t
        setTab(t)
    }
    const [records, setRecords] = useState([])
    const [loadingRecords, setLoadingRecords] = useState(false)
    const [summaries, setSummaries] = useState([])
    const [loadingSummaries, setLoadingSummaries] = useState(false)
    const [uploadOpen, setUploadOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [refreshing, setRefreshing] = useState(false)
    const [fetchKey, setFetchKey] = useState(0)

    const slideAnim = useRef(new Animated.Value(0)).current
    const [tabBarWidth, setTabBarWidth] = useState(0)

    useEffect(() => {
        Animated.timing(slideAnim, { toValue: tab === 'records' ? 0 : 1, duration: 250, useNativeDriver: false }).start()
    }, [tab])

    // Restore scroll position on mount
    useEffect(() => {
        const savedY = SESSION_SCROLL.get('records_scroll')
        if (savedY != null) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: savedY, animated: false })
                scrollRestored.current = true
            }, 120)
        } else {
            scrollRestored.current = true
        }
    }, []) // mount only

    const pillLeft = tabBarWidth
        ? slideAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 4 + (tabBarWidth - 8) / 2] })
        : 4

    // Fetch dependents
    useEffect(() => {
        const cached = getCache('guardian_records_deps')
        if (cached && fetchKey === 0) {
            setDependents(cached)
            if (!_cachedDep && cached.length === 1) selectDep(cached[0])
            setLoadingDeps(false)
            return
        }
        setLoadingDeps(true)
        api.get('/dependents')
            .then(res => {
                const deps = res.data || []
                setDependents(deps)
                setCache('guardian_records_deps', deps)
                if (!_cachedDep && deps.length === 1) selectDep(deps[0])
            })
            .catch(() => { })
            .finally(() => { setLoadingDeps(false); setRefreshing(false) })
    }, [fetchKey]) // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch records for selected dependent
    useEffect(() => {
        if (!selectedDep) { setRecords([]); return }
        const cacheKey = `guardian_records_${selectedDep.dependent_id}`
        const cached = getCache(cacheKey)
        if (cached) { setRecords(cached); setLoadingRecords(false); return }
        setLoadingRecords(true)
        api.get('/medical', { params: { dependent_id: selectedDep.dependent_id } })
            .then(res => {
                const data = (res.data || []).sort((a, b) => new Date(b.upload_date || b.created_at) - new Date(a.upload_date || a.created_at))
                setRecords(data)
                setCache(cacheKey, data)
            })
            .catch(() => setRecords([]))
            .finally(() => setLoadingRecords(false))
    }, [selectedDep, fetchKey]) // eslint-disable-line react-hooks/exhaustive-deps

    const fetchSummaries = (silent = false) => {
        if (!selectedDep) { setSummaries([]); return }
        const cacheKey = `guardian_summaries_${selectedDep.dependent_id}`
        const cached = getCache(cacheKey)
        if (cached && !silent) { setSummaries(cached); return }
        if (!silent) setLoadingSummaries(true)
        api.get('/summary', { params: { dependent_id: selectedDep.dependent_id, all: true } })
            .then(res => {
                const d = res.data
                const data = Array.isArray(d) ? d : d ? [d] : []
                setSummaries(data)
                setCache(cacheKey, data)
            })
            .catch(() => setSummaries([]))
            .finally(() => setLoadingSummaries(false))
    }

    useEffect(() => { fetchSummaries() }, [selectedDep, fetchKey]) // eslint-disable-line react-hooks/exhaustive-deps

    const refresh = () => {
        clearCache('guardian_records_deps')
        if (selectedDep) {
            clearCache(`guardian_records_${selectedDep.dependent_id}`)
            clearCache(`guardian_summaries_${selectedDep.dependent_id}`)
        }
        setRefreshing(true)
        setFetchKey(k => k + 1)
    }

    const handleDelete = (recordId) => {
        Alert.alert('Delete Record?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`/medical/${recordId}`)
                        setRecords(prev => prev.filter(r => (r.record_id || r.id) !== recordId))
                    } catch { Alert.alert('Error', 'Failed to delete record') }
                },
            },
        ])
    }

    const usedBytes = records.reduce((acc, r) => acc + (r.file_size || 0), 0)
    const filteredRecords = searchQuery.trim()
        ? records.filter(r => {
            const q = searchQuery.toLowerCase()
            const name = (r.file_url?.split('/').pop()?.substring(37) || r.file_name || 'Medical Record').toLowerCase()
            const complaint = (r.complaint || '').toLowerCase()
            const date = fmt(r.upload_date || r.created_at).toLowerCase()
            return name.includes(q) || complaint.includes(q) || date.includes(q)
        })
        : records

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <Header role="guardian" />
            <View style={{ flex: 1 }}>
            <LoadingOverlay visible={loadingDeps || loadingRecords || loadingSummaries} role="guardian" />
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={e => SESSION_SCROLL.set('records_scroll', e.nativeEvent.contentOffset.y)}
                scrollEventThrottle={100}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={PILL_COLOR} colors={[PILL_COLOR]} />}
            >
                {loadingDeps ? null : dependents.length === 0 ? (
                    <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 32, alignItems: 'center', gap: 12 }}>
                        <Text style={{ color: C.text, fontWeight: '600', fontSize: 15 }}>No dependents yet</Text>
                        <Text style={{ color: C.textSub, fontSize: 13, textAlign: 'center' }}>Add a dependent to manage their records.</Text>
                    </View>
                ) : (
                    <>
                        {/* Upload button — space always reserved */}
                        <View style={{ alignItems: 'flex-end', marginBottom: 10, opacity: tab === 'records' ? 1 : 0 }}>
                            <TouchableOpacity
                                onPress={() => setUploadOpen(true)}
                                disabled={tab !== 'records'}
                                activeOpacity={0.8}
                                style={{ backgroundColor: PILL_COLOR, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}
                            >
                                <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>+ Upload</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Animated tab bar */}
                        <View
                            style={{ flexDirection: 'row', backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, padding: 4, marginBottom: 14, position: 'relative' }}
                            onLayout={e => setTabBarWidth(e.nativeEvent.layout.width)}
                        >
                            <Animated.View style={{ position: 'absolute', top: 4, bottom: 4, width: (tabBarWidth - 8) / 2 || 0, left: pillLeft, borderRadius: 10, backgroundColor: PILL_COLOR }} />
                            {['records', 'summaries'].map(t => (
                                <TouchableOpacity key={t} onPress={() => switchTab(t)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', zIndex: 1 }} activeOpacity={0.8}>
                                    <Text style={{ color: tab === t ? 'white' : C.textSub, fontSize: 13, fontWeight: '600' }}>
                                        {t === 'records' ? 'Records' : 'Summaries'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Dependent selector */}
                        <TouchableOpacity
                            onPress={() => setPickerOpen(true)}
                            activeOpacity={0.8}
                            style={{
                                backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.inputBorder,
                                borderRadius: 12, padding: 12, marginBottom: 16,
                                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: selectedDep ? C.text : C.textMuted, fontSize: 14 }}>
                                {selectedDep ? selectedDep.full_name : 'Select a dependent…'}
                            </Text>
                            <Text style={{ color: C.textMuted, fontSize: 13 }}>▾</Text>
                        </TouchableOpacity>

                        {/* Search bar — records tab only, dep selected */}
                        {tab === 'records' && selectedDep && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8 }}>
                                <Ionicons name="search-outline" size={16} color={C.textMuted} />
                                <TextInput
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholder="Search by name, complaint, or date…"
                                    placeholderTextColor={C.textMuted}
                                    style={{ flex: 1, color: C.text, fontSize: 14 }}
                                    returnKeyType="search"
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                                        <Ionicons name="close-circle" size={16} color={C.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}

                        {/* Storage bar — records tab only */}
                        {tab === 'records' && (
                            <StorageBar usedBytes={usedBytes} role="guardian" locked={!selectedDep} />
                        )}

                        {/* Content */}
                        {!selectedDep ? (
                            <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 48, alignItems: 'center', gap: 10 }}>
                                <Text style={{ fontSize: 32 }}>🔒</Text>
                                <Text style={{ color: C.textSub, fontSize: 14, textAlign: 'center' }}>
                                    Select a dependent to view {tab}.
                                </Text>
                            </View>
                        ) : tab === 'records' ? (
                            <RecordsTab records={filteredRecords} loading={loadingRecords} C={C} hasRecords={records.length > 0} onDelete={handleDelete} />
                        ) : (
                            <SummariesTab
                                summaries={summaries}
                                loading={loadingSummaries}
                                selectedDepId={selectedDep.dependent_id}
                                onDone={() => fetchSummaries(true)}
                                C={C}
                            />
                        )}
                    </>
                )}
            </ScrollView>

            </View>

            {/* Dependent picker — centered modal */}
            <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setPickerOpen(false)}>
                    <Pressable style={{ backgroundColor: C.modalBg, borderRadius: 20, padding: 24, width: 320, maxWidth: '88%', borderWidth: 1, borderColor: C.modalBorder }} onPress={() => {}}>
                        <Text style={{ color: C.accent, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>Select Dependent</Text>
                        <Text style={{ color: C.textSub, fontSize: 12, marginBottom: 16 }}>Choose whose records to view</Text>
                        <View style={{ gap: 8 }}>
                            {dependents.map(dep => (
                                <TouchableOpacity
                                    key={dep.dependent_id}
                                    onPress={() => { selectDep(dep); setPickerOpen(false) }}
                                    activeOpacity={0.75}
                                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: selectedDep?.dependent_id === dep.dependent_id ? `${PILL_COLOR}18` : C.cardBg, borderWidth: 1.5, borderColor: selectedDep?.dependent_id === dep.dependent_id ? PILL_COLOR : C.cardBorder, borderRadius: 12, padding: 14 }}
                                >
                                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '500' }}>{dep.full_name}</Text>
                                    {selectedDep?.dependent_id === dep.dependent_id && (
                                        <Text style={{ color: PILL_COLOR, fontWeight: '700', fontSize: 15 }}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <BottomNav role="guardian" />

            {/* Upload bottom sheet */}
            <Modal visible={uploadOpen} transparent animationType="slide" onRequestClose={() => setUploadOpen(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(61,0,40,0.4)' }} onPress={() => setUploadOpen(false)} />
                <UploadSheet
                    dependents={dependents}
                    initialDep={selectedDep}
                    onClose={() => setUploadOpen(false)}
                    onSuccess={() => {
                        setUploadOpen(false)
                        if (selectedDep) {
                            clearCache(`guardian_records_${selectedDep.dependent_id}`)
                            setLoadingRecords(true)
                            api.get('/medical', { params: { dependent_id: selectedDep.dependent_id } })
                                .then(res => {
                                    const data = (res.data || []).sort((a, b) => new Date(b.upload_date || b.created_at) - new Date(a.upload_date || a.created_at))
                                    setRecords(data)
                                    setCache(`guardian_records_${selectedDep.dependent_id}`, data)
                                })
                                .catch(() => { })
                                .finally(() => setLoadingRecords(false))
                        }
                    }}
                />
            </Modal>
        </SafeAreaView>
    )
}

// ─── Records tab ───────────────────────────────────────────────────────────────

function RecordsTab({ records, loading, C, hasRecords, onDelete }) {
    if (loading) return null
    if (records.length === 0) {
        return hasRecords ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: C.textMuted, fontSize: 14 }}>No records match your search.</Text>
            </View>
        ) : (
            <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 18, padding: 48, alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 38 }}>📂</Text>
                <Text style={{ color: C.text, fontWeight: '600', fontSize: 15 }}>No records yet</Text>
                <Text style={{ color: C.textSub, fontSize: 13, textAlign: 'center' }}>Upload a medical record for this dependent.</Text>
            </View>
        )
    }
    return (
        <View style={{ gap: 10 }}>
            {records.map(r => <RecordCard key={r.record_id || r.id} record={r} C={C} onDelete={onDelete} />)}
        </View>
    )
}

// ─── Summaries tab ─────────────────────────────────────────────────────────────

function SummariesTab({ summaries, loading, selectedDepId, onDone, C }) {
    if (loading) return null

    const generatedMap = {}
    summaries.forEach(s => { generatedMap[s.summary_type] = s })
    const generatedTypes = ALL_SUMMARY_TYPES.filter(t => generatedMap[t])
    const ungeneratedTypes = ALL_SUMMARY_TYPES.filter(t => !generatedMap[t])
    const hasMonthlyUsage = summaries.some(s => isThisMonth(s.generated_at))

    return (
        <View style={{ gap: 10 }}>
            {generatedTypes.map(t => (
                <SummaryCard key={t} summary={generatedMap[t]} selectedDepId={selectedDepId} hasMonthlyUsage={hasMonthlyUsage} onDone={onDone} C={C} />
            ))}
            {ungeneratedTypes.length > 0 && (
                <>
                    {generatedTypes.length > 0 && (
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8, marginBottom: 2 }}>
                            Not yet generated
                        </Text>
                    )}
                    {ungeneratedTypes.map(t => (
                        <UngeneratedCard key={t} type={t} selectedDepId={selectedDepId} hasMonthlyUsage={hasMonthlyUsage} onDone={onDone} C={C} />
                    ))}
                </>
            )}
        </View>
    )
}

// ─── Record card ───────────────────────────────────────────────────────────────

function RecordCard({ record, C, onDelete }) {
    const [complaintVis, setComplaintVis] = useState(false)

    const fileName = record.file_url?.split('/').pop()?.substring(37) || record.file_name || 'Medical Record'
    const stroke = C.accent

    let icon
    if (record.file_type === 'application/pdf') {
        icon = <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <Polyline points="14 2 14 8 20 8" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
    } else if (record.file_type?.startsWith('image/')) {
        icon = <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx="8.5" cy="8.5" r="1.5" stroke={stroke} strokeWidth="1.8" />
            <Polyline points="21 15 16 10 5 21" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
    } else {
        icon = <Svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <Path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    }

    return (
        <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flexShrink: 0 }}>{icon}</View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <TouchableOpacity onPress={() => record.complaint && setComplaintVis(v => !v)} activeOpacity={record.complaint ? 0.7 : 1}>
                            <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }} numberOfLines={1}>{fileName}</Text>
                        </TouchableOpacity>
                        {record.complaint && (
                            <View style={{ backgroundColor: `${C.accent}18`, borderWidth: 1, borderColor: `${C.accent}33`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                                <Text style={{ color: C.accent, fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
                                    {record.complaint.length > 22 ? record.complaint.slice(0, 22) + '…' : record.complaint}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 3 }}>
                        Uploaded {fmt(record.upload_date || record.created_at)}
                    </Text>
                    {complaintVis && record.complaint && (
                        <View style={{ marginTop: 6, backgroundColor: C.inputBg, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: C.cardBorder }}>
                            <Text style={{ color: C.textMuted, fontSize: 11, marginBottom: 2 }}>Diagnosis / Complaint</Text>
                            <Text style={{ color: C.text, fontSize: 12 }}>{record.complaint}</Text>
                        </View>
                    )}
                </View>
                <View style={{ flexDirection: 'row', gap: 6, flexShrink: 0 }}>
                    {record.signed_url && (
                        <TouchableOpacity onPress={() => Linking.openURL(record.signed_url)} activeOpacity={0.8} style={{ backgroundColor: PILL_COLOR, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}>
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', marginTop: 3 }}>View</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => onDelete(record.record_id || record.id)} activeOpacity={0.8} style={{ width: 34, height: 34, borderWidth: 1.5, borderColor: 'rgba(229,62,62,0.4)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                        <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <Polyline points="3 6 5 6 21 6" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <Path d="M10 11v6M14 11v6" stroke="#e53e3e" strokeWidth="2" strokeLinecap="round" />
                        </Svg>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

// ─── Generated summary card ────────────────────────────────────────────────────

function SummaryCard({ summary, selectedDepId, hasMonthlyUsage, onDone, C }) {
    const [expanded, setExpanded] = useState(false)
    const [regenerating, setRegenerating] = useState(false)
    const [showLock, setShowLock] = useState(false)

    const label = SUMMARY_LABELS[summary.summary_type] || summary.summary_type

    const handleRegenerate = async () => {
        if (hasMonthlyUsage) { setShowLock(true); return }
        setRegenerating(true)
        try {
            await api.post('/summary/generate', { dependent_id: selectedDepId, summary_type: summary.summary_type })
            onDone()
        } catch (err) {
            const msg = (err.response?.data?.error || '').toLowerCase()
            if (msg.includes('limit') || msg.includes('lock') || msg.includes('subscription')) setShowLock(true)
        } finally { setRegenerating(false) }
    }

    return (
        <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
                        <InfoIcon type={summary.summary_type} C={C} />
                    </View>
                    <Text style={{ color: C.textMuted, fontSize: 11 }}>Generated {fmt(summary.generated_at)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {expanded && (
                        <SmallBtn onPress={() => Share.share({ message: summary.summary_text }).catch(() => { })} accent={C.accent}>Save</SmallBtn>
                    )}
                    {expanded && (
                        <SmallBtn onPress={handleRegenerate} disabled={regenerating} accent={C.accent}>
                            {regenerating ? '…' : 'Regenerate'}
                        </SmallBtn>
                    )}
                    <SmallBtn onPress={() => setExpanded(e => !e)} accent={C.accent}>{expanded ? '▲' : '▼'}</SmallBtn>
                </View>
            </View>

            {expanded && summary.summary_text && (
                <ScrollView
                    style={{ marginTop: 12, backgroundColor: C.inputBg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.cardBorder, maxHeight: 320 }}
                    nestedScrollEnabled showsVerticalScrollIndicator={false}
                >
                    <Text style={{ color: C.text, fontSize: 13, lineHeight: 23 }}>{summary.summary_text}</Text>
                </ScrollView>
            )}

            <Modal visible={showLock} transparent animationType="fade" onRequestClose={() => setShowLock(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 32 }} onPress={() => setShowLock(false)}>
                    <Pressable onPress={() => { }} style={{ backgroundColor: C.modalBg, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: C.modalBorder }}>
                        <Text style={{ color: C.modalText, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>Monthly limit reached</Text>
                        <Text style={{ color: C.modalSub, fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
                            You have exceeded your free tier limit for this dependent this month.
                        </Text>
                        <TouchableOpacity onPress={() => setShowLock(false)}>
                            <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }}>Got it</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    )
}

// ─── Ungenerated summary card ──────────────────────────────────────────────────

function UngeneratedCard({ type, selectedDepId, hasMonthlyUsage, onDone, C }) {
    const [generating, setGenerating] = useState(false)
    const [showLock, setShowLock] = useState(false)

    const handleGenerate = async () => {
        if (hasMonthlyUsage) { setShowLock(true); return }
        setGenerating(true)
        try {
            await api.post('/summary/generate', { dependent_id: selectedDepId, summary_type: type })
            onDone()
        } catch (err) {
            const msg = (err.response?.data?.error || '').toLowerCase()
            if (msg.includes('limit') || msg.includes('lock') || msg.includes('subscription')) setShowLock(true)
        } finally { setGenerating(false) }
    }

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 14, padding: 14, opacity: 0.75 }}>
            <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                    <Text style={{ color: C.text, fontWeight: '600', fontSize: 13 }}>{SUMMARY_LABELS[type] || type}</Text>
                    <InfoIcon type={type} C={C} />
                </View>
                <Text style={{ color: C.textMuted, fontSize: 11 }}>Not generated yet</Text>
            </View>
            <SmallBtn onPress={handleGenerate} disabled={generating} accent={C.accent}>
                {generating ? '…' : 'Generate'}
            </SmallBtn>

            <Modal visible={showLock} transparent animationType="fade" onRequestClose={() => setShowLock(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 32 }} onPress={() => setShowLock(false)}>
                    <Pressable onPress={() => { }} style={{ backgroundColor: C.modalBg, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: C.modalBorder }}>
                        <Text style={{ color: C.modalText, fontWeight: '600', fontSize: 13, marginBottom: 6 }}>Monthly limit reached</Text>
                        <Text style={{ color: C.modalSub, fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
                            You have exceeded your free tier limit for this dependent this month.
                        </Text>
                        <TouchableOpacity onPress={() => setShowLock(false)}>
                            <Text style={{ color: C.accent, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }}>Got it</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    )
}

// ─── Upload bottom sheet ───────────────────────────────────────────────────────

function UploadSheet({ dependents, initialDep, onClose, onSuccess }) {
    const { theme } = useTheme()
    const C = makeC(theme)
    const [dep, setDep] = useState(initialDep || null)
    const [depPickerOpen, setDepPickerOpen] = useState(false)
    const [file, setFile] = useState(null)
    const [complaint, setComplaint] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const pickFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true })
        if (result.canceled) return
        const picked = result.assets[0]
        if (picked.size > 10 * 1024 * 1024) { setError('File must be under 10MB'); return }
        setFile(picked); setError('')
    }

    const handleUpload = async () => {
        if (!dep) { setError('Please select a dependent'); return }
        if (!file) { setError('Please select a file'); return }
        if (!complaint.trim()) { setError('Please enter the diagnosis or complaint'); return }
        setLoading(true); setError('')
        try {
            const formData = new FormData()
            formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' })
            formData.append('complaint', complaint.trim())
            formData.append('dependent_id', dep.dependent_id)
            await api.post('/medical/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
            onSuccess()
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed')
        } finally { setLoading(false) }
    }

    return (
        <>
            <Pressable onPress={Keyboard.dismiss} style={{ backgroundColor: C.modalBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, borderColor: C.cardBorder, padding: 20, paddingBottom: 40 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.cardBorder, alignSelf: 'center', marginBottom: 20 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Text style={{ color: C.accent, fontWeight: '700', fontSize: 17 }}>Upload Record</Text>
                    <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                        <Text style={{ color: C.textSub, fontSize: 22, lineHeight: 24 }}>×</Text>
                    </TouchableOpacity>
                </View>

                {/* Dependent selector */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: C.accent, fontWeight: '600', fontSize: 13, marginBottom: 8 }}>
                        Dependent <Text style={{ color: '#e53e3e' }}>*</Text>
                    </Text>
                    <TouchableOpacity
                        onPress={() => setDepPickerOpen(true)}
                        activeOpacity={0.8}
                        style={{ backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        <Text style={{ color: dep ? C.text : C.textMuted, fontSize: 14 }}>
                            {dep ? dep.full_name : 'Select a dependent…'}
                        </Text>
                        <Text style={{ color: C.textMuted, fontSize: 13 }}>▾</Text>
                    </TouchableOpacity>
                </View>

                {/* Complaint */}
                <View style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: C.accent, fontWeight: '600', fontSize: 13 }}>
                            Diagnosis / Chief Complaint <Text style={{ color: '#e53e3e' }}>*</Text>
                        </Text>
                        <Text style={{ color: C.textMuted, fontSize: 12 }}>{complaint.length}/150</Text>
                    </View>
                    <TextInput
                        value={complaint}
                        onChangeText={t => setComplaint(t.slice(0, 150))}
                        placeholder="e.g. Suspected Type 2 Diabetes — routine follow-up labs"
                        placeholderTextColor={C.textMuted}
                        multiline numberOfLines={3} textAlignVertical="top"
                        style={{ backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.inputBorder, borderRadius: 10, padding: 12, color: C.text, fontSize: 14, minHeight: 80 }}
                    />
                </View>

                {/* File picker */}
                <TouchableOpacity onPress={pickFile} activeOpacity={0.8} style={{ borderWidth: 2, borderColor: C.inputBorder, borderStyle: 'dashed', borderRadius: 14, padding: 32, alignItems: 'center', backgroundColor: C.inputBg, marginBottom: 16 }}>
                    <Text style={{ fontSize: 24, marginBottom: 8 }}>📎</Text>
                    <Text style={{ color: C.text, fontWeight: '600', fontSize: 14, marginBottom: 4 }}>{file ? `✓ ${file.name}` : 'Tap to select file'}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>{file ? 'Tap to change' : 'PDF, JPG, or PNG — max 10MB'}</Text>
                </TouchableOpacity>

                {/* Notice */}
                <View style={{ backgroundColor: `${PILL_COLOR}0d`, borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: C.cardBorder }}>
                    <Text style={{ color: C.text, fontWeight: '600', fontSize: 12, marginBottom: 4 }}>Before uploading</Text>
                    <Text style={{ color: C.textSub, fontSize: 12, lineHeight: 18 }}>
                        Ensure the document includes the patient's full name, date of birth, gender, and the lab's official stamp.
                    </Text>
                </View>

                {!!error && <Text style={{ color: '#e53e3e', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</Text>}

                <TouchableOpacity onPress={handleUpload} disabled={loading} activeOpacity={0.85} style={{ backgroundColor: PILL_COLOR, borderRadius: 12, padding: 14, alignItems: 'center', opacity: loading ? 0.7 : 1 }}>
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '700' }}>{loading ? 'Uploading…' : 'Upload Record'}</Text>
                </TouchableOpacity>
            </Pressable>

            {/* Dependent picker inside upload sheet */}
            <Modal visible={depPickerOpen} transparent animationType="fade" onRequestClose={() => setDepPickerOpen(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setDepPickerOpen(false)}>
                    <View style={{ backgroundColor: C.modalBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, borderColor: C.modalBorder, paddingTop: 16, paddingBottom: 40 }}>
                        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.cardBorder, alignSelf: 'center', marginBottom: 16 }} />
                        <Text style={{ color: C.accent, fontWeight: '700', fontSize: 15, marginHorizontal: 20, marginBottom: 12 }}>Select Dependent</Text>
                        {dependents.map(d => (
                            <TouchableOpacity
                                key={d.dependent_id}
                                onPress={() => { setDep(d); setDepPickerOpen(false) }}
                                activeOpacity={0.7}
                                style={{ paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <Text style={{ color: C.text, fontSize: 14, fontWeight: '500' }}>{d.full_name}</Text>
                                {dep?.dependent_id === d.dependent_id && (
                                    <Text style={{ color: PILL_COLOR, fontWeight: '700', fontSize: 14 }}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </>
    )
}

// ─── Info icon ─────────────────────────────────────────────────────────────────

function InfoIcon({ type, C }) {
    const [vis, setVis] = useState(false)
    const desc = SUMMARY_DESCRIPTIONS[type]
    if (!desc) return null
    return (
        <>
            <TouchableOpacity onPress={() => setVis(true)} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: C.accent, fontSize: 8, fontWeight: '700', lineHeight: 10 }}>i</Text>
            </TouchableOpacity>
            <Modal visible={vis} transparent animationType="fade" onRequestClose={() => setVis(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 32 }} onPress={() => setVis(false)}>
                    <View style={{ backgroundColor: C.modalBg, borderRadius: 14, padding: 20, borderWidth: 1, borderColor: C.modalBorder }}>
                        <Text style={{ color: C.modalText, fontSize: 13, lineHeight: 20 }}>{desc}</Text>
                    </View>
                </Pressable>
            </Modal>
        </>
    )
}

// ─── Small button ──────────────────────────────────────────────────────────────

function SmallBtn({ children, onPress, disabled, accent }) {
    return (
        <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7} style={{ borderWidth: 1.5, borderColor: `${accent}40`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, opacity: disabled ? 0.5 : 1, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
            {typeof children === 'string'
                ? <Text style={{ color: accent, fontSize: 12, fontWeight: '600' }}>{children}</Text>
                : children}
        </TouchableOpacity>
    )
}
