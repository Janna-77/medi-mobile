import { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, useWindowDimensions } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme } from '../context/ThemeContext'
import Svg, { Path, Rect, Circle } from 'react-native-svg'

// Persisted outside the component so the animation survives screen remounts
const SLIDE_ANIMS = {
    independent: new Animated.Value(0),
    guardian:    new Animated.Value(0),
}

const INDEPENDENT_TABS = [
    { id: 'home',    label: 'Home',    screen: 'IndependentHome' },
    { id: 'records', label: 'Records', screen: 'IndependentRecords' },
    { id: 'ai',      label: 'Medi AI', screen: 'IndependentAI' },
    { id: 'profile', label: 'Profile', screen: 'IndependentProfile' },
]

const GUARDIAN_TABS = [
    { id: 'home',    label: 'Home',    screen: 'GuardianHome' },
    { id: 'records', label: 'Records', screen: 'GuardianRecords' },
    { id: 'ai',      label: 'Medi AI', screen: 'GuardianAI' },
    { id: 'profile', label: 'Profile', screen: 'GuardianProfile' },
]

function HomeIcon({ active, activeColor, inactiveColor }) {
    const c = active ? activeColor : inactiveColor
    const fill = active ? activeColor + '1f' : 'none'
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"
                stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={fill} />
            <Path d="M9 21V13h6v8"
                stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    )
}

function RecordsIcon({ active, activeColor, inactiveColor }) {
    const c = active ? activeColor : inactiveColor
    const fill = active ? activeColor + '1f' : 'none'
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={fill} />
            <Path d="M14 2v6h6" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
            <Path d="M9 13h6M9 17h4" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
        </Svg>
    )
}

function AIIcon({ active, activeColor, inactiveColor }) {
    const c = active ? activeColor : inactiveColor
    const fill = active ? activeColor + '1f' : 'none'
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Rect x="3" y="6" width="18" height="13" rx="3"
                stroke={c} strokeWidth="1.8" fill={fill} />
            <Path d="M8 6V4M12 6V3M16 6V4" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
            <Circle cx="8.5" cy="12.5" r="1.5" fill={c} />
            <Circle cx="15.5" cy="12.5" r="1.5" fill={c} />
            <Path d="M9.5 16c.7.7 1.5 1 2.5 1s1.8-.3 2.5-1"
                stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        </Svg>
    )
}

function ProfileIcon({ active, activeColor, inactiveColor }) {
    const c = active ? activeColor : inactiveColor
    const fill = active ? activeColor + '1f' : 'none'
    return (
        <Svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" fill={fill} />
            <Path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
                stroke={c} strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
    )
}

const ICON_MAP = [HomeIcon, RecordsIcon, AIIcon, ProfileIcon]

// Role-specific gradient for the active-tab indicator (unchanged by mode)
const GRADIENT = {
    guardian:    ['#740949', '#e87090'],
    independent: ['#006fa6', '#00a8e8'],
}

export default function BottomNav({ role = 'independent' }) {
    const navigation = useNavigation()
    const route = useRoute()
    const { width } = useWindowDimensions()
    const { theme } = useTheme()

    const isGuardian = role === 'guardian'
    const tabs = isGuardian ? GUARDIAN_TABS : INDEPENDENT_TABS
    const currentScreen = route.name
    const activeIdx = tabs.findIndex(t => t.screen === currentScreen)

    const activeColor   = theme.accent
    const inactiveColor = theme.textSecondary
    const gradientColors = GRADIENT[role] ?? GRADIENT.independent

    const tabWidth = width / 4
    const indicatorWidth = width * 0.15
    const slideAnim = SLIDE_ANIMS[role] ?? SLIDE_ANIMS.independent

    useEffect(() => {
        if (activeIdx < 0) return
        Animated.timing(slideAnim, { toValue: activeIdx, duration: 280, useNativeDriver: false }).start()
    }, [activeIdx])

    const indicatorLeft = slideAnim.interpolate({
        inputRange:  [0, 1, 2, 3],
        outputRange: [0, 1, 2, 3].map(i => i * tabWidth + (tabWidth - indicatorWidth) / 2),
    })

    return (
        <View style={[styles.nav, { backgroundColor: theme.topbarBg, borderTopColor: theme.topbarBorder }]}>
            {activeIdx >= 0 && (
                <Animated.View style={[styles.indicator, { left: indicatorLeft, width: indicatorWidth }]}>
                    <LinearGradient
                        colors={gradientColors}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            )}

            {tabs.map((tab, i) => {
                const active = currentScreen === tab.screen
                const Icon = ICON_MAP[i]
                return (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => navigation.navigate(tab.screen)}
                        style={styles.tab}
                        activeOpacity={0.7}
                    >
                        <Icon active={active} activeColor={activeColor} inactiveColor={inactiveColor} />
                        <Text style={[styles.label, { color: active ? activeColor : inactiveColor, fontWeight: active ? '700' : '500' }]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    nav:       { flexDirection: 'row', borderTopWidth: 1, paddingBottom: 20, paddingTop: 8, height: 72, position: 'relative' },
    indicator: { position: 'absolute', top: 0, height: 2.5, borderRadius: 2, overflow: 'hidden' },
    tab:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
    label:     { fontSize: 10, letterSpacing: 0.1 },
})
