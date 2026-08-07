import { useState, useEffect } from 'react'
import api from '../api/axios'

export default function useGuardianDashboard() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [profile, setProfile] = useState(null)
    const [dependents, setDependents] = useState([])
    const [records, setRecords] = useState([])
    const [latestSummary, setLatestSummary] = useState(null)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [profileRes, dependentsRes, recordsRes, summaryRes] = await Promise.allSettled([
                    api.get('/users/profile'),
                    api.get('/dependents'),
                    api.get('/medical'),   // returns records for all guardian's dependents
                    api.get('/summary'),   // returns latest summary across dependents
                ])

                if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data)
                else setError('Failed to load profile')

                if (dependentsRes.status === 'fulfilled') setDependents(dependentsRes.value.data ?? [])
                if (recordsRes.status === 'fulfilled') setRecords(recordsRes.value.data ?? [])
                if (summaryRes.status === 'fulfilled') setLatestSummary(summaryRes.value.data ?? null)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    const sortedRecords = [...records].sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date))
    const dependentsCount = dependents.length
    const totalRecords = records.length
    const lastUploadRecord = sortedRecords[0] ?? null
    const lastUpload = lastUploadRecord?.upload_date ?? null

    let ctaType = 'ai'
    if (dependentsCount === 0) ctaType = 'addDependent'
    else if (totalRecords === 0) ctaType = 'upload'

    const SUMMARY_LABELS = { SOAP: 'SOAP Note', referral: 'Referral Letter', report: 'Medical Report' }

    const recentActivity = [
        ...sortedRecords.slice(0, 3).map(r => ({ type: 'record', data: r, date: r.upload_date })),
        latestSummary ? { type: 'summary', data: latestSummary, date: latestSummary.generated_at } : null,
    ]
        .filter(Boolean)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)

    return {
        loading, error, profile,
        dependents, dependentsCount,
        totalRecords, lastUpload, lastUploadRecord,
        latestSummary,
        recentActivity, ctaType,
    }
}
