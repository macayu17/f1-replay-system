import { useEffect, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import Leaderboard from './Leaderboard'
import TelemetryCharts from './TelemetryCharts'
import StrategyPanel from './StrategyPanel'
import PitStopAnalysis from './PitStopAnalysis'
import SectorTimes from './SectorTimes'
import GapChart from './GapChart'
import PodiumDisplay from './PodiumDisplay'
import ReplayControls from './ReplayControls'
import RaceMessagesPanel from './RaceMessagesPanel'
import useRaceReplayData from '../hooks/useRaceReplayData'
import useReplayPlayback from '../hooks/useReplayPlayback'
import { asFiniteNumber, formatRaceClock, isLapCompleted } from '../utils/replayMath'

const RaceReplay = ({ year, raceName, apiUrl }) => {
    const [currentTime, setCurrentTime] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [speed, setSpeed] = useState(1)
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [comparisonDriver, setComparisonDriver] = useState(null)
    const [showPodium, setShowPodium] = useState(false)
    const [currentLap, setCurrentLap] = useState(1)
    const [finalStandings, setFinalStandings] = useState(null)

    const API_URL = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8000'

    const {
        loading,
        error,
        retry,
        telemetry,
        driversInfo,
        events,
        raceControl,
        circuitInfo,
        weather,
        laps,
        teamRadio,
        totalLaps,
        minTime,
        maxTime,
        raceStartTime,
        raceEndTime,
        initialTime,
    } = useRaceReplayData({ year, raceName, apiUrl: API_URL })

    useEffect(() => {
        setShowPodium(false)
        setIsPlaying(false)
        setCurrentLap(1)
        setFinalStandings(null)
        setSelectedDriver(null)
        setComparisonDriver(null)
    }, [year, raceName])

    useEffect(() => {
        setCurrentTime(initialTime)
    }, [initialTime])

    const clampTime = useCallback((t) => {
        const lower = minTime ?? 0;
        const upper = maxTime ?? 0;
        if (!Number.isFinite(t)) return lower;
        return Math.max(lower, Math.min(upper, t));
    }, [minTime, maxTime]);

    // Group telemetry by driver for performance
    const groupedTelemetry = useMemo(() => {
        const groups = {};
        telemetry.forEach(d => {
            if (!groups[d.Driver]) groups[d.Driver] = [];
            groups[d.Driver].push(d);
        });
        // Ensure sorted by Time
        Object.keys(groups).forEach(driver => {
            groups[driver].sort((a, b) => a.Time - b.Time);
        });
        return groups;
    }, [telemetry]);

    // Group laps by driver for performance
    const groupedLaps = useMemo(() => {
        const groups = {};
        laps.forEach(l => {
            if (!groups[l.Driver]) groups[l.Driver] = [];
            groups[l.Driver].push(l);
        });
        // Ensure sorted by LapNumber
        Object.keys(groups).forEach(driver => {
            groups[driver].sort((a, b) => a.LapNumber - b.LapNumber);
        });
        return groups;
    }, [laps]);

    // Calculate Standings & Current Positions
    const currentPositions = useMemo(() => {
        if (!groupedTelemetry || Object.keys(groupedTelemetry).length === 0) return [];

        const positions = Object.keys(groupedTelemetry).map(driver => {
            const data = groupedTelemetry[driver];
            // Binary search for the closest time <= currentTime
            let low = 0, high = data.length - 1;
            let idx = -1;
            while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                if (data[mid].Time <= currentTime) {
                    idx = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }

            if (idx !== -1) {
                const p1 = data[idx];
                const p2 = data[idx + 1]; // Next point

                let point = { ...p1 };

                // Interpolate X, Y for smoothness
                // Only interpolate if gap is small (< 2s) to avoid interpolating across pit stops or dropouts
                if (p2 && (p2.Time - p1.Time) < 2 && (p2.Time - p1.Time) > 0) {
                    const t = (currentTime - p1.Time) / (p2.Time - p1.Time);
                    point.X = p1.X + (p2.X - p1.X) * t;
                    point.Y = p1.Y + (p2.Y - p1.Y) * t;
                }

                // Determine Status
                const isLastPoint = idx === data.length - 1;
                const timeDiff = currentTime - point.Time;
                const driverInfo = driversInfo[driver];
                const officialStatus = driverInfo?.Status || 'Finished';

                if (isLastPoint && timeDiff > 5) { // Increased tolerance to 5s
                    if (officialStatus === 'Finished' || officialStatus.includes('Lap')) {
                        point.Status = "FINISHED";
                    } else {
                        point.Status = "RET";
                    }
                } else {
                    point.Status = "RUNNING";
                }

                // Determine Current Lap
                // Use LapNumber directly from telemetry - it comes from FastF1's official data
                // The backend merges this from session.laps which is authoritative
                if (point.LapNumber !== undefined && point.LapNumber !== null) {
                    point.Lap = Math.max(1, point.LapNumber); // Ensure minimum of 1
                } else {
                    point.Lap = 1;
                }

                // Safety check for invalid coordinates
                if (point.X === null || point.X === undefined || isNaN(point.X) ||
                    point.Y === null || point.Y === undefined || isNaN(point.Y)) {
                    return null;
                }

                return point;
            }
            return null;
        }).filter(Boolean);

        // Calculate cumulative time for each driver from laps data
        // This is the correct way to determine positions - not by distance
        positions.forEach(p => {
            const driverLaps = groupedLaps[p.Driver] || [];
            // Get completed laps (LapTime is not null/undefined and lap has started)
            const completedLaps = driverLaps.filter(l => isLapCompleted(l, currentTime));

            // Sum up lap times for cumulative race time
            let cumulativeTime = 0;
            completedLaps.forEach(l => { cumulativeTime += l.LapTime; });
            p.CumulativeTime = cumulativeTime;
            p.CompletedLaps = completedLaps.length;
        });

        // Sort Logic
        positions.sort((a, b) => {
            const infoA = driversInfo[a.Driver] || {};
            const infoB = driversInfo[b.Driver] || {};

            // Retired drivers always last
            if (a.Status === 'RET' && b.Status !== 'RET') return 1;
            if (b.Status === 'RET' && a.Status !== 'RET') return -1;

            // 1. If Race Finished (past official finish or replay end),
            //    ALWAYS use Official Classification
            const raceFinished = (raceEndTime > 0 && currentTime >= raceEndTime) || (currentTime >= maxTime);

            if (raceFinished) {
                // Use official classification - default to 99 for non-classified
                const posA = infoA.ClassifiedPosition ?? 99;
                const posB = infoB.ClassifiedPosition ?? 99;
                return posA - posB;
            }

            // 2. If Start of Race (formation / first seconds after green), respect Grid Position
            const isStart = currentTime < (raceStartTime + 10);
            if (isStart) {
                const gridA = infoA.GridPosition || 20;
                const gridB = infoB.GridPosition || 20;
                return gridA - gridB;
            }

            // 3. Standard Race Sorting: higher current lap, then current lap distance.
            const lapA = a.Lap || 0;
            const lapB = b.Lap || 0;
            if (lapA !== lapB) return lapB - lapA; // More laps = better

            const distanceA = asFiniteNumber(a.Distance);
            const distanceB = asFiniteNumber(b.Distance);
            if (distanceA !== null && distanceB !== null && Math.abs(distanceA - distanceB) > 0.01) {
                return distanceB - distanceA;
            }

            if (a.CumulativeTime && b.CumulativeTime) {
                return a.CumulativeTime - b.CumulativeTime;
            }

            return 0;
        });

        // Calculate Gaps
        if (positions.length > 0) {
            const leader = positions.find(p => p.Status === "RUNNING" || p.Status === "FINISHED") || positions[0];
            const leaderLap = leader.Lap || 0;
            const leaderTime = leader.CumulativeTime || 0;

            const isRaceOver = (raceEndTime > 0 && currentTime >= raceEndTime) || (currentTime >= maxTime);

            positions.forEach((p) => {
                if (isRaceOver && driversInfo[p.Driver]?.ClassifiedPosition) {
                    p.Status = "FINISHED";
                }

                if (p.Driver === leader.Driver) {
                    p.GapStr = "Leader";
                } else if (p.Status === "RET") {
                    p.GapStr = "OUT";
                } else {
                    const lapDiff = leaderLap - (p.Lap || 0);
                    if (lapDiff > 0) {
                        p.GapStr = `+${lapDiff} Lap${lapDiff > 1 ? 's' : ''}`;
                    } else if (leaderTime && p.CumulativeTime) {
                        // Calculate time gap
                        const timeGap = p.CumulativeTime - leaderTime;
                        p.GapStr = `+${timeGap.toFixed(3)}s`;
                    } else {
                        // Fallback to distance-based estimation
                        const distDiff = (leader.Distance || 0) - (p.Distance || 0);
                        const speed = (p.Speed || 100) / 3.6;
                        const timeGap = speed > 1 ? distDiff / speed : distDiff / 50;
                        p.GapStr = `+${Math.abs(timeGap).toFixed(3)}s`;
                    }
                }
            });
        }

        return positions;
    }, [groupedTelemetry, groupedLaps, currentTime, driversInfo, maxTime, raceEndTime, raceStartTime]);

    const finishAt = raceEndTime && raceEndTime > 0 ? raceEndTime : maxTime;
    const standings = useMemo(() => {
        if (finalStandings && currentTime >= finishAt) return finalStandings;
        return currentPositions;
    }, [currentPositions, finalStandings, currentTime, finishAt]);

    const handlePlaybackFinish = useCallback(() => {
        setIsPlaying(false)
        if (totalLaps > 0 && !showPodium) {
            setTimeout(() => setShowPodium(true), 500)
        }
    }, [totalLaps, showPodium])

    useReplayPlayback({
        isPlaying,
        speed,
        maxTime,
        setCurrentTime,
        onFinish: handlePlaybackFinish,
    })

    // Freeze leaderboard once the official finish is reached
    useEffect(() => {
        if (!finishAt || finishAt <= 0) return;
        if (finalStandings) return;
        if (currentTime < finishAt) return;
        if (!currentPositions || currentPositions.length === 0) return;

        const officialSorted = currentPositions
            .map(p => ({ ...p }))
            .sort((a, b) => {
                const posA = driversInfo[a.Driver]?.ClassifiedPosition ?? 99;
                const posB = driversInfo[b.Driver]?.ClassifiedPosition ?? 99;
                return posA - posB;
            });
        setFinalStandings(officialSorted);
        setIsPlaying(false);
        if (!showPodium) setShowPodium(true);
    }, [currentTime, finishAt, finalStandings, currentPositions, showPodium, driversInfo]);

    // ==================== NEW FEATURES ====================

    // Lap start times lookup - memoized for performance
    const lapStartTimes = useMemo(() => {
        if (!laps || laps.length === 0) return {};
        const times = {};
        laps.forEach(lap => {
            if (lap.LapStartTime !== null && lap.LapStartTime !== undefined) {
                const lapNum = lap.LapNumber;
                if (!times[lapNum] || lap.LapStartTime < times[lapNum]) {
                    times[lapNum] = lap.LapStartTime;
                }
            }
        });
        return times;
    }, [laps]);

    // Calculate current lap using telemetry LapNumber when available (most direct/robust);
    // fallback to FastF1 lap start times.
    useEffect(() => {
        // 1) If we're before Lap 1 start, show Lap 0
        if (lapStartTimes?.[1] !== undefined && currentTime < lapStartTimes[1]) {
            if (currentLap !== 0) setCurrentLap(0);
            return;
        }

        // 2) Prefer telemetry LapNumber (max lap among visible cars at this time)
        let calculatedLap = null;
        if (standings && standings.length > 0) {
            const maxLap = Math.max(...standings.map(p => (p?.Lap ?? 0)));
            if (Number.isFinite(maxLap) && maxLap > 0) {
                calculatedLap = maxLap;
            }
        }

        // 3) Fallback to lap start times
        if (calculatedLap === null) {
            if (!lapStartTimes || Object.keys(lapStartTimes).length === 0) return;

            calculatedLap = 1;
            const sortedLaps = Object.entries(lapStartTimes)
                .map(([lap, time]) => ({ lap: parseInt(lap), time }))
                .filter(({ lap, time }) => lap > 0 && time !== null && time !== undefined)
                .sort((a, b) => a.lap - b.lap);

            for (const { lap, time } of sortedLaps) {
                if (time <= currentTime) {
                    calculatedLap = lap;
                } else {
                    break;
                }
            }
        }

        // Clamp to totalLaps if available
        if (totalLaps > 0 && calculatedLap > totalLaps) calculatedLap = totalLaps;

        if (calculatedLap !== currentLap) setCurrentLap(calculatedLap);
    }, [currentTime, lapStartTimes, totalLaps, currentLap, standings]);

    // Live fastest lap (only among laps completed by current replay time)
    const fastestLapInfo = useMemo(() => {
        if (!laps || laps.length === 0) return null;
        let fastest = null;

        laps.forEach((lap) => {
            if (!lap?.LapTime || lap.LapTime <= 0) return;
            if (lap?.LapStartTime == null) return;

            const lapFinishTime = lap.LapStartTime + lap.LapTime;
            if (lapFinishTime > currentTime) return;

            if (!fastest || lap.LapTime < fastest.time) {
                fastest = { driver: lap.Driver, time: lap.LapTime, lap: lap.LapNumber };
            }
        });

        return fastest;
    }, [laps, currentTime]);

    // Lap navigation functions
    const goToLap = useCallback((lapNum) => {
        const startTime = lapStartTimes[lapNum];
        if (startTime !== undefined) {
            setCurrentTime(clampTime(startTime - 2)); // 2 seconds before lap starts
        }
    }, [lapStartTimes, clampTime]);

    const goToPrevLap = useCallback(() => {
        const prevLap = Math.max(1, currentLap - 1);
        goToLap(prevLap);
    }, [currentLap, goToLap]);

    const goToNextLap = useCallback(() => {
        if (!totalLaps || totalLaps <= 0) return;
        const nextLap = Math.min(totalLaps, currentLap + 1);
        goToLap(nextLap);
    }, [currentLap, totalLaps, goToLap]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            switch (e.key) {
                case ' ': // Space - Play/Pause
                    e.preventDefault();
                    setIsPlaying(prev => !prev);
                    break;
                case 'ArrowLeft': // Previous lap
                    e.preventDefault();
                    goToPrevLap();
                    break;
                case 'ArrowRight': // Next lap
                    e.preventDefault();
                    goToNextLap();
                    break;
                case 'Escape': // Clear selection
                    setSelectedDriver(null);
                    setComparisonDriver(null);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToPrevLap, goToNextLap]);

    // Driver click handler with Shift support for comparison
    const handleDriverClick = useCallback((driver, event) => {
        if (event?.shiftKey && selectedDriver && selectedDriver !== driver) {
            // Shift+Click = set comparison driver
            setComparisonDriver(driver);
        } else {
            // Normal click = set selected driver
            setSelectedDriver(driver);
            setComparisonDriver(null); // Clear comparison
        }
    }, [selectedDriver]);

    // ==================== END NEW FEATURES ====================

    const trackGeometry = useMemo(() => {
        const validTelemetry = telemetry.filter((d) => (
            asFiniteNumber(d?.X) !== null && asFiniteNumber(d?.Y) !== null
        ));

        if (validTelemetry.length === 0) return null;

        const width = 800;
        const height = 500;
        const xExtent = d3.extent(validTelemetry, d => d.X);
        const yExtent = d3.extent(validTelemetry, d => d.Y);

        if (xExtent.some((v) => v === undefined || v === null)) return null;
        if (yExtent.some((v) => v === undefined || v === null)) return null;

        const xPadding = Math.max(1, (xExtent[1] - xExtent[0]) * 0.1);
        const yPadding = Math.max(1, (yExtent[1] - yExtent[0]) * 0.1);
        const xScale = d3.scaleLinear()
            .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
            .range([0, width]);
        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([height, 0]);

        const trackDriver = Object.keys(groupedTelemetry).find((driver) => groupedTelemetry[driver]?.length > 2);
        const trackData = (trackDriver ? groupedTelemetry[trackDriver] : validTelemetry)
            .filter((d) => asFiniteNumber(d?.X) !== null && asFiniteNumber(d?.Y) !== null);
        const line = d3.line()
            .x(d => xScale(d.X))
            .y(d => yScale(d.Y))
            .curve(d3.curveCatmullRom);

        return {
            path: line(trackData),
            xScale,
            yScale,
        };
    }, [telemetry, groupedTelemetry]);

    const activeDrivers = useMemo(() => (
        trackGeometry ? currentPositions.filter(d => d.Status === "RUNNING") : []
    ), [currentPositions, trackGeometry]);

    const getTyreStroke = useCallback((compound) => {
        const c = compound ? compound.toUpperCase() : 'UNKNOWN';
        if (c.includes('SOFT')) return '#FF1801';
        if (c.includes('MEDIUM')) return '#BC5614';
        if (c.includes('HARD')) return '#FBFBF9';
        if (c.includes('INTER')) return '#00D2BE';
        if (c.includes('WET')) return '#0000FF';
        return '#FFF';
    }, []);

    // Race Control Status (Flags) - Improved detection
    const currentStatus = useMemo(() => {
        // Check Track Status FIRST for the authoritative status
        if (events && events.length > 0) {
            // Find the most recent event at or before currentTime using reverse search
            let activeEvent = null;
            for (let i = events.length - 1; i >= 0; i--) {
                if (events[i].Time <= currentTime) {
                    activeEvent = events[i];
                    break;
                }
            }

            if (activeEvent) {
                // FastF1 track_status Status field - can be numeric or string
                const status = String(activeEvent.Status || '').trim();

                // DEBUG: Log current track status
                // console.log('Track Status:', status, 'at time:', currentTime, 'event time:', activeEvent.Time);

                // Status codes from FastF1/FIA:
                // 1 = AllClear/Green, 2 = Yellow, 4 = SCDeployed, 5 = Red, 6 = VSC, 7 = SCEnding

                // Explicitly return null for "All Clear" status - track is green
                if (status === '1' || status.toUpperCase() === 'ALLCLEAR' || status.toUpperCase() === 'GREEN') {
                    return null;  // Track is clear, no flag to display
                }

                switch (status) {
                    case '4': return { type: 'SC', text: 'SAFETY CAR' };
                    case '6': return { type: 'VSC', text: 'VIRTUAL SAFETY CAR' };
                    case '7': return { type: 'SC', text: 'SAFETY CAR ENDING' };
                    case '5': return { type: 'RED', text: 'RED FLAG' };
                    case '2': return { type: 'YELLOW', text: 'YELLOW FLAG' };
                }

                // Also check string status values
                const statusUpper = status.toUpperCase();
                if (statusUpper === 'SC' || statusUpper === 'SAFETYCAR') return { type: 'SC', text: 'SAFETY CAR' };
                if (statusUpper === 'VSC' || statusUpper === 'VIRTUALSAFETYCAR') return { type: 'VSC', text: 'VIRTUAL SAFETY CAR' };
                if (statusUpper === 'RED') return { type: 'RED', text: 'RED FLAG' };
                if (statusUpper === 'YELLOW') return { type: 'YELLOW', text: 'YELLOW FLAG' };
            }
        }

        // Fallback: Check Race Control Messages for explicit flag announcements
        // Only use this if no track status events are available
        const recentMsgs = raceControl.filter(m => m.Time <= currentTime && m.Time > currentTime - 30);  // Within last 30 seconds
        const lastMsg = recentMsgs[recentMsgs.length - 1];

        if (lastMsg) {
            const msg = (lastMsg.Message || '').toUpperCase();
            // Only trigger on explicit statements, not mentions
            if (msg.includes("RED FLAG")) return { type: 'RED', text: 'RED FLAG' };
            if (msg.includes("SAFETY CAR DEPLOYED")) return { type: 'SC', text: 'SAFETY CAR' };
            if (msg.includes("VSC DEPLOYED") || msg.includes("VIRTUAL SAFETY CAR DEPLOYED")) return { type: 'VSC', text: 'VIRTUAL SAFETY CAR' };
        }

        return null;
    }, [events, raceControl, currentTime]);

    // Recent Race Control Messages & Team Radio
    const recentMessages = useMemo(() => {
        const rc = raceControl.filter(m => m.Time <= currentTime).map(m => ({ ...m, type: 'RC' }));
        const tr = teamRadio.filter(m => m.Time <= currentTime).map(m => ({ ...m, type: 'TR' }));

        const all = [...rc, ...tr].sort((a, b) => a.Time - b.Time);
        return all.slice(-8).reverse();
    }, [raceControl, teamRadio, currentTime]);

    // Current Weather
    const currentWeather = useMemo(() => {
        if (!weather.length) return null;
        // Find latest weather <= currentTime
        // Assuming weather is sorted by Time
        let low = 0, high = weather.length - 1;
        let idx = -1;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (weather[mid].Time <= currentTime) {
                idx = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return idx !== -1 ? weather[idx] : weather[0];
    }, [weather, currentTime]);

    return (
        <div className="w-full text-white">
            {loading && (
                <div className="velocity-panel grid min-h-[500px] place-items-center">
                    <div className="velocity-mono animate-pulse text-center text-xl font-semibold uppercase text-rbr-yellow md:text-2xl">
                        Initializing telemetry stream
                    </div>
                </div>
            )}

            {!loading && error && (
                <div className="velocity-panel is-hot flex min-h-[300px] flex-col items-center justify-center gap-4 p-6">
                    <div className="velocity-mono text-center text-sm text-red-200">{error}</div>
                    <button
                        type="button"
                        onClick={retry}
                        className="velocity-button px-5 py-2"
                    >
                        Retry Load
                    </button>
                </div>
            )}

            {!loading && !error && (
                <div className="flex w-full flex-col gap-3">
                    <div className="velocity-panel grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div className="terminal-pane-title lg:col-span-2">
                            <span className="velocity-label">GPX Monitor</span>
                            <span className="velocity-mono text-[10px] text-white/45">{raceName}</span>
                        </div>
                        <div className="min-w-0">
                            <div className="px-3 pb-3">
                            <div className="velocity-label mb-2">Post-Race Analytics</div>
                            <h2 className="truncate text-xl font-display font-bold uppercase leading-none md:text-3xl">
                                <span className="text-rbr-red">Grid</span>Pulse Console
                            </h2>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-px bg-[#f6a11a]/10 p-px">
                            <div className="bg-[#050607]/95 px-3 py-2">
                                <div className="velocity-label">Season</div>
                                <div className="velocity-mono mt-2 text-sm font-semibold text-white">{year}</div>
                            </div>
                            <div className="bg-[#050607]/95 px-3 py-2">
                                <div className="velocity-label">Lap</div>
                                <div className="velocity-mono mt-2 text-sm font-semibold text-white">{currentLap}/{totalLaps || '--'}</div>
                            </div>
                            <div className="bg-[#050607]/95 px-3 py-2">
                                <div className="velocity-label">Clock</div>
                                <div className="velocity-mono mt-2 text-sm font-semibold text-[#f6a11a]">{formatRaceClock(currentTime - raceStartTime)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
                        <aside className="h-[380px] overflow-hidden xl:col-span-2 xl:h-[700px]">
                            <Leaderboard
                                standings={standings}
                                driversInfo={driversInfo}
                                onDriverClick={handleDriverClick}
                                fastestLapDriver={fastestLapInfo?.driver}
                                selectedDriver={selectedDriver}
                                comparisonDriver={comparisonDriver}
                            />
                        </aside>

                        <section className="flex min-h-[700px] flex-col gap-3 xl:col-span-8">
                            <div className="velocity-panel is-hot track-stage relative flex min-h-[440px] flex-1 justify-center overflow-hidden">
                                <div className="track-grid pointer-events-none absolute inset-0 opacity-100"></div>

                                {currentStatus && (
                                    <div className={`absolute left-0 right-0 top-0 z-30 border-b py-3 text-center font-display text-xl font-bold uppercase
                                        ${currentStatus.type === 'RED' ? 'border-red-800 bg-red-600/90 text-white' :
                                            currentStatus.type === 'YELLOW' ? 'border-yellow-700 bg-yellow-400/90 text-black' :
                                                'border-rbr-yellow bg-rbr-yellow/90 text-black'}`}>
                                        {currentStatus.text}
                                    </div>
                                )}

                                <svg viewBox="0 0 800 500" className="relative z-10 h-full min-h-[460px] w-full" aria-label="Race track replay map">
                                    <defs>
                                        <filter id="track-glow">
                                            <feGaussianBlur stdDeviation="4.5" result="coloredBlur" />
                                            <feMerge>
                                                <feMergeNode in="coloredBlur" />
                                                <feMergeNode in="SourceGraphic" />
                                            </feMerge>
                                        </filter>
                                    </defs>

                                    {trackGeometry?.path && (
                                        <>
                                            <path
                                                d={trackGeometry.path}
                                                fill="none"
                                                stroke="#ff1801"
                                                strokeWidth="12"
                                                opacity="0.16"
                                                filter="url(#track-glow)"
                                            />
                                            <path
                                                d={trackGeometry.path}
                                                fill="none"
                                                stroke="#3a3939"
                                                strokeWidth="9"
                                                opacity="0.9"
                                            />
                                            <path
                                                d={trackGeometry.path}
                                                fill="none"
                                                stroke="#fbfbf9"
                                                strokeWidth="2"
                                                opacity="0.86"
                                            />
                                        </>
                                    )}

                                    {trackGeometry && activeDrivers.map((driver) => {
                                        const info = driversInfo[driver.Driver];
                                        return (
                                            <g
                                                key={driver.Driver}
                                                className="transition-transform duration-75 ease-linear"
                                                transform={`translate(${trackGeometry.xScale(driver.X)}, ${trackGeometry.yScale(driver.Y)})`}
                                            >
                                                <circle
                                                    r="7"
                                                    fill={info?.TeamColor || '#111'}
                                                    stroke={getTyreStroke(driver.Compound)}
                                                    strokeWidth="2"
                                                />
                                                <circle r="10" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
                                                <text
                                                    x="11"
                                                    y="4"
                                                    fill="white"
                                                    fontSize="10"
                                                    fontFamily="JetBrains Mono, monospace"
                                                    fontWeight="700"
                                                    style={{ textShadow: '0 0 6px #000' }}
                                                >
                                                    {info?.Abbreviation || driver.Driver}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>

                                <div className="absolute right-3 top-3 z-20 grid gap-px bg-[#f6a11a]/10 p-px sm:grid-cols-2 xl:grid-cols-1">
                                    <div className="min-w-[128px] bg-[#050607]/92 p-3">
                                        <div className="velocity-label">Race Time</div>
                                        <div className="velocity-mono mt-2 text-2xl font-bold tabular-nums text-[#f6a11a]">
                                            {formatRaceClock(currentTime - raceStartTime)}
                                        </div>
                                    </div>
                                    <div className="min-w-[128px] bg-[#050607]/92 p-3">
                                        <div className="velocity-label">Lap</div>
                                        <div className="velocity-mono mt-2 text-2xl font-bold tabular-nums text-white">
                                            {currentLap} <span className="text-lg text-white/40">/ {totalLaps}</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedDriver && driversInfo[selectedDriver] && (
                                    <div className="velocity-panel is-hot absolute bottom-4 left-4 right-4 z-30 p-4 sm:left-auto sm:w-80 sm:p-5">
                                        <div className="mb-4 flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-3xl font-display font-bold uppercase leading-none text-white">
                                                    {driversInfo[selectedDriver].LastName}
                                                </h3>
                                                <div className="velocity-label mt-2">{driversInfo[selectedDriver].FirstName}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDriver(null)}
                                                className="velocity-button secondary h-8 w-8 shrink-0"
                                                aria-label="Close driver details"
                                            >
                                                X
                                            </button>
                                        </div>

                                        <div className="metric-tile mb-4 flex items-center gap-3 p-3">
                                            <div className="h-11 w-1.5" style={{ backgroundColor: driversInfo[selectedDriver].TeamColor }}></div>
                                            <div className="min-w-0">
                                                <div className="velocity-label">Team</div>
                                                <div className="truncate text-sm font-bold text-white">{driversInfo[selectedDriver].TeamName}</div>
                                            </div>
                                            <div className="velocity-mono ml-auto text-3xl font-bold text-white/20">{selectedDriver}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div className="metric-tile p-3">
                                                <div className="velocity-label">Tyre</div>
                                                <div className="velocity-mono mt-2 text-lg font-bold text-white">{standings.find(d => d.Driver === selectedDriver)?.Compound || '-'}</div>
                                            </div>
                                            <div className="metric-tile p-3">
                                                <div className="velocity-label">Speed</div>
                                                <div className="velocity-mono mt-2 text-lg font-bold text-white">
                                                    {Math.round(standings.find(d => d.Driver === selectedDriver)?.Speed || 0)}
                                                    <span className="ml-1 text-xs font-normal text-white/50">km/h</span>
                                                </div>
                                            </div>
                                            <div className="metric-tile col-span-2 p-3">
                                                <div className="velocity-label">Status</div>
                                                <div className={`velocity-mono mt-2 text-lg font-bold ${standings.find(d => d.Driver === selectedDriver)?.Status === 'RET' ? 'text-red-400' : 'text-pb-green'}`}>
                                                    {standings.find(d => d.Driver === selectedDriver)?.Status === 'RET' ? 'Retired' : 'On Track'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <ReplayControls
                                isPlaying={isPlaying}
                                onTogglePlay={() => setIsPlaying(!isPlaying)}
                                currentLap={currentLap}
                                totalLaps={totalLaps}
                                onPrevLap={goToPrevLap}
                                onNextLap={goToNextLap}
                                onGoToLap={goToLap}
                                minTime={minTime}
                                maxTime={maxTime}
                                currentTime={currentTime}
                                onSeek={(value) => setCurrentTime(clampTime(value))}
                                speed={speed}
                                onSpeedChange={setSpeed}
                            />

                            <div className="h-[210px] shrink-0">
                                <TelemetryCharts
                                    telemetry={telemetry}
                                    groupedTelemetry={groupedTelemetry}
                                    selectedDriver={selectedDriver}
                                    comparisonDriver={comparisonDriver}
                                    leaderDriver={standings[0]?.Driver}
                                    currentTime={currentTime}
                                />
                            </div>
                        </section>

                        <aside className="flex flex-col gap-3 overflow-y-auto pr-1 xl:col-span-2 xl:h-[700px]">
                            <div className="velocity-panel shrink-0">
                                <div className="terminal-pane-title">
                                    <h3 className="velocity-label">Circuit Information</h3>
                                </div>
                                <div className="p-3">
                                <div className="mb-2 truncate text-sm font-bold text-white" title={circuitInfo.OfficialEventName || raceName}>{circuitInfo.OfficialEventName || raceName}</div>
                                <div className="mb-3 flex justify-between gap-3 text-[10px] text-white/60">
                                    <span className="truncate">{circuitInfo.Location}</span>
                                    <span className="velocity-mono shrink-0">R{circuitInfo.RoundNumber}</span>
                                </div>

                                {currentWeather && (
                                    <div className="grid grid-cols-2 gap-px bg-[#f6a11a]/10 p-px text-[10px]">
                                        <div className="bg-[#050607]/95 p-2">
                                            <div className="velocity-label">Air</div>
                                            <div className="velocity-mono mt-1 font-bold text-white">{currentWeather.AirTemp}°C</div>
                                        </div>
                                        <div className="bg-[#050607]/95 p-2">
                                            <div className="velocity-label">Track</div>
                                            <div className="velocity-mono mt-1 font-bold text-white">{currentWeather.TrackTemp}°C</div>
                                        </div>
                                        <div className="bg-[#050607]/95 p-2">
                                            <div className="velocity-label">Hum</div>
                                            <div className="velocity-mono mt-1 font-bold text-white">{currentWeather.Humidity}%</div>
                                        </div>
                                        <div className="bg-[#050607]/95 p-2">
                                            <div className="velocity-label">Wind</div>
                                            <div className="velocity-mono mt-1 font-bold text-white">{currentWeather.WindSpeed} m/s</div>
                                        </div>
                                    </div>
                                )}
                                </div>
                            </div>

                            <RaceMessagesPanel recentMessages={recentMessages} />

                            <div className="min-h-[160px] flex-1">
                                <PitStopAnalysis laps={laps} driversInfo={driversInfo} currentTime={currentTime} />
                            </div>

                            <SectorTimes
                                laps={laps}
                                driversInfo={driversInfo}
                                standings={standings}
                                currentTime={currentTime}
                            />
                        </aside>
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                        <div className="h-72">
                            <GapChart
                                laps={laps}
                                driversInfo={driversInfo}
                                standings={standings}
                                currentTime={currentTime}
                                totalLaps={totalLaps}
                            />
                        </div>

                        <div className="h-72">
                            <StrategyPanel
                                laps={laps}
                                driversInfo={driversInfo}
                                currentTime={currentTime}
                                totalLaps={totalLaps}
                            />
                        </div>
                    </div>
                </div>
            )}

            <PodiumDisplay
                standings={standings}
                driversInfo={driversInfo}
                isRaceFinished={showPodium}
                onClose={() => setShowPodium(false)}
            />
        </div>
    )
}

export default RaceReplay
