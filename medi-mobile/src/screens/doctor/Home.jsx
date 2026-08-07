import { useState, useEffect } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView,
    SafeAreaView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import Header from '../../components/Header'
import LoadingOverlay from '../../components/LoadingOverlay'
import api from '../../api/axios'
import { useTheme } from '../../context/ThemeContext'

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
        accentRed:       '#c0392b',
    }
}

function getStyles(C) {
    return {
        safe:           { flex: 1, backgroundColor: C.bg },
        scroll:         { flex: 1 },
        content:        { padding: 20, paddingBottom: 32 },

        greetingBlock:  { marginBottom: 28 },
        dateLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
        greeting:       { fontSize: 26, fontFamily: 'Calistoga', letterSpacing: -0.2, lineHeight: 34 },

        statRow:        { gap: 12, paddingRight: 4 },
        statCard:       { minWidth: 120, borderWidth: 1, borderRadius: 16, padding: 16, backgroundColor: C.cardBg, borderColor: C.cardBorder },
        statValue:      { fontSize: 24, fontWeight: '700', marginBottom: 4, lineHeight: 28, color: C.accent },
        statValueRed:   { fontSize: 24, fontWeight: '700', marginBottom: 4, lineHeight: 28, color: C.accentRed },
        statLabel:      { fontSize: 12, fontWeight: '500', marginBottom: 2, color: C.text, fontFamily: 'Georgia' },
        statSub:        { fontSize: 11, color: C.textSub },

        sectionLabel:   { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12, color: C.textSub },
        emptyText:      { fontSize: 14, textAlign: 'center', marginTop: 40, color: C.textMuted },

        recentCard:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 13, backgroundColor: C.cardBg, borderColor: C.cardBorder },
        avatar:         { width: 36, height: 36, borderRadius: 18, backgroundColor: '#5a1e96', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
        avatarText:     { color: 'white', fontSize: 13, fontWeight: '700' },
        patientName:    { fontWeight: '600', fontSize: 13, color: C.text },
        patientMeta:    { fontSize: 11, marginTop: 2, color: C.textSub },
    }
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
}

function fmtShort(d) {
    return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'
}

function getInitials(name) {
    const parts = (name || '').trim().split(/\s+/)
    if (parts.length === 1) return (parts[0][0] || '?').toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function DoctorHome() {
    const navigation = useNavigation()
    const { theme } = useTheme()
    const C = makeC(theme)
    const styles = getStyles(C)

    const [profile, setProfile] = useState(null)
    const [patients, setPatients] = useState([])
    const [pending, setPending] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.allSettled([
            api.get('/users/profile'),
            api.get('/doctors/patients'),
            api.get('/doctors/pending'),
        ]).then(([profileRes, patientsRes, pendingRes]) => {
            if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data)
            if (patientsRes.status === 'fulfilled') setPatients(patientsRes.value.data ?? [])
            if (pendingRes.status === 'fulfilled') setPending(pendingRes.value.data ?? [])
        }).finally(() => setLoading(false))
    }, [])

    const lastName = profile?.full_name?.trim().split(/\s+/).pop() || ''
    const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

    const recentPatients = [...patients]
        .sort((a, b) => new Date(b.granted_at || 0) - new Date(a.granted_at || 0))
        .slice(0, 3)

    const now = new Date()
    const newThisMonth = patients.filter(p => {
        if (!p.granted_at) return false
        const d = new Date(p.granted_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    const cta = pending.length > 0
        ? { label: `View ${pending.length} pending request${pending.length !== 1 ? 's' : ''} →`, sub: 'Patients waiting for approval' }
        : { label: 'View patient list →', sub: patients.length > 0 ? `${patients.length} patient${patients.length !== 1 ? 's' : ''} in your list` : 'No patients yet' }

    return (
        <SafeAreaView style={styles.safe}>
            <Header role="doctor" />
            <View style={{ flex: 1 }}>
            <LoadingOverlay visible={loading} role="doctor" />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Greeting */}
                <View style={styles.greetingBlock}>
                    <Text style={[styles.dateLabel, { color: C.accentLabel }]}>{todayStr}</Text>
                    <Text style={[styles.greeting, { color: C.text }]}>
                        {getGreeting()}{lastName ? `, Dr. ${lastName}` : ''}
                    </Text>
                </View>

                {/* Stat cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statRow}
                    style={{ marginBottom: 24 }}
                >
                    <StatCard label="Patients" value={loading ? '…' : String(patients.length)} sub="total"      onPress={() => navigation.navigate('DoctorPatients')} />
                    <StatCard label="Pending"  value={loading ? '…' : String(pending.length)}  sub="requests"   onPress={() => navigation.navigate('DoctorPatients')} accent={pending.length > 0} />
                    <StatCard label="New"      value={loading ? '…' : String(newThisMonth)}    sub="this month" onPress={() => navigation.navigate('DoctorPatients')} />
                </ScrollView>

                {/* CTA */}
                <CTAButton label={cta.label} sub={cta.sub} onPress={() => navigation.navigate('DoctorPatients')} />

                {/* Recent patients */}
                {recentPatients.length > 0 && (
                    <View style={{ marginTop: 32 }}>
                        <Text style={styles.sectionLabel}>Recent Patients</Text>
                        <View style={{ gap: 8 }}>
                            {recentPatients.map(p => (
                                <RecentCard
                                    key={p.access_id}
                                    patient={p}
                                    onPress={() => navigation.navigate('PatientView', { patientId: p.patient_id, patientName: p.full_name, patientType: p.patient_type, guardianName: p.guardian_name })}
                                />
                            ))}
                        </View>
                    </View>
                )}

                {!loading && patients.length === 0 && pending.length === 0 && (
                    <Text style={styles.emptyText}>
                        No patients yet. They'll appear once someone grants you access.
                    </Text>
                )}
            </ScrollView>
            </View>
        </SafeAreaView>
    )
}

function StatCard({ label, value, sub, onPress, accent }) {
    const { theme } = useTheme()
    const C = makeC(theme)
    const styles = getStyles(C)
    return (
        <TouchableOpacity onPress={onPress} style={styles.statCard} activeOpacity={0.75}>
            <Text style={accent ? styles.statValueRed : styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statSub}>{sub}</Text>
        </TouchableOpacity>
    )
}

function CTAButton({ label, sub, onPress }) {
    return (
        <TouchableOpacity onPress={onPress} style={{ borderRadius: 18, overflow: 'hidden' }} activeOpacity={0.8}>
            <LinearGradient
                colors={['#5a1e96', '#8b5cf6']}
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

function RecentCard({ patient, onPress }) {
    const { theme } = useTheme()
    const C = makeC(theme)
    const styles = getStyles(C)
    const initials = getInitials(patient.full_name)
    const badge = patient.patient_type === 'dependent' ? 'Dependent' : 'Independent'

    return (
        <TouchableOpacity onPress={onPress} style={styles.recentCard} activeOpacity={0.75}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.patientName} numberOfLines={1}>{patient.full_name}</Text>
                <Text style={styles.patientMeta}>{badge} · Added {fmtShort(patient.granted_at)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={C.textSub} />
        </TouchableOpacity>
    )
}
