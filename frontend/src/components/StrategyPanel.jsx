import React from 'react';

const TYRE_COLORS = {
  'SOFT': 'bg-red-500',
  'MEDIUM': 'bg-yellow-400',
  'HARD': 'bg-white',
  'INTERMEDIATE': 'bg-green-500',
  'WET': 'bg-blue-500',
  'UNKNOWN': 'bg-gray-500'
};

const StrategyPanel = ({ laps, driversInfo, totalLaps }) => {
  // Group laps by driver
  const driverStrategies = React.useMemo(() => {
    if (!laps || laps.length === 0) return {};
    
    const strategies = {};
    laps.forEach(lap => {
        if (!strategies[lap.Driver]) strategies[lap.Driver] = [];
        strategies[lap.Driver].push(lap);
    });
    
    // Sort laps for each driver
    Object.keys(strategies).forEach(d => {
        strategies[d].sort((a, b) => a.LapNumber - b.LapNumber);
    });
    
    return strategies;
  }, [laps]);

  const drivers = Object.keys(driverStrategies).sort();

  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded p-3 backdrop-blur-sm overflow-x-auto h-full flex flex-col">
      <h3 className="text-white text-[10px] font-bold uppercase tracking-widest border-b border-gray-700 pb-1 mb-2 shrink-0">Tyre Strategy History</h3>
      
      <div className="min-w-[800px] flex-1 overflow-y-auto custom-scrollbar pr-2">
        {/* Header (Lap Numbers) */}
        <div className="flex mb-1 ml-12 sticky top-0 bg-gray-900/90 z-10">
            {Array.from({length: Math.ceil(totalLaps / 5)}).map((_, i) => (
                <div key={i} className="flex-1 text-[9px] text-gray-500 border-l border-gray-800 pl-1">
                    {(i * 5) + 1}
                </div>
            ))}
        </div>

        {drivers.map(driver => {
            const driverLaps = driverStrategies[driver];
            const info = driversInfo[driver] || {};
            
            return (
                <div key={driver} className="flex items-center mb-1 h-4">
                    <div className="w-12 text-[9px] font-bold text-white flex items-center gap-1 shrink-0">
                        <div className="w-0.5 h-3" style={{backgroundColor: info.TeamColor}}></div>
                        {driver}
                    </div>
                    
                    <div className="flex-1 flex h-1.5 bg-gray-800 rounded-sm overflow-hidden relative">
                        {driverLaps.map((lap, i) => {
                            const colorClass = TYRE_COLORS[lap.Compound?.toUpperCase()] || 'bg-gray-600';
                            const widthPct = (1 / totalLaps) * 100;
                            
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
