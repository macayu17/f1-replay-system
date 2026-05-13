import React, { useState } from 'react';
import { isPitStopVisible } from '../utils/replayMath';

const PitStopAnalysis = ({ laps, driversInfo, currentTime }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter laps where a pit stop occurred (PitInTime is present)
  const pitStops = React.useMemo(() => {
    if (!laps || laps.length === 0) return [];

    const stops = laps.filter(lap => isPitStopVisible(lap, currentTime)).map(lap => {
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
  }, [laps, currentTime]);

  return (
    <div className={`velocity-panel flex flex-col p-3 transition-all duration-300 ${isExpanded ? 'h-80' : 'h-48'}`}>
      <div className="mb-2 flex shrink-0 items-center justify-between border-b border-white/10 pb-2">
        <h3 className="velocity-label text-white">Pit Stop Feed</h3>
        <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="velocity-button secondary px-2 py-1 text-[9px]"
        >
            {isExpanded ? 'Minimize' : 'Expand'}
        </button>
      </div>

      <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
        <table className="velocity-mono w-full text-left text-[10px] text-white/70">
            <thead className="sticky top-0 bg-[#111]/95 text-[9px] uppercase text-white/45">
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
                        <tr key={idx} className="border-b border-white/10 hover:bg-white/5">
                            <td className="px-1 py-1 text-rbr-yellow">{stop.lap}</td>
                            <td className="flex items-center gap-1 px-1 py-1 font-bold text-white">
                                <div className="w-0.5 h-2" style={{backgroundColor: info.TeamColor}}></div>
                                {info.Abbreviation || stop.driver}
                            </td>
                            <td className="px-1 py-1">{stop.compound}</td>
                            <td className="px-1 py-1 text-white/55">{stop.tyreLife}L</td>
                        </tr>
                    );
                })}
                {pitStops.length === 0 && (
                    <tr>
                        <td colSpan="4" className="px-1 py-2 text-center text-white/40">No pit stops recorded yet.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default PitStopAnalysis;
