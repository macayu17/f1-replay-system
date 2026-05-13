import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { sliceTimeWindow } from '../utils/replayMath';

const findNearestSample = (samples, targetTime, startIndex) => {
  if (!samples.length) return { sample: null, index: startIndex };

  let index = Math.max(0, startIndex);
  while (index + 1 < samples.length && samples[index + 1].Time <= targetTime) {
    index += 1;
  }

  const current = samples[index];
  const next = samples[index + 1];
  const nearest = next && Math.abs(next.Time - targetTime) < Math.abs(current.Time - targetTime)
    ? next
    : current;

  return {
    sample: nearest && Math.abs(nearest.Time - targetTime) <= 0.75 ? nearest : null,
    index,
  };
};

const TelemetryCharts = ({ telemetry, groupedTelemetry, selectedDriver, comparisonDriver, leaderDriver, currentTime }) => {
  const telemetryByDriver = useMemo(() => {
    if (groupedTelemetry) return groupedTelemetry;

    const groups = {};
    (telemetry || []).forEach((row) => {
      if (!groups[row.Driver]) groups[row.Driver] = [];
      groups[row.Driver].push(row);
    });
    Object.values(groups).forEach((rows) => rows.sort((a, b) => a.Time - b.Time));
    return groups;
  }, [groupedTelemetry, telemetry]);

  const chartData = useMemo(() => {
    if (!selectedDriver) return [];

    const driverRows = telemetryByDriver[selectedDriver] || [];
    if (driverRows.length === 0) return [];

    const windowSeconds = 60;
    const startTime = Math.max(0, currentTime - windowSeconds);
    const endTime = currentTime;

    // If comparison driver is set, use that; otherwise use leader
    const compareDriver = comparisonDriver || (leaderDriver !== selectedDriver ? leaderDriver : null);

    const driverData = sliceTimeWindow(driverRows, startTime, endTime);
    const compareRows = compareDriver ? telemetryByDriver[compareDriver] || [] : [];
    const compareData = compareRows.length ? sliceTimeWindow(compareRows, startTime, endTime) : [];

    let compareIndex = 0;
    return driverData.map(d => {
      const nearest = findNearestSample(compareData, d.Time, compareIndex);
      compareIndex = nearest.index;
      const c = nearest.sample;

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
  }, [telemetryByDriver, selectedDriver, comparisonDriver, leaderDriver, currentTime]);

  // Determine comparison label
  const compareLabel = comparisonDriver || (leaderDriver !== selectedDriver ? leaderDriver : null) || 'N/A';

  if (!selectedDriver) {
    return (
      <div className="velocity-panel grid h-full place-items-center p-4 text-center text-sm text-white/45">
        <span className="velocity-mono uppercase">Select a driver to view telemetry</span>
      </div>
    );
  }

  return (
    <div className="velocity-panel grid h-full grid-cols-1 gap-2 p-3 md:grid-cols-3">
      <div className="col-span-1 mb-1 flex items-center justify-between border-b border-white/10 pb-2 md:col-span-3">
        <h3 className="velocity-label text-white">
          Telemetry: <span className="text-rbr-red">{selectedDriver}</span> vs <span className={comparisonDriver ? "text-blue-400" : "text-gray-400"}>{compareLabel}</span>
        </h3>
        <div className="velocity-mono hidden gap-2 text-[9px] uppercase sm:flex">
          <span className="text-rbr-red">Speed</span>
          <span className="text-[#00D2BE]">Throttle</span>
          <span className="text-[#FF0000]">Brake</span>
          <span className="text-yellow-400">Gear</span>
        </div>
      </div>

      {/* Speed Trace */}
      <div className="relative h-full min-h-[150px] w-full">
        <div className="velocity-label absolute left-1 top-1 z-10 text-[9px]">Speed</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(113,113,122,0.16)" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 360]} stroke="#5f3e39" tick={{ fontSize: 9, fill: '#9f9a97' }} width={25} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0b0b0b', border: '1px solid rgba(255,24,1,0.35)', fontSize: '10px', borderRadius: 4 }}
              itemStyle={{ fontSize: '10px', padding: 0 }}
              labelStyle={{ display: 'none' }}
            />
            <Line type="monotone" dataKey="speed" stroke="#FF1801" strokeWidth={1.8} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="compareSpeed" stroke="#71717A" strokeWidth={1} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="relative h-full min-h-[150px] w-full">
        <div className="velocity-label absolute left-1 top-1 z-10 text-[9px]">Inputs</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(113,113,122,0.16)" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} stroke="#5f3e39" tick={{ fontSize: 9, fill: '#9f9a97' }} width={25} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0b0b0b', border: '1px solid rgba(255,24,1,0.35)', fontSize: '10px', borderRadius: 4 }}
              itemStyle={{ fontSize: '10px', padding: 0 }}
              labelStyle={{ display: 'none' }}
            />
            <Line type="step" dataKey="throttle" stroke="#00D2BE" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="step" dataKey="compareThrottle" stroke="#666" strokeWidth={1} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
            <Line type="step" dataKey="brake" stroke="#FF0000" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="relative h-full min-h-[150px] w-full">
        <div className="velocity-label absolute left-1 top-1 z-10 text-[9px]">Gear</div>
        <ResponsiveContainer width="100%" height="100%">

          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(113,113,122,0.16)" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis yAxisId="left" domain={[0, 8]} stroke="#5f3e39" tick={{ fontSize: 9, fill: '#9f9a97' }} width={25} />
            <YAxis yAxisId="right" domain={[0, 13000]} orientation="right" stroke="#5f3e39" tick={{ fontSize: 9, fill: '#9f9a97' }} width={35} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0b0b0b', border: '1px solid rgba(255,24,1,0.35)', fontSize: '10px', borderRadius: 4 }}
              itemStyle={{ fontSize: '10px', padding: 0 }}
              labelStyle={{ display: 'none' }}
            />
            <Line yAxisId="left" type="step" dataKey="gear" stroke="#BC5614" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line yAxisId="right" type="monotone" dataKey="rpm" stroke="#FFF" strokeWidth={1} dot={false} isAnimationActive={false} opacity={0.3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TelemetryCharts;
