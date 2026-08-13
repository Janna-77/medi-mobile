import { useState, useEffect, useRef, useCallback } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, Modal, Animated,
    FlatList, StyleSheet, Pressable, DeviceEventEmitter,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import api from '../api/axios'
import { useTranslation } from 'react-i18next'

const isAccessRequest = (msg) => msg.startsWith('ACCESS_REQUEST:')
const isDoctorAccount = (msg) => msg.includes('doctor account')
const isLinkRequest   = (msg) => msg.includes('requested to link')
const isSummaryReq    = (msg) => msg.startsWith('SUMMARY_REQUEST:')

const parseSummaryReq  = (msg) => { const p = msg.split(':'); return { dependentId: p[1], displayMessage: p.slice(2).join(':') } }
const parseAccessReq   = (msg) => { const p = msg.split(':'); return { accessId: p[1], displayMessage: p.slice(2).join(':') } }

const getDrawerDisplay = (msg) => {
    if (isAccessRequest(msg)) return parseAccessReq(msg).displayMessage
    if (isSummaryReq(msg))    return parseSummaryReq(msg).displayMessage
    if (msg.startsWith('SUMMARY_APPROVED:') || msg.startsWith('SUMMARY_DENIED:')) return parseSummaryReq(msg).displayMessage
    return msg
}

const isGuardianMsg = (msg) => isLinkRequest(msg) || isSummaryReq(msg)
const isDoctorMsg   = (msg) => isAccessRequest(msg) || isDoctorAccount(msg)
const isIndepMsg    = (msg) => !isAccessRequest(msg) && !isDoctorAccount(msg) && !isLinkRequest(msg) && !isSummaryReq(msg)

const GLASS_BG = {
    independent: 'rgba(10,40,80,0.90)',
    guardian:    'rgba(60,10,45,0.90)',
    doctor:      'rgba(40,20,70,0.90)',
}
const DOT_COLOR = {
    independent: '#d6e8f7',
    guardian:    '#ead4ed',
    doctor:      '#ead6f7',
}

