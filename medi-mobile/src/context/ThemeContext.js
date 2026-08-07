import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { THEMES } from '../theme/themes'
import { authContext } from './AuthContext'

const ThemeContext = createContext(null)

export const ThemeProvider = ({ children }) => {
    const { user } = useContext(authContext)
    const [mode, setMode] = useState('dark')
    const [themeReady, setThemeReady] = useState(false)

    // Load saved mode from AsyncStorage on mount — gate themeReady on completion
    useEffect(() => {
        AsyncStorage.getItem('medi_mode').then(saved => {
            if (saved === 'light' || saved === 'dark') setMode(saved)
        }).finally(() => setThemeReady(true))
    }, [])

    // Re-sync whenever the user changes (e.g. after login / role switch)
    useEffect(() => {
        if (!user) return
        AsyncStorage.getItem('medi_mode').then(saved => {
            if (saved === 'light' || saved === 'dark') setMode(saved)
        })
    }, [user])

    const toggleMode = async () => {
        const next = mode === 'light' ? 'dark' : 'light'
        setMode(next)
        await AsyncStorage.setItem('medi_mode', next)
    }

    const role = user?.role ?? 'independent'
    const theme = THEMES[role]?.[mode] ?? THEMES.independent.dark

    return (
        <ThemeContext.Provider value={{ theme, role, mode, themeReady, toggleMode }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
