import React, { useMemo } from 'react';
import { isLapStarted, isSectorVisible } from '../utils/replayMath';

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
            const s1Visible = isSectorVisible(lap, 'Sector1', currentTime);
            const s2Visible = isSectorVisible(lap, 'Sector2', currentTime);
            const s3Visible = isSectorVisible(lap, 'Sector3', currentTime);

            if (s1Visible) allS1.push(lap.Sector1Time);
            if (s2Visible) allS2.push(lap.Sector2Time);
            if (s3Visible) allS3.push(lap.Sector3Time);

            if (isLapStarted(lap, currentTime) && (s1Visible || s2Visible || s3Visible)) {
                const existing = driverLatest[lap.Driver];
                if (!existing || lap.LapNumber > existing.LapNumber) {
                    driverLatest[lap.Driver] = {
                        ...lap,
                        Sector1Time: s1Visible ? lap.Sector1Time : null,
                        Sector2Time: s2Visible ? lap.Sector2Time : null,
                        Sector3Time: s3Visible ? lap.Sector3Time : null,
                    };
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
        <div className="velocity-panel p-3">
            <h3 className="velocity-label mb-3 flex items-center gap-2 border-b border-white/10 pb-2 text-white">
                <span className="h-1.5 w-1.5 bg-sector-purple"></span>
                Sector Times
            </h3>

            <table className="velocity-mono w-full text-[10px]">
                <thead className="text-white/45">
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
                            <tr key={d.driver} className="border-t border-white/10 hover:bg-white/5">
                                <td className="px-1 py-0.5 text-white/55">{i + 1}</td>
                                <td className="flex items-center gap-1 px-1 py-0.5 font-bold text-white">
                                    <div className="w-0.5 h-3" style={{ backgroundColor: info.TeamColor }}></div>
                                    {info.Abbreviation || d.driver}
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

            <div className="velocity-mono mt-2 flex gap-3 text-[9px] text-white/45">
                <span><span className="text-sector-purple">■</span> Overall Best</span>
            </div>
        </div>
    );
};

export default SectorTimes;
