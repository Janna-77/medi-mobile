import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, SafeAreaView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import useIndependentDashboard from '../../hooks/useIndependentDashboard'
import Header from '../../components/Header'
import LoadingOverlay from '../../components/LoadingOverlay'
import BottomNav from '../../components/BottomNav'

// Dark mode colors — mirrors web --indep-* CSS vars
const C = {
    bg:              '#141e2d',
    cardBg:          'rgba(255,255,255,0.05)',
    cardBorder:      'rgba(50,100,150,0.22)',
    cardBorderActive:'rgba(0,168,232,0.38)',
    text:            '#d8eaf6',
    textSub:         '#5a90b5',
    textMuted:       '#3d6882',
    accent:          '#1e90c8',
    accentLabel:     '#4ab8d8',
    ctaFrom:         '#006fa6',
    ctaTo:           '#00a8e8',
}

const SUMMARY_LABELS = {
    SOAP: 'SOAP Note',
    referral: 'Referral Letter',
    report: 'Medical Report',
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

export default function IndependentHome() {
    const navigation = useNavigation()
    const {
        loading, profile,
        totalRecords, lastUpload, doctorsCount, latestSummary,
        recentActivity, ctaType,
    } = useIndependentDashboard()

    const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    const firstName = profile?.full_name?.split(' ')[0] || ''

    const cta = {
        upload:  { label: 'Upload your first record →', sub: 'Add a medical document to get started',  screen: 'IndependentRecords' },
        summary: { label: 'Generate your first summary →', sub: 'Let Medi AI summarize your records',  screen: 'IndependentAI' },
        ai:      { label: 'Ask Medi AI →',               sub: 'Your records are ready — ask anything', screen: 'IndependentAI' },
    }[ctaType] ?? { label: 'Ask Medi AI →', sub: '', screen: 'IndependentAI' }

    return (
        <SafeAreaView style={styles.safe}>
            <Header role="independent" />
            <View style={{ flex: 1 }}>
            <LoadingOverlay visible={loading} role="independent" />
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
                    <StatCard label="Records"     value={loading ? '…' : String(totalRecords)}  sub="uploaded"   onPress={() => navigation.navigate('IndependentRecords')} />
                    <StatCard label="Last Upload" value={loading ? '…' : fmtShort(lastUpload)}  sub={lastUpload ? String(new Date(lastUpload).getFullYear()) : 'none yet'} onPress={() => navigation.navigate('IndependentRecords')} />
                    <StatCard label="Doctors"     value={loading ? '…' : String(doctorsCount)}  sub="with access" onPress={() => navigation.navigate('IndependentProfile')} />
                    <StatCard
                        label="Summary"
                        value={loading ? '…' : (latestSummary ? (SUMMARY_LABELS[latestSummary.summary_type] || latestSummary.summary_type) : '—')}
                        sub={latestSummary ? fmtShort(latestSummary.generated_at) : 'none yet'}
                        onPress={() => navigation.navigate('IndependentRecords')}
                    />
                </ScrollView>

                {/* CTA */}
                <CTAButton label={cta.label} sub={cta.sub} onPress={() => navigation.navigate(cta.screen)} />

                {/* Recent activity */}
                {recentActivity.length > 0 && (
                    <View style={{ marginTop: 32 }}>
                        <Text style={[styles.sectionLabel, { color: C.textSub }]}>Recent Activity</Text>
                        <View style={{ gap: 8 }}>
                            {recentActivity.map((item, i) => (
                                <ActivityCard key={i} item={item} navigation={navigation} />
                            ))}
                        </View>
                    </View>
                )}

                {!loading && recentActivity.length === 0 && (
                    <Text style={[styles.emptyText, { color: C.textMuted }]}>
                        No activity yet. Start by uploading a record.
                    </Text>
                )}
            </ScrollView>
            </View>

            <BottomNav role="independent" />
        </SafeAreaView>
    )
}

function StatCard({ label, value, sub, onPress }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[styles.statCard, { backgroundColor: C.cardBg, borderColor: C.cardBorder }]}
            activeOpacity={0.75}
        >
            <Text style={[styles.statValue, { color: C.accent }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: C.text, fontFamily: 'Georgia' }]}>{label}</Text>
            <Text style={[styles.statSub, { color: C.textSub }]}>{sub}</Text>
        </TouchableOpacity>
    )
}

