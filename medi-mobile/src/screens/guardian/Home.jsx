import {
    View, Text, TouchableOpacity, ScrollView,
    SafeAreaView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import useGuardianDashboard from '../../hooks/useGuardianDashboard'
import Header from '../../components/Header'
import LoadingOverlay from '../../components/LoadingOverlay'
import BottomNav from '../../components/BottomNav'
import { useTheme } from '../../context/ThemeContext'

const SUMMARY_LABELS = {
    SOAP: 'SOAP Note',
    referral: 'Referral Letter',
    report: 'Medical Report',
}

function makeC(theme) {
    return {
        bg:              theme.pageBg,
        cardBg:          theme.cardBg,
        cardBorder:      theme.cardBorder,
        cardBorderActive:theme.cardBorderActive,
        text:            theme.textPrimary,
        textSub:         theme.textSecondary,
        textMuted:       theme.textMuted,
        accent:          theme.accent,
        accentLabel:     theme.accentLabel,
    }
}

function getStyles(C) {
    return {
        safe:         { flex: 1, backgroundColor: C.bg },
        scroll:       { flex: 1 },
        content:      { padding: 20, paddingBottom: 12 },

        greetingBlock:{ marginBottom: 28 },
        dateLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
        greeting:     { fontSize: 26, fontFamily: 'Calistoga', letterSpacing: -0.2, lineHeight: 34 },

        statRow:      { gap: 12, paddingRight: 4 },
        statCard:     { minWidth: 120, borderWidth: 1, borderRadius: 16, padding: 16, backgroundColor: C.cardBg, borderColor: C.cardBorder },
        statValue:    { fontSize: 24, fontWeight: '700', marginBottom: 4, lineHeight: 28, color: C.accent },
        statLabel:    { fontSize: 12, fontWeight: '500', marginBottom: 2, color: C.text, fontFamily: 'Georgia' },
        statSub:      { fontSize: 11, color: C.textSub },

        sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, color: C.textSub },
        emptyText:    { fontSize: 14, textAlign: 'center', marginTop: 40, color: C.textMuted },

        actCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 13, backgroundColor: C.cardBg, borderColor: C.cardBorder },
        actIconWrap:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: `${C.accent}1a` },
        actTitle:     { fontWeight: '600', fontSize: 13, marginBottom: 2, color: C.text },
        actSub:       { fontSize: 11, color: C.textSub },
    }
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
}

function fmt(d) {
    return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}
function fmtShort(d) {
    return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'
}

export default function GuardianHome() {
    const navigation = useNavigation()
    const { theme } = useTheme()
    const C = makeC(theme)
    const styles = getStyles(C)

    const {
        loading, profile,
        dependentsCount, totalRecords, lastUpload, lastUploadRecord, latestSummary,
        recentActivity, ctaType,
    } = useGuardianDashboard()

    const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    const firstName = profile?.full_name?.split(' ')[0] || ''

    const cta = {
        addDependent: { label: 'Add a dependent →',       sub: 'Start by adding someone to manage',             screen: 'AddDependent' },
        upload:       { label: 'Upload first record →',   sub: 'Add a medical document for your dependent',      screen: 'GuardianRecords' },
        ai:           { label: 'Ask Medi AI →',           sub: 'Your records are ready — ask anything',          screen: 'GuardianAI' },
    }[ctaType] ?? { label: 'Ask Medi AI →', sub: '', screen: 'GuardianAI' }

    return (
        <SafeAreaView style={styles.safe}>
            <Header role="guardian" />
            <View style={{ flex: 1 }}>
            <LoadingOverlay visible={loading} role="guardian" />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Greeting */}
                <View style={styles.greetingBlock}>
                    <Text style={[styles.dateLabel, { color: C.accentLabel }]}>{todayStr}</Text>
                    <Text style={[styles.greeting, { color: C.text }]}>
                        {getGreeting()}{firstName ? `, ${firstName}` : ''}
                    </Text>
                </View>

                {/* Stat cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statRow}
                    style={{ marginBottom: 24 }}
                >
                    <StatCard label="Dependents"  value={loading ? '…' : String(dependentsCount)} sub="managed"   onPress={() => navigation.navigate('GuardianProfile')} />
                    <StatCard
                        label="Last Upload"
                        value={loading ? '…' : fmtShort(lastUpload)}
                        sub={lastUpload ? String(new Date(lastUpload).getFullYear()) : 'none yet'}
                        onPress={() => navigation.navigate('GuardianRecords', { dependentId: lastUploadRecord?.dependent_id })}
                    />
                    <StatCard label="Records"     value={loading ? '…' : String(totalRecords)}    sub="total"     onPress={() => navigation.navigate('GuardianRecords')} />
                    <StatCard
                        label="Summary"
                        value={loading ? '…' : (latestSummary ? (SUMMARY_LABELS[latestSummary.summary_type] || latestSummary.summary_type) : '—')}
                        sub={latestSummary ? fmtShort(latestSummary.generated_at) : 'none yet'}
                        onPress={() => navigation.navigate('GuardianRecords', { dependentId: latestSummary?.dependent_id, tab: 'summaries' })}
                    />
                </ScrollView>

                {/* CTA */}
                <CTAButton label={cta.label} sub={cta.sub} onPress={() => navigation.navigate(cta.screen)} />

                {/* Recent activity */}
                {recentActivity.length > 0 && (
                    <View style={{ marginTop: 32 }}>
                        <Text style={styles.sectionLabel}>Recent Activity</Text>
                        <View style={{ gap: 8 }}>
                            {recentActivity.map((item, i) => (
                                <ActivityCard key={i} item={item} navigation={navigation} />
                            ))}
                        </View>
                    </View>
                )}

                {!loading && recentActivity.length === 0 && (
                    <Text style={styles.emptyText}>No activity yet.</Text>
                )}
            </ScrollView>
            </View>

            <BottomNav role="guardian" />
        </SafeAreaView>
    )
}

