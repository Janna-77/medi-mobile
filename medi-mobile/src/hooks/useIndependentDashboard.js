import { useState, useEffect } from 'react'
import api from '../api/axios'
import { getCache, setCache } from '../utils/pageCache'

const CACHE_KEY = 'independent_dashboard'

export default function useIndependentDashboard(fetchKey = 0) {
    const _cached = getCache(CACHE_KEY)
    const [loading, setLoading] = useState(!_cached)
    const [error, setError] = useState(null)
    const [profile, setProfile] = useState(_cached?.profile ?? null)
    const [records, setRecords] = useState(_cached?.records ?? [])
    const [accessList, setAccessList] = useState(_cached?.accessList ?? [])
    const [latestSummary, setLatestSummary] = useState(_cached?.latestSummary ?? null)

    useEffect(() => {
        const cached = getCache(CACHE_KEY)
        if (cached && fetchKey === 0) {
            setProfile(cached.profile)
            setRecords(cached.records)
            setAccessList(cached.accessList)
            setLatestSummary(cached.latestSummary)
            setLoading(false)
            return
        }
        setLoading(true)
        const fetchAll = async () => {
            try {
                const [profileRes, recordsRes, accessRes, summaryRes] = await Promise.allSettled([
                    api.get('/users/profile'),
                    api.get('/medical'),
                    api.get('/doctors/access'),
                    api.get('/summary'),
                ])

                const newProfile = profileRes.status === 'fulfilled' ? profileRes.value.data : null
                const newRecords = recordsRes.status === 'fulfilled' ? (recordsRes.value.data ?? []) : []
                const newAccessList = accessRes.status === 'fulfilled' ? (accessRes.value.data ?? []) : []
                const newLatestSummary = summaryRes.status === 'fulfilled' ? summaryRes.value.data : null

                if (profileRes.status === 'fulfilled') setProfile(newProfile)
                else setError('Failed to load profile')

                setRecords(newRecords)
                setAccessList(newAccessList)
                setLatestSummary(newLatestSummary)

                setCache(CACHE_KEY, {
                    profile: newProfile,
                    records: newRecords,
                    accessList: newAccessList,
                    latestSummary: newLatestSummary,
                })
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [fetchKey]) // eslint-disable-line react-hooks/exhaustive-deps

    const sortedRecords = [...records].sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date))
    const totalRecords = records.length
    const lastUpload = sortedRecords[0]?.upload_date ?? null
    const approvedDoctors = accessList.filter(a => a.status === 'approved')
    const doctorsCount = approvedDoctors.length

    let ctaType = 'ai'
    if (totalRecords === 0) ctaType = 'upload'
    else if (!latestSummary) ctaType = 'summary'

    const recentActivity = [
        ...sortedRecords.slice(0, 3).map(r => ({ type: 'record', data: r, date: r.upload_date })),
        latestSummary ? { type: 'summary', data: latestSummary, date: latestSummary.generated_at } : null,
        approvedDoctors.length > 0 ? { type: 'doctor', data: approvedDoctors[0], date: approvedDoctors[0].granted_at } : null,
    ]
        .filter(Boolean)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5)

    return {
        loading, error, profile, records,
        totalRecords, lastUpload, doctorsCount,
        latestSummary, approvedDoctors,
        recentActivity, ctaType,
    }
}
