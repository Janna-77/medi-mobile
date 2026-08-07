import { useState, useEffect } from 'react'
import {
    View, Text, TouchableOpacity, TextInput, ScrollView,
    StyleSheet, Alert, Modal, Pressable, SafeAreaView, FlatList,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Header from '../../components/Header'

const COLORS = {
    independent: { bg: '#081c2f', container: 'rgba(13,31,51,0.92)', text: '#d6e8f7', accent: '#00a8e8', border: 'rgba(0,168,232,0.25)' },
    guardian:    { bg: '#1c0818', container: 'rgba(50,10,35,0.92)',  text: '#f4d0e0', accent: '#e87090', border: 'rgba(220,140,185,0.25)' },
    doctor:      { bg: '#120820', container: 'rgba(30,12,55,0.92)',  text: '#e8d8f8', accent: '#a78bfa', border: 'rgba(185,145,235,0.25)' },
}

// ─── Message-type helpers ────────────────────────────────────────────────────

const isLinkRequest    = (msg) => msg.includes('requested to link')
const isAccessRequest  = (msg) => msg.startsWith('ACCESS_REQUEST:')
const isSummaryRequest = (msg) => msg.startsWith('SUMMARY_REQUEST:')
const isSummaryDenied  = (msg) => msg.startsWith('SUMMARY_DENIED:')
const isSummaryApproved = (msg) => msg.startsWith('SUMMARY_APPROVED:')

const parseAccessRequest  = (msg) => { const p = msg.split(':'); return { accessId: p[1], displayMessage: p.slice(2).join(':') } }
const parseSummaryRequest = (msg) => { const p = msg.split(':'); return { dependentId: p[1], displayMessage: p.slice(2).join(':') } }
const parseSummaryDenied  = (msg) => { const p = msg.split(':'); return { dependentId: p[1], displayMessage: p.slice(2).join(':') } }

const getDisplayMessage = (msg) => {
    if (isAccessRequest(msg))   return parseAccessRequest(msg).displayMessage
    if (isSummaryRequest(msg))  return parseSummaryRequest(msg).displayMessage
    if (isSummaryDenied(msg))   return parseSummaryDenied(msg).displayMessage
    if (isSummaryApproved(msg)) return parseSummaryRequest(msg).displayMessage
    return msg
}

const isGuardianNotification = (n) => {
    const msg = n.message
    if (isAccessRequest(msg)) return false
    if (msg.includes('Your doctor account has been approved')) return false
    if (msg.includes('you to their patient list')) return false
    if (msg.includes('approved your request and added')) return true
    if (msg.includes('medical summary')) return true
    if (isLinkRequest(msg)) return true
    if (isSummaryRequest(msg)) return true
    if (n.related_dependent_id) return true
    return false
}

const isIndependentNotification = (n) => {
    const msg = n.message
    if (isAccessRequest(msg)) return false
    if (msg.includes('doctor account')) return false
    if (msg.includes('patient list') && msg.includes('dependent')) return false
    if (msg.includes('patient list')) return true
    if (msg.includes('approved your request and added you to their patient list')) return true
    return !isGuardianNotification(n)
}

const isDoctorNotification = (n) => {
    const msg = n.message
    if (isAccessRequest(msg)) return true
    if (msg.includes('doctor account')) return true
    if (msg.includes('approved your request and added')) return false
    return false
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Notifications() {
    const navigation = useNavigation()
    const { user } = useAuth()
    const role = user?.role || 'independent'
    const c = COLORS[role] || COLORS.independent

    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('guardian')
    const [dependents, setDependents] = useState([])
    const [selectedDependent, setSelectedDependent] = useState('all')
    const [depPickerOpen, setDepPickerOpen] = useState(false)
    const [accountStatus, setAccountStatus] = useState({ is_independent: false, is_guardian: false, is_doctor: false })

    const isDoctorView    = role === 'doctor'
    const isGuardianView  = role === 'guardian'
    const isGuardianAndIndependent = !isDoctorView && accountStatus.is_guardian && accountStatus.is_independent

    useEffect(() => {
        api.get('/upgrade/status').then(res => setAccountStatus(res.data)).catch(() => {})
    }, [])

    useEffect(() => {
        api.get('/notifications')
            .then(res => setNotifications(res.data))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        if (!isGuardianView) return
        api.get('/dependents').then(res => setDependents(res.data)).catch(() => {})
    }, [isGuardianView])

    const handleMarkAllRead = async () => {
        try {
            await api.patch('/notifications/read-all')
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        } catch {}
    }

    const handleMarkRead = async (notificationId) => {
        try {
            await api.patch(`/notifications/${notificationId}/read`)
            setNotifications(prev => prev.map(n =>
                n.notification_id === notificationId ? { ...n, is_read: true } : n
            ))
        } catch {}
    }

    const handleApproveLink = async (notification) => {
        try {
            await api.post('/dependents/approve-link', { notification_id: notification.notification_id })
            setNotifications(prev => prev.map(n =>
                n.notification_id === notification.notification_id ? { ...n, is_read: true } : n
            ))
        } catch {
            Alert.alert('Error', 'Failed to approve link')
        }
    }

    const handleDenyLink = async (notification) => {
        try { await handleMarkRead(notification.notification_id) } catch {}
    }

    const handleApproveAccess = async (notification) => {
        const { accessId } = parseAccessRequest(notification.message)
        try {
            await api.patch(`/doctors/access/${accessId}/approve`)
            await handleMarkRead(notification.notification_id)
        } catch {
            Alert.alert('Error', 'Failed to approve')
        }
    }

    const handleDenyAccess = async (notification) => {
        const { accessId } = parseAccessRequest(notification.message)
        try {
            await api.patch(`/doctors/access/${accessId}/deny`)
            await handleMarkRead(notification.notification_id)
        } catch {
            Alert.alert('Error', 'Failed to deny')
        }
    }

    const handleApproveSummary = async (notification) => {
        const { dependentId } = parseSummaryRequest(notification.message)
        try {
            await api.post('/dependents/approve-summary', {
                notification_id: notification.notification_id,
                dependent_id: dependentId,
            })
            setNotifications(prev => prev.map(n =>
                n.notification_id === notification.notification_id ? { ...n, is_read: true } : n
            ))
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to approve summary request')
        }
    }

    const handleDenySummary = async (notification) => {
        try {
            await api.post('/dependents/deny-summary', { notification_id: notification.notification_id })
            setNotifications(prev => prev.map(n =>
                n.notification_id === notification.notification_id ? { ...n, is_read: true } : n
            ))
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to deny summary request')
        }
    }

    // ─── Filtering ────────────────────────────────────────────────────────────

    let filtered = notifications.filter(n =>
        getDisplayMessage(n.message).toLowerCase().includes(search.toLowerCase())
    )

    if (isDoctorView) {
        filtered = filtered.filter(isDoctorNotification)
    } else if (isGuardianAndIndependent) {
        if (roleFilter === 'guardian') {
            filtered = filtered.filter(isGuardianNotification)
            if (selectedDependent !== 'all') {
                const depName = dependents.find(d => d.dependent_id === selectedDependent)?.full_name
                filtered = filtered.filter(n =>
                    n.related_dependent_id === selectedDependent ||
                    (isSummaryRequest(n.message) && parseSummaryRequest(n.message).dependentId === selectedDependent) ||
                    (depName && n.message.includes(depName))
                )
            }
        } else {
            filtered = filtered.filter(isIndependentNotification)
        }
    } else if (isGuardianView) {
        filtered = filtered.filter(isGuardianNotification)
        if (selectedDependent !== 'all') {
            const depName = dependents.find(d => d.dependent_id === selectedDependent)?.full_name
            filtered = filtered.filter(n =>
                n.related_dependent_id === selectedDependent ||
                (isSummaryRequest(n.message) && parseSummaryRequest(n.message).dependentId === selectedDependent) ||
                (depName && n.message.includes(depName))
            )
        }
    } else {
        filtered = filtered.filter(isIndependentNotification)
    }

    const unreadCount = filtered.filter(n => !n.is_read).length
    const showDepPicker = (isGuardianView || (isGuardianAndIndependent && roleFilter === 'guardian')) && dependents.length > 0

    const selectedDepName = selectedDependent === 'all'
        ? 'All dependents'
        : dependents.find(d => d.dependent_id === selectedDependent)?.full_name || 'All dependents'

    // ─── Render notification item ─────────────────────────────────────────────

    const renderItem = ({ item: n }) => {
        const created = new Date(n.created_at)
        const dateStr = created.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        const timeStr = created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

        return (
            <View style={[
                styles.notifCard,
                { backgroundColor: n.is_read ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)' },
                !n.is_read && { borderColor: c.accent },
            ]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                        {!n.is_read && (
                            <View style={[styles.unreadDot, { backgroundColor: c.accent }]} />
                        )}
                        <Text style={[styles.notifText, { color: c.text, flex: 1 }]}>
                            {getDisplayMessage(n.message)}
                        </Text>
                    </View>
                    <Text style={styles.notifDate}>{dateStr} · {timeStr}</Text>
                </View>

                {isAccessRequest(n.message) && !n.is_read && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveAccess(n)}>
                            <Text style={styles.approveBtnText}>✓ Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.denyBtn} onPress={() => handleDenyAccess(n)}>
                            <Text style={styles.denyBtnText}>✕ Deny</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isLinkRequest(n.message) && !n.is_read && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveLink(n)}>
                            <Text style={styles.approveBtnText}>✓ Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.denyBtn} onPress={() => handleDenyLink(n)}>
                            <Text style={styles.denyBtnText}>✕ Deny</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isSummaryRequest(n.message) && !n.is_read && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveSummary(n)}>
                            <Text style={styles.approveBtnText}>✓ Allow</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.denyBtn} onPress={() => handleDenySummary(n)}>
                            <Text style={styles.denyBtnText}>✕ Deny</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!isLinkRequest(n.message) && !isAccessRequest(n.message) && !isSummaryRequest(n.message) && !n.is_read && (
                    <TouchableOpacity onPress={() => handleMarkRead(n.notification_id)}>
                        <Text style={[styles.markReadText, { color: c.accent }]}>Mark as read</Text>
                    </TouchableOpacity>
                )}
            </View>
        )
    }

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
            <Header role={role} />

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.heading}>Notifications</Text>
                {unreadCount > 0 && (
                    <Text style={styles.subheading}>{unreadCount} unread</Text>
                )}

                <View style={[styles.container, { borderColor: c.border }]}>

                    {/* Search + mark all */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TextInput
                            style={[styles.searchInput, { borderColor: c.border, color: c.text }]}
                            placeholder="Search notifications..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={search}
                            onChangeText={setSearch}
                        />
                        {unreadCount > 0 && (
                            <TouchableOpacity
                                style={[styles.markAllBtn, { backgroundColor: c.accent }]}
                                onPress={handleMarkAllRead}
                            >
                                <Text style={styles.markAllText}>Mark all read</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Role filter (guardian + independent) */}
                    {isGuardianAndIndependent && (
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {['guardian', 'independent'].map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.filterBtn, { borderColor: c.accent, backgroundColor: roleFilter === f ? c.accent : 'transparent' }]}
                                    onPress={() => { setRoleFilter(f); setSelectedDependent('all') }}
                                >
                                    <Text style={[styles.filterBtnText, { color: roleFilter === f ? 'white' : c.text }]}>
                                        {f.charAt(0).toUpperCase() + f.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {/* Dependent picker */}
                    {showDepPicker && (
                        <TouchableOpacity
                            style={[styles.depPicker, { borderColor: c.border }]}
                            onPress={() => setDepPickerOpen(true)}
                        >
                            <Text style={[styles.depPickerText, { color: c.text }]}>{selectedDepName}</Text>
                            <Text style={{ color: c.accent }}>▼</Text>
                        </TouchableOpacity>
                    )}

                    {/* Dependent picker modal */}
                    <Modal visible={depPickerOpen} transparent animationType="slide" onRequestClose={() => setDepPickerOpen(false)}>
                        <Pressable style={styles.pickerOverlay} onPress={() => setDepPickerOpen(false)}>
                            <View style={[styles.pickerSheet, { backgroundColor: COLORS[role]?.container || '#0d1f33' }]}>
                                <Text style={[styles.pickerTitle, { color: c.text }]}>Filter by dependent</Text>
                                {[{ dependent_id: 'all', full_name: 'All dependents' }, ...dependents].map(dep => (
                                    <TouchableOpacity
                                        key={dep.dependent_id}
                                        style={[styles.pickerOption, selectedDependent === dep.dependent_id && { backgroundColor: c.accent + '33' }]}
                                        onPress={() => { setSelectedDependent(dep.dependent_id); setDepPickerOpen(false) }}
                                    >
                                        <Text style={[styles.pickerOptionText, { color: c.text }, selectedDependent === dep.dependent_id && { fontWeight: '700' }]}>
                                            {dep.full_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Pressable>
                    </Modal>

                    {/* List */}
                    {loading ? (
                        <Text style={[styles.emptyText, { color: c.text }]}>Loading...</Text>
                    ) : filtered.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={{ fontSize: 36, marginBottom: 12 }}>🔔</Text>
                            <Text style={[styles.emptyText, { color: c.text }]}>
                                {search ? 'No matching notifications' : 'No notifications yet'}
                            </Text>
                        </View>
                    ) : (
                        <View style={{ gap: 10 }}>
                            {filtered.map(n => renderItem({ item: n }))}
                        </View>
                    )}
                </View>

                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { padding: 24, paddingBottom: 48 },
    heading: { color: 'white', textAlign: 'center', fontSize: 24, fontWeight: '700', marginBottom: 8 },
    subheading: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontSize: 13, marginBottom: 20 },
    container: {
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
        padding: 20, borderWidth: 1, gap: 16,
    },
    searchInput: {
        flex: 1, padding: 10, borderRadius: 8, borderWidth: 1.5,
        backgroundColor: 'rgba(255,255,255,0.06)', fontSize: 13,
    },
    markAllBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
    markAllText: { color: 'white', fontSize: 12, fontWeight: '700' },
    filterBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
    filterBtnText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
    depPicker: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 10, borderRadius: 8, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.06)',
    },
    depPickerText: { fontSize: 13, fontWeight: '600' },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
    pickerTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
    pickerOption: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginBottom: 4 },
    pickerOptionText: { fontSize: 14 },
    notifCard: {
        borderRadius: 10, padding: 14, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)', gap: 8,
    },
    unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
    notifText: { fontSize: 14, lineHeight: 21 },
    notifDate: { color: '#8a9ab0', fontSize: 11, flexShrink: 0 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    approveBtn: {
        flex: 1, backgroundColor: '#38a169', borderRadius: 8,
        paddingVertical: 7, paddingHorizontal: 16, alignItems: 'center',
    },
    approveBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
    denyBtn: {
        flex: 1, borderWidth: 1.5, borderColor: '#e53e3e', borderRadius: 8,
        paddingVertical: 7, paddingHorizontal: 16, alignItems: 'center',
    },
    denyBtnText: { color: '#e53e3e', fontSize: 12, fontWeight: '700' },
    markReadText: { fontSize: 12, textDecorationLine: 'underline', marginTop: 4 },
    emptyState: { alignItems: 'center', paddingVertical: 24 },
    emptyText: { fontSize: 14, textAlign: 'center' },
    backBtn: { marginTop: 32, alignItems: 'center' },
    backText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecorationLine: 'underline' },
})
