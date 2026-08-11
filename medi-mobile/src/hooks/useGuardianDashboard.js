import { useState, useEffect } from 'react'
import api from '../api/axios'
import { getCache, setCache, clearCache } from '../utils/pageCache'

const CACHE_KEY = 'guardian_dashboard'

export default function useGuardianDashboard() {
    const cached = getCache(CACHE_KEY)

    const [loading,          setLoading]          = useState(!cached)
    const [refreshing,       setRefreshing]       = useState(false)
    const [fetchKey,         setFetchKey]         = useState(0)
    const [profile,          setProfile]          = useState(cached?.profile          ?? null)
    const [dependents,       setDependents]       = useState(cached?.dependents       ?? [])
    const [totalRecords,     setTotalRecords]     = useState(cached?.totalRecords     ?? 0)
    const [lastUploadRecord, setLastUploadRecord] = useState(cached?.lastUploadRecord ?? null)
    const [latestSummary,    setLatestSummary]    = useState(cached?.latestSummary    ?? null)
    const [recentActivity,   setRecentActivity]   = useState(cached?.recentActivity   ?? [])

    useEffect(() => {
        const currentCached = getCache(CACHE_KEY)
        const isBackground = !!currentCached

        const fetchAll = async () => {
            try {
                const [profileRes, dependentsRes] = await Promise.allSettled([
                    api.get('/users/profile'),
                    api.get('/dependents'),
                ])

                const newProfile = profileRes.status === 'fulfilled' ? profileRes.value.data : (profile ?? null)
                const deps = dependentsRes.status === 'fulfilled' ? (dependentsRes.value.data || []) : (dependents ?? [])

                let totalRecordsNew   = 0
                let lastUploadNew     = null
                let latestSummaryNew  = null
                let recentActivityNew = []

                if (deps.length > 0) {
                    const [recordResults, summaryResults] = await Promise.all([
                        Promise.allSettled(deps.map(d => api.get('/medical', { params: { dependent_id: d.dependent_id } }))),
                        Promise.allSettled(deps.map(d => api.get('/summary', { params: { dependent_id: d.dependent_id, all: true } }))),
                    ])

                    const allRecords = []
                    recordResults.forEach((res, i) => {
                        if (res.status === 'fulfilled') {
                            ;(res.value.data || []).forEach(r => allRecords.push({
                                ...r,
                                dependent_name: deps[i].full_name,
                                dependent_id:   deps[i].dependent_id,
                            }))
                        }
                    })

                    const allSummaries = []
                    summaryResults.forEach((res, i) => {
                        if (res.status === 'fulfilled') {
                            const data = res.value.data
                            const arr  = Array.isArray(data) ? data : (data ? [data] : [])
                            arr.forEach(s => allSummaries.push({
                                ...s,
                                dependent_name: deps[i].full_name,
                                dependent_id:   deps[i].dependent_id,
                            }))
                        }
                    })

                    totalRecordsNew = allRecords.length

                    lastUploadNew = allRecords.find(r => r.most_recent)
                        ?? [...allRecords].sort((a, b) =>
                            new Date(b.upload_date || b.created_at) - new Date(a.upload_date || a.created_at)
                        )[0]
                        ?? null

                    latestSummaryNew = [...allSummaries]
                        .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))[0]
                        ?? null

                    recentActivityNew = [
                        ...allRecords.map(r   => ({ type: 'record',  data: r, date: r.upload_date || r.created_at })),
                        ...allSummaries.map(s => ({ type: 'summary', data: s, date: s.generated_at })),
                    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
                }

                const fresh = {
                    profile:          newProfile,
                    dependents:       deps,
                    totalRecords:     totalRecordsNew,
                    lastUploadRecord: lastUploadNew,
                    latestSummary:    latestSummaryNew,
                    recentActivity:   recentActivityNew,
                }

                setCache(CACHE_KEY, fresh)
                setProfile(fresh.profile)
                setDependents(fresh.dependents)
                setTotalRecords(fresh.totalRecords)
                setLastUploadRecord(fresh.lastUploadRecord)
                setLatestSummary(fresh.latestSummary)
                setRecentActivity(fresh.recentActivity)
            } finally {
                if (!isBackground) setLoading(false)
                setRefreshing(false)
            }
        }

        fetchAll()
    }, [fetchKey]) // eslint-disable-line react-hooks/exhaustive-deps

    const refresh = () => {
        clearCache(CACHE_KEY)
        setRefreshing(true)
        setFetchKey(k => k + 1)
    }

    let ctaType = 'ai'
    if (dependents.length === 0) ctaType = 'addDependent'
    else if (totalRecords === 0) ctaType = 'upload'

    return {
        loading,
        refreshing,
        refresh,
        profile,
        dependents,
        dependentsCount:  dependents.length,
        totalRecords,
        lastUpload:       lastUploadRecord?.upload_date ?? lastUploadRecord?.created_at ?? null,
        lastUploadRecord,
        latestSummary,
        recentActivity,
        ctaType,
    }
}
