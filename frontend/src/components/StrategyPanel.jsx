import React from 'react';
import { isLapStarted } from '../utils/replayMath';

const TYRE_COLORS = {
  'SOFT': 'bg-red-500',
  'MEDIUM': 'bg-yellow-400',
  'HARD': 'bg-white',
  'INTERMEDIATE': 'bg-green-500',
  'WET': 'bg-blue-500',
  'UNKNOWN': 'bg-gray-500'
};

const StrategyPanel = ({ laps, driversInfo, totalLaps, currentTime }) => {
  // Group laps by driver
  const driverStrategies = React.useMemo(() => {
    if (!laps || laps.length === 0) return {};

    const strategies = {};
    laps.forEach(lap => {
        if (!isLapStarted(lap, currentTime)) return;
        if (!strategies[lap.Driver]) strategies[lap.Driver] = [];
        strategies[lap.Driver].push(lap);
    });

    // Sort laps for each driver
    Object.keys(strategies).forEach(d => {
        strategies[d].sort((a, b) => a.LapNumber - b.LapNumber);
    });

    return strategies;
  }, [laps, currentTime]);

  const drivers = Object.keys(driverStrategies).sort();

  return (
    <div className="velocity-panel flex h-full flex-col overflow-x-auto p-3">
      <h3 className="velocity-label mb-3 shrink-0 border-b border-white/10 pb-2 text-white">Tyre Strategy History</h3>

      <div className="min-w-[800px] flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="sticky top-0 z-10 mb-2 ml-12 flex bg-[#111]/90">
            {Array.from({length: Math.ceil(totalLaps / 5)}).map((_, i) => (
                <div key={i} className="velocity-mono flex-1 border-l border-white/10 pl-1 text-[9px] text-white/45">
                    {(i * 5) + 1}
                </div>
            ))}
        </div>

        {drivers.map(driver => {
            const driverLaps = driverStrategies[driver];
            const info = driversInfo[driver] || {};

            return (
                <div key={driver} className="mb-1 flex h-5 items-center">
                    <div className="velocity-mono flex w-12 shrink-0 items-center gap-1 text-[9px] font-bold text-white">
                        <div className="h-3 w-0.5" style={{backgroundColor: info.TeamColor}}></div>
                        {info.Abbreviation || driver}
                    </div>

                    <div className="relative flex h-2 flex-1 overflow-hidden rounded-sm bg-white/10">
                        {driverLaps.map((lap, i) => {
                            const colorClass = TYRE_COLORS[lap.Compound?.toUpperCase()] || 'bg-gray-600';
                            const widthPct = totalLaps > 0 ? (1 / totalLaps) * 100 : 0;

                            // Check for pit stop
                            const isPit = !!lap.PitOutTime;

                            return (
                                <div
                                    key={i}
                                    className={`${colorClass} h-full relative group`}
                                    style={{width: `${widthPct}%`}}
                                    title={`Lap ${lap.LapNumber}: ${lap.Compound}`}
                                >
                                    {isPit && (
                                        <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-black z-10"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default StrategyPanel;