function StatCard({ label, value, sub, onPress }) {
    const { theme } = useTheme()
    const C = makeC(theme)
    const styles = getStyles(C)
    return (
        <TouchableOpacity onPress={onPress} style={styles.statCard} activeOpacity={0.75}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statSub}>{sub}</Text>
        </TouchableOpacity>
    )
}

function CTAButton({ label, sub, onPress }) {
    return (
        <TouchableOpacity onPress={onPress} style={{ borderRadius: 18, overflow: 'hidden' }} activeOpacity={0.8}>
            <LinearGradient
                colors={['#740949', '#a94382']}
                start={{ x: 0.13, y: 0.13 }}
                end={{ x: 1, y: 1 }}
                style={{ borderRadius: 18, padding: 20, gap: 4 }}
            >
                <Text style={{ fontSize: 16, fontWeight: '700', color: 'white' }}>{label}</Text>
                {sub ? <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)' }}>{sub}</Text> : null}
            </LinearGradient>
        </TouchableOpacity>
    )
}

function ActivityCard({ item, navigation }) {
    const { theme } = useTheme()
    const C = makeC(theme)
    const styles = getStyles(C)

    const iconName = { record: 'document-text-outline', summary: 'list-outline', dependent: 'people-outline' }[item.type] ?? 'ellipse-outline'

    const getInfo = () => {
        const fileName = item.data?.file_url?.split('/').pop()?.substring(37) || item.data?.file_name || 'Medical Record'
        const depName = item.data?.dependent_name ? ` · ${item.data.dependent_name}` : ''
        if (item.type === 'record')  return { title: fileName,                                                                    sub: `Uploaded · ${fmt(item.date)}${depName}`,          screen: 'GuardianRecords', params: { dependentId: item.data?.dependent_id } }
        if (item.type === 'summary') return { title: SUMMARY_LABELS[item.data?.summary_type] || item.data?.summary_type || 'Summary', sub: `Summary generated · ${fmt(item.date)}${depName}`, screen: 'GuardianRecords', params: { dependentId: item.data?.dependent_id, tab: 'summaries' } }
        return null
    }
    const info = getInfo()
    if (!info) return null

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate(info.screen, info.params)}
            style={styles.actCard}
            activeOpacity={0.75}
        >
            <View style={styles.actIconWrap}>
                <Ionicons name={iconName} size={16} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.actTitle} numberOfLines={1}>{info.title}</Text>
                <Text style={styles.actSub}>{info.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={C.textSub} />
        </TouchableOpacity>
    )
}
