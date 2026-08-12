import { useState, useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet, Pressable, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import Svg, { Polyline } from 'react-native-svg'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../api/axios'

function NavArrow({ direction, onPress, disabled, DC }) {
    const [pressed, setPressed] = useState(false)
    const active = pressed && !disabled

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            onPressIn={() => !disabled && setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={{
                width: 30, height: 30, borderRadius: 9,
                backgroundColor: disabled ? DC.arrowDisabledBg : active ? DC.arrowBgPressed : DC.arrowBg,
                borderWidth: 1,
                borderColor: disabled ? DC.arrowDisabledBorder : active ? DC.arrowBorderPressed : DC.arrowBorder,
                justifyContent: 'center', alignItems: 'center',
            }}
        >
            <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <Polyline
                    points={direction === 'left' ? '15,18 9,12 15,6' : '9,18 15,12 9,6'}
                    stroke={disabled ? DC.arrowDisabledStroke : active ? DC.arrowStrokePressed : DC.arrowStroke}
                    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none"
                />
            </Svg>
        </Pressable>
    )
}

function makeDC(theme) {
    return {
        topbarBg: theme.topbarBg,
        topbarBorder: theme.topbarBorder,
        arrowBg: theme.cardBg,
        arrowBorder: theme.cardBorder,
        arrowBgPressed: theme.inputBg,
        arrowBorderPressed: theme.cardBorderActive,
        arrowStroke: theme.accent,
        arrowStrokePressed: theme.accent,
        arrowDisabledBg: theme.cardBg,
        arrowDisabledBorder: theme.cardBorder,
        arrowDisabledStroke: theme.textMuted,
    }
}

export default function DependentHeader({ dependentId }) {
    const navigation = useNavigation()
    const insets = useSafeAreaInsets()
    const { logout } = useAuth()
    const { theme, mode, toggleMode } = useTheme()
    const DC = makeDC(theme)
    const lightMode = mode === 'light'

    const handleModeToggle = async () => {
        const newMode = !lightMode  // true = light, false = dark
        await toggleMode()
        try { await api.patch(`/dependents/${dependentId}/mode`, { mode: newMode }) } catch { }
    }

    const handleLogout = () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: logout },
        ])
    }

    const [canGoForward, setCanGoForward] = useState(false)
    const forwardStack = useRef([])
    const isGoingFwd = useRef(false)
    const prevRoutes = useRef(null)

    const canGoBack = navigation.canGoBack()

    useEffect(() => {
        const unsub = navigation.addListener('state', e => {
            const routes = e.data?.state?.routes
            if (!routes) return
            if (prevRoutes.current !== null) {
                if (routes.length < prevRoutes.current.length) {
                    const removed = prevRoutes.current.slice(routes.length)
                    const next = [...removed.map(r => ({ name: r.name, params: r.params })), ...forwardStack.current]
                    forwardStack.current = next
                    setCanGoForward(next.length > 0)
                } else if (routes.length > prevRoutes.current.length && !isGoingFwd.current) {
                    forwardStack.current = []
                    setCanGoForward(false)
                }
            }
            isGoingFwd.current = false
            prevRoutes.current = routes
        })
        return unsub
    }, [navigation])

    const handleForward = () => {
        if (!forwardStack.current.length) return
        isGoingFwd.current = true
        const [next, ...rest] = forwardStack.current
        forwardStack.current = rest
        setCanGoForward(rest.length > 0)
        navigation.navigate(next.name, next.params)
    }

    return (
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: DC.topbarBg, borderBottomColor: DC.topbarBorder }]}>
            <View style={styles.arrowGroup}>
                <NavArrow direction="left" onPress={() => navigation.goBack()} disabled={!canGoBack} DC={DC} />
                <NavArrow direction="right" onPress={handleForward} disabled={!canGoForward} DC={DC} />
            </View>

            <TouchableOpacity onPress={canGoBack ? () => navigation.goBack() : undefined} activeOpacity={canGoBack ? 0.8 : 1}>
                <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            </TouchableOpacity>

            <View style={styles.rightGroup}>
                <TouchableOpacity
                    onPress={handleModeToggle}
                    activeOpacity={0.75}
                    style={{
                        width: 30, height: 30, borderRadius: 9,
                        backgroundColor: DC.arrowBg,
                        borderWidth: 1, borderColor: DC.arrowBorder,
                        justifyContent: 'center', alignItems: 'center',
                    }}
                >
                    <Text style={{ fontSize: 14, lineHeight: 17 }}>{lightMode ? '☀︎' : '⏾'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleLogout}
                    activeOpacity={0.7}
                    style={{
                        width: 50, height: 30, borderRadius: 9,
                        backgroundColor: 'rgba(229,62,62,0.12)',
                        borderWidth: 1, borderColor: 'rgba(229,62,62,0.45)',
                        justifyContent: 'center', alignItems: 'center',
                    }}
                >
                    <Text style={{ color: lightMode ? '#3f0707ff' : '#b59999ff', fontSize: 9, fontWeight: '700', letterSpacing: 0.2 }}>Log out</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, borderBottomWidth: 1,
    },
    arrowGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    rightGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    logo: { width: 60, height: 60, left: 12 },
})
