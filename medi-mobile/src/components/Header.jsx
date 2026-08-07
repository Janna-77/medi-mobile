import { useState, useEffect } from 'react'
import {
    View, Text, Image, TouchableOpacity, StyleSheet, Pressable,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import api from '../api/axios'
import NotificationDrawer from './NotificationDrawer'
import Svg, { Path, Polyline } from 'react-native-svg'

const RC = {
    independent: { topBg: 'rgba(14,22,36,0.95)', border: 'rgba(50,90,130,0.35)', },
    guardian: { topBg: 'rgba(14,22,36,0.95)', border: 'rgba(130,50,95,0.35)', },
    doctor: { topBg: 'rgba(14,22,36,0.95)', border: 'rgba(100,50,160,0.35)', },
}

function ProfileBtn({ onPress }) {
    const [pressed, setPressed] = useState(false)
    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={{
                width: 30, height: 30, borderRadius: 9,
                backgroundColor: pressed ? 'rgba(120,50,200,0.12)' : 'rgba(185,145,235,0.25)',
                borderWidth: 1,
                borderColor: pressed ? 'rgba(120,50,200,0.3)' : 'rgba(185,145,235,0.4)',
                justifyContent: 'center', alignItems: 'center',
            }}
        >
            <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <Path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0" stroke={pressed ? '#a070e8' : '#ede8ff'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M4 23c0-4 3.6-7 8-7s8 3 8 7" stroke={pressed ? '#a070e8' : '#ede8ff'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
        </Pressable>
    )
}

function NavArrow({ direction, role, onPress, disabled }) {
    const [pressed, setPressed] = useState(false)
    const isGuardian = role === 'guardian'
    const isDoctor = role === 'doctor'

    const bg = (pressed && !disabled)
        ? (isGuardian ? 'rgba(181,0,110,0.1)' : isDoctor ? 'rgba(120,50,200,0.12)' : 'rgba(0,168,232,0.12)')
        : (isGuardian ? 'rgba(220,140,185,0.25)' : isDoctor ? 'rgba(185,145,235,0.25)' : 'rgba(195,225,248,0.35)')
    const borderCol = (pressed && !disabled)
        ? (isGuardian ? 'rgba(181,0,110,0.3)' : isDoctor ? 'rgba(120,50,200,0.3)' : 'rgba(0,168,232,0.25)')
        : (isGuardian ? 'rgba(220,140,185,0.4)' : isDoctor ? 'rgba(185,145,235,0.4)' : 'rgba(195,225,248,0.5)')
    const stroke = disabled
        ? (isGuardian ? 'rgba(220,140,185,0.2)' : isDoctor ? 'rgba(185,145,235,0.2)' : 'rgba(195,225,248,0.2)')
        : (pressed
            ? (isGuardian ? '#ff8cc8' : isDoctor ? '#a070e8' : '#00a8e8')
            : (isGuardian ? '#b889a4' : isDoctor ? '#9070c0' : '#7aa8c4'))

    const points = direction === 'left' ? '15,18 9,12 15,6' : '9,18 15,12 9,6'

    return (
        <Pressable
            onPress={disabled ? undefined : onPress}
            onPressIn={() => !disabled && setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={{
                width: 30, height: 30, borderRadius: 9,
                backgroundColor: disabled ? 'rgba(255,255,255,0.06)' : bg,
                borderWidth: 1,
                borderColor: disabled ? 'rgba(255,255,255,0.1)' : borderCol,
                justifyContent: 'center', alignItems: 'center',
            }}
        >
            <Svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <Polyline
                    points={points}
                    stroke={stroke}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </Svg>
        </Pressable>
    )
}

export default function Header({ role }) {
    const navigation = useNavigation()
    const c = RC[role] ?? RC.independent

    const [notifOpen, setNotifOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    const homeScreen = `${role.charAt(0).toUpperCase() + role.slice(1)}Home`
    const canGoBack = navigation.canGoBack()

    useEffect(() => {
        api.get('/notifications').then(r => setUnreadCount(r.data.filter(n => !n.is_read).length)).catch(() => { })
    }, [])

    const iconColor = role === 'guardian' ? '#f2ecf0' : role === 'doctor' ? '#ede8ff' : '#7aa8c4'

    return (
        <>
            <View style={[styles.topbar, { backgroundColor: c.topBg, borderBottomColor: c.border }]}>

                {/* Left: profile (doctor) or back/forward arrows */}
                <View style={styles.arrowGroup}>
                    {role === 'doctor' ? (
                        <ProfileBtn onPress={() => navigation.navigate('DoctorProfile')} />
                    ) : null}
                    <NavArrow direction="left" role={role} onPress={() => navigation.goBack()} disabled={!canGoBack} />
                    <NavArrow direction="right" role={role} disabled />
                </View>

                {/* Center: logo */}
                <TouchableOpacity onPress={() => navigation.navigate(homeScreen)} activeOpacity={0.8}>
                    <Image source={require('../../assets/logo.png')} style={[styles.logo, { right: role === 'doctor' ? 35 : 15 }]} resizeMode="contain" />
                </TouchableOpacity>

                {/* Right: bell */}
                <TouchableOpacity onPress={() => setNotifOpen(true)} activeOpacity={0.75} style={styles.iconBtn}>
                    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <Path
                            d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                            stroke={iconColor}
                            strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"
                        />
                        <Path d="M13.73 21a2 2 0 0 1-3.46 0"
                            stroke={iconColor}
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
    topbar: {
        height: 60, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: 1,
    },
    logo: { width: 60, height: 60, right: 15 },
    arrowGroup: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    iconBtn: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    unreadDot: { position: 'absolute', top: 2, right: 2, width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#e53e3e' },
})
