import { useState, useEffect } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, Linking, RefreshControl,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import Svg, { Path, Polyline, Line, Circle } from 'react-native-svg'
import DependentHeader from '../../components/DependentHeader'
import LoadingOverlay from '../../components/LoadingOverlay'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { getCache, setCache, clearCache } from '../../utils/pageCache'
import api from '../../api/axios'

function makeDC(theme) {
    if (!theme) return {
        pageBg: '#081c2f', cardBg: 'rgba(255,255,255,0.06)', cardBorder: 'rgba(134,239,172,0.18)',
        cardBorderActive: '#1b684e', text: '#f0faf4', textSub: '#86efac', textMuted: '#9ca3af',
        accent: '#1b684e', accentLight: '#eafff2', accentBorder: '#1b684e',
        iconBg: '#eafff2', iconBorder: '#1b684e', modalBg: '#0c2318',
        modalBorder: 'rgba(134,239,172,0.2)', errorRed: '#e53e3e', warnOrange: '#d97706', successGreen: '#16a34a',
    }
    return {
        pageBg: theme.pageBg,
        cardBg: theme.cardBg,
        cardBorder: theme.cardBorder,
        cardBorderActive: theme.cardBorderActive,
        text: theme.textPrimary,
        textSub: theme.textSecondary,
        textMuted: theme.textMuted,
        accent: theme.accent,
        accentLight: theme.modalBg,
        accentBorder: theme.accent,
        iconBg: theme.inputBg,
        iconBorder: theme.cardBorder,
        modalBg: theme.modalBg,
        modalBorder: theme.modalBorder,
        errorRed: '#e53e3e',
        warnOrange: '#d97706',
        successGreen: '#16a34a',
    }
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
}

