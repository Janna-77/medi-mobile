import { useState, useEffect, useRef } from 'react'
import { View, Image, TouchableOpacity, StyleSheet, Pressable, DeviceEventEmitter } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import api from '../api/axios'
import { useTheme } from '../context/ThemeContext'
import NotificationDrawer from './NotificationDrawer'
import Svg, { Path, Polyline } from 'react-native-svg'

const _isDoctorMsg   = (msg) => msg.startsWith('ACCESS_REQUEST:') || msg.includes('doctor account')
const _isGuardianMsg = (msg) => msg.includes('requested to link') || msg.startsWith('SUMMARY_REQUEST:')
const _isIndepMsg    = (msg) => !_isDoctorMsg(msg) && !_isGuardianMsg(msg)

const countUnreadForRole = (notifs, role) => {
    const byRole = notifs.filter(n => {
        if (role === 'doctor')   return _isDoctorMsg(n.message)
        if (role === 'guardian') return _isGuardianMsg(n.message)
        return _isIndepMsg(n.message)
    })
    return byRole.filter(n => !n.is_read).length
}

function ProfileBtn({ onPress }) {
    const [pressed, setPressed] = useState(false)
    const { theme } = useTheme()
    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={{
                width: 30, height: 30, borderRadius: 9,
                backgroundColor: pressed ? `${theme.accent}33` : `${theme.accent}26`,
                borderWidth: 1,
                borderColor: pressed ? `${theme.accent}66` : `${theme.accent}40`,
                justifyContent: 'center', alignItems: 'center',
            }}
        >
            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <Path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0"
                    stroke={pressed ? theme.accent : theme.textPrimary}
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M4 23c0-4 3.6-7 8-7s8 3 8 7"
                    stroke={pressed ? theme.accent : theme.textPrimary}
                    strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        </Pressable>
    )
}

function NavArrow({ direction, onPress, disabled }) {
    const [pressed, setPressed] = useState(false)
    const { theme } = useTheme()

    const bg        = (pressed && !disabled) ? `${theme.accent}26`      : `${theme.textSecondary}33`
    const borderCol = (pressed && !disabled) ? `${theme.accent}4d`      : `${theme.textSecondary}4d`
    const stroke    = disabled               ? `${theme.textSecondary}40`
                    : pressed                ? theme.accent
                    :                          theme.textSecondary

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            onPressIn={() => !disabled && setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={{
                width: 30, height: 30, borderRadius: 9,
                backgroundColor: disabled ? `${theme.textMuted}1a` : bg,
                borderWidth: 1,
                borderColor: disabled ? `${theme.textMuted}33` : borderCol,
                justifyContent: 'center', alignItems: 'center',
            }}
        >
            <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <Polyline
                    points={direction === 'left' ? '15,18 9,12 15,6' : '9,18 15,12 9,6'}
                    stroke={stroke}
                    strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none"
                />
            </Svg>
        </Pressable>
    )
}

export default function Header({ role }) {
    const navigation = useNavigation()
    const { theme } = useTheme()

    const [notifOpen, setNotifOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const [canGoForward, setCanGoForward] = useState(false)

    const forwardStack  = useRef([])   // { name, params }[]
    const isGoingFwd    = useRef(false)
    const prevRoutes    = useRef(null)

    const homeScreen = `${role.charAt(0).toUpperCase() + role.slice(1)}Home`
    const canGoBack  = navigation.canGoBack()

    // Track forward history by watching the navigation state
    useEffect(() => {
        const unsub = navigation.addListener('state', e => {
            const routes = e.data?.state?.routes
            if (!routes) return

            if (prevRoutes.current !== null) {
                if (routes.length < prevRoutes.current.length) {
                    // went back — push the removed route onto the forward stack
                    const removed = prevRoutes.current.slice(routes.length)
                    const next = [...removed.map(r => ({ name: r.name, params: r.params })), ...forwardStack.current]
                    forwardStack.current = next
                    setCanGoForward(next.length > 0)
                } else if (routes.length > prevRoutes.current.length && !isGoingFwd.current) {
                    // new forward navigation by user — clear forward stack
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

    useEffect(() => {
        api.get('/notifications').then(r => setUnreadCount(countUnreadForRole(r.data, role))).catch(() => {})
    }, [])

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('notifs_updated', (allNotifs) => {
            setUnreadCount(countUnreadForRole(allNotifs, role))
        })
        return () => sub.remove()
    }, [role])

    return (
        <>
            <View style={[styles.topbar, { backgroundColor: theme.topbarBg, borderBottomColor: theme.topbarBorder }]}>

                <View style={styles.arrowGroup}>
                    {role === 'doctor' ? (
                        <ProfileBtn onPress={() => navigation.navigate('DoctorProfile')} />
                    ) : null}
                    <NavArrow direction="left"  onPress={() => navigation.goBack()} disabled={!canGoBack} />
                    <NavArrow direction="right" onPress={handleForward}            disabled={!canGoForward} />
                </View>

                <TouchableOpacity onPress={() => navigation.navigate(homeScreen)} activeOpacity={0.8}>
                    <Image
                        source={require('../../assets/logo.png')}
                        style={[styles.logo, { right: role === 'doctor' ? 35 : 15 }]}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setNotifOpen(true)} activeOpacity={0.75} style={styles.iconBtn}>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <Path
                            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                            stroke={theme.textPrimary}
                            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"
                        />
                        <Path d="M13.73 21a2 2 0 0 1-3.46 0"
                            stroke={theme.textPrimary}
                            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    {unreadCount > 0 && <View style={styles.unreadDot} />}
                </TouchableOpacity>
            </View>

            {notifOpen && <NotificationDrawer role={role} onClose={() => setNotifOpen(false)} />}
        </>
    )
}

const styles = StyleSheet.create({
    topbar:    { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1 },
    logo:      { width: 60, height: 60, right: 15 },
    arrowGroup:{ flexDirection: 'row', gap: 6, alignItems: 'center' },
    iconBtn:   { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    unreadDot: { position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#e53e3e' },
})
