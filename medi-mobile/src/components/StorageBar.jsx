import { useState } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'

const FREE_LIMIT_MB = 50

export default function StorageBar({ usedBytes = 0, role, locked = false }) {
    const { theme } = useTheme()
    const navigation = useNavigation()
    const [expanded, setExpanded] = useState(false)

    const limitMB    = FREE_LIMIT_MB
    const limitBytes = limitMB * 1024 * 1024
    const usedMB     = (usedBytes / (1024 * 1024)).toFixed(1)
    const percent    = Math.min((usedBytes / limitBytes) * 100, 100)
    const barColor   = percent >= 90 ? '#e53e3e' : percent >= 70 ? '#ed8936' : '#22c55e'
    const accent     = theme.accent
    const subsScreen = role === 'guardian' ? 'GuardianSubscriptions' : 'Subscriptions'

    if (locked) return (
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14, marginBottom: 16, alignItems: 'center' }}>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>🔒 Select a dependent first</Text>
        </View>
    )

    return (
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {!expanded && (
                    <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700', flexShrink: 0 }}>Storage Used</Text>
                )}

                {expanded ? (
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ color: theme.textPrimary, fontSize: 13, fontWeight: '700' }}>Storage Used</Text>
                            <TouchableOpacity onPress={() => navigation.navigate(subsScreen)} activeOpacity={0.7}>
                                <Text style={{ color: theme.textSecondary, fontSize: 11, textDecorationLine: 'underline' }}>Purchase extra storage</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ height: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                            <View style={{ height: '100%', width: `${percent}%`, backgroundColor: barColor, borderRadius: 99 }} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{usedMB} MB used</Text>
                            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{limitMB} MB total</Text>
                        </View>
                    </View>
                ) : (
                    <View style={{ flex: 1, height: 15, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${percent}%`, backgroundColor: barColor, borderRadius: 99 }} />
                    </View>
                )}

                {/* Chevron circle — only this toggles */}
                <TouchableOpacity
                    onPress={() => setExpanded(e => !e)}
                    activeOpacity={0.7}
                    style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: `${accent}26`, borderWidth: 1, borderColor: `${accent}40`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={10} color={accent} />
                </TouchableOpacity>
            </View>
        </View>
    )
}
