import { useState } from 'react'
import {
    View, Text, TouchableOpacity, TextInput, ScrollView,
    StyleSheet, Linking, SafeAreaView,
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import Header from '../../components/Header'

const TABS = [
    { id: 'bug',        label: 'Bug',        placeholder: 'Report a bug...' },
    { id: 'suggestion', label: 'Suggestion', placeholder: 'Leave us a suggestion...' },
    { id: 'other',      label: 'Other',      placeholder: 'Other...' },
]

const GRADIENT = {
    independent: '#006fa6',
    guardian:    '#740949',
    doctor:      '#5a1e96',
}

const BG = {
    independent: '#081c2f',
    guardian:    '#1c0818',
    doctor:      '#120820',
}

export default function ReportSmth() {
    const { user } = useAuth()
    const role = user?.role || 'independent'
    const accentColor = GRADIENT[role] || GRADIENT.independent
    const bgColor     = BG[role]      || BG.independent

    const [tab, setTab]       = useState('bug')
    const [msg, setMsg]       = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError]   = useState('')

    const activePlaceholder = TABS.find(t => t.id === tab)?.placeholder || ''

    const handleSubmit = async () => {
        if (!msg.trim()) { setError('Please write a message before submitting.'); return }
        setLoading(true)
        setError('')
        try {
            await api.post('/users/report', { report_type: tab, report_msg: msg.trim() })
            setSuccess(true)
            setMsg('')
            setTimeout(() => setSuccess(false), 3000)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: bgColor }]}>
            <Header role={role} />
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

                <Text style={styles.title}>Help Medi Serve You Better</Text>
                <Text style={styles.subtitle}>Your feedback shapes the experience for everyone.</Text>

                {/* Tabs */}
                <View style={styles.tabBar}>
                    {TABS.map(({ id, label }) => (
                        <TouchableOpacity
                            key={id}
                            style={[styles.tab, tab === id && { backgroundColor: accentColor }]}
                            onPress={() => { setTab(id); setMsg(''); setError('') }}
                        >
                            <Text style={[styles.tabText, tab === id && { color: 'white', fontWeight: '700' }]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Char counter */}
                <View style={styles.counterRow}>
                    <Text style={[styles.counter, msg.length > 900 && { color: '#e53e3e' }]}>
                        {msg.length}/1000
                    </Text>
                </View>

                {/* Text box */}
                <View style={styles.textBox}>
                    <TextInput
                        style={styles.textInput}
                        value={msg}
                        onChangeText={v => { if (v.length <= 1000) setMsg(v) }}
                        placeholder={activePlaceholder}
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                    />
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}
                {success && <Text style={styles.successText}>Submitted! Thank you for your feedback.</Text>}

                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: accentColor }, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    <Text style={styles.submitBtnText}>{loading ? 'Submitting...' : 'Submit'}</Text>
                </TouchableOpacity>

                <Text style={styles.contactText}>Have a question?</Text>
                <Text style={styles.contactText}>
                    Contact us at{' '}
                    <Text
                        style={[styles.contactLink, { color: accentColor }]}
                        onPress={() => Linking.openURL('mailto:mediegyptofficial@gmail.com?subject=I have a question')}
                    >
                        mediegyptofficial@gmail.com
                    </Text>
                </Text>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { padding: 20, paddingBottom: 48 },
    title: { color: 'white', fontSize: 26, fontWeight: '700', letterSpacing: -0.3, marginBottom: 6 },
    subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 28 },
    tabBar: {
        flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14, padding: 4, marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
    counterRow: { alignItems: 'flex-end', marginBottom: 6 },
    counter: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
    textBox: {
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
        padding: 16, marginBottom: 16, borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)', minHeight: 140,
    },
    textInput: { color: 'white', fontSize: 14, lineHeight: 22, minHeight: 110 },
    errorText: { color: '#e53e3e', fontSize: 13, marginBottom: 12 },
    successText: { color: '#38a169', fontSize: 13, marginBottom: 12 },
    submitBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 24 },
    submitBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
    contactText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', marginBottom: 2 },
    contactLink: { textDecorationLine: 'underline' },
})
