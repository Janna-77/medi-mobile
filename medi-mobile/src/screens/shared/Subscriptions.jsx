import { useState, useEffect } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView,
    StyleSheet, Modal, Pressable, SafeAreaView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Header from '../../components/Header'

const STORAGE_KEYS = {
    mediAiPro:          'medi_sub_ai_pro',
    summaryMonthly:     'medi_sub_summary_monthly',
    summaryMonthlyDate: 'medi_sub_summary_monthly_date',
    storageUpgraded:    'medi_sub_storage',
}

// Brand gradient color per role — stays the same in light and dark
const GRAD = {
    guardian:    '#740949',
    independent: '#006fa6',
    doctor:      '#5a1e96',
}

export default function Subscriptions() {
    const navigation = useNavigation()
    const route = useRoute()
    const { user } = useAuth()
    const { theme } = useTheme()
    const role = route.params?.role || user?.role || 'independent'
    const grad = GRAD[role] || GRAD.independent

    const [openDdl, setOpenDdl]               = useState(route.params?.openDdl || null)
    const [hasAiPro, setHasAiPro]             = useState(false)
    const [hasSummaryMonthly, setHasSummaryMonthly] = useState(false)
    const [hasStorage, setHasStorage]         = useState(false)
    const [popup, setPopup]                   = useState(null)
    const [simChecked, setSimChecked]         = useState(false)
    const [paySuccess, setPaySuccess]         = useState(false)

    useEffect(() => {
        const load = async () => {
            const [aiPro, summary, storage] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.mediAiPro),
                AsyncStorage.getItem(STORAGE_KEYS.summaryMonthly),
                AsyncStorage.getItem(STORAGE_KEYS.storageUpgraded),
            ])
            if (aiPro === 'true') setHasAiPro(true)
            if (summary === 'true') setHasSummaryMonthly(true)
            if (storage === 'true') setHasStorage(true)
        }
        load()
    }, [])

    const toggleDdl = (key) => setOpenDdl(prev => prev === key ? null : key)

    const openPayPopup = (type, label, onConfirm) => {
        setSimChecked(false)
        setPaySuccess(false)
        setPopup({ type, label, onConfirm })
    }

    const handlePay = () => {
        if (!simChecked) return
        popup.onConfirm()
        setPaySuccess(true)
    }

    const closePopup = () => { setPopup(null); setPaySuccess(false); setSimChecked(false) }

    const purchaseAiPro = async () => {
        await AsyncStorage.setItem(STORAGE_KEYS.mediAiPro, 'true')
        setHasAiPro(true)
    }

    const purchaseSummaryMonthly = async () => {
        await AsyncStorage.setItem(STORAGE_KEYS.summaryMonthly, 'true')
        await AsyncStorage.setItem(STORAGE_KEYS.summaryMonthlyDate, Date.now().toString())
        setHasSummaryMonthly(true)
    }

    const purchaseOneSummary = async () => {
        const current = parseInt(await AsyncStorage.getItem('medi_sub_summary_oneoff_count') || '0')
        await AsyncStorage.setItem('medi_sub_summary_oneoff_count', (current + 1).toString())
        await AsyncStorage.setItem('medi_sub_summary_oneoff_pending', 'true')
    }

    const purchaseStorage = async () => {
        await AsyncStorage.setItem(STORAGE_KEYS.storageUpgraded, 'true')
        setHasStorage(true)
    }

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: theme.pageBg }]}>
            <Header role={role} />
            <ScrollView contentContainerStyle={styles.content}>

                <Text style={[styles.heading, { color: theme.textPrimary }]}>Subscriptions</Text>
                <Text style={[styles.subheading, { color: theme.textSecondary }]}>
                    Unlock premium features for your Medi account
                </Text>

                <View style={{ gap: 12 }}>

                    {/* ── Medi AI Pro ── */}
                    <View>
                        <DdlHeader
                            ddlKey="ai" title="Medi AI Pro" price="99 EGP/month"
                            badge={hasAiPro} isOpen={openDdl === 'ai'}
                            onPress={() => toggleDdl('ai')} theme={theme}
                        />
                        {openDdl === 'ai' && (
                            <View style={[styles.panel, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                                {[
                                    '✦ Unlimited daily Medi AI requests',
                                    '✦ Priority AI response speed',
                                    '✦ Exclusive Pro badge in chat',
                                    '✦ Star decorations in chat interface',
                                ].map(f => (
                                    <Text key={f} style={[styles.featureText, { color: theme.textPrimary }]}>{f}</Text>
                                ))}
                                <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                                    Free tier: 15 requests per day. Pro removes this limit entirely.
                                </Text>
                                {hasAiPro ? (
                                    <ActiveBanner label="✓ Medi AI Pro is active" />
                                ) : (
                                    <GradBtn
                                        label="Purchase Now — 99 EGP/month"
                                        color={grad}
                                        onPress={() => openPayPopup('ai', 'Medi AI Pro — 99 EGP/month', purchaseAiPro)}
                                    />
                                )}
                            </View>
                        )}
                    </View>

                    {/* ── Purchase Summaries ── */}
                    <View>
                        <DdlHeader
                            ddlKey="summary" title="Purchase Summaries"
                            badge={hasSummaryMonthly} isOpen={openDdl === 'summary'}
                            onPress={() => toggleDdl('summary')} theme={theme}
                        />
                        {openDdl === 'summary' && (
                            <View style={[styles.panel, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                                <View style={{ flexDirection: 'row', gap: 14 }}>
                                    {/* Monthly */}
                                    <View style={{ flex: 1, gap: 10 }}>
                                        <Text style={[styles.subTitle, { color: theme.textPrimary }]}>Monthly Summaries</Text>
                                        <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                                            Generate unlimited summaries each month. Resets every 30 days from your last summary.
                                        </Text>
                                        <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 18 }}>
                                            49 EGP<Text style={{ fontSize: 11, fontWeight: '500', color: theme.textMuted }}>/month</Text>
                                        </Text>
                                        {hasSummaryMonthly ? (
                                            <ActiveBanner label="✓ Active" small />
                                        ) : (
                                            <GradBtn
                                                label="Subscribe"
                                                color={grad}
                                                onPress={() => openPayPopup('summary_monthly', 'Monthly Summaries — 49 EGP/month', purchaseSummaryMonthly)}
                                            />
                                        )}
                                    </View>

                                    <View style={[styles.vertDivider, { backgroundColor: theme.cardBorder }]} />

                                    {/* One-off */}
                                    <View style={{ flex: 1, gap: 10 }}>
                                        <Text style={[styles.subTitle, { color: theme.textPrimary }]}>One Summary</Text>
                                        <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                                            Unlock regeneration once. Locks again after use.
                                        </Text>
                                        <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 18 }}>
                                            10 EGP<Text style={{ fontSize: 11, fontWeight: '500', color: theme.textMuted }}> one-time</Text>
                                        </Text>
                                        <GradBtn
                                            label="Buy Once"
                                            color={grad}
                                            onPress={() => openPayPopup('summary_one', 'One Summary — 10 EGP', purchaseOneSummary)}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* ── Purchase Storage ── */}
                    <View>
                        <DdlHeader
                            ddlKey="storage" title="Purchase Storage" price="25 EGP/month"
                            badge={hasStorage} isOpen={openDdl === 'storage'}
                            onPress={() => toggleDdl('storage')} theme={theme}
                        />
                        {openDdl === 'storage' && (
                            <View style={[styles.panel, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
                                {[
                                    '✦ 500 MB of medical record storage',
                                    '✦ Up from the free 50 MB limit',
                                    '✦ Storage bar reflects new limit',
                                ].map(f => (
                                    <Text key={f} style={[styles.featureText, { color: theme.textPrimary }]}>{f}</Text>
                                ))}
                                <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                                    Free tier: 50 MB. Upgrade to 500 MB for 25 EGP/month.
                                </Text>
                                {hasStorage ? (
                                    <ActiveBanner label="✓ 500 MB storage is active" />
                                ) : (
                                    <GradBtn
                                        label="Purchase Now — 25 EGP/month"
                                        color={grad}
                                        onPress={() => openPayPopup('storage', 'Storage Upgrade — 25 EGP/month', purchaseStorage)}
                                    />
                                )}
                                <Text style={[styles.noteText, { color: '#fc8181', marginTop: 4 }]}>
                                    *Warning: If your storage exceeds 500 MB and you cancel, your oldest files will be automatically deleted.
                                </Text>
                            </View>
                        )}
                    </View>

                </View>

                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={[styles.backText, { color: theme.textSecondary }]}>← Back</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Payment popup */}
            {popup && (
                <Modal visible transparent animationType="fade" onRequestClose={closePopup}>
                    <Pressable style={styles.popupOverlay} onPress={closePopup}>
                        <Pressable
                            style={[styles.popupBox, { backgroundColor: theme.modalBg, borderColor: theme.modalBorder }]}
                            onPress={() => {}}
                        >
                            {paySuccess ? (
                                <View style={{ alignItems: 'center', gap: 12 }}>
                                    <Text style={{ fontSize: 48 }}>✅</Text>
                                    <Text style={[styles.popupTitle, { color: theme.modalText }]}>Purchase successful!</Text>
                                    <Text style={[styles.popupSubtext, { color: theme.modalSubtext }]}>
                                        {popup.label} has been activated.
                                    </Text>
                                    <GradBtn label="Done" color={grad} onPress={closePopup} />
                                </View>
                            ) : (
                                <>
                                    <Text style={[styles.popupTitle, { color: theme.modalText }]}>Complete Purchase</Text>
                                    <Text style={[styles.popupSubtext, { color: theme.modalSubtext }]}>{popup.label}</Text>

                                    <TouchableOpacity
                                        style={[styles.checkRow, { borderColor: theme.modalBorder, backgroundColor: theme.modalInputBg }]}
                                        onPress={() => setSimChecked(c => !c)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={[styles.checkbox, { borderColor: theme.accent }, simChecked && { backgroundColor: theme.accent }]}>
                                            {simChecked && <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                                        </View>
                                        <Text style={[styles.checkLabel, { color: theme.modalText }]}>
                                            Simulate card detail entry
                                        </Text>
                                    </TouchableOpacity>

                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <TouchableOpacity
                                            style={[styles.popupBtn, { borderColor: theme.modalBorder, borderWidth: 1, backgroundColor: theme.modalInputBg }]}
                                            onPress={closePopup}
                                        >
                                            <Text style={{ color: theme.modalSubtext, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.popupBtn, { backgroundColor: simChecked ? grad : theme.cardBg, opacity: simChecked ? 1 : 0.55 }]}
                                            onPress={handlePay}
                                            disabled={!simChecked}
                                        >
                                            <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Pay Now</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
        </SafeAreaView>
    )
}

function DdlHeader({ ddlKey, title, price, badge, isOpen, onPress, theme }) {
    return (
        <TouchableOpacity
            style={[
                styles.ddlHeader,
                { backgroundColor: theme.cardBg, borderColor: isOpen ? theme.cardBorderActive : theme.cardBorder },
                isOpen && styles.ddlHeaderOpen,
            ]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={[styles.ddlTitle, { color: theme.textPrimary }]}>{title}</Text>
                {badge && (
                    <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                    </View>
                )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {price && <Text style={[styles.ddlPrice, { color: theme.textMuted }]}>{price}</Text>}
                <Text style={[styles.chevron, { color: theme.accent }]}>{isOpen ? '▲' : '▼'}</Text>
            </View>
        </TouchableOpacity>
    )
}

function ActiveBanner({ label, small }) {
    return (
        <View style={[styles.activeBannerWrap, small && { paddingVertical: 8, paddingHorizontal: 12 }]}>
            <Text style={[styles.activeBannerText, small && { fontSize: 12 }]}>{label}</Text>
        </View>
    )
}

function GradBtn({ label, color, onPress }) {
    return (
        <TouchableOpacity
            style={[styles.gradBtn, { backgroundColor: color }]}
            onPress={onPress}
            activeOpacity={0.85}
        >
            <Text style={styles.gradBtnText}>{label}</Text>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { padding: 24, paddingBottom: 48 },
    heading: { fontSize: 26, fontWeight: '600', textAlign: 'center', marginBottom: 6, letterSpacing: -0.2 },
    subheading: { fontSize: 13, textAlign: 'center', marginBottom: 28 },
    ddlHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 18, borderRadius: 14, borderWidth: 1,
    },
    ddlHeaderOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    ddlTitle: { fontSize: 15, fontWeight: '600' },
    ddlPrice: { fontSize: 12 },
    chevron: { fontSize: 12 },
    activeBadge: {
        backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.28)', borderRadius: 20,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    activeBadgeText: { color: '#22c55e', fontSize: 10, fontWeight: '700' },
    panel: {
        borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14, padding: 20, gap: 12,
    },
    featureText: { fontSize: 13 },
    noteText: { fontSize: 12, lineHeight: 18 },
    subTitle: { fontSize: 13, fontWeight: '700' },
    vertDivider: { width: 1 },
    activeBannerWrap: {
        backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1.5,
        borderColor: 'rgba(34,197,94,0.32)', borderRadius: 10,
        paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
    },
    activeBannerText: { color: '#22c55e', fontWeight: '700', fontSize: 13 },
    gradBtn: { borderRadius: 10, padding: 12, alignItems: 'center' },
    gradBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
    backBtn: { marginTop: 36, alignItems: 'center' },
    backText: { fontSize: 13, textDecorationLine: 'underline' },
    popupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    popupBox: { borderRadius: 20, padding: 28, width: 320, maxWidth: '90%', borderWidth: 1, gap: 18 },
    popupTitle: { fontSize: 17, fontWeight: '700' },
    popupSubtext: { fontSize: 13 },
    checkRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderRadius: 10, padding: 13, borderWidth: 1,
    },
    checkbox: {
        width: 20, height: 20, borderRadius: 4, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    checkLabel: { fontSize: 13, flex: 1 },
    popupBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
})
