import { useState } from 'react'
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, SafeAreaView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import Header from '../../components/Header'

const COLORS = {
    independent: {
        bg: '#081c2f',
        cardBg: 'rgba(13,31,51,0.92)',
        cardBorder: 'rgba(0,168,232,0.18)',
        heading: '#d6e8f7',
        para: '#7aa8c4',
        accent: '#00a8e8',
        divider: 'rgba(40,90,150,0.4)',
        accordionBorderActive: 'rgba(0,168,232,0.35)',
    },
    guardian: {
        bg: '#1c0818',
        cardBg: 'rgba(50,10,35,0.92)',
        cardBorder: 'rgba(160,55,105,0.35)',
        heading: '#f4d0e0',
        para: '#c090b0',
        accent: '#e87090',
        divider: 'rgba(160,55,105,0.4)',
        accordionBorderActive: 'rgba(232,112,144,0.4)',
    },
    doctor: {
        bg: '#120820',
        cardBg: 'rgba(30,12,55,0.92)',
        cardBorder: 'rgba(120,70,200,0.35)',
        heading: '#e8d8f8',
        para: '#b090d8',
        accent: '#a78bfa',
        divider: 'rgba(120,70,200,0.4)',
        accordionBorderActive: 'rgba(139,92,246,0.4)',
    },
}

export default function About() {
    const navigation = useNavigation()
    const { t } = useTranslation()
    const { user } = useAuth()
    const role = user?.role || 'independent'
    const c = COLORS[role] || COLORS.independent

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
            {user && <Header role={role} />}
            <ScrollView contentContainerStyle={styles.content}>

                {!user && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 24 }}>
                        <Text style={[styles.backLink, { color: c.accent }]}>← Back</Text>
                    </TouchableOpacity>
                )}

                <Text style={[styles.title, { color: c.heading }]}>{t('about.title')}</Text>

                <Card c={c}>
                    <Text style={[styles.para, { color: c.para }]}>{t('about.intro_p1')}</Text>
                    <Text style={[styles.para, { color: c.para }]}>{t('about.intro_p2')}</Text>
                    <Text style={[styles.para, { color: c.para, marginBottom: 0 }]}>{t('about.intro_p3')}</Text>
                </Card>

                <View style={{ gap: 12, marginTop: 12, marginBottom: 24 }}>
                    <Accordion title={t('about.ddl_indep_title')} c={c}>
                        {['ddl_indep_p1', 'ddl_indep_p2', 'ddl_indep_p3', 'ddl_indep_p4', 'ddl_indep_p5'].map((k, i, arr) => (
                            <Text key={k} style={[styles.para, { color: c.para, marginBottom: i === arr.length - 1 ? 0 : 14 }]}>
                                {t(`about.${k}`)}
                            </Text>
                        ))}
                    </Accordion>

                    <Accordion title={t('about.ddl_guardian_title')} c={c}>
                        {['ddl_guardian_p1', 'ddl_guardian_p2', 'ddl_guardian_p3', 'ddl_guardian_p4', 'ddl_guardian_p5', 'ddl_guardian_p6', 'ddl_guardian_p7'].map((k, i, arr) => (
                            <Text key={k} style={[styles.para, { color: c.para, marginBottom: i === arr.length - 1 ? 0 : 14 }]}>
                                {t(`about.${k}`)}
                            </Text>
                        ))}
                    </Accordion>

                    <Accordion title={t('about.ddl_doctor_title')} c={c}>
                        {['ddl_doctor_p1', 'ddl_doctor_p2', 'ddl_doctor_p3', 'ddl_doctor_p4'].map((k, i, arr) => (
                            <Text key={k} style={[styles.para, { color: c.para, marginBottom: i === arr.length - 1 ? 0 : 14 }]}>
                                {t(`about.${k}`)}
                            </Text>
                        ))}
                    </Accordion>
                </View>

                <Text style={[styles.contactText, { color: c.para }]}>Have a question? Contact us at{' '}
                    <Text
                        style={{ color: c.accent, textDecorationLine: 'underline' }}
                        onPress={() => Linking.openURL('mailto:mediegyptofficial@gmail.com?subject=I have a question')}
                    >
                        mediegyptofficial@gmail.com
                    </Text>
                </Text>
            </ScrollView>
        </SafeAreaView>
    )
}

function Card({ children, c }) {
    return (
        <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.cardBorder }]}>
            {children}
        </View>
    )
}

function Accordion({ title, children, c }) {
    const [open, setOpen] = useState(false)
    return (
        <View style={[styles.accordion, { backgroundColor: c.cardBg, borderColor: open ? c.accordionBorderActive : c.cardBorder }]}>
            <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setOpen(o => !o)}
                activeOpacity={0.8}
            >
                <Text style={[styles.accordionTitle, { color: c.heading }]}>{title}</Text>
                <Text style={[styles.accordionChevron, { color: c.accent }]}>{open ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {open && (
                <View style={styles.accordionBody}>
                    <View style={[styles.accordionDivider, { backgroundColor: c.divider }]} />
                    {children}
                </View>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    content: { padding: 20, paddingBottom: 48 },
    backLink: { fontSize: 14, fontWeight: '600' },
    title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.3, marginBottom: 20 },
    para: { fontSize: 14, lineHeight: 24 },
    card: { borderRadius: 18, padding: 24, borderWidth: 1, marginBottom: 0 },
    accordion: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
    accordionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20,
    },
    accordionTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
    accordionChevron: { fontSize: 12, marginLeft: 12 },
    accordionBody: { paddingHorizontal: 24, paddingBottom: 24 },
    accordionDivider: { height: 1, marginBottom: 18 },
    contactText: { textAlign: 'center', fontSize: 13 },
})
