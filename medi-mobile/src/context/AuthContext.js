import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api, { setAuthFailureHandler } from '../api/axios'
import { clearAllCaches } from '../utils/pageCache'

export const authContext = createContext()
export const useAuth = () => useContext(authContext)

const parseMode = (raw) =>
    (raw === true || raw === 'true' || raw === 'TRUE' || raw === 'light') ? 'light' : 'dark'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [logoutKey, setLogoutKey] = useState(0)

    useEffect(() => {
        (async () => {
            const [token, storedRole] = await Promise.all([
                AsyncStorage.getItem('medi_token'),
                AsyncStorage.getItem('medi_role'),
            ])
            if (token) {
                try {
                    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
                    const decoded = JSON.parse(atob(b64))
                    // Respect the explicitly stored role (set during role-pick) over JWT's default
                    if (storedRole) decoded.role = storedRole
                    setUser(decoded)
                    api.get('/users/profile').then(async res => {
                        const mode = parseMode(res.data.mode)
                        await AsyncStorage.setItem('medi_mode', mode)
                    }).catch(() => { })
                } catch (err) {
                    await AsyncStorage.removeItem('medi_token')
                }
            }
            setLoading(false)
        })()
    }, [])

    const login = async (token, role, userId) => {
        await AsyncStorage.multiSet([
            ['medi_token', token],
            ['medi_role', role],
            ['medi_userId', String(userId)],
        ])
        try {
            const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
            const decoded = JSON.parse(atob(b64))
            // Always use the explicitly passed role — JWT may carry the server's default role
            decoded.role = role
            setUser(decoded)
            api.get('/users/profile').then(async res => {
                const mode = parseMode(res.data.mode)
                await AsyncStorage.setItem('medi_mode', mode)
            }).catch(() => { })
        } catch (err) {
            setUser({ token, role, userId })
        }
    }

    const logout = async () => {
        clearAllCaches()
        await AsyncStorage.multiRemove(['medi_token', 'medi_role', 'medi_userId', 'medi_mode'])
        setUser(null)
        setLogoutKey(k => k + 1)
    }

    // Give the axios interceptor access to the real logout so a 401 properly
    // clears user state and triggers navigation back to auth screens
    useEffect(() => {
        setAuthFailureHandler(logout)
    }, [])

    const switchAccount = async (targetRole) => {
        try {
            const res = await api.post('/users/switch-account', { targetRole })
            const { token } = res.data
            await AsyncStorage.multiSet([['medi_token', token], ['medi_role', targetRole]])
            const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
            const decoded = JSON.parse(atob(b64))
            decoded.role = targetRole
            setUser(decoded)
            return targetRole
        } catch (err) {
            console.error('Switch failed:', err)
            throw err
        }
    }

    return (
        <authContext.Provider value={{ user, login, logout, loading, logoutKey, switchAccount }}>
            {children}
        </authContext.Provider>
    )
}
