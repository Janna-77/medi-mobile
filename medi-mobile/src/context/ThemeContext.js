import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { THEMES } from '../theme/themes'
import { authContext } from './AuthContext'

const ThemeContext = createContext(null)

export const ThemeProvider = ({ children }) => {
    const { user } = useContext(authContext)
    const [mode, setMode] = useState('light')

    // Load saved mode from AsyncStorage on mount
    useEffect(() => {
        (async () => {
            const saved = await AsyncStorage.getItem('medi_mode')
            if (saved === 'light' || saved === 'dark') setMode(saved)
        })()
    }, [])

    // Re-sync mode from AsyncStorage whenever the user changes (e.g. after login)
    useEffect(() => {
        if (!user) return
        (async () => {
            const saved = await AsyncStorage.getItem('medi_mode')
            if (saved === 'light' || saved === 'dark') setMode(saved)
        })()
    }, [user])

    const toggleMode = async () => {
        const next = mode === 'light' ? 'dark' : 'light'
        setMode(next)
        await AsyncStorage.setItem('medi_mode', next)
    }

    const role = user?.role ?? 'independent'
    const theme = THEMES[role]?.[mode] ?? THEMES.independent.light

    return (
        <ThemeContext.Provider value={{ theme, role, mode, toggleMode }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
