import 'react-native-gesture-handler'
import './src/i18n'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './src/context/AuthContext'
import { ThemeProvider } from './src/context/ThemeContext'
import AppNavigator from './src/navigation/AppNavigator'

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <AuthProvider>
                    <ThemeProvider>
                        <AppNavigator />
                    </ThemeProvider>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    )
}
