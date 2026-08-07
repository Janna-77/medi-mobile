import {
    View, Text, Image, TouchableOpacity, Pressable,
    StyleSheet, ImageBackground, Dimensions, Modal,
    I18nManager, Animated,
} from 'react-native'
import { useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import * as Updates from 'expo-updates'

const { width } = Dimensions.get('window')

export default function SignUpChoice() {
    const navigation = useNavigation()
    const { t, i18n } = useTranslation()
    return (
        <ImageBackground
            source={require('../../../assets/login-bg.jpg')}
            style={styles.bg}
            resizeMode="cover"
        >
            <LangSwitcher i18n={i18n} t={t} />

            <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
            />

            <Text style={styles.tagline}>{t('signup_choice.tagline')}</Text>

            <View style={styles.card}>
                <Text style={styles.chooseText}>{t('signup_choice.choose')}</Text>

                <HoverButton
                    label={t('signup_choice.independent')}
                    glowColor="#2596be"
                    onPress={() => navigation.navigate('SignupIndependent')}
                />
                <HoverButton
                    label={t('signup_choice.guardian')}
                    glowColor="#99055e"
                    onPress={() => navigation.navigate('SignupGuardian')}
                />
                <HoverButton
                    label={t('signup_choice.doctor')}
                    glowColor="#6a50a0"
                    onPress={() => navigation.navigate('SignupDoctor')}
                />

                <Text style={styles.loginText}>
                    {t('common.already_have_account')}{' '}
                    <Text
                        onPress={() => navigation.navigate('Login')}
                        style={styles.loginLink}
                    >
                        {t('common.login')}
                    </Text>
                </Text>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('About')}>
                <Text style={styles.aboutLink}>{t('about.link')}</Text>
            </TouchableOpacity>
        </ImageBackground>
    )
}

function LangSwitcher({ i18n, t }) {
    const [open, setOpen] = useState(false)

    const changeLanguage = async (code) => {
        const needsRTLChange = (code === 'ar') !== I18nManager.isRTL
        i18n.changeLanguage(code)
        setOpen(false)
        if (needsRTLChange) {
            I18nManager.forceRTL(code === 'ar')
            await Updates.reloadAsync()
        }
    }

    return (
        <>
            <TouchableOpacity style={styles.langBtn} onPress={() => setOpen(true)}>
                <Text style={styles.langBtnText}>🌐 {t('lang.change')}</Text>
            </TouchableOpacity>

            <Modal transparent visible={open} onRequestClose={() => setOpen(false)} animationType="fade">
                <TouchableOpacity style={styles.langOverlay} onPress={() => setOpen(false)} activeOpacity={1}>
                    <View style={styles.langDropdown}>
                        {[['en', 'English'], ['fr', 'Français'], ['ar', 'العربية']].map(([code, label]) => (
                            <TouchableOpacity
                                key={code}
                                style={[styles.langOption, i18n.language === code && styles.langOptionActive]}
                                onPress={() => changeLanguage(code)}
                            >
                                <Text style={[styles.langOptionText, i18n.language === code && styles.langOptionTextBold]}>
                                    {label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    )
}

function HoverButton({ label, glowColor, onPress }) {
    const scale = useRef(new Animated.Value(1)).current

    const onPressIn = () =>
        Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()

    const onPressOut = () =>
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()

    return (
        <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
            <Animated.View style={[styles.roleBtn, { transform: [{ scale }], shadowColor: glowColor }]}>
                <Text style={styles.roleBtnText}>{label}</Text>
            </Animated.View>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    bg: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    logo: {
        width: 130,
        height: 130,
        marginBottom: 4,
    },
    tagline: {
        color: 'white',
        fontSize: 28,
        fontFamily: 'Calistoga',
        textAlign: 'center',
        marginBottom: 24,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 12,
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 24,
        padding: 36,
        width: Math.min(360, width - 48),
        gap: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    chooseText: {
        textAlign: 'center',
        color: 'white',
        fontSize: 20,
        fontFamily: 'Fraunces',
        marginBottom: 10,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    roleBtn: {
        backgroundColor: 'white',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 6,
    },
    roleBtnText: {
        color: '#1a1a1a',
        fontSize: 16,
        fontWeight: '700',
    },
    loginText: {
        textAlign: 'center',
        color: 'white',
        fontSize: 15,
        marginTop: 16,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    loginLink: {
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        color: 'white',
    },
    aboutLink: {
        color: 'white',
        textDecorationLine: 'underline',
        fontSize: 13,
        marginTop: 16,
    },
    // Lang switcher
    langBtn: {
        position: 'absolute',
        top: 52,
        right: 24,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.25)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    langBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    langOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: 100,
        paddingRight: 24,
    },
    langDropdown: {
        backgroundColor: 'rgba(15,25,45,0.97)',
        borderRadius: 12,
        overflow: 'hidden',
        minWidth: 160,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 32,
        elevation: 12,
    },
    langOption: {
        paddingVertical: 12,
        paddingHorizontal: 18,
    },
    langOptionActive: {
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    langOptionText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '500',
    },
    langOptionTextBold: {
        fontWeight: '700',
    },
})
