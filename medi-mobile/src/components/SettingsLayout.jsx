import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'

const COLORS = {
    guardian:    { bg: '#1a0a14', header: 'rgba(90,10,60,0.94)', border: 'rgba(220,140,185,0.25)', text: '#f4d0e0' },
    doctor:      { bg: '#0f0820', header: 'rgba(59,31,94,0.94)',  border: 'rgba(185,145,235,0.25)', text: '#e8d8f8' },
    independent: { bg: '#081c2f', header: 'rgba(8,28,47,0.94)',   border: 'rgba(0,168,232,0.2)',    text: '#e0f0ff' },
}

export default function SettingsLayout({ role, buttons }) {
    const c = COLORS[role] ?? COLORS.independent

    return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: c.header, borderBottomColor: c.border }]}>
                <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
                <Text style={[styles.title, { color: c.text }]}>Account Settings</Text>
                <View style={{ width: 38 }} />
            </View>

            {/* Buttons list */}
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                {buttons.map((btn, i) => (
                    <SettingsButton
                        key={i}
                        label={btn.label}
                        onPress={btn.onClick}
                        disabled={btn.disabled}
                        pending={btn.pending}
                        color={c.text}
                        isLast={i === buttons.length - 1}
                    />
                ))}
            </ScrollView>
        </View>
    )
}

function SettingsButton({ label, onPress, disabled, pending, color, isLast }) {
    return (
        <TouchableOpacity
            onPress={disabled ? undefined : onPress}
            activeOpacity={disabled ? 1 : 0.65}
            style={[
                styles.btn,
                !isLast && styles.btnBorder,
                disabled && styles.btnDisabled,
            ]}
        >
            <Text style={[styles.btnText, { color: disabled ? 'rgba(255,255,255,0.3)' : color }]}>
                {label}
            </Text>
            {disabled && (
                <Text style={styles.btnSub}>
                    {pending ? '(pending)' : '(already active)'}
                </Text>
            )}
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container:  { flex: 1 },
    header:     { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 1 },
    logo:       { width: 38, height: 38 },
    title:      { fontSize: 18, fontWeight: '700' },
    list:       { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 32 },
    btn:        { paddingVertical: 18, paddingHorizontal: 4 },
    btnBorder:  { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)' },
    btnDisabled:{ opacity: 0.6 },
    btnText:    { fontSize: 14, fontWeight: '700' },
    btnSub:     { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 },
})