function CTAButton({ label, sub, onPress }) {
    return (
        <TouchableOpacity onPress={onPress} style={styles.ctaWrap} activeOpacity={0.8}>
            <LinearGradient
                colors={['#006fa6', '#00a8e8']}
                start={{ x: 0.13, y: 0.13 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
            >
                <Text style={styles.ctaLabel}>{label}</Text>
                {sub ? <Text style={styles.ctaSub}>{sub}</Text> : null}
            </LinearGradient>
        </TouchableOpacity>
    )
}

function ActivityCard({ item, navigation }) {
    const iconMap = {
        record:  { name: 'document-text-outline', color: C.accent },
        summary: { name: 'list-outline',           color: C.accent },
        doctor:  { name: 'person-circle-outline',  color: C.accent },
    }
    const icon = iconMap[item.type] ?? { name: 'ellipse-outline', color: C.accent }

    const getInfo = () => {
        const fileName = item.data?.file_url?.split('/').pop()?.substring(37) || 'Medical Record'
        if (item.type === 'record')  return { title: fileName,                                                                    sub: `Uploaded · ${fmt(item.date)}`,          screen: 'IndependentRecords' }
        if (item.type === 'summary') return { title: SUMMARY_LABELS[item.data?.summary_type] || item.data?.summary_type || 'Summary', sub: `Summary generated · ${fmt(item.date)}`, screen: 'IndependentAI' }
        if (item.type === 'doctor')  return { title: `Dr. ${item.data?.doctor_name || ''}`,                                       sub: `Access granted · ${fmt(item.date)}`,      screen: 'IndependentProfile' }
        return null
    }
    const info = getInfo()
    if (!info) return null

    return (
        <TouchableOpacity
            onPress={() => navigation.navigate(info.screen)}
            style={[styles.actCard, { backgroundColor: C.cardBg, borderColor: C.cardBorder }]}
            activeOpacity={0.75}
        >
            <View style={[styles.actIconWrap, { backgroundColor: 'rgba(0,168,232,0.1)' }]}>
                <Ionicons name={icon.name} size={16} color={icon.color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.actTitle, { color: C.text }]} numberOfLines={1}>{info.title}</Text>
                <Text style={[styles.actSub, { color: C.textSub }]}>{info.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={C.textSub} />
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    safe:         { flex: 1, backgroundColor: C.bg },
    scroll:       { flex: 1 },
    content:      { padding: 20, paddingBottom: 12 },

    greetingBlock:{ marginBottom: 28 },
    dateLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
    greeting:     { fontSize: 26, fontWeight: '600', fontFamily: 'Georgia', letterSpacing: -0.2, lineHeight: 34 },

    statRow:      { gap: 12, paddingRight: 4 },
    statCard:     { minWidth: 120, borderWidth: 1, borderRadius: 16, padding: 16 },
    statValue:    { fontSize: 24, fontWeight: '700', marginBottom: 4, lineHeight: 28 },
    statLabel:    { fontSize: 12, fontWeight: '500', marginBottom: 2 },
    statSub:      { fontSize: 11 },

    ctaWrap:      { borderRadius: 18, overflow: 'hidden' },
    cta:          { borderRadius: 18, padding: 20, gap: 4 },
    ctaLabel:     { fontSize: 16, fontWeight: '700', color: 'white' },
    ctaSub:       { fontSize: 12, color: 'rgba(255,255,255,0.82)' },

    sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
    emptyText:    { fontSize: 14, textAlign: 'center', marginTop: 40 },

    actCard:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 13 },
    actIconWrap:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    actTitle:     { fontWeight: '600', fontSize: 13, marginBottom: 2 },
    actSub:       { fontSize: 11 },
})
