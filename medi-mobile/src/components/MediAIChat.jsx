import { useState, useRef, useEffect } from 'react'
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation } from '@react-navigation/native'
import api from '../api/axios'
import { useTheme } from '../context/ThemeContext'
import SavedChatsDrawer from './SavedChatsDrawer'
import LoadingOverlay from './LoadingOverlay'

const DAILY_LIMIT = 20
const REQUEST_KEY = 'medi_ai_requests'
const PRO_KEY = 'medi_sub_ai_pro'

// In-memory session storage (cleared on app restart, same as sessionStorage)
const SESSION_MESSAGES = new Map()
const SESSION_SCROLL   = new Map()

function isLimitReset(firstRequestTime) {
    if (!firstRequestTime) return true
    return Date.now() - firstRequestTime >= 24 * 60 * 60 * 1000
}

function getTimeRemaining(firstRequestTime) {
    if (!firstRequestTime) return null
    const remaining = 24 * 60 * 60 * 1000 - (Date.now() - firstRequestTime)
    if (remaining <= 0) return null
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    const resetStr = new Date(firstRequestTime + 24 * 60 * 60 * 1000)
        .toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    return { hours, minutes, resetStr }
}

function makeC(theme, role) {
    const accent = role === 'guardian' ? '#740949' : '#006fa6'
    const accentLight = role === 'guardian' ? '#a94382' : '#00a8e8'
    return {
        bg: theme.pageBg,
        cardBg: theme.cardBg,
        cardBorder: theme.cardBorder,
        text: theme.textPrimary,
        textSub: theme.textSecondary,
        textMuted: theme.textMuted,
        inputBg: theme.inputBg,
        inputBorder: theme.inputBorder,
        accent,
        accentLight,
        modalBg: theme.modalBg,
        modalBorder: theme.modalBorder,
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MediAIChat({ role, dependentId, dependentSelector, locked }) {
    const navigation = useNavigation()
    const { theme } = useTheme()
    const C = makeC(theme, role)

    const chatKey = `medi_ai_chat_${role}_${dependentId || 'self'}`

    const [messages, setMessages] = useState(() => SESSION_MESSAGES.get(chatKey) || [])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [showInfo, setShowInfo] = useState(false)
    const [savedChatsOpen, setSavedChatsOpen] = useState(false)
    const [isPro, setIsPro] = useState(false)
    const [requestData, setRequestData] = useState({ count: 0, firstRequestTime: null })
    const [timeRemaining, setTimeRemaining] = useState(null)

    const scrollRef = useRef(null)

    // Load AsyncStorage on mount
    useEffect(() => {
        Promise.all([
            AsyncStorage.getItem(PRO_KEY),
            AsyncStorage.getItem(REQUEST_KEY),
        ]).then(([pro, req]) => {
            setIsPro(pro === 'true')
            if (req) {
                const data = JSON.parse(req)
                if (isLimitReset(data.firstRequestTime)) {
                    setRequestData({ count: 0, firstRequestTime: null })
                } else {
                    setRequestData(data)
                    setTimeRemaining(getTimeRemaining(data.firstRequestTime))
                }
            }
        })
    }, [])

    // Countdown ticker
    useEffect(() => {
        if (!timeRemaining) return
        const id = setInterval(() => {
            AsyncStorage.getItem(REQUEST_KEY).then(raw => {
                if (!raw) return
                const data = JSON.parse(raw)
                if (isLimitReset(data.firstRequestTime)) {
                    const fresh = { count: 0, firstRequestTime: null }
                    AsyncStorage.setItem(REQUEST_KEY, JSON.stringify(fresh))
                    setRequestData(fresh)
                    setTimeRemaining(null)
                } else {
                    setTimeRemaining(getTimeRemaining(data.firstRequestTime))
                }
            })
        }, 60000)
        return () => clearInterval(id)
    }, [timeRemaining])

    // Restore messages when dependentId changes (guardian switching)
    const prevDepRef = useRef(dependentId)
    useEffect(() => {
        if (prevDepRef.current !== dependentId) {
            const restored = SESSION_MESSAGES.get(chatKey) || []
            setMessages(restored)
            setInput('')
            prevDepRef.current = dependentId
        }
    }, [dependentId, chatKey])

    // Persist messages to session map
    useEffect(() => {
        SESSION_MESSAGES.set(chatKey, messages)
    }, [messages, chatKey])

    // On mount: restore saved scroll position; after that, scroll to end on new messages
    const scrollRestored = useRef(false)
    useEffect(() => {
        const savedY = SESSION_SCROLL.get(chatKey)
        if (savedY != null && messages.length > 0) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: savedY, animated: false })
                scrollRestored.current = true
            }, 120)
        } else {
            scrollRestored.current = true
        }
    }, []) // mount only — eslint-disable-line react-hooks/exhaustive-deps

    // Scroll to end when new messages arrive (not on initial restore)
    useEffect(() => {
        if (!scrollRestored.current) return
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80)
    }, [messages, loading])

    const isLimited = !isPro && requestData.count >= DAILY_LIMIT

    const sendMessage = async () => {
        const text = input.trim()
        if (!text || loading || locked) return

        if (!isPro) {
            let data = requestData
            if (isLimitReset(data.firstRequestTime)) data = { count: 0, firstRequestTime: null }
            if (data.count >= DAILY_LIMIT) {
                setRequestData(data)
                setTimeRemaining(getTimeRemaining(data.firstRequestTime))
                return
            }
            const newData = { count: data.count + 1, firstRequestTime: data.firstRequestTime || Date.now() }
            await AsyncStorage.setItem(REQUEST_KEY, JSON.stringify(newData))
            setRequestData(newData)
            if (newData.count >= DAILY_LIMIT) setTimeRemaining(getTimeRemaining(newData.firstRequestTime))
        }

        const updated = [...messages, { role: 'user', message: text }]
        setMessages(updated)
        setInput('')
        setLoading(true)

        try {
            const res = await api.post('/ai/chat', {
                message: text,
                history: messages,
                dependent_id: dependentId || undefined,
            })
            setMessages(prev => [...prev, { role: 'assistant', message: res.data.reply }])
        } catch (err) {
            const is503 = err.response?.status === 503 || err.response?.data?.error === 'chat_history_too_long'
            setMessages(prev => [...prev, {
                role: 'assistant',
                message: is503
                    ? '⚠️ The AI could not respond — your conversation history may be too long. Try clearing the chat and starting fresh.'
                    : 'Sorry, something went wrong. Please try again.',
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleClearChat = () => {
        SESSION_MESSAGES.delete(chatKey)
        setMessages([])
        setInput('')
    }

    const handleSaveChat = async () => {
        if (messages.length === 0 || saving) return
        setSaving(true)
        try {
            const title = messages[0]?.message?.slice(0, 60) || 'Medi AI Chat'
            const body = { messages, title }
            if (dependentId) body.dependent_id = dependentId
            await api.post('/users/save-chat', body, { _skipAuthFailure: true })
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 2500)
        } catch { /* silent */ }
        finally { setSaving(false) }
    }

    const subsScreen = 'Subscriptions'

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            <View style={{ flex: 1, padding: 16, paddingBottom: 0 }}>

                {/* Header row: title + action buttons */}
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700' }}>
                                Medi AI{isPro ? ' Pro' : ''}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowInfo(v => !v)}
                                style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: C.textMuted, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={{ color: C.textMuted, fontSize: 9, fontWeight: '700', lineHeight: 11 }}>i</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={{ color: C.textSub, fontSize: 12 }}>Ask questions about your medical records</Text>
                        {showInfo && (
                            <View style={{ position: 'absolute', top: 44, left: 0, right: 0, zIndex: 99, elevation: 10, backgroundColor: C.modalBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.cardBorder }}>
                                <Text style={{ color: C.text, fontSize: 12, lineHeight: 18 }}>
                                    I can help explain your medical records, lab results, diagnoses, and medical terms in simple language. Medi AI does not diagnose or treat medical conditions.
                                </Text>
                                {!isPro && (
                                    <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 6 }}>
                                        {DAILY_LIMIT - requestData.count} of {DAILY_LIMIT} free requests remaining today.
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                    <View style={{ gap: 6, alignItems: 'flex-end' }}>
                        {messages.length > 0 && (
                            <>
                                <TouchableOpacity
                                    onPress={handleClearChat}
                                    style={{ backgroundColor: 'rgba(229,62,62,0.1)', borderWidth: 1, borderColor: 'rgba(229,62,62,0.35)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
                                >
                                    <Text style={{ color: '#fc8181', fontSize: 11, fontWeight: '700' }}>Clear chat</Text>
                                </TouchableOpacity>
                                {role !== 'dependent' && (
                                    <TouchableOpacity
                                        onPress={handleSaveChat}
                                        disabled={saving}
                                        style={{ backgroundColor: saveSuccess ? 'rgba(56,161,105,0.15)' : C.cardBg, borderWidth: 1, borderColor: saveSuccess ? 'rgba(56,161,105,0.4)' : C.cardBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, opacity: saving ? 0.6 : 1 }}
                                    >
                                        <Text style={{ color: saveSuccess ? '#38a169' : C.text, fontSize: 11, fontWeight: '700' }}>
                                            {saving ? 'Saving…' : saveSuccess ? '✓ Saved' : 'Save chat'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                        {/* View saved chats */}
                        {(role === 'independent' || (role === 'guardian' && dependentId)) && (
                            <TouchableOpacity onPress={() => setSavedChatsOpen(true)} activeOpacity={0.7}>
                                <Text style={{ color: C.textSub, fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' }}>
                                    View saved chats
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Dependent selector slot */}
                {dependentSelector && (
                    <View style={{ marginBottom: 12 }}>{dependentSelector}</View>
                )}

                {/* Chat bubble area */}
                <View style={{ flex: 1, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 16, overflow: 'hidden' }}>
                    {locked && (
                        <View style={{ ...StyleFill, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10 }}>
                            <Text style={{ fontSize: 28 }}>🔒</Text>
                            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>Select a dependent to start chatting</Text>
                        </View>
                    )}
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={{ padding: 16, gap: 12 }}
                        showsVerticalScrollIndicator={false}
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                        onScroll={e => SESSION_SCROLL.set(chatKey, e.nativeEvent.contentOffset.y)}
                        scrollEventThrottle={100}
                    >
                        {messages.length === 0 && !locked && (
                            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                                <Text style={{ color: C.textSub, fontSize: 13, textAlign: 'center' }}>
                                    Ask me anything about your medical records
                                </Text>
                            </View>
                        )}
                        {messages.map((msg, i) => (
                            <View key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                                {msg.role === 'assistant' && (
                                    <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700', marginBottom: 4, marginLeft: 2 }}>
                                        MEDI AI{isPro ? ' PRO' : ''}
                                    </Text>
                                )}
                                <View style={{
                                    backgroundColor: msg.role === 'user' ? C.accent : C.inputBg,
                                    borderWidth: 1,
                                    borderColor: msg.role === 'user' ? C.accent : C.cardBorder,
                                    borderRadius: msg.role === 'user' ? 16 : 16,
                                    borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                                    borderBottomLeftRadius: msg.role === 'user' ? 16 : 4,
                                    padding: 14,
                                }}>
                                    <Text style={{ color: msg.role === 'user' ? 'white' : C.text, fontSize: 14, lineHeight: 22 }}>
                                        {msg.message}
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {loading && (
                            <View style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                                <View style={{
                                    backgroundColor: C.inputBg,
                                    borderWidth: 1, borderColor: C.cardBorder,
                                    borderRadius: 16, borderBottomLeftRadius: 4,
                                    padding: 14,
                                }}>
                                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 11, marginBottom: 6, opacity: 0.7 }}>
                                        MEDI AI{isPro ? ' PRO' : ''}
                                    </Text>
                                    <Text style={{ color: C.textSub, fontSize: 14 }}>Thinking...</Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>

                {/* Limit banner */}
                {isLimited && timeRemaining && (
                    <View style={{ backgroundColor: C.cardBg, borderWidth: 1.5, borderColor: C.cardBorder, borderRadius: 12, padding: 14, marginTop: 10, alignItems: 'center' }}>
                        <Text style={{ color: C.text, fontSize: 13, fontWeight: '700', marginBottom: 4 }}>
                            You've used all {DAILY_LIMIT} free requests for today 💔
                        </Text>
                        <Text style={{ color: C.textSub, fontSize: 12, marginBottom: 8 }}>
                            Resets in {timeRemaining.hours}h {timeRemaining.minutes}m — on {timeRemaining.resetStr}
                        </Text>
                        <TouchableOpacity onPress={() => navigation.navigate(subsScreen)}>
                            <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' }}>
                                Purchase Medi AI Pro to remove this limit
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Input row */}
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end', paddingVertical: 12 }}>
                    <TextInput
                        value={input}
                        onChangeText={setInput}
                        placeholder={isLimited || locked ? 'Unavailable…' : 'Type your question…'}
                        placeholderTextColor={C.textMuted}
                        multiline
                        editable={!isLimited && !locked}
                        style={{
                            flex: 1, backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.inputBorder,
                            borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
                            color: C.text, fontSize: 14, lineHeight: 20, maxHeight: 120,
                            opacity: isLimited || locked ? 0.5 : 1,
                        }}
                    />
                    <TouchableOpacity
                        onPress={sendMessage}
                        disabled={loading || !input.trim() || isLimited || locked}
                        activeOpacity={0.8}
                        style={{
                            width: 48, height: 48, borderRadius: 14,
                            backgroundColor: (!input.trim() || isLimited || locked) ? C.cardBg : C.accent,
                            borderWidth: 1, borderColor: C.cardBorder,
                            alignItems: 'center', justifyContent: 'center',
                            opacity: (!input.trim() || isLimited || locked) ? 0.45 : 1,
                        }}
                    >
                        <Text style={{ color: (!input.trim() || isLimited || locked) ? C.textMuted : 'white', fontSize: 18 }}>➤</Text>
                    </TouchableOpacity>
                </View>

                {/* Pro upsell */}
                {!isPro && (
                    <TouchableOpacity
                        onPress={() => navigation.navigate(subsScreen)}
                        style={{ marginBottom: 12, alignSelf: 'center', borderWidth: 1.5, borderColor: C.cardBorder, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 7 }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ color: C.textSub, fontSize: 12, fontWeight: '700' }}>✦ Purchase Medi AI Pro</Text>
                    </TouchableOpacity>
                )}
            </View>

            {savedChatsOpen && (
                <SavedChatsDrawer
                    onClose={() => setSavedChatsOpen(false)}
                    dependentId={dependentId}
                />
            )}
        </View>
    )
}

const StyleFill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 }
