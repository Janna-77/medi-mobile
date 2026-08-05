import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import { I18nManager } from 'react-native'

import en from './locales/en.json'
import ar from './locales/ar.json'
import fr from './locales/fr.json'

const SUPPORTED = ['en', 'ar', 'fr']
const deviceLang = Localization.getLocales()?.[0]?.languageCode ?? 'en'
const lng = SUPPORTED.includes(deviceLang) ? deviceLang : 'en'

// RTL layout for Arabic — requires app reload to take full effect
I18nManager.forceRTL(lng === 'ar')

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        ar: { translation: ar },
        fr: { translation: fr },
    },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
})

export default i18n
