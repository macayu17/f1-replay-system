import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TelemetryCharts = ({ telemetry, selectedDriver, comparisonDriver, leaderDriver, currentTime }) => {

  const chartData = useMemo(() => {
    if (!telemetry || !selectedDriver) return [];

    // Filter data for selected driver and leader
    // We want a window around currentTime? Or the whole lap?
    // "Gold Standard" usually means comparing a specific LAP.
    // But here we are in a continuous replay.
    // Let's show a rolling window of 30 seconds around currentTime?
    // Or maybe just the last 60 seconds of data.

    const windowSeconds = 60;
    const startTime = Math.max(0, currentTime - windowSeconds);
    const endTime = currentTime;

    // If comparison driver is set, use that; otherwise use leader
    const compareDriver = comparisonDriver || leaderDriver;

    const driverData = telemetry.filter(d => d.Driver === selectedDriver && d.Time >= startTime && d.Time <= endTime);
    const compareData = compareDriver ? telemetry.filter(d => d.Driver === compareDriver && d.Time >= startTime && d.Time <= endTime) : [];

    // Merge data by Time (approximate matching)
    return driverData.map(d => {
      const c = compareData.find(cd => Math.abs(cd.Time - d.Time) < 0.5);
      return {
        time: d.Time,
        dist: d.Distance,
        speed: d.Speed,
        throttle: d.Throttle,
        brake: d.Brake,
        rpm: d.RPM,
        gear: d.nGear,
        compareSpeed: c ? c.Speed : null,
        compareThrottle: c ? c.Throttle : null,
        compareBrake: c ? c.Brake : null,
        compareRPM: c ? c.RPM : null,
        compareGear: c ? c.nGear : null,
      };
    });
  }, [telemetry, selectedDriver, comparisonDriver, leaderDriver, currentTime]);

  // Determine comparison label
  const compareLabel = comparisonDriver || leaderDriver || 'N/A';

  if (!selectedDriver) return <div className="text-gray-500 text-center p-4">Select a driver to view telemetry</div>;

  return (
    <div className="grid grid-cols-3 gap-2 bg-gray-900/80 p-2 rounded border border-gray-700 backdrop-blur-sm h-full">
      <div className="col-span-3 flex justify-between items-center border-b border-gray-700 pb-1 mb-1">
        <h3 className="text-white text-[10px] font-bold uppercase tracking-widest">
          Telemetry: <span className="text-rbr-red">{selectedDriver}</span> vs <span className={comparisonDriver ? "text-blue-400" : "text-gray-400"}>{compareLabel}</span>
        </h3>
        <div className="flex gap-2 text-[9px]">
          <span className="text-rbr-red">Speed</span>
          <span className="text-[#00D2BE]">Throttle</span>
          <span className="text-[#FF0000]">Brake</span>
          <span className="text-yellow-400">Gear</span>
        </div>
      </div>

      {/* Speed Trace */}
      <div className="h-full min-h-[150px] w-full relative">
        <div className="absolute top-1 left-1 text-[9px] text-gray-500 font-mono z-10">SPEED</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 360]} stroke="#444" tick={{ fontSize: 9, fill: '#666' }} width={25} />
            <Tooltip
              contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
              itemStyle={{ fontSize: '10px', padding: 0 }}
              labelStyle={{ display: 'none' }}
            />
            <Line type="monotone" dataKey="speed" stroke="#DC0000" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="compareSpeed" stroke="#666" strokeWidth={1} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Throttle & Brake */}
      <div className="h-full min-h-[150px] w-full relative">
        <div className="absolute top-1 left-1 text-[9px] text-gray-500 font-mono z-10">INPUTS</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} stroke="#444" tick={{ fontSize: 9, fill: '#666' }} width={25} />
            <Tooltip
              contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
              itemStyle={{ fontSize: '10px', padding: 0 }}
              labelStyle={{ display: 'none' }}
            />
            <Line type="step" dataKey="throttle" stroke="#00D2BE" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="step" dataKey="compareThrottle" stroke="#666" strokeWidth={1} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
            <Line type="step" dataKey="brake" stroke="#FF0000" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gear & RPM */}
      <div className="h-full min-h-[150px] w-full relative">
        <div className="absolute top-1 left-1 text-[9px] text-gray-500 font-mono z-10">GEAR</div>
        <ResponsiveContainer width="100%" height="100%">

          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis yAxisId="left" domain={[0, 8]} stroke="#444" tick={{ fontSize: 9, fill: '#666' }} width={25} />
            <YAxis yAxisId="right" domain={[0, 13000]} orientation="right" stroke="#444" tick={{ fontSize: 9, fill: '#666' }} width={35} />
            <Tooltip
              contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
              itemStyle={{ fontSize: '10px', padding: 0 }}
              labelStyle={{ display: 'none' }}
            />
            <Line yAxisId="left" type="step" dataKey="gear" stroke="#FCD700" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line yAxisId="right" type="monotone" dataKey="rpm" stroke="#FFF" strokeWidth={1} dot={false} isAnimationActive={false} opacity={0.3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TelemetryCharts;
