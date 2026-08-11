import { useState, useEffect } from 'react'
import { View, Text, SafeAreaView, TouchableOpacity, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import MediAIChat from '../../components/MediAIChat'
import LoadingOverlay from '../../components/LoadingOverlay'
import api from '../../api/axios'
import { useTheme } from '../../context/ThemeContext'
import { getCache, setCache } from '../../utils/pageCache'

const PILL_COLOR = '#740949'

// Persist selected dependent across navigations (cleared on app restart)
let _cachedDep = null

function makeC(theme) {
    return {
        bg:          theme.pageBg,
        cardBg:      theme.cardBg,
        cardBorder:  theme.cardBorder,
        text:        theme.textPrimary,
        textMuted:   theme.textMuted,
        accent:      theme.accent,
        inputBg:     theme.inputBg,
        inputBorder: theme.inputBorder,
        modalBg:     theme.modalBg,
        modalBorder: theme.modalBorder,
    }
}

export default function GuardianAI() {
    const { theme } = useTheme()
    const C = makeC(theme)

    const [dependents, setDependents]   = useState([])
    const [selectedDep, setSelectedDep] = useState(_cachedDep)
    const [pickerOpen, setPickerOpen]   = useState(false)
    const [loadingDeps, setLoadingDeps] = useState(true)

    const selectDep = (dep) => {
        _cachedDep = dep
        setSelectedDep(dep)
    }

    useEffect(() => {
        const cached = getCache('guardian_ai_deps')
        if (cached) {
            setDependents(cached)
            if (!_cachedDep && cached.length === 1) selectDep(cached[0])
            setLoadingDeps(false)
            return
        }
        api.get('/dependents')
            .then(res => {
                const deps = res.data || []
                setDependents(deps)
                setCache('guardian_ai_deps', deps)
                // Auto-select only if nothing cached yet
                if (!_cachedDep && deps.length === 1) selectDep(deps[0])
            })
            .catch(() => {})
            .finally(() => setLoadingDeps(false))
    }, [])

    const locked = dependents.length > 1 && !selectedDep

    const dependentSelector = !loadingDeps && dependents.length > 0 ? (
        <TouchableOpacity
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.8}
            style={{
                backgroundColor: C.inputBg, borderWidth: 1.5, borderColor: C.inputBorder,
                borderRadius: 12, padding: 12,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            }}
        >
            <Text style={{ color: selectedDep ? C.text : C.textMuted, fontSize: 14 }}>
                {selectedDep ? selectedDep.full_name : 'Select a dependent…'}
            </Text>
            <Text style={{ color: C.textMuted, fontSize: 13 }}>▾</Text>
        </TouchableOpacity>
    ) : null

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <Header role="guardian" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={{ flex: 1 }}>
                    {/* Screen-level overlay — covers MediAIChat + everything below header */}
                    <LoadingOverlay visible={loadingDeps} role="guardian" />
                    <MediAIChat
                        role="guardian"
                        dependentId={selectedDep?.dependent_id}
                        locked={locked}
                        dependentSelector={dependentSelector}
                    />
                </View>
                <BottomNav role="guardian" />
            </KeyboardAvoidingView>

            {/* Dependent picker — centered modal */}
            <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
                <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setPickerOpen(false)}>
                    <Pressable style={{ backgroundColor: C.modalBg, borderRadius: 20, padding: 24, width: 320, maxWidth: '88%', borderWidth: 1, borderColor: C.modalBorder }} onPress={() => {}}>
                        <Text style={{ color: C.accent, fontWeight: '700', fontSize: 16, marginBottom: 4 }}>Select Dependent</Text>
                        <Text style={{ color: C.textSub, fontSize: 12, marginBottom: 16 }}>Choose who to chat about</Text>
                        <View style={{ gap: 8 }}>
                            {dependents.map(dep => (
                                <TouchableOpacity
                                    key={dep.dependent_id}
                                    onPress={() => { selectDep(dep); setPickerOpen(false) }}
                                    activeOpacity={0.75}
                                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: selectedDep?.dependent_id === dep.dependent_id ? `${PILL_COLOR}18` : C.cardBg, borderWidth: 1.5, borderColor: selectedDep?.dependent_id === dep.dependent_id ? PILL_COLOR : C.cardBorder, borderRadius: 12, padding: 14 }}
                                >
                                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '500' }}>{dep.full_name}</Text>
                                    {selectedDep?.dependent_id === dep.dependent_id && (
                                        <Text style={{ color: PILL_COLOR, fontWeight: '700', fontSize: 15 }}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    )
}