export default function NotificationDrawer({ role, onClose }) {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [displayCount, setDisplayCount] = useState(20)
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState(role === 'independent' ? 'independent' : 'guardian')
    const [isGuardianAndIndep, setIsGuardianAndIndep] = useState(false)
    const [dependents, setDependents] = useState([])
    const [selectedDep, setSelectedDep] = useState('all')
    const [depPickerOpen, setDepPickerOpen] = useState(false)
    const slideAnim = useRef(new Animated.Value(320)).current
    const { t } = useTranslation()
    const insets = useSafeAreaInsets()

    useEffect(() => {
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start()
    }, [])

    const handleClose = () => {
        Animated.timing(slideAnim, { toValue: 320, duration: 260, useNativeDriver: true }).start(onClose)
    }

    useEffect(() => {
        api.get('/upgrade/status')
            .then(res => setIsGuardianAndIndep(res.data.is_guardian && res.data.is_independent))
            .catch(() => {})
    }, [])

    const fetchNotifs = useCallback(async () => {
        try {
            const res = await api.get('/notifications')
            setNotifications(res.data)
        } catch { /* ignore */ }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchNotifs() }, [fetchNotifs])

    const showingGuardian = role === 'guardian' || (isGuardianAndIndep && roleFilter === 'guardian')

    useEffect(() => {
        if (!showingGuardian) return
        api.get('/dependents').then(res => setDependents(Array.isArray(res.data) ? res.data : [])).catch(() => {})
    }, [showingGuardian])

    // ── filter ──────────────────────────────────────────────────────────────
    const safeNotifs = Array.isArray(notifications) ? notifications : []
    let visible = safeNotifs
    if (role === 'doctor') {
        visible = safeNotifs.filter(n => isDoctorMsg(n.message))
    } else if (isGuardianAndIndep) {
        visible = safeNotifs.filter(n => roleFilter === 'guardian' ? isGuardianMsg(n.message) : isIndepMsg(n.message))
    } else if (role === 'guardian') {
        visible = safeNotifs.filter(n => isGuardianMsg(n.message))
    } else {
        visible = safeNotifs.filter(n => isIndepMsg(n.message))
    }

    if (selectedDep !== 'all') {
        const depName = dependents.find(d => d.dependent_id === selectedDep)?.full_name
        visible = visible.filter(n =>
            n.related_dependent_id === selectedDep ||
            (isSummaryReq(n.message) && parseSummaryReq(n.message).dependentId === selectedDep) ||
            (depName && n.message.includes(depName))
        )
    }

    const unread = visible.filter(n => !n.is_read).length
    const filtered = search.trim()
        ? visible.filter(n => getDrawerDisplay(n.message).toLowerCase().includes(search.toLowerCase()))
        : visible

    // ── actions ─────────────────────────────────────────────────────────────
    const markRead = async (id) => {
        await api.patch(`/notifications/${id}/read`)
        const updated = safeNotifs.map(n => n.notification_id === id ? { ...n, is_read: true } : n)
        setNotifications(updated)
        DeviceEventEmitter.emit('notifs_updated', updated)
    }
    const markAllRead = async () => {
        await api.patch('/notifications/read-all')
        const updated = safeNotifs.map(n => ({ ...n, is_read: true }))
        setNotifications(updated)
        DeviceEventEmitter.emit('notifs_updated', updated)
    }
    const approveLink    = async (n) => { await api.post('/dependents/approve-link',    { notification_id: n.notification_id }); await markRead(n.notification_id) }
    const denyLink       = async (n) => { await api.post('/dependents/deny-link',       { notification_id: n.notification_id }); await markRead(n.notification_id) }
    const approveSummary = async (n) => { const { dependentId } = parseSummaryReq(n.message); await api.post('/dependents/approve-summary', { notification_id: n.notification_id, dependent_id: dependentId }); await markRead(n.notification_id) }
    const denySummary    = async (n) => { await api.post('/dependents/deny-summary',   { notification_id: n.notification_id }); await markRead(n.notification_id) }
    const approveAccess  = async (n) => { const { accessId } = parseAccessReq(n.message); await api.patch(`/doctors/access/${accessId}/approve`); await markRead(n.notification_id); DeviceEventEmitter.emit('doctor_access_changed') }
    const denyAccess     = async (n) => { const { accessId } = parseAccessReq(n.message); await api.patch(`/doctors/access/${accessId}/deny`);    await markRead(n.notification_id); DeviceEventEmitter.emit('doctor_access_changed') }

    // reset display window when search or filters change
    useEffect(() => { setDisplayCount(20) }, [search, roleFilter, selectedDep])

    const glass    = GLASS_BG[role]    ?? GLASS_BG.independent
    const dotColor = DOT_COLOR[role]   ?? DOT_COLOR.independent
    const selectedDepName = dependents.find(d => d.dependent_id === selectedDep)?.full_name ?? t('common.Alldependents')

    return (
        <Modal visible transparent animationType="none" onRequestClose={handleClose}>
            {/* Backdrop */}
            <Pressable style={styles.backdrop} onPress={handleClose} />

            {/* Sliding panel */}
            <Animated.View
                style={[
                    styles.panel,
                    {
                        backgroundColor: glass,
                        paddingTop: insets.top,
                        transform: [{ translateX: slideAnim }],
                    },
                ]}
            >
                {/* Header row */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>{t('common.Notifications')}</Text>
                        {unread > 0 && <Text style={styles.unreadLabel}>{unread} unread</Text>}
                    </View>
                    <View style={styles.headerRight}>
                        {unread > 0 && (
                            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
                                <Text style={styles.markAllText}>{t('common.Markallread')}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search + filters */}
                <View style={styles.filters}>
                    <TextInput
                        value={search}
                        onChangeText={setSearch}
                        placeholder={t('common.Searchnotifications')}
                        placeholderTextColor="rgba(255,255,255,0.35)"
                        style={styles.searchInput}
                    />

                    {isGuardianAndIndep && (
                        <View style={styles.pillRow}>
                            {[['guardian', t('common.guardian')], ['independent', t('common.independent')]].map(([key, label]) => (
                                <TouchableOpacity
                                    key={key}
                                    onPress={() => { setRoleFilter(key); setSelectedDep('all') }}
                                    style={[styles.pill, roleFilter === key && styles.pillActive]}
                                >
                                    <Text style={styles.pillText}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {showingGuardian && dependents.length > 0 && (
                        <>
                            <TouchableOpacity style={styles.depPicker} onPress={() => setDepPickerOpen(true)}>
                                <Text style={styles.depPickerText}>{selectedDepName}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>▼</Text>
                            </TouchableOpacity>
                            <Modal visible={depPickerOpen} transparent animationType="slide" onRequestClose={() => setDepPickerOpen(false)}>
                                <Pressable style={styles.pickerBackdrop} onPress={() => setDepPickerOpen(false)} />
                                <View style={styles.pickerSheet}>
                                    <TouchableOpacity style={styles.pickerOption} onPress={() => { setSelectedDep('all'); setDepPickerOpen(false) }}>
                                        <Text style={[styles.pickerOptionText, selectedDep === 'all' && { fontWeight: '700', color: '#fff' }]}>{t('common.Alldependents')}</Text>
                                    </TouchableOpacity>
                                    {dependents.map(d => (
                                        <TouchableOpacity key={d.dependent_id} style={styles.pickerOption} onPress={() => { setSelectedDep(d.dependent_id); setDepPickerOpen(false) }}>
                                            <Text style={[styles.pickerOptionText, selectedDep === d.dependent_id && { fontWeight: '700', color: '#fff' }]}>{d.full_name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </Modal>
                        </>
                    )}
                </View>

                {/* List */}
                <FlatList
                    style={styles.list}
                    contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
                    showsVerticalScrollIndicator={false}
                    data={loading ? [] : filtered.slice(0, displayCount)}
                    keyExtractor={n => String(n.notification_id)}
                    renderItem={({ item: n }) => (
                        <View style={[styles.notifCard, { backgroundColor: n.is_read ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.10)', borderColor: n.is_read ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.14)' }]}>
                            <View style={styles.notifRow}>
                                <Text style={[styles.notifText, { color: n.is_read ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.92)' }]}>
                                    {!n.is_read && <Text style={{ color: dotColor }}>● </Text>}
                                    {getDrawerDisplay(n.message)}
                                </Text>
                                <Text style={styles.notifDate}>
                                    {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </Text>
                            </View>
                            {isAccessRequest(n.message) && !n.is_read && <ActionButtons onApprove={() => approveAccess(n)} onDeny={() => denyAccess(n)} t={t} />}
                            {isLinkRequest(n.message)   && !n.is_read && <ActionButtons onApprove={() => approveLink(n)}    onDeny={() => denyLink(n)}    t={t} />}
                            {isSummaryReq(n.message)    && !n.is_read && <ActionButtons onApprove={() => approveSummary(n)} onDeny={() => denySummary(n)} t={t} />}
                            {!isAccessRequest(n.message) && !isLinkRequest(n.message) && !isSummaryReq(n.message) && !n.is_read && (
                                <TouchableOpacity onPress={() => markRead(n.notification_id)}>
                                    <Text style={styles.markReadBtn}>{t('common.Markasread')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    onEndReached={() => setDisplayCount(c => c + 20)}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={filtered.length > displayCount ? <Skeleton /> : null}
                    ListEmptyComponent={
                        loading ? (
                            <View style={{ gap: 10 }}><Skeleton /><Skeleton /></View>
                        ) : (
                            <View style={styles.emptyBox}>
                                <Text style={{ fontSize: 32, marginBottom: 10 }}>🔔</Text>
                                <Text style={styles.emptyText}>{search ? t('common.Nomatchingnotifications') : t('common.Nonotifications')}</Text>
                            </View>
                        )
                    }
                />
            </Animated.View>
        </Modal>
    )
}

function ActionButtons({ onApprove, onDeny, t }) {
    return (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity style={styles.approveBtn} onPress={onApprove} activeOpacity={0.75}>
                <Text style={styles.approveBtnText}>{t('common.Approve')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.denyBtn} onPress={onDeny} activeOpacity={0.75}>
                <Text style={styles.denyBtnText}>{t('common.Deny')}</Text>
            </TouchableOpacity>
        </View>
    )
}

function Skeleton() {
    return (
        <View style={styles.skeleton}>
            <View style={styles.skeletonLine1} />
            <View style={styles.skeletonLine2} />
        </View>
    )
}

const styles = StyleSheet.create({
    backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    panel:        { position: 'absolute', top: 0, right: 0, bottom: 0, width: 320, borderLeftWidth: 1, borderLeftColor: 'rgba(100,180,255,0.14)' },
    header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
    title:        { color: 'white', fontSize: 17, fontWeight: '700' },
    unreadLabel:  { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 },
    headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    markAllBtn:   { backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
    markAllText:  { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },
    closeBtn:     { padding: 4 },
    closeText:    { color: 'rgba(255,255,255,0.6)', fontSize: 18 },
    filters:      { padding: 12, paddingBottom: 0, gap: 8 },
    searchInput:  { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, color: 'white', fontSize: 13 },
    pillRow:      { flexDirection: 'row', gap: 6 },
    pill:         { flex: 1, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', backgroundColor: 'transparent' },
    pillActive:   { backgroundColor: 'rgba(255,255,255,0.18)' },
    pillText:     { color: 'white', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
    depPicker:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12 },
    depPickerText:{ color: 'white', fontSize: 12 },
    pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    pickerSheet:  { backgroundColor: '#1a2a3a', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, gap: 4 },
    pickerOption: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8 },
    pickerOptionText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
    list:         { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    emptyBox:     { alignItems: 'center', paddingTop: 48 },
    emptyText:    { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
    notifCard:    { padding: 14, borderRadius: 10, borderWidth: 1, gap: 8 },
    notifRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    notifText:    { flex: 1, fontSize: 13, lineHeight: 20 },
    notifDate:    { color: 'rgba(255,255,255,0.35)', fontSize: 11, flexShrink: 0 },
    markReadBtn:  { color: 'rgba(255,255,255,0.4)', fontSize: 11, textDecorationLine: 'underline' },
    approveBtn:   { flex: 1, backgroundColor: '#38a169', borderRadius: 7, paddingVertical: 7, alignItems: 'center' },
    approveBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
    denyBtn:      { flex: 1, borderWidth: 1, borderColor: 'rgba(252,129,129,0.5)', borderRadius: 7, paddingVertical: 7, alignItems: 'center' },
    denyBtnText:  { color: '#fc8181', fontSize: 12, fontWeight: '700' },
    skeleton:     { padding: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8, opacity: 0.5 },
    skeletonLine1: { height: 12, width: '85%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
    skeletonLine2: { height: 12, width: '55%', borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.13)' },
})
