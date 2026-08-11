import { useState, useEffect, useRef } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView,
    Modal, Pressable, TextInput, ActivityIndicator,
    Animated, StyleSheet, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle, Line, Polyline, Path } from 'react-native-svg'
import api from '../api/axios'
import { useTheme } from '../context/ThemeContext'

function fmt(d) {
    return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
}

function makeC(theme) {
    return {
        bg: theme.pageBg,
        cardBg: theme.cardBg,
        cardBorder: theme.cardBorder,
        text: theme.textPrimary,
        textSub: theme.textSecondary,
        textMuted: theme.textMuted,
        accent: theme.accent,
        inputBg: theme.inputBg,
        inputBorder: theme.inputBorder,
        panelBg: theme.modalBg,
    }
}

export default function SavedChatsDrawer({ onClose, dependentId }) {
    const { theme } = useTheme()
    const C = makeC(theme)
    const insets = useSafeAreaInsets()

    const slideAnim = useRef(new Animated.Value(320)).current

    const [chats, setChats] = useState([])
    const [loading, setLoading] = useState(true)
    const [downloadingId, setDownloadingId] = useState(null)
    const [sharingId, setSharingId]         = useState(null)
    const [renamingId, setRenamingId] = useState(null)
    const [renameVal, setRenameVal] = useState('')
    const [deletingId, setDeletingId] = useState(null)
    const renameRef = useRef(null)

    useEffect(() => {
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start()
    }, [])

    const handleClose = () => {
        Animated.timing(slideAnim, { toValue: 320, duration: 260, useNativeDriver: true }).start(onClose)
    }

    useEffect(() => {
        const params = dependentId ? { dependent_id: dependentId } : {}
        api.get('/users/saved-chats', { params, _skipAuthFailure: true })
            .then(res => setChats(res.data || []))
            .catch(err => console.log('[SavedChats] error', err.response?.status, err.response?.data))
            .finally(() => setLoading(false))
    }, [dependentId])

    useEffect(() => {
        if (renamingId) setTimeout(() => renameRef.current?.focus(), 50)
    }, [renamingId])

    const getSignedUrl = async (chatId) => {
        const { data } = await api.get(`/users/saved-chats/${chatId}/signed-url`, { _skipAuthFailure: true })
        const url = data?.signedUrl ?? data?.signed_url ?? data?.url ?? (typeof data === 'string' ? data : null)
        if (!url) throw new Error('Failed to get download URL')
        return url
    }

    const handleDownload = async (chat) => {
        if (downloadingId) return
        setDownloadingId(chat.chat_id)
        try {
            const signedUrl = await getSignedUrl(chat.chat_id)
            const fileName = `${(chat.title || 'MediAI-Chat').replace(/[^a-z0-9]/gi, '_')}.pdf`
            await FileSystem.downloadAsync(signedUrl, FileSystem.documentDirectory + fileName)
            Alert.alert('Saved', `"${chat.title || 'Medi AI Chat'}" saved to Files.`)
        } catch (err) {
            const msg = err?.message || ''
            if (!msg.toLowerCase().includes('cancel')) {
                Alert.alert('Error', msg || 'Failed to download. Please try again.')
            }
        } finally { setDownloadingId(null) }
    }

    const handleShare = async (chat) => {
        if (sharingId) return
        setSharingId(chat.chat_id)
        try {
            const signedUrl = await getSignedUrl(chat.chat_id)
            const fileName = `${(chat.title || 'MediAI-Chat').replace(/[^a-z0-9]/gi, '_')}.pdf`
            const { uri } = await FileSystem.downloadAsync(signedUrl, FileSystem.cacheDirectory + fileName)
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save or Share PDF', UTI: 'com.adobe.pdf' })
        } catch (err) {
            const msg = err?.message || ''
            if (!msg.toLowerCase().includes('cancel')) {
                Alert.alert('Error', msg || 'Failed to share. Please try again.')
            }
        } finally { setSharingId(null) }
    }

    const startRename = (chat) => {
        setRenamingId(chat.chat_id)
        setRenameVal(chat.title || '')
    }

    const commitRename = async (chatId) => {
        const trimmed = renameVal.trim()
        setRenamingId(null)
        if (!trimmed) return
        try {
            await api.patch(`/users/saved-chats/${chatId}`, { title: trimmed }, { _skipAuthFailure: true })
            setChats(prev => prev.map(c => c.chat_id === chatId ? { ...c, title: trimmed } : c))
        } catch { /* silent */ }
    }

    const handleDelete = async (chatId) => {
        if (deletingId === chatId) return
        setDeletingId(chatId)
        try {
            await api.delete(`/users/saved-chats/${chatId}`, { _skipAuthFailure: true })
            setChats(prev => prev.filter(c => c.chat_id !== chatId))
        } catch { /* silent */ }
        finally { setDeletingId(null) }
    }

    return (
        <Modal visible transparent animationType="none" onRequestClose={handleClose}>
            {/* Backdrop */}
            <Pressable style={styles.backdrop} onPress={handleClose} />

            {/* Sliding panel */}
            <Animated.View
                style={[
                    styles.panel,
                    { backgroundColor: C.panelBg, paddingTop: insets.top, transform: [{ translateX: slideAnim }] },
                ]}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: C.cardBorder }]}>
                    <View>
                        <Text style={[styles.title, { color: C.text }]}>Saved Chats</Text>
                        {!loading && <Text style={[styles.subtitle, { color: C.textSub }]}>{chats.length} saved</Text>}
                    </View>
                    <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: C.cardBg, borderColor: C.cardBorder }]}>
                        <Text style={{ color: C.textSub, fontSize: 16, lineHeight: 18 }}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* List */}
                <ScrollView
                    contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                >
                    {loading && (
                        <View style={{ alignItems: 'center', paddingTop: 48 }}>
                            <ActivityIndicator size="small" color={C.accent} />
                        </View>
                    )}
                    {!loading && chats.length === 0 && (
                        <Text style={{ color: C.textSub, fontSize: 14, textAlign: 'center', marginTop: 48 }}>
                            No saved chats yet.
                        </Text>
                    )}
                    {chats.map(chat => (
                        <View key={chat.chat_id} style={[styles.card, { backgroundColor: C.cardBg, borderColor: C.cardBorder }]}>
                            {/* Title row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {renamingId === chat.chat_id ? (
                                    <TextInput
                                        ref={renameRef}
                                        value={renameVal}
                                        onChangeText={setRenameVal}
                                        onBlur={() => commitRename(chat.chat_id)}
                                        onSubmitEditing={() => commitRename(chat.chat_id)}
                                        returnKeyType="done"
                                        style={[styles.renameInput, { backgroundColor: C.inputBg, borderColor: C.accent, color: C.text }]}
                                    />
                                ) : (
                                    <TouchableOpacity onPress={() => startRename(chat)} style={{ flex: 1 }} activeOpacity={0.7}>
                                        <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                                            {chat.title || 'Medi AI Chat'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                <Text style={{ color: C.textMuted, fontSize: 10, flexShrink: 0 }}>{fmt(chat.created_at)}</Text>
                            </View>

                            {/* Actions row */}
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
                                {/* Download icon */}
                                <TouchableOpacity
                                    onPress={() => handleDownload(chat)}
                                    disabled={!!downloadingId || !!sharingId}
                                    activeOpacity={0.7}
                                    style={[styles.iconBtn, { borderColor: `${C.accent}40`, backgroundColor: `${C.accent}0d`, opacity: downloadingId === chat.chat_id ? 0.5 : 1 }]}
                                >
                                    {downloadingId === chat.chat_id ? (
                                        <ActivityIndicator size="small" color={C.accent} />
                                    ) : (
                                        <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                            <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <Polyline points="7 10 12 15 17 10" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <Line x1="12" y1="15" x2="12" y2="3" stroke={C.accent} strokeWidth="2" strokeLinecap="round" />
                                        </Svg>
                                    )}
                                </TouchableOpacity>

                                {/* Share icon */}
                                <TouchableOpacity
                                    onPress={() => handleShare(chat)}
                                    disabled={!!downloadingId || !!sharingId}
                                    activeOpacity={0.7}
                                    style={[styles.iconBtn, { borderColor: `${C.accent}40`, backgroundColor: `${C.accent}0d`, opacity: sharingId === chat.chat_id ? 0.5 : 1 }]}
                                >
                                    {sharingId === chat.chat_id ? (
                                        <ActivityIndicator size="small" color={C.accent} />
                                    ) : (
                                        <Ionicons name="share-social-outline" size={13} color={C.accent} />
                                    )}
                                </TouchableOpacity>

                                {/* Delete */}
                                <TouchableOpacity
                                    onPress={() => handleDelete(chat.chat_id)}
                                    disabled={deletingId === chat.chat_id}
                                    activeOpacity={0.7}
                                    style={[styles.iconBtn, { backgroundColor: 'rgba(229,62,62,0.08)', borderColor: 'rgba(229,62,62,0.25)', opacity: deletingId === chat.chat_id ? 0.5 : 1 }]}
                                >
                                    {deletingId === chat.chat_id ? (
                                        <ActivityIndicator size="small" color="#fc8181" />
                                    ) : (
                                        <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                                            <Polyline points="3 6 5 6 21 6" stroke="#fc8181" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <Path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="#fc8181" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <Path d="M10 11v6M14 11v6" stroke="#fc8181" strokeWidth="2" strokeLinecap="round" />
                                        </Svg>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </Animated.View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    panel: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 320, borderLeftWidth: 1, borderLeftColor: 'rgba(100,150,200,0.15)' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 16, borderBottomWidth: 1 },
    title: { fontSize: 17, fontWeight: '700' },
    subtitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    card: { borderWidth: 1, borderRadius: 12, padding: 12 },
    renameInput: { flex: 1, fontSize: 13, fontWeight: '600', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
    pdfBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    iconBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
})
