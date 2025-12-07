import React, { useState } from 'react';

const PitStopAnalysis = ({ laps, driversInfo }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter laps where a pit stop occurred (PitInTime is present)
  const pitStops = React.useMemo(() => {
    if (!laps || laps.length === 0) return [];
    
    // We look for laps where PitInTime is not null
    const stops = laps.filter(lap => lap.PitInTime).map(lap => {
        return {
            driver: lap.Driver,
            lap: lap.LapNumber,
            compound: lap.Compound,
            tyreLife: lap.TyreLife,
            pitIn: lap.PitInTime
        };
    });

    // Sort by Lap Number
    return stops.sort((a, b) => b.lap - a.lap); // Most recent first
  }, [laps]);

  return (
    <div className={`bg-gray-900/80 border border-gray-700 rounded p-3 backdrop-blur-sm flex flex-col transition-all duration-300 ${isExpanded ? 'h-[400px] absolute right-4 top-64 z-50 w-80 shadow-2xl bg-black' : 'h-48'}`}>
      <div className="flex justify-between items-center border-b border-gray-700 pb-1 mb-2 shrink-0">
        <h3 className="text-white text-[10px] font-bold uppercase tracking-widest">Pit Stop Feed</h3>
        <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[9px] text-rbr-red hover:text-white uppercase font-bold"
        >
            {isExpanded ? 'Minimize' : 'Expand'}
        </button>
      </div>
      
      <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
        <table className="w-full text-left text-[10px] text-gray-300">
            <thead className="text-[9px] text-gray-500 uppercase bg-gray-800 sticky top-0">
                <tr>
                    <th className="px-1 py-1">Lap</th>
                    <th className="px-1 py-1">Driver</th>
                    <th className="px-1 py-1">Tyre</th>
                    <th className="px-1 py-1">Life</th>
                </tr>
            </thead>
            <tbody>
                {pitStops.map((stop, idx) => {
                    const info = driversInfo[stop.driver] || {};
                    return (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="px-1 py-1 font-mono text-yellow-500">{stop.lap}</td>
                            <td className="px-1 py-1 font-bold text-white flex items-center gap-1">
                                <div className="w-0.5 h-2" style={{backgroundColor: info.TeamColor}}></div>
                                {stop.driver}
                            </td>
                            <td className="px-1 py-1">{stop.compound}</td>
                            <td className="px-1 py-1 text-gray-400">{stop.tyreLife}L</td>
                        </tr>
                    );
                })}
                {pitStops.length === 0 && (
                    <tr>
                        <td colSpan="4" className="px-1 py-2 text-center text-gray-500 italic">No pit stops recorded yet.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default PitStopAnalysis;
