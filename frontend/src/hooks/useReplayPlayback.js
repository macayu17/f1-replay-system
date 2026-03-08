import { useEffect } from 'react'

export default function useReplayPlayback({
  isPlaying,
  speed,
  maxTime,
  setCurrentTime,
  onFinish,
}) {
  useEffect(() => {
    let animationFrameId
    let lastTimestamp

    const animate = (timestamp) => {
      if (!lastTimestamp) lastTimestamp = timestamp
      const deltaTime = (timestamp - lastTimestamp) / 1000
      lastTimestamp = timestamp

      if (isPlaying) {
        setCurrentTime((prev) => {
          const next = prev + (deltaTime * speed)
          if (next >= maxTime) {
            onFinish?.()
            return maxTime
          }
          return next
        })
        animationFrameId = requestAnimationFrame(animate)
      }
    }

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
    }
  }, [isPlaying, speed, maxTime, setCurrentTime, onFinish])
}
