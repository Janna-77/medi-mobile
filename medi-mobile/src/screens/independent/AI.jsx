import { View, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import MediAIChat from '../../components/MediAIChat'
import { useTheme } from '../../context/ThemeContext'

export default function IndependentAI() {
    const { theme } = useTheme()

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.pageBg }}>
            <Header role="independent" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={{ flex: 1 }}>
                    <MediAIChat role="independent" />
                </View>
                <BottomNav role="independent" />
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
