import { useState, useEffect, useRef } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView,
    SafeAreaView, Linking, Animated, RefreshControl,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import Svg, { Path, Rect, Circle, Polyline } from 'react-native-svg'
import Header from '../../components/Header'
import LoadingOverlay from '../../components/LoadingOverlay'
import api from '../../api/axios'
import { useTheme } from '../../context/ThemeContext'
import { getCache, setCache, clearCache } from '../../utils/pageCache'

function makeC(theme) {
    return {
        bg:               theme.pageBg,
        cardBg:           theme.cardBg,
        cardBorder:       theme.cardBorder,
        cardBorderActive: theme.cardBorderActive,
        text:             theme.textPrimary,
        textSub:          theme.textSecondary,
        textMuted:        theme.textMuted,
        accent:           theme.accent,
        inputBg:          theme.inputBg,
        inputBorder:      theme.inputBorder,
    }
}

const SUMMARY_TYPES = [
    { value: 'SOAP',     label: 'SOAP Note' },
    { value: 'referral', label: 'Referral Letter' },
    { value: 'report',   label: 'Medical Report' },
]

export default function PatientView({ route }) {
    const navigation = useNavigation()
    const { theme } = useTheme()
    const C = makeC(theme)
    const { patientId, patientName, patientType, guardianName } = route.params

    const CACHE_KEY = `doctor_patient_${patientId}`
    const _c = getCache(CACHE_KEY)
    const [records, setRecords]                     = useState(_c?.records ?? [])
    const [summaries, setSummaries]                 = useState(_c?.summaries ?? {})
    const [patientPhone, setPatientPhone]           = useState(_c?.patientPhone ?? null)
    const [loading, setLoading]                     = useState(!_c)
    const [activeTab, setActiveTab]                 = useState('records')
    const [activeSummaryType, setActiveSummaryType] = useState(_c ? (SUMMARY_TYPES.find(t => _c.summaries[t.value])?.value ?? null) : null)
    const [showCopied, setShowCopied]               = useState(false)
    const [refreshing, setRefreshing]               = useState(false)
    const [fetchKey, setFetchKey]                   = useState(0)
    const fadeAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const cached = getCache(CACHE_KEY)
        if (cached && fetchKey === 0) {
            setRecords(cached.records)
            setSummaries(cached.summaries)
            setPatientPhone(cached.patientPhone)
            const first = SUMMARY_TYPES.find(t => cached.summaries[t.value])
            if (first) setActiveSummaryType(first.value)
            setLoading(false)
            return
        }
        setLoading(true)
        const fetchData = async () => {
            try {
                const [recordsRes, phoneRes] = await Promise.allSettled([
                    api.get(`/medical?patient_id=${patientId}`),
                    api.get(`/doctors/patient-phone?patient_id=${patientId}`),
                ])
                const newRecords = recordsRes.status === 'fulfilled' ? recordsRes.value.data : []
                const newPhone = phoneRes.status === 'fulfilled' ? (phoneRes.value.data.phone_number || null) : null
                if (recordsRes.status === 'fulfilled') setRecords(newRecords)
                if (phoneRes.status === 'fulfilled') setPatientPhone(newPhone)

                const results = {}
                await Promise.all(
                    SUMMARY_TYPES.map(async (type) => {
                        try {
                            const res = await api.get(`/summary?patient_id=${patientId}&summary_type=${type.value}`)
                            results[type.value] = res.data
                        } catch {
                            results[type.value] = null
                        }
                    })
                )
                setSummaries(results)
                setCache(CACHE_KEY, { records: newRecords, summaries: results, patientPhone: newPhone })

                const firstAvailable = SUMMARY_TYPES.find(t => results[t.value])
                if (firstAvailable) setActiveSummaryType(firstAvailable.value)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
                setRefreshing(false)
            }
        }
        fetchData()
    }, [patientId, fetchKey]) // eslint-disable-line react-hooks/exhaustive-deps

    const refresh = () => {
        clearCache(CACHE_KEY)
        setRefreshing(true)
        setFetchKey(k => k + 1)
    }

    const handlePhonePress = () => {
        if (showCopied) return
        setShowCopied(true)
        fadeAnim.setValue(0)
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.delay(2100),
            Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(() => setShowCopied(false))
    }

    const availableSummaryTypes = SUMMARY_TYPES.filter(t => summaries[t.value])
    const count = availableSummaryTypes.length
    const activeSummary = activeSummaryType ? summaries[activeSummaryType] : null
    const activeTypeLabel = SUMMARY_TYPES.find(t => t.value === activeSummaryType)?.label

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <Header role="doctor" />
            <LoadingOverlay visible={loading} role="doctor" />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} colors={[C.accent]} />}
            >
                {/* Confidential notice */}
                <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, padding: 10, marginBottom: 16, alignItems: 'center' }}>
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>🔒 Confidential — Viewing as authorized doctor</Text>
                </View>

                {/* Patient identity */}
                <View style={{ alignItems: 'center', marginBottom: 20, gap: 2 }}>
                    {patientName ? (
                        <Text style={{ fontFamily: 'Calistoga', fontSize: 22, color: C.text, textAlign: 'center', letterSpacing: -0.2 }}>
                            {patientName}
                        </Text>
                    ) : null}
                    {patientType ? (
                        <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', marginTop: 2 }}>
                            {patientType === 'dependent' ? 'Dependent' : 'Independent'}
                        </Text>
                    ) : null}
                    {patientType === 'dependent' && guardianName ? (
                        <Text style={{ fontSize: 12, color: C.textMuted, textAlign: 'center' }}>
                            Guardian: {guardianName}
                        </Text>
                    ) : null}
                </View>

                {/* Patient phone — tap to copy */}
                {patientPhone && (
                    <View style={{ position: 'relative', marginBottom: 20 }}>
                        <TouchableOpacity
                            onPress={handlePhonePress}
                            activeOpacity={0.7}
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 }}
                        >
                            <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.35 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                                    stroke={C.textSub} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                            <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '600' }}>{patientPhone}</Text>
                        </TouchableOpacity>

                        {showCopied && (
                            <Animated.View
                                pointerEvents="none"
                                style={{
                                    position: 'absolute', inset: 0,
                                    backgroundColor: C.bg,
                                    borderWidth: 1, borderColor: C.cardBorder,
                                    borderRadius: 8,
                                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
                                    opacity: fadeAnim,
                                }}
                            >
                                <Svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                    <Rect x="9" y="9" width="13" height="13" rx="2" ry="2"
                                        stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                                        stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                                <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>Copied</Text>
                            </Animated.View>
                        )}
                    </View>
                )}

                {/* Top-level tabs */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                    {[{ key: 'records', label: '📋 Records' }, { key: 'summary', label: '📄 Summaries' }].map(tab => (
                        <TabBtn
                            key={tab.key}
                            active={activeTab === tab.key}
                            onPress={() => setActiveTab(tab.key)}
                            label={tab.label}
                        />
                    ))}
                </View>

                {/* Records */}
                {!loading && activeTab === 'records' && (
                    records.length === 0 ? (
                        <EmptyState icon="📂" text="No records available" />
                    ) : (
                        <View style={{ gap: 10 }}>
                            {records.map(record => (
                                <RecordCard key={record.record_id} record={record} />
                            ))}
                        </View>
                    )
                )}

                {/* Summaries */}
                {!loading && activeTab === 'summary' && (
                    count === 0 ? (
                        <EmptyState icon="📋" text="No summaries available" sub="No health summaries have been generated for this patient yet." />
                    ) : (
                        <>
                            {/* Summary type sub-tabs */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                                {availableSummaryTypes.map(type => (
                                    <TabBtn
                                        key={type.value}
                                        active={activeSummaryType === type.value}
                                        onPress={() => setActiveSummaryType(type.value)}
                                        label={type.label}
                                        small
                                        flex={count > 1}
                                    />
                                ))}
                            </View>

                            <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 16, padding: 24 }}>
                                {activeSummary && (
                                    <>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                            <View style={{ backgroundColor: '#5a1e96', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                                                <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                    {activeTypeLabel}
                                                </Text>
                                            </View>
                                            <Text style={{ color: C.textMuted, fontSize: 11 }}>
                                                {new Date(activeSummary.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </Text>
                                        </View>
                                        <View style={{ backgroundColor: C.inputBg, borderRadius: 10, padding: 20, borderWidth: 1, borderColor: C.inputBorder }}>
                                            <Text style={{ color: C.text, fontSize: 14, lineHeight: 25 }}>
                                                {activeSummary.summary_text}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </>
                    )
                )}

                {/* Back link */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 32, alignItems: 'center' }} activeOpacity={0.6}>
                    <Text style={{ color: C.textMuted, fontSize: 13 }}>← Back to patients</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBtn({ active, onPress, label, small, flex }) {
    const { theme } = useTheme()
    const C = makeC(theme)
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={{
                flex: flex || (!small) ? 1 : undefined,
                backgroundColor: active ? '#5a1e96' : C.cardBg,
                borderWidth: 1, borderColor: active ? 'transparent' : C.cardBorder,
                borderRadius: 10, padding: small ? 10 : 11,
                alignItems: 'center',
            }}
        >
            <Text style={{ color: active ? 'white' : C.text, fontWeight: '600', fontSize: small ? 12 : 14 }}>
                {label}
            </Text>
        </TouchableOpacity>
    )
}

function EmptyState({ icon, text, sub }) {
    const { theme } = useTheme()
    const C = makeC(theme)
    return (
        <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 16, padding: 48, alignItems: 'center' }}>
            <Text style={{ fontSize: 38, marginBottom: 12 }}>{icon}</Text>
            <Text style={{ color: C.text, fontWeight: '600', marginBottom: sub ? 6 : 0, textAlign: 'center' }}>{text}</Text>
            {sub && <Text style={{ color: C.textMuted, fontSize: 13, textAlign: 'center' }}>{sub}</Text>}
        </View>
    )
}

function RecordCard({ record }) {
    const { theme } = useTheme()
    const C = makeC(theme)

    const fileName = record.file_url.split('/').pop().substring(37)
    const date = new Date(record.upload_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

    const iconStroke = '#8b5cf6'
    let icon
    if (record.file_type === 'application/pdf') {
        icon = (
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={iconStroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Polyline points="14 2 14 8 20 8" stroke={iconStroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
        )
    } else if (record.file_type?.startsWith('image/')) {
        icon = (
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke={iconStroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="8.5" cy="8.5" r="1.5" stroke={iconStroke} strokeWidth="1.8" />
                <Polyline points="21 15 16 10 5 21" stroke={iconStroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
        )
    } else {
        icon = (
            <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <Path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                    stroke={iconStroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        )
    }

    return (
        <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder,
            borderRadius: 14, padding: 16,
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                <View style={{ flexShrink: 0 }}>{icon}</View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: C.text, fontWeight: '600', fontSize: 14, marginBottom: 3 }} numberOfLines={1}>{fileName}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 12 }}>{date}</Text>
                </View>
            </View>
            <TouchableOpacity
                onPress={() => Linking.openURL(record.signed_url)}
                activeOpacity={0.8}
                style={{ backgroundColor: '#5a1e96', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, flexShrink: 0, marginLeft: 12 }}
            >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>View</Text>
            </TouchableOpacity>
        </View>
    )
}
