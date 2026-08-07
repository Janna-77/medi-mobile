import { View } from 'react-native'
import BottomNav from '../components/BottomNav'

export default function IndependentLayout({ children }) {
    return (
        <View style={{ flex: 1 }}>
            {children}
            <BottomNav role="independent" />
        </View>
    )
}
