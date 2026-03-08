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
  return (
    <div className="bg-gray-900/80 p-2 rounded border border-gray-700 flex gap-4 items-center shadow-lg backdrop-blur-sm shrink-0">
      <button
        className={`px-4 py-1.5 rounded font-bold font-mono text-xs transition-all tracking-wider ${isPlaying ? 'bg-rbr-red text-white hover:bg-red-700 shadow-[0_0_15px_rgba(220,0,0,0.4)]' : 'bg-white text-black hover:bg-gray-200'}`}
        onClick={onTogglePlay}
        title="Space to toggle"
      >
        {isPlaying ? 'PAUSE' : 'PLAY'}
      </button>

      <div className="flex items-center gap-1 border-l border-gray-600 pl-4">
        <button
          onClick={onPrevLap}
          disabled={currentLap <= 1}
          className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono text-xs transition-colors"
          title="← Previous lap"
        >
          ◀
        </button>
        <select
          value={Math.max(1, currentLap)}
          onChange={(e) => onGoToLap(Number(e.target.value))}
          className="bg-black border border-gray-600 text-white p-1 rounded font-mono text-[10px] outline-none focus:border-rbr-red w-16 text-center"
        >
          {Array.from({ length: totalLaps }, (_, i) => i + 1).map((lap) => (
            <option key={lap} value={lap}>LAP {lap}</option>
          ))}
        </select>
        <button
          onClick={onNextLap}
          disabled={currentLap >= totalLaps}
          className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono text-xs transition-colors"
          title="→ Next lap"
        >
          ▶
        </button>
      </div>

      <div className="flex-grow flex flex-col justify-center gap-1">
        <div className="flex justify-between text-[9px] text-gray-400 font-mono">
          <span>START</span>
          <span>FINISH</span>
        </div>
        <input
          type="range"
          min={minTime}
          max={maxTime}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rbr-red hover:accent-white transition-all"
        />
      </div>

      <div className="flex items-center gap-2 border-l border-gray-600 pl-4">
        <span className="text-[9px] font-mono text-gray-400 uppercase">Speed</span>
        <select
          className="bg-black border border-gray-600 text-white p-1 rounded font-mono text-[10px] outline-none focus:border-rbr-red hover:border-gray-400 transition-colors"
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

      <div className="text-[8px] text-gray-600 font-mono border-l border-gray-600 pl-4 hidden lg:block">
        <div>SPACE: Play/Pause</div>
        <div>←→: Prev/Next Lap</div>
      </div>
    </div>
  )
}

export default ReplayControls
