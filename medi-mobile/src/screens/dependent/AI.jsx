import { View, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute } from '@react-navigation/native'
import DependentHeader from '../../components/DependentHeader'
import MediAIChat from '../../components/MediAIChat'
import { useTheme } from '../../context/ThemeContext'

export default function DependentAI() {
    const route = useRoute()
    const { dependentId } = route.params || {}
    const { theme } = useTheme()

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.pageBg }} edges={['bottom']}>
            <DependentHeader dependentId={dependentId} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={{ flex: 1 }}>
                    <MediAIChat role="dependent" dependentId={dependentId} />
                </View>
                <View style={{ height: 30 }} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}
