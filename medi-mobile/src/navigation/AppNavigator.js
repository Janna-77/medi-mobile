import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import AuthNavigator from './AuthNavigator'
import MainNavigator from './MainNavigator'

export default function AppNavigator() {
    const { user, loading } = useAuth()
    const { themeReady } = useTheme()

    if (loading || !themeReady) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#2596be" />
            </View>
        )
    }

    return (
        <NavigationContainer key={user ? 'authed' : 'guest'}>
            {user ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    )
}

const styles = StyleSheet.create({
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#081c2f' },
})
