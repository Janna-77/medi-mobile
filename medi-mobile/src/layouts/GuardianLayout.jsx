import { View } from 'react-native'
import BottomNav from '../components/BottomNav'

export default function GuardianLayout({ children }) {
    return (
        <View style={{ flex: 1 }}>
            {children}
            <BottomNav role="guardian" />
        </View>
    )
}
