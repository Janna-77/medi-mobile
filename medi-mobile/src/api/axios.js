import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
})

// Automatically attach token to every request
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('medi_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// Automatically handle expired tokens
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const url = error.config?.url || ''
        const isAuthEndpoint =
            url.includes('/auth/login') ||
            url.includes('/auth/register') ||
            url.includes('/auth/verify')
        if (
            (error.response?.status === 401 || error.response?.status === 403) &&
            !isAuthEndpoint
        ) {
            await AsyncStorage.removeItem('medi_token')
            // Navigation reset is handled by AuthContext + navigator in App.js
        }
        return Promise.reject(error)
    }
)

export default api
