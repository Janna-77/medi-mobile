import { useState, useEffect } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView, Linking, RefreshControl,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import Svg, { Path, Polyline, Rect, Circle } from 'react-native-svg'
import DependentHeader from '../../components/DependentHeader'
import LoadingOverlay from '../../components/LoadingOverlay'
import { useTheme } from '../../context/ThemeContext'
import { getCache, setCache, clearCache } from '../../utils/pageCache'
import api from '../../api/axios'

// Module-level session store — replaces sessionStorage (persists for app session)
const SESSION_APPROVAL = {}  // { [dependentId]: { status: 'approved', at: timestamp } }

function makeDC(theme) {
    if (!theme) return {
        pageBg: '#081c2f', cardBg: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(134,239,172,0.18)',
        cardBorderActive: '#1b684e', text: '#f0faf4', textMuted: '#9ca3af',
        accentLabel: '#86efac', accent: '#1b684e', accentLight: '#eafff2',
        tabActiveBg: '#eafff2', tabActiveColor: '#1b684e', summaryBg: 'rgba(255,255,255,0.08)',
        badgeBg: '#247c5f', inputBg: 'rgba(255,255,255,0.08)', inputBorder: 'rgba(134,239,172,0.18)',
        errorRed: '#e53e3e',
    }
    return {
        pageBg: theme.pageBg,
        cardBg: theme.cardBg,
        cardBorder: theme.cardBorder,
        cardBorderActive: theme.cardBorderActive,
        text: theme.textPrimary,
        textMuted: theme.textMuted,
        accentLabel: theme.accentLabel,
        accent: theme.accent,
        accentLight: theme.inputBg,
        tabActiveBg: theme.inputBg,
        tabActiveColor: theme.accent,
        summaryBg: theme.inputBg,
        badgeBg: theme.accent,
        inputBg: theme.inputBg,
        inputBorder: theme.inputBorder ?? theme.cardBorder,
        errorRed: '#e53e3e',
    }
}

const SUMMARY_TYPES = [
    { value: 'SOAP', label: 'SOAP Note' },
    { value: 'referral', label: 'Referral Letter' },
    { value: 'report', label: 'Medical Report' },
]

