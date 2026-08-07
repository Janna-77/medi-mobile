import 'react-native-gesture-handler'
import './src/i18n'
import { useState, useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Asset } from 'expo-asset'
import * as Font from 'expo-font'
import { Calistoga_400Regular } from '@expo-google-fonts/calistoga'
import { Fraunces_400Regular } from '@expo-google-fonts/fraunces'
import { AuthProvider } from './src/context/AuthContext'
import { ThemeProvider } from './src/context/ThemeContext'
import AppNavigator from './src/navigation/AppNavigator'

export default function App() {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        Promise.all([
            Asset.loadAsync([
                require('./assets/signup-bg.gif'),
                require('./assets/login-bg.jpg'),
                require('./assets/logo.png'),
            ]),
            Font.loadAsync({
                Calistoga: Calistoga_400Regular,
                Fraunces: Fraunces_400Regular,
            }),
        ]).finally(() => setReady(true))
    }, [])

    if (!ready) return null

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
