import { View, Text } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../context/AuthContext'

// ── Built screens ────────────────────────────────────────────────────────────
import IndependentHome from '../screens/independent/Home'
import IndependentProfile from '../screens/independent/Profile'
import GuardianHome from '../screens/guardian/Home'
import GuardianProfile from '../screens/guardian/Profile'
import DoctorHome from '../screens/doctor/Home'
import DoctorProfile from '../screens/doctor/Profile'
import Notifications from '../screens/shared/Notifications'
import Subscriptions from '../screens/shared/Subscriptions'
import ReportSmth from '../screens/shared/ReportSmth'
import About from '../screens/shared/About'

// Upgrade screens reachable from within the app
import IndependentAddDoctor from '../screens/auth/IndependentAddDoctor'
import IndependentAddGuardian from '../screens/auth/IndependentAddGuardian'
import GuardianAddDoctor from '../screens/auth/GuardianAddDoctor'
import GuardianAddIndependent from '../screens/auth/GuardianAddIndependent'
import DoctorAddGuardian from '../screens/auth/DoctorAddGuardian'
import DoctorAddIndependent from '../screens/auth/DoctorAddIndependent'

// ── Placeholder for unbuilt screens ─────────────────────────────────────────
function Soon({ route }) {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#081c2f', gap: 8 }}>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>{route.name}</Text>
            <Text style={{ color: '#7aa8c4', fontSize: 14 }}>Coming soon</Text>
        </View>
    )
}

const Stack = createNativeStackNavigator()

export default function MainNavigator() {
    const { user } = useAuth()

    const initialRoute =
        user?.role === 'guardian' ? 'GuardianHome' :
            user?.role === 'doctor' ? 'DoctorHome' :
                user?.role === 'dependent' ? 'DependentHome' :
                    'IndependentHome'

    return (
        <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false, animation: 'none' }}
        >

            {/* ── Independent ── */}
            <Stack.Screen name="IndependentHome" component={IndependentHome} />
            <Stack.Screen name="IndependentProfile" component={IndependentProfile} />
            <Stack.Screen name="IndependentSettings" component={Soon} />
            <Stack.Screen name="IndependentRecords" component={Soon} />
            <Stack.Screen name="IndependentAI" component={Soon} />

            {/* ── Guardian ── */}
            <Stack.Screen name="GuardianHome" component={GuardianHome} />
            <Stack.Screen name="GuardianSettings" component={Soon} />
            <Stack.Screen name="GuardianProfile" component={GuardianProfile} />
            <Stack.Screen name="AddDependent" component={Soon} />
            <Stack.Screen name="GuardianRecords" component={Soon} />
            <Stack.Screen name="GuardianAI" component={Soon} />

            {/* ── Doctor ── */}
            <Stack.Screen name="DoctorHome" component={DoctorHome} />
            <Stack.Screen name="DoctorProfile" component={DoctorProfile} />
            <Stack.Screen name="DoctorPatients" component={Soon} />

            {/* ── Dependent ── */}
            <Stack.Screen name="DependentHome" component={Soon} />
            <Stack.Screen name="DependentAI" component={Soon} />
            <Stack.Screen name="CallGuardian" component={Soon} />
            <Stack.Screen name="ViewR/S" component={Soon} />

            {/* ── Shared ── */}
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="Subscriptions" component={Subscriptions} />
            <Stack.Screen name="ReportSmth" component={ReportSmth} />
            <Stack.Screen name="About" component={About} />

            {/* ── Account upgrade screens (reachable from Profile) ── */}
            <Stack.Screen name="IndependentAddDoctor" component={IndependentAddDoctor} />
            <Stack.Screen name="IndependentAddGuardian" component={IndependentAddGuardian} />
            <Stack.Screen name="GuardianAddDoctor" component={GuardianAddDoctor} />
            <Stack.Screen name="GuardianAddIndependent" component={GuardianAddIndependent} />
            <Stack.Screen name="DoctorAddGuardian" component={DoctorAddGuardian} />
            <Stack.Screen name="DoctorAddIndependent" component={DoctorAddIndependent} />

        </Stack.Navigator>
    )
}
