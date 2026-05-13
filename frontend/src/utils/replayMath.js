export const isFiniteNumber = (value) => (
  typeof value === 'number' && Number.isFinite(value)
)

export const asFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export const findLastIndexAtOrBefore = (rows, time, getTime = (row) => row?.Time) => {
  if (!Array.isArray(rows) || rows.length === 0) return -1

  const target = asFiniteNumber(time)
  if (target === null) return -1

  let low = 0
  let high = rows.length - 1
  let index = -1

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const rowTime = asFiniteNumber(getTime(rows[mid]))

    if (rowTime !== null && rowTime <= target) {
      index = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return index
}

export const sliceTimeWindow = (rows, startTime, endTime, getTime = (row) => row?.Time) => {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const start = asFiniteNumber(startTime)
  const end = asFiniteNumber(endTime)
  if (start === null || end === null || end < start) return []

  const startIndex = findLastIndexAtOrBefore(rows, start, getTime)
  let index = Math.max(0, startIndex)

  while (index < rows.length) {
    const rowTime = asFiniteNumber(getTime(rows[index]))
    if (rowTime !== null && rowTime >= start) break
    index += 1
  }

  const result = []
  for (let i = index; i < rows.length; i += 1) {
    const rowTime = asFiniteNumber(getTime(rows[i]))
    if (rowTime === null) continue
    if (rowTime > end) break
    result.push(rows[i])
  }

  return result
}

export const getLapFinishTime = (lap) => {
  const start = asFiniteNumber(lap?.LapStartTime)
  const duration = asFiniteNumber(lap?.LapTime)
  if (start === null || duration === null || duration <= 0) return null
  return start + duration
}

export const isLapStarted = (lap, currentTime) => {
  const start = asFiniteNumber(lap?.LapStartTime)
  const now = asFiniteNumber(currentTime)
  return start !== null && now !== null && start <= now
}

export const isLapCompleted = (lap, currentTime) => {
  const finish = getLapFinishTime(lap)
  const now = asFiniteNumber(currentTime)
  return finish !== null && now !== null && finish <= now
}

export const isPitStopVisible = (lap, currentTime) => {
  const pitTime = asFiniteNumber(lap?.PitInTime ?? lap?.PitOutTime)
  const now = asFiniteNumber(currentTime)
  return pitTime !== null && now !== null && pitTime <= now
}

export const getRaceElapsedTime = (currentTime, raceStartTime) => {
  const now = asFiniteNumber(currentTime)
  const start = asFiniteNumber(raceStartTime)
  if (now === null || start === null) return 0
  return Math.max(0, now - start)
}

export const isRaceClockMessageVisible = (message, currentTime, raceStartTime) => {
  const messageTime = asFiniteNumber(message?.Time)
  if (messageTime === null || messageTime < 0) return false
  return messageTime <= getRaceElapsedTime(currentTime, raceStartTime)
}

export const isSectorVisible = (lap, sectorPrefix, currentTime) => {
  const now = asFiniteNumber(currentTime)
  if (now === null || !lap) return false

  const sectorDuration = asFiniteNumber(lap[`${sectorPrefix}Time`])
  if (sectorDuration === null || sectorDuration <= 0) return false

  const sectorSessionTime = asFiniteNumber(lap[`${sectorPrefix}SessionTime`])
  if (sectorSessionTime !== null) return sectorSessionTime <= now

  return isLapCompleted(lap, currentTime)
}

export const formatRaceClock = (seconds) => {
  const elapsed = Math.max(0, asFiniteNumber(seconds) ?? 0)
  const hours = Math.floor(elapsed / 3600)
  const minutes = Math.floor((elapsed % 3600) / 60)
  const wholeSeconds = Math.floor(elapsed % 60)

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    wholeSeconds.toString().padStart(2, '0'),
  ].join(':')
}