export default function DependentHome() {
    const navigation = useNavigation()
    const route = useRoute()
    const { user } = useAuth()
    const { theme, themeReady } = useTheme()
    const DC = makeDC(theme)
    const { dependentId: paramDepId } = route.params || {}

    // Resolve from params → JWT user object (decoded token has dependentId)
    const resolvedDepId = paramDepId || user?.dependentId
    const CACHE_KEY = `dependent_home_${resolvedDepId}`
    const _c = getCache(CACHE_KEY)

    const [depId, setDepId] = useState(resolvedDepId)
    const [dependent, setDependent] = useState(_c?.dependent ?? null)
    const [guardianPhone, setGuardianPhone] = useState(_c?.guardianPhone ?? '')
    const [summaryStatus, setSummaryStatus] = useState(_c?.summaryStatus ?? 'idle')
    const [requestError, setRequestError] = useState('')
    const [loading, setLoading] = useState(!_c)
    const [refreshing, setRefreshing] = useState(false)
    const [fetchKey, setFetchKey] = useState(0)

    const refresh = () => { clearCache(CACHE_KEY); setRefreshing(true); setFetchKey(k => k + 1) }

    useEffect(() => {
        const cached = getCache(CACHE_KEY)
        if (cached && fetchKey === 0) {
            setDependent(cached.dependent)
            setGuardianPhone(cached.guardianPhone)
            setSummaryStatus(cached.summaryStatus)
            setLoading(false)
            return
        }
        const fetchInfo = async () => {
            const profileRes = await api.get('/users/profile').catch(() => null)
            if (profileRes) setGuardianPhone(profileRes.data.phone_number || '')

            const resolvedId = paramDepId || user?.dependentId
            if (resolvedId) setDepId(resolvedId)

            const [depsRes, statusRes] = await Promise.allSettled([
                api.get('/dependents'),
                resolvedId
                    ? api.get(`/dependents/${resolvedId}/summary-access`)
                    : Promise.reject('no depId'),
            ])
            let dep = null
            if (depsRes.status === 'fulfilled') {
                dep = depsRes.value.data.find(d => String(d.dependent_id) === String(resolvedId)) ?? null
                if (dep) setDependent(dep)
            }
            const newStatus = statusRes.status === 'fulfilled' ? statusRes.value.data.status : 'idle'
            setSummaryStatus(newStatus)
            setCache(CACHE_KEY, {
                dependent: dep,
                guardianPhone: profileRes?.data?.phone_number || '',
                summaryStatus: newStatus,
            })
            setLoading(false)
            setRefreshing(false)
        }
        fetchInfo()
    }, [paramDepId, fetchKey])

    useEffect(() => {
        if (summaryStatus !== 'pending') return
        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/dependents/${depId}/summary-access`)
                const { status } = res.data
                if (status !== 'pending') { setSummaryStatus(status); clearInterval(interval) }
            } catch { clearInterval(interval) }
        }, 5000)
        return () => clearInterval(interval)
    }, [summaryStatus, depId])

    const handleRequestSummary = async () => {
        setRequestError('')
        try {
            await api.post('/dependents/request-summary', { dependent_id: depId })
            setSummaryStatus('pending')
        } catch { setRequestError('Failed to send request') }
    }

    const firstName = dependent?.full_name?.split(' ')[0] || ''

    return (
        <View style={{ flex: 1, backgroundColor: DC.pageBg }}>
            <LoadingOverlay visible={loading} role="dependent" />
            <DependentHeader dependentId={depId} />

            <ScrollView
                contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={DC.accent} colors={[DC.accent]} />}
            >
                {/* Greeting */}
                <View style={{ marginBottom: 28 }}>
                    <Text style={{ fontSize: 28, fontWeight: '600', color: DC.text, letterSpacing: -0.2, lineHeight: 36 }}>
                        {getGreeting()}{firstName ? `, ${firstName}` : ''}
                    </Text>
                </View>

                <View style={{ gap: 12 }}>

                    {/* View My Health Summary */}
                    <ActionCard
                        onPress={summaryStatus === 'approved'
                            ? () => navigation.navigate('DependentSummary', { dependentId: depId, approved: true })
                            : undefined}
                        clickable={summaryStatus === 'approved'}
                        DC={DC}
                    >
                        <View style={styles.cardRow}>
                            <View style={[styles.iconBox, { backgroundColor: DC.iconBg, borderColor: DC.iconBorder }]}>
                                <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={DC.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <Polyline points="14 2 14 8 20 8" />
                                    <Line x1="16" y1="13" x2="8" y2="13" />
                                    <Line x1="16" y1="17" x2="8" y2="17" />
                                </Svg>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: DC.text, fontWeight: '600', fontSize: 14, marginBottom: 3 }}>
                                    View Health Records & Summaries
                                </Text>
                                {summaryStatus === 'approved' ? (
                                    <Text style={{ color: DC.successGreen, fontSize: 12, fontWeight: '600' }}>✓ Access granted — tap to view</Text>
                                ) : summaryStatus === 'pending' ? (
                                    <Text style={{ color: DC.warnOrange, fontSize: 12, fontWeight: '600' }}>⏳ Waiting for guardian approval</Text>
                                ) : summaryStatus === 'denied' ? (
                                    <Text style={{ color: DC.errorRed, fontSize: 12, fontWeight: '600' }}>✕ Request denied by guardian</Text>
                                ) : (
                                    <Text style={{ color: DC.textMuted, fontSize: 12 }}>Request permission from your guardian</Text>
                                )}
                            </View>
                            {summaryStatus === 'approved' && (
                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DC.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Polyline points="9 18 15 12 9 6" />
                                </Svg>
                            )}
                        </View>

                        {summaryStatus === 'idle' && (
                            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: DC.cardBorder }}>
                                <GreenBtn onPress={() => handleRequestSummary()} DC={DC}>Request Access</GreenBtn>
                                {!!requestError && <Text style={{ color: DC.errorRed, fontSize: 12, marginTop: 6 }}>{requestError}</Text>}
                            </View>
                        )}
                        {summaryStatus === 'denied' && (
                            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: DC.cardBorder }}>
                                <TouchableOpacity onPress={() => setSummaryStatus('idle')} activeOpacity={0.7}>
                                    <Text style={{ color: DC.accent, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }}>
                                        Send a new request
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </ActionCard>

                    {/* Ask Medi AI */}
                    <ActionCard onPress={() => navigation.navigate('DependentAI', { dependentId: depId })} clickable DC={DC}>
                        <View style={styles.cardRow}>
                            <View style={[styles.iconBox, { backgroundColor: DC.iconBg, borderColor: DC.iconBorder }]}>
                                <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={DC.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </Svg>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: DC.text, fontWeight: '600', fontSize: 14, marginBottom: 3 }}>Ask Medi AI</Text>
                                <Text style={{ color: DC.textMuted, fontSize: 12 }}>Ask questions about your health</Text>
                            </View>
                            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DC.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <Polyline points="9 18 15 12 9 6" />
                            </Svg>
                        </View>
                    </ActionCard>

                    {/* Call Guardian */}
                    {!!guardianPhone && (
                        <ActionCard onPress={() => Linking.openURL(`tel:${guardianPhone}`)} clickable DC={DC}>
                            <View style={styles.cardRow}>
                                <View style={[styles.iconBox, { backgroundColor: DC.iconBg, borderColor: DC.iconBorder }]}>
                                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={DC.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </Svg>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: DC.text, fontWeight: '600', fontSize: 14, marginBottom: 3 }}>Call Guardian</Text>
                                    <Text style={{ color: DC.textMuted, fontSize: 12 }}>Contact your guardian</Text>
                                </View>
                                <Svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={DC.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <Polyline points="9 18 15 12 9 6" />
                                </Svg>
                            </View>
                        </ActionCard>
                    )}
                </View>
            </ScrollView>

        </View>
    )
}

function ActionCard({ children, onPress, clickable, DC }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={clickable ? 0.75 : 1}
            style={{
                backgroundColor: DC.cardBg,
                borderWidth: 1, borderColor: DC.cardBorder,
                borderRadius: 16, padding: 16,
            }}
        >
            {children}
        </TouchableOpacity>
    )
}

function GreenBtn({ children, onPress, DC }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={{
                backgroundColor: DC.accentLight,
                borderWidth: 1.5, borderColor: DC.accentBorder,
                borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20,
                alignSelf: 'flex-start',
            }}
        >
            <Text style={{ color: DC.accent, fontWeight: '700', fontSize: 13 }}>{children}</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBox: {
        width: 44, height: 44, borderRadius: 12, borderWidth: 1.5,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
})
