const ReplayControls = ({
  isPlaying,
  onTogglePlay,
  currentLap,
  totalLaps,
  onPrevLap,
  onNextLap,
  onGoToLap,
  minTime,
  maxTime,
  currentTime,
  onSeek,
  speed,
  onSpeedChange,
}) => {
  const safeTotalLaps = Math.max(1, totalLaps || 1)
  const safeCurrentLap = Math.min(safeTotalLaps, Math.max(1, currentLap || 1))

  return (
    <div className="velocity-panel flex shrink-0 flex-col gap-2 p-2 xl:flex-row xl:items-center xl:gap-3">
      <button
        type="button"
        className={`velocity-button h-8 px-4 ${isPlaying ? '' : 'secondary'}`}
        onClick={onTogglePlay}
        title="Space to toggle"
      >
        {isPlaying ? 'Pause' : 'Play'}
      </button>

      <div className="flex items-center gap-1 xl:border-l xl:border-white/10 xl:pl-4">
        <button
          type="button"
          onClick={onPrevLap}
          disabled={safeCurrentLap <= 1}
          className="velocity-button secondary h-8 w-8 disabled:opacity-30"
          title="← Previous lap"
          aria-label="Previous lap"
        >
          &lt;
        </button>
        <select
          value={safeCurrentLap}
          onChange={(e) => onGoToLap(Number(e.target.value))}
          className="velocity-input velocity-mono h-8 min-h-0 w-24 px-2 text-center text-[10px]"
        >
          {Array.from({ length: safeTotalLaps }, (_, i) => i + 1).map((lap) => (
            <option key={lap} value={lap}>LAP {lap}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={onNextLap}
          disabled={safeCurrentLap >= safeTotalLaps}
          className="velocity-button secondary h-8 w-8 disabled:opacity-30"
          title="→ Next lap"
          aria-label="Next lap"
        >
          &gt;
        </button>
      </div>

      <div className="flex min-w-[220px] flex-grow flex-col justify-center gap-2">
        <div className="velocity-mono flex justify-between text-[9px] text-white/50">
          <span>START</span>
          <span>FINISH</span>
        </div>
        <input
          type="range"
          min={minTime}
          max={maxTime}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full appearance-none"
          aria-label="Replay timeline"
        />
      </div>

      <div className="flex items-center gap-2 xl:border-l xl:border-white/10 xl:pl-4">
        <span className="velocity-label">Speed</span>
        <select
          className="velocity-input velocity-mono h-8 min-h-0 px-2 text-[10px]"
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
        >
          <option value="1">1x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
          <option value="20">20x</option>
          <option value="60">60x</option>
        </select>
      </div>
    </div>
  )
}

export default ReplayControls
