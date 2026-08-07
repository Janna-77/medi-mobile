import { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import Svg, { Polyline, Circle } from 'react-native-svg'

const W        = 210
const H        = 78
const BASELINE = 52

const SPEED         = 0.004
const FADE_DELAY    = 400
const FADE_DURATION = 1000
const SEGMENTS      = 24

function buildECGPoints() {
    const pts = []
    for (let i = 0; i <= W; i++) {
        const t = i / W
        let y = BASELINE
        if (t >= 0.15 && t < 0.27) {
            y = BASELINE + 8 * Math.sin((t - 0.15) / 0.12 * Math.PI)
        } else if (t >= 0.32 && t < 0.44) {
            y = BASELINE - 8 * Math.sin((t - 0.32) / 0.12 * Math.PI)
        } else if (t >= 0.49 && t <= 0.56) {
            const peakT = 0.515
            y = t <= peakT
                ? BASELINE - 44 * ((t - 0.49) / (peakT - 0.49))
                : BASELINE - 44 * (1 - (t - peakT) / (0.56 - peakT))
        } else if (t >= 0.61 && t < 0.76) {
            y = BASELINE + 18 * Math.sin((t - 0.61) / 0.15 * Math.PI)
        }
        pts.push([i, y])
    }
    return pts
}

const ECG_PTS = buildECGPoints()

function ptsStr(startIdx, endIdx) {
    let s = ''
    for (let i = startIdx; i <= endIdx; i++) s += `${ECG_PTS[i][0]},${ECG_PTS[i][1]} `
    return s.trim()
}

function getColor(role) {
    return role === 'guardian'  ? '#ff8cc8'
         : role === 'doctor'    ? '#a070e8'
         : role === 'dependent' ? '#16a34a'
         : '#4ab8d8'
}

function useECGLoop(active) {
    const [frame, setFrame] = useState({ headIdx: 0, segs: [] })
    const headRef  = useRef(0)
    const cycleRef = useRef(null)
    const rafRef   = useRef(null)

    useEffect(() => {
        if (!active) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            headRef.current = 0
            cycleRef.current = null
            setFrame({ headIdx: 0, segs: [] })
            return
        }

        const tick = (ts) => {
            if (!cycleRef.current) cycleRef.current = ts
            const head    = headRef.current
            const elapsed = ts - cycleRef.current
            const headIdx = Math.min(Math.round(head * (ECG_PTS.length - 1)), ECG_PTS.length - 1)

            const segs = []
            if (headIdx > 0 && head > 0) {
                for (let s = 0; s < SEGMENTS; s++) {
                    const si = Math.floor(headIdx * s / SEGMENTS)
                    const ei = Math.floor(headIdx * (s + 1) / SEGMENTS)
                    if (ei <= si) continue
                    const f     = ((s + 0.5) / SEGMENTS) * head
                    const age   = elapsed * (head - f) / head
                    const alpha = age <= FADE_DELAY
                        ? 1.0
                        : Math.max(0, 1 - (age - FADE_DELAY) / FADE_DURATION)
                    if (alpha > 0.01) segs.push({ si, ei, alpha })
                }
            }

            setFrame({ headIdx, segs })

            headRef.current += SPEED
            if (headRef.current >= 1.0) {
                headRef.current  = 0
                cycleRef.current = ts
            }
            rafRef.current = requestAnimationFrame(tick)
        }

        rafRef.current = requestAnimationFrame(tick)
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [active])

    return frame
}

function ECGTrace({ role }) {
    const { headIdx, segs } = useECGLoop(true)
    const color = getColor(role)
    const tx = ECG_PTS[headIdx]?.[0] ?? 0
    const ty = ECG_PTS[headIdx]?.[1] ?? BASELINE

    return (
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            {segs.map((seg, i) => (
                <Polyline
                    key={i}
                    points={ptsStr(seg.si, seg.ei)}
                    stroke={color}
                    strokeWidth={2.5}
                    strokeOpacity={seg.alpha}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ))}
            {/* Glowing dot at head */}
            <Circle cx={tx} cy={ty} r={4}   fill={color} opacity={0.28} />
            <Circle cx={tx} cy={ty} r={2.2} fill={color} opacity={1} />
        </Svg>
    )
}

// ─── Full-screen loading overlay ──────────────────────────────────────────────

export default function LoadingOverlay({ visible, role }) {
    const fadeAnim = useRef(new Animated.Value(1)).current
    const [show, setShow] = useState(visible)

    useEffect(() => {
        if (visible) {
            setShow(true)
            fadeAnim.setValue(0)
            Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start()
        } else {
            Animated.timing(fadeAnim, { toValue: 0, duration: 320, useNativeDriver: true })
                .start(() => setShow(false))
        }
    }, [visible])

    if (!show) return null

    const bgColor = role === 'guardian'  ? '#1a0a14'
                  : role === 'doctor'    ? '#0f0820'
                  : role === 'dependent' ? '#0a1a0a'
                  : '#081c2f'

    return (
        <Animated.View style={[styles.overlay, { backgroundColor: bgColor, opacity: fadeAnim }]}>
            <ECGTrace role={role} />
        </Animated.View>
    )
}

// ─── Inline ECG spinner ───────────────────────────────────────────────────────

export function ECGSpinner({ role }) {
    return (
        <View style={styles.spinner}>
            <ECGTrace role={role} />
        </View>
    )
}

const styles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, alignItems: 'center', justifyContent: 'center' },
    spinner: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
})
