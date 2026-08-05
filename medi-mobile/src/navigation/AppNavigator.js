import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'
import AuthNavigator from './AuthNavigator'

// Placeholder until Phase 3 dashboards are built
function MainPlaceholder() {
    const { user, logout } = useAuth()
    return (
        <View style={styles.main}>
            <Text style={styles.text}>Logged in as {user?.role}</Text>
            <Text style={styles.sub} onPress={logout}>Tap to log out</Text>
        </View>
    )
}

export default function AppNavigator() {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#2596be" />
            </View>
        )
    }

    return (
        <NavigationContainer>
            {user ? <MainPlaceholder /> : <AuthNavigator />}
        </NavigationContainer>
    )
}

const styles = StyleSheet.create({
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f9ff' },
    main: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f9ff', gap: 12 },
    text: { fontSize: 20, fontWeight: '700', color: '#0d2d4a' },
    sub: { fontSize: 14, color: '#2596be', textDecorationLine: 'underline' },
})