export default function DependentSummary() {
    const navigation = useNavigation()
    const route = useRoute()
    const { dependentId, approved: routeApproved } = route.params || {}
    const { theme } = useTheme()
    const DC = makeDC(theme)

    const approved = (() => {
        if (routeApproved === true) return true
        const s = SESSION_APPROVAL[dependentId]
        if (!s || s.status !== 'approved') return false
        return Date.now() - s.at < 58 * 60 * 1000
    })()

    const CACHE_KEY = `dependent_summary_${dependentId}`
    const _c = getCache(CACHE_KEY)

    const [summaries, setSummaries] = useState(_c?.summaries ?? {})
    const [records, setRecords] = useState(_c?.records ?? [])
    const [loading, setLoading] = useState(!_c && approved)
    const [refreshing, setRefreshing] = useState(false)
    const [fetchKey, setFetchKey] = useState(0)
    const [accessDenied, setAccessDenied] = useState(false)
    const [topTab, setTopTab] = useState('records')
    const [activeSummaryTab, setActiveSummaryTab] = useState(_c ? (SUMMARY_TYPES.find(t => _c.summaries[t.value])?.value ?? null) : null)

    const refresh = () => { clearCache(CACHE_KEY); setRefreshing(true); setFetchKey(k => k + 1) }

    useEffect(() => {
        if (!approved) { setAccessDenied(true); setLoading(false); return }
        const cached = getCache(CACHE_KEY)
        if (cached && fetchKey === 0) {
            setRecords(cached.records)
            setSummaries(cached.summaries)
            const first = SUMMARY_TYPES.find(t => cached.summaries[t.value])
            if (first) setActiveSummaryTab(first.value)
            setLoading(false)
            return
        }
        const fetchAll = async () => {
            try {
                const [recordsRes] = await Promise.allSettled([
                    api.get(`/medical?dependent_id=${dependentId}`),
                ])
                const newRecords = recordsRes.status === 'fulfilled' ? recordsRes.value.data : []
                const safeRecords = Array.isArray(newRecords) ? newRecords : []
                setRecords(safeRecords)

                const results = {}
                await Promise.all(
                    SUMMARY_TYPES.map(async (type) => {
                        try {
                            const res = await api.get(`/summary?dependent_id=${dependentId}&summary_type=${type.value}`)
                            results[type.value] = res.data
                        } catch {
                            results[type.value] = null
                        }
                    })
                )
                setSummaries(results)
                const first = SUMMARY_TYPES.find(t => results[t.value])
                if (first) setActiveSummaryTab(first.value)
                setCache(CACHE_KEY, { records: safeRecords, summaries: results })
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
                setRefreshing(false)
            }
        }
        fetchAll()
    }, [dependentId, approved, fetchKey])

    const availableTypes = SUMMARY_TYPES.filter(t => summaries[t.value])
    const summaryCount = availableTypes.length
    const activeSummary = activeSummaryTab ? summaries[activeSummaryTab] : null
    const activeType = SUMMARY_TYPES.find(t => t.value === activeSummaryTab)

    if (accessDenied) {
        return (
            <View style={{ flex: 1, backgroundColor: DC.pageBg }}>
                <DependentHeader dependentId={dependentId} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                    <View style={{ backgroundColor: DC.cardBg, borderWidth: 1, borderColor: DC.cardBorder, borderRadius: 16, alignItems: 'center', padding: 48 }}>
                        <Text style={{ fontSize: 44, marginBottom: 16 }}>🔒</Text>
                        <Text style={{ color: DC.text, fontWeight: '700', fontSize: 18, marginBottom: 8, textAlign: 'center' }}>
                            Access Required
                        </Text>
                        <Text style={{ color: DC.textMuted, fontSize: 13, lineHeight: 21, textAlign: 'center', marginBottom: 24 }}>
                            You need your guardian's permission to view this. Go back and request access first.
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('DependentHome', { dependentId })}
                            activeOpacity={0.85}
                            style={{ backgroundColor: DC.accentLight, borderWidth: 1.5, borderColor: DC.accent, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 }}
                        >
                            <Text style={{ color: DC.accent, fontWeight: '700', fontSize: 14 }}>← Back to home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        )
    }

    return (
        <View style={{ flex: 1, backgroundColor: DC.pageBg }}>
            <LoadingOverlay visible={loading} role="dependent" />
            <DependentHeader dependentId={dependentId} />

            <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={DC.accent} colors={[DC.accent]} />}
            >
                <Text style={{ fontSize: 11, fontWeight: '700', color: DC.accentLabel, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>
                    My Health
                </Text>

                {!loading && (
                    <>
                        {/* Top-level tabs */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                            {[{ key: 'records', label: '📋 Records' }, { key: 'summaries', label: '📄 Summaries' }].map(tab => (
                                <TouchableOpacity
                                    key={tab.key}
                                    onPress={() => setTopTab(tab.key)}
                                    activeOpacity={0.8}
                                    style={{
                                        flex: 1,
                                        backgroundColor: topTab === tab.key ? DC.accent : DC.cardBg,
                                        borderWidth: 1, borderColor: topTab === tab.key ? DC.accent : DC.cardBorder,
                                        borderRadius: 10, paddingVertical: 11,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: topTab === tab.key ? 'white' : DC.text, fontWeight: '600', fontSize: 14 }}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Records tab */}
                        {topTab === 'records' && (
                            records.length === 0 ? (
                                <View style={{ backgroundColor: DC.cardBg, borderWidth: 1, borderColor: DC.cardBorder, borderRadius: 16, padding: 48, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 38, marginBottom: 12 }}>📂</Text>
                                    <Text style={{ color: DC.text, fontWeight: '600' }}>No records yet</Text>
                                </View>
                            ) : (
                                <View style={{ gap: 10 }}>
                                    {records.map(record => (
                                        <RecordCard key={record.record_id} record={record} DC={DC} />
                                    ))}
                                </View>
                            )
                        )}

                        {/* Summaries tab */}
                        {topTab === 'summaries' && (
                            summaryCount === 0 ? (
                                <View style={{ backgroundColor: DC.cardBg, borderWidth: 1, borderColor: DC.cardBorder, borderRadius: 16, padding: 48, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 38, marginBottom: 12 }}>📋</Text>
                                    <Text style={{ color: DC.text, fontWeight: '600', marginBottom: 6 }}>No summaries yet</Text>
                                    <Text style={{ color: DC.textMuted, fontSize: 13, textAlign: 'center' }}>
                                        Your guardian hasn't generated any health summaries for you yet.
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    {/* Summary type sub-tabs */}
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                                        {availableTypes.map(type => (
                                            <TouchableOpacity
                                                key={type.value}
                                                onPress={() => setActiveSummaryTab(type.value)}
                                                activeOpacity={0.8}
                                                style={{
                                                    flex: summaryCount > 1 ? 1 : undefined,
                                                    backgroundColor: activeSummaryTab === type.value ? DC.accent : DC.cardBg,
                                                    borderWidth: 1, borderColor: activeSummaryTab === type.value ? DC.accent : DC.cardBorder,
                                                    borderRadius: 10, padding: 10, alignItems: 'center',
                                                }}
                                            >
                                                <Text style={{ color: activeSummaryTab === type.value ? 'white' : DC.text, fontWeight: '600', fontSize: 12 }}>
                                                    {type.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <View style={{ backgroundColor: DC.cardBg, borderWidth: 1, borderColor: DC.cardBorder, borderRadius: 16, padding: 24 }}>
                                        {activeSummary && (
                                            <>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                    <View style={{ backgroundColor: DC.badgeBg, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 }}>
                                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                            {activeType?.label}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ color: DC.textMuted, fontSize: 11 }}>
                                                        {new Date(activeSummary.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </Text>
                                                </View>
                                                <View style={{ backgroundColor: DC.inputBg, borderRadius: 10, padding: 20, borderWidth: 1, borderColor: DC.inputBorder }}>
                                                    <Text style={{ color: DC.text, fontSize: 14, lineHeight: 25 }}>
                                                        {activeSummary.summary_text}
                                                    </Text>
                                                </View>
                                            </>
                                        )}
                                    </View>
                                </>
                            )
                        )}

                        <TouchableOpacity
                            onPress={() => navigation.navigate('DependentHome', { dependentId })}
                            activeOpacity={0.7}
                            style={{ alignItems: 'center', marginTop: 28 }}
                        >
                            <Text style={{ color: DC.textMuted, fontSize: 13 }}>← Back to home</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    )
}

function RecordCard({ record, DC }) {
    const fileName = record.file_url?.split('/').pop().substring(37) || 'File'
    const date = new Date(record.upload_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const iconStroke = DC.accent

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
            backgroundColor: DC.cardBg, borderWidth: 1, borderColor: DC.cardBorder,
            borderRadius: 14, padding: 16,
        }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                <View style={{ flexShrink: 0 }}>{icon}</View>
                <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: DC.text, fontWeight: '600', fontSize: 14, marginBottom: 3 }} numberOfLines={1}>{fileName}</Text>
                    <Text style={{ color: DC.textMuted, fontSize: 12 }}>{date}</Text>
                </View>
            </View>
            <TouchableOpacity
                onPress={() => Linking.openURL(record.signed_url)}
                activeOpacity={0.8}
                style={{ backgroundColor: DC.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, flexShrink: 0, marginLeft: 12 }}
            >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', marginTop: 3 }}>View</Text>
            </TouchableOpacity>
        </View>
    )
}

