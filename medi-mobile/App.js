import './src/i18n'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from './src/context/AuthContext'
import { ThemeProvider } from './src/context/ThemeContext'

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          {/* Navigation goes here in Phase 2 */}
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
