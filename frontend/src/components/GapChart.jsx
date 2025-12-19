import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const GapChart = ({ laps, driversInfo, standings, currentTime, totalLaps }) => {
    // Calculate gap to leader for each driver at each lap
    const gapData = useMemo(() => {
        if (!laps || laps.length === 0) return [];

        // Group laps by lap number, then by driver
        const lapsByNumber = {};
        laps.forEach(lap => {
            if (!lap.LapTime || lap.LapTime <= 0) return; // Skip invalid laps
            if (!lapsByNumber[lap.LapNumber]) lapsByNumber[lap.LapNumber] = {};
            lapsByNumber[lap.LapNumber][lap.Driver] = lap;
        });

        // Calculate cumulative time for each driver
        const cumulativeTime = {};
        const data = [];
        const lapNumbers = Object.keys(lapsByNumber).map(Number).sort((a, b) => a - b);

        // Get current lap from standings
        const currentLap = standings[0]?.Lap || 1;

        lapNumbers.forEach(lapNum => {
            if (lapNum > currentLap) return; // Don't show future laps

            const lapData = lapsByNumber[lapNum];

            // Update cumulative times
            Object.entries(lapData).forEach(([driver, lap]) => {
                if (!cumulativeTime[driver]) cumulativeTime[driver] = 0;
                cumulativeTime[driver] += lap.LapTime;
            });

            // Find leader (minimum cumulative time)
            const times = Object.entries(cumulativeTime);
            if (times.length === 0) return;

            const leaderTime = Math.min(...times.map(([, t]) => t));

            // Create data point
            const point = { lap: lapNum };
            times.forEach(([driver, time]) => {
                point[driver] = parseFloat((time - leaderTime).toFixed(3));
            });

            data.push(point);
        });

        return data;
    }, [laps, standings]);

    // Get drivers to display (top 8 from standings)
    const displayDrivers = useMemo(() => {
        return standings.slice(0, 8).map(s => s.Driver);
    }, [standings]);

    // Generate colors for each driver
    const getDriverColor = (driver) => {
        const info = driversInfo[driver];
        return info?.TeamColor || '#888888';
    };

    if (gapData.length === 0) {
        return (
            <div className="bg-gray-900/80 border border-gray-700 rounded p-3 backdrop-blur-sm h-full flex items-center justify-center">
                <span className="text-gray-500 text-xs">Gap data calculating...</span>
            </div>
        );
    }

    return (
        <div className="bg-gray-900/80 border border-gray-700 rounded p-3 backdrop-blur-sm h-full flex flex-col">
            <h3 className="text-white text-[10px] font-bold uppercase tracking-widest border-b border-gray-700 pb-1 mb-2">
                Gap to Leader
            </h3>

            <div className="flex-1 min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={gapData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis
                            dataKey="lap"
                            stroke="#666"
                            tick={{ fontSize: 9, fill: '#888' }}
                            label={{ value: 'Lap', position: 'bottom', fontSize: 9, fill: '#666' }}
                        />
                        <YAxis
                            stroke="#666"
                            tick={{ fontSize: 9, fill: '#888' }}
                            tickFormatter={(v) => `+${v.toFixed(0)}s`}
                            domain={[0, 'auto']}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', fontSize: 10 }}
                            formatter={(value, name) => [`+${value.toFixed(3)}s`, driversInfo[name]?.Abbreviation || name]}
                            labelFormatter={(lap) => `Lap ${lap}`}
                        />
                        {displayDrivers.map(driver => (
                            <Line
                                key={driver}
                                type="monotone"
                                dataKey={driver}
                                stroke={getDriverColor(driver)}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 mt-2 text-[9px]">
                {displayDrivers.slice(0, 5).map(driver => (
                    <div key={driver} className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getDriverColor(driver) }}></div>
                        <span className="text-gray-400">{driversInfo[driver]?.Abbreviation || driver}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GapChart;
