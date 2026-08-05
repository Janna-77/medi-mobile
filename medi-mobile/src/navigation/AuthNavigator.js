import { createStackNavigator } from '@react-navigation/stack'
import { View, Text, StyleSheet } from 'react-native'

// Converted screens
import Login from '../screens/auth/Login'
import SignupChoice from '../screens/auth/SignupChoice'
import SignupIndependent from '../screens/auth/SignupIndependent'
import SignupGuardian from '../screens/auth/SignupGuardian'
import SignupDoctor from '../screens/auth/SignupDoctor'
import AddDependent from '../screens/auth/AddDependent'
import IndependentAddDoctor from '../screens/auth/IndependentAddDoctor'
import IndependentAddGuardian from '../screens/auth/IndependentAddGuardian'
import GuardianAddDoctor from '../screens/auth/GuardianAddDoctor'
import GuardianAddIndependent from '../screens/auth/GuardianAddIndependent'
import DoctorAddGuardian from '../screens/auth/DoctorAddGuardian'
import DoctorAddIndependent from '../screens/auth/DoctorAddIndependent'

// TODO: swap placeholders as each screen is converted
const Placeholder = ({ route }) => (
    <View style={styles.placeholder}>
        <Text style={styles.text}>{route.name}</Text>
        <Text style={styles.sub}>Not converted yet</Text>
    </View>
)

const Stack = createStackNavigator()

export default function AuthNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { flex: 1 } }}>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="SignupChoice" component={SignupChoice} />
            <Stack.Screen name="Verification" component={Placeholder} />
            <Stack.Screen name="SignupIndependent" component={SignupIndependent} />
            <Stack.Screen name="SignupGuardian" component={SignupGuardian} />
            <Stack.Screen name="SignupDoctor" component={SignupDoctor} />
            <Stack.Screen name="AddDependent" component={AddDependent} />
            <Stack.Screen name="IndependentAddDoctor" component={IndependentAddDoctor} />
            <Stack.Screen name="IndependentAddGuardian" component={IndependentAddGuardian} />
            <Stack.Screen name="GuardianAddDoctor" component={GuardianAddDoctor} />
            <Stack.Screen name="GuardianAddIndependent" component={GuardianAddIndependent} />
            <Stack.Screen name="DoctorAddGuardian" component={DoctorAddGuardian} />
            <Stack.Screen name="DoctorAddIndependent" component={DoctorAddIndependent} />
        </Stack.Navigator>
    )
}

const styles = StyleSheet.create({
    placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
    text: { fontSize: 20, fontWeight: '700', color: '#333' },
    sub: { fontSize: 14, color: '#888', marginTop: 8 },
})
