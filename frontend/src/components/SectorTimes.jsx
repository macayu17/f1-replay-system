import React, { useMemo } from 'react';

const getDriverCode = (info, fallback) => {
    const rawAbbr = String(info?.Abbreviation ?? '').trim().toUpperCase();
    if (rawAbbr.length === 3) return rawAbbr;
    if (rawAbbr.length > 3) return rawAbbr.slice(0, 3);

    const last = String(info?.LastName ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (last.length >= 3) return last.slice(0, 3);

    const first = String(info?.FirstName ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
    const combined = (first.slice(0, 1) + last.slice(0, 2)).replace(/[^A-Z]/g, '');
    if (combined.length === 3) return combined;

    const fb = String(fallback ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return fb ? fb.slice(0, 3) : '---';
};

const SectorTimes = ({ laps, driversInfo, standings, currentTime }) => {
    // Get the most recent sector times for each driver
    const sectorData = useMemo(() => {
        if (!laps || laps.length === 0) return { drivers: [], bestS1: null, bestS2: null, bestS3: null };

        // Group laps by driver and get the most recent completed lap
        const driverLatest = {};
        const allS1 = [];
        const allS2 = [];
        const allS3 = [];

        laps.forEach(lap => {
            if (lap.Sector1Time) allS1.push(lap.Sector1Time);
            if (lap.Sector2Time) allS2.push(lap.Sector2Time);
            if (lap.Sector3Time) allS3.push(lap.Sector3Time);

            // Only consider laps that have started before current time
            if (lap.LapStartTime && lap.LapStartTime <= currentTime) {
                const existing = driverLatest[lap.Driver];
                if (!existing || lap.LapNumber > existing.LapNumber) {
                    driverLatest[lap.Driver] = lap;
                }
            }
        });

        const bestS1 = allS1.length > 0 ? Math.min(...allS1) : null;
        const bestS2 = allS2.length > 0 ? Math.min(...allS2) : null;
        const bestS3 = allS3.length > 0 ? Math.min(...allS3) : null;

        // Convert to array and sort by position in standings
        const positionMap = {};
        standings.forEach((s, i) => { positionMap[s.Driver] = i; });

        const drivers = Object.entries(driverLatest)
            .map(([driver, lap]) => ({
                driver,
                s1: lap.Sector1Time,
                s2: lap.Sector2Time,
                s3: lap.Sector3Time,
                lapNum: lap.LapNumber,
                position: positionMap[driver] ?? 99
            }))
            .sort((a, b) => a.position - b.position)
            .slice(0, 10); // Top 10

        return { drivers, bestS1, bestS2, bestS3 };
    }, [laps, currentTime, standings]);

    const formatTime = (seconds) => {
        if (!seconds || seconds <= 0) return '-';
        return seconds.toFixed(3);
    };

    const getSectorClass = (time, best) => {
        if (!time || !best) return 'text-white';
        if (Math.abs(time - best) < 0.001) return 'text-sector-purple font-bold'; // Overall best
        return 'text-white';
    };

    return (
        <div className="bg-gray-900/80 border border-gray-700 rounded p-3 backdrop-blur-sm">
            <h3 className="text-white text-[10px] font-bold uppercase tracking-widest border-b border-gray-700 pb-1 mb-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sector-purple"></span>
                Sector Times
            </h3>

            <table className="w-full text-[10px] font-mono">
                <thead className="text-gray-500">
                    <tr>
                        <th className="text-left px-1">POS</th>
                        <th className="text-left px-1">DRIVER</th>
                        <th className="text-right px-1">S1</th>
                        <th className="text-right px-1">S2</th>
                        <th className="text-right px-1">S3</th>
                    </tr>
                </thead>
                <tbody>
                    {sectorData.drivers.map((d, i) => {
                        const info = driversInfo[d.driver] || {};
                        return (
                            <tr key={d.driver} className="border-t border-gray-800 hover:bg-gray-800/50">
                                <td className="px-1 py-0.5 text-gray-400">{i + 1}</td>
                                <td className="px-1 py-0.5 font-bold text-white flex items-center gap-1">
                                    <div className="w-0.5 h-3" style={{ backgroundColor: info.TeamColor }}></div>
                                    {getDriverCode(info, d.driver)}
                                </td>
                                <td className={`px-1 py-0.5 text-right ${getSectorClass(d.s1, sectorData.bestS1)}`}>
                                    {formatTime(d.s1)}
                                </td>
                                <td className={`px-1 py-0.5 text-right ${getSectorClass(d.s2, sectorData.bestS2)}`}>
                                    {formatTime(d.s2)}
                                </td>
                                <td className={`px-1 py-0.5 text-right ${getSectorClass(d.s3, sectorData.bestS3)}`}>
                                    {formatTime(d.s3)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="mt-2 flex gap-3 text-[9px] text-gray-500">
                <span><span className="text-sector-purple">●</span> Overall Best</span>
            </div>
        </div>
    );
};

export default SectorTimes;
