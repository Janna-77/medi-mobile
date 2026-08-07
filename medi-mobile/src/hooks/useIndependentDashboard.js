import { useState, useEffect } from 'react'
import api from '../api/axios'

export default function useIndependentDashboard() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [profile, setProfile] = useState(null)
    const [records, setRecords] = useState([])
    const [accessList, setAccessList] = useState([])
    const [latestSummary, setLatestSummary] = useState(null)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [profileRes, recordsRes, accessRes, summaryRes] = await Promise.allSettled([
                    api.get('/users/profile'),
                    api.get('/medical'),
                    api.get('/doctors/access'),
                    api.get('/summary'),
                ])

                if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data)
                else setError('Failed to load profile')

                if (recordsRes.status === 'fulfilled') setRecords(recordsRes.value.data ?? [])
                if (accessRes.status === 'fulfilled') setAccessList(accessRes.value.data ?? [])
                if (summaryRes.status === 'fulfilled') setLatestSummary(summaryRes.value.data)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

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
