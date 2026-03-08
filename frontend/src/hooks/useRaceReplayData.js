import { useCallback, useEffect, useState } from 'react'
import * as d3 from 'd3'
import axios from 'axios'

const parseTimeSeconds = (value) => {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const s = value.trim()
  if (!s) return null

  const daysMatch = s.match(/^(\d+)\s+days?\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?$/i)
  const hmsMatch = s.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))?$/)
  const msMatch = s.match(/^(\d{1,2}):(\d{2})(?:\.(\d+))?$/)

  const toSeconds = (days, h, m, sec, frac) => {
    const ms = frac ? Number(`0.${frac}`) : 0
    return (Number(days) * 86400) + (Number(h) * 3600) + (Number(m) * 60) + Number(sec) + ms
  }

  if (daysMatch) {
    const [, d, h, m, sec, frac] = daysMatch
    return toSeconds(d, h, m, sec, frac)
  }
  if (hmsMatch) {
    const [, h, m, sec, frac] = hmsMatch
    return toSeconds(0, h, m, sec, frac)
  }
  if (msMatch) {
    const [, m, sec, frac] = msMatch
    return toSeconds(0, 0, m, sec, frac)
  }

  const asNum = Number(s)
  if (Number.isFinite(asNum)) {
    return asNum > 1e12 ? asNum / 1000 : asNum
  }

  return null
}

const normalizeMessages = (msgs, timeBase) => {
  const base = (typeof timeBase === 'number' && Number.isFinite(timeBase)) ? timeBase : 0
  return (Array.isArray(msgs) ? msgs : [])
    .map((m) => {
      const rawTime = m?.Time ?? m?.SessionTime ?? m?.time ?? m?.sessionTime ?? null
      let t = parseTimeSeconds(rawTime)

      if (!(t != null && base && t > base + 60 * 60 && t > 1e6) && t != null && base && t > base && t > 60 * 10) {
        t = t - base
      }

      const messageText = m?.Message ?? m?.Text ?? m?.message ?? m?.text ?? ''
      return { ...m, Time: t ?? 0, Message: String(messageText ?? '') }
    })
    .filter((m) => Number.isFinite(m.Time))
    .sort((a, b) => a.Time - b.Time)
}

const EMPTY = {
  telemetry: [],
  driversInfo: {},
  events: [],
  raceControl: [],
  circuitInfo: {},
  weather: [],
  laps: [],
  teamRadio: [],
  totalLaps: 0,
  minTime: 0,
  maxTime: 0,
  raceStartTime: 0,
  raceEndTime: 0,
  initialTime: 0,
}

export default function useRaceReplayData({ year, raceName, apiUrl }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryToken, setRetryToken] = useState(0)
  const [data, setData] = useState(EMPTY)

  const retry = useCallback(() => {
    setRetryToken((v) => v + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError(null)
      setData(EMPTY)

      try {
        const [radioRes, telemetryRes] = await Promise.all([
          axios.get(`${apiUrl}/api/${year}/${raceName}/race/team_radio`).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/api/${year}/${raceName}/race/telemetry_replay`),
        ])

        if (cancelled) return

        const res = telemetryRes.data || {}
        const telemetry = Array.isArray(res.telemetry) ? res.telemetry : []
        const driversInfo = res.drivers || {}
        const laps = res.laps || []
        const events = res.events || []
        const raceControl = normalizeMessages(res.race_control, res.time_base)
        const teamRadio = normalizeMessages(radioRes.data, 0)
        const circuitInfo = res.circuit_info || {}
        const weather = res.weather || []
        const totalLaps = res.total_laps || 0

        let minTime = 0
        let maxTime = 0
        let raceStartTime = 0
        let raceEndTime = 0
        let initialTime = 0

        if (telemetry.length > 0) {
          const absoluteMin = d3.min(telemetry, (d) => d.Time) ?? 0
          const absoluteMax = d3.max(telemetry, (d) => d.Time) ?? 0

          const startTimes = {}
          laps.forEach((l) => {
            if (l?.LapNumber && l.LapStartTime !== null && l.LapStartTime !== undefined) {
              const n = l.LapNumber
              if (startTimes[n] === undefined || l.LapStartTime < startTimes[n]) {
                startTimes[n] = l.LapStartTime
              }
            }
          })

          const lap1Start = startTimes[1] !== undefined ? startTimes[1] : absoluteMin
          const startAt = Math.max(absoluteMin, lap1Start - 10)
          raceStartTime = lap1Start

          let endAt = 0
          if (totalLaps > 0) {
            const winnerKey = Object.keys(driversInfo).find((k) => driversInfo[k]?.ClassifiedPosition === 1)
            if (winnerKey) {
              const winnerTotalTime = driversInfo[winnerKey]?.TotalTime
              if (winnerTotalTime != null && winnerTotalTime > 0 && lap1Start != null) {
                endAt = lap1Start + winnerTotalTime
              }

              const winnerLap = laps.find((l) => l.Driver === winnerKey && l.LapNumber === totalLaps)
              if (!endAt && winnerLap?.LapStartTime != null && winnerLap?.LapTime != null && winnerLap.LapTime > 0) {
                endAt = winnerLap.LapStartTime + winnerLap.LapTime
              }
            }

            if (!endAt) {
              const finalLaps = laps.filter((l) => l.LapNumber === totalLaps && l.LapStartTime != null && l.LapTime != null && l.LapTime > 0)
              if (finalLaps.length > 0) {
                endAt = Math.min(...finalLaps.map((l) => l.LapStartTime + l.LapTime))
              }
            }
          }

          minTime = startAt
          maxTime = endAt && endAt > minTime ? Math.min(absoluteMax, endAt + 10) : absoluteMax
          raceEndTime = endAt || 0
          initialTime = minTime
        }

        setData({
          telemetry,
          driversInfo,
          events,
          raceControl,
          circuitInfo,
          weather,
          laps,
          teamRadio,
          totalLaps,
          minTime,
          maxTime,
          raceStartTime,
          raceEndTime,
          initialTime,
        })
      } catch {
        if (!cancelled) {
          setError('Failed to load race replay data. Please retry.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [apiUrl, year, raceName, retryToken])

  return {
    loading,
    error,
    retry,
    ...data,
  }
}
