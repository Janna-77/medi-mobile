import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import api from '../api/axios'

export const authContext = createContext()
export const useAuth = () => useContext(authContext)

const parseMode = (raw) =>
    (raw === true || raw === 'true' || raw === 'TRUE' || raw === 'light') ? 'light' : 'dark'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        (async () => {
            const token = await AsyncStorage.getItem('medi_token')
            if (token) {
                try {
                    const decoded = JSON.parse(atob(token.split('.')[1]))
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
            const decoded = JSON.parse(atob(token.split('.')[1]))
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
        await AsyncStorage.multiRemove(['medi_token', 'medi_role', 'medi_userId', 'medi_mode'])
        setUser(null)
    }

    const switchAccount = async (targetRole) => {
        try {
            const res = await api.post('/users/switch-account', { targetRole })
            const { token } = res.data
            await AsyncStorage.multiSet([['medi_token', token], ['medi_role', targetRole]])
            const decoded = JSON.parse(atob(token.split('.')[1]))
            setUser(decoded)
            return targetRole
        } catch (err) {
            console.error('Switch failed:', err)
            throw err
        }
    }

    return (
        <authContext.Provider value={{ user, login, logout, loading, switchAccount }}>
            {children}
        </authContext.Provider>
    )
}
