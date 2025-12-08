import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import axios from 'axios'
import Leaderboard from './Leaderboard'
import TelemetryCharts from './TelemetryCharts'
import StrategyPanel from './StrategyPanel'
import PitStopAnalysis from './PitStopAnalysis'
import SectorTimes from './SectorTimes'
import GapChart from './GapChart'
import PodiumDisplay from './PodiumDisplay'

const RaceReplay = ({ year, raceName, apiUrl }) => {
    const [telemetry, setTelemetry] = useState([])
    const [driversInfo, setDriversInfo] = useState({})
    const [events, setEvents] = useState([])
    const [raceControl, setRaceControl] = useState([])
    const [circuitInfo, setCircuitInfo] = useState({})
    const [weather, setWeather] = useState([])
    const [laps, setLaps] = useState([])
    const [loading, setLoading] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [minTime, setMinTime] = useState(0)
    const [maxTime, setMaxTime] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [speed, setSpeed] = useState(1)
    const [standings, setStandings] = useState([])
    const [selectedDriver, setSelectedDriver] = useState(null)
    const [comparisonDriver, setComparisonDriver] = useState(null) // For driver comparison mode
    const [teamRadio, setTeamRadio] = useState([])
    const [totalLaps, setTotalLaps] = useState(0)
    const [showPodium, setShowPodium] = useState(false) // Podium display state
    const [currentLap, setCurrentLap] = useState(1) // Current lap counter

    const svgRef = useRef()

    // Use prop if available, otherwise fallback (though prop should always be there from App.jsx)
    const API_URL = apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:8000';

    useEffect(() => {
        setLoading(true)
        setTelemetry([])
        setDriversInfo({})
        setEvents([])
        setRaceControl([])
        setCircuitInfo({})
        setWeather([])
        setTeamRadio([])

        const fetchData = async () => {
            try {
                // Fetch Team Radio first
                const radioRes = await axios.get(`${API_URL}/api/${year}/${raceName}/race/team_radio`);
                setTeamRadio(radioRes.data);
            } catch (err) {
                console.error("Radio fetch error", err);
            }

            try {
                // Then fetch Telemetry
                const res = await axios.get(`${API_URL}/api/${year}/${raceName}/race/telemetry_replay`);
                const data = res.data.telemetry
                setTelemetry(data)
                setDriversInfo(res.data.drivers || {})
                setEvents(res.data.events || [])
                setRaceControl(res.data.race_control || [])
                setCircuitInfo(res.data.circuit_info || {})
                setWeather(res.data.weather || [])
                setLaps(res.data.laps || [])
                setTotalLaps(res.data.total_laps || 0)

                if (data.length > 0) {
                    // Initialize start time based on Laps data if available, to avoid pre-race telemetry
                    // Find the earliest Lap 1 Start Time
                    const fetchedLaps = res.data.laps || [];
                    let min = d3.min(data, d => d.Time);
                    let startAt = min;

                    if (fetchedLaps.length > 0) {
                        const lap1Starts = fetchedLaps
                            .filter(l => l.LapNumber === 1 && l.LapStartTime !== null && l.LapStartTime !== undefined)
                            .map(l => l.LapStartTime);

                        if (lap1Starts.length > 0) {
                            const raceStart = Math.min(...lap1Starts);
                            // Set default start time to 5 seconds before race start
                            // But keep 'min' as the absolute minimum so user can scrub back
                            if (raceStart > 0) {
                                startAt = Math.max(min, raceStart - 5);
                            }
                        }
                    }

                    let max = d3.max(data, d => d.Time)

                    // Calculate Race End Time (Winner's Finish Time)
                    const totalLaps = res.data.total_laps || 0;

                    if (totalLaps > 0 && fetchedLaps.length > 0) {
                        // Find laps that are the final lap
                        const finalLaps = fetchedLaps.filter(l => l.LapNumber === totalLaps);
                        if (finalLaps.length > 0) {
                            // Calculate finish times (StartTime + LapTime)
                            const finishTimes = finalLaps.map(l => (l.LapStartTime || 0) + (l.LapTime || 0));
                            // The winner is the first one to finish
                            const winnerFinishTime = Math.min(...finishTimes);

                            // Only clamp max time if winnerFinishTime is reasonable (e.g. > startAt)
                            // And ensure we don't cut off too much if data continues
                            if (winnerFinishTime > startAt) {
                                // Use the later of (Winner + 30s) or (Max Data Time - 60s)
                                // This prevents cutting off the race if totalLaps is wrong (too small)
                                // But still tries to stop near the end
                                // Actually, let's just trust the data max unless it's WAY longer

                                // If winner finishes at T=5000, and data goes to T=6000, maybe we stop at 5060.
                                // But if winner finishes at T=2000 (wrong totalLaps), and data goes to T=6000, we shouldn't stop at 2060.

                                // Heuristic: If winnerFinishTime is within 5 minutes of max data, use it.
                                if (max - winnerFinishTime < 300) {
                                    max = winnerFinishTime + 30;
                                }
                            }
                        }
                    }

                    setMinTime(min)
                    setMaxTime(max)
                    setCurrentTime(startAt)
                }
            } catch (err) {
                console.error("Telemetry fetch error", err);
            } finally {
                setLoading(false)
            }
        };

        fetchData();
    }, [year, raceName, API_URL])

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
                // ALWAYS prefer calculation from official Laps data over telemetry LapNumber
                // This fixes the "Lap 7 at half race" issue caused by telemetry gaps
                if (groupedLaps[driver]) {
                    // Find the last lap that has started (LapStartTime <= currentTime)
                    // Since groupedLaps is sorted by LapNumber, we can iterate backwards or filter
                    // Filter is safer. IMPORTANT: Check for valid LapStartTime (not null/undefined)
                    const startedLaps = groupedLaps[driver].filter(l =>
                        l.LapStartTime !== null &&
                        l.LapStartTime !== undefined &&
                        l.LapStartTime <= currentTime
                    );
                    const currentLapData = startedLaps[startedLaps.length - 1];

                    if (currentLapData) {
                        point.Lap = currentLapData.LapNumber;
                    } else {
                        // Before first lap start time
                        point.Lap = 1;
                    }
                } else if (point.LapNumber !== undefined) {
                    // Fallback to telemetry if no lap data
                    point.Lap = point.LapNumber;
                } else {
                    point.Lap = 1;
                }

                // Fix: Ensure Lap doesn't start at 0 if race has started
                if (!point.Lap || point.Lap < 1) point.Lap = 1;

                // Safety check for invalid coordinates
                if (point.X === null || point.X === undefined || isNaN(point.X) ||
                    point.Y === null || point.Y === undefined || isNaN(point.Y)) {
                    return null;
                }

                return point;
            }
            return null;
        }).filter(Boolean);

        // Sort Logic
        positions.sort((a, b) => {
            const infoA = driversInfo[a.Driver] || {};
            const infoB = driversInfo[b.Driver] || {};

            // 1. If Race Finished (Leader has finished total laps), respect Official Classification
            // We check if the leader (or anyone) has reached totalLaps
            const raceFinished = positions.some(p => (p.Lap || 0) >= totalLaps && totalLaps > 0);

            // Also check if we are near maxTime (within 30s)
            const nearEnd = (maxTime - currentTime) < 30;

            if (raceFinished || nearEnd) {
                const posA = infoA.ClassifiedPosition || 99;
                const posB = infoB.ClassifiedPosition || 99;
                // If both have valid positions, sort by them
                if (posA !== 99 || posB !== 99) {
                    return posA - posB;
                }
            }

            // 2. If Start of Race (Lap 0 or 1 and very early), respect Grid Position
            // This fixes the "Random Order at Start" issue
            const isStart = (a.Lap || 0) <= 1 && currentTime < 120;
            if (isStart) {
                // If both have distance < 300m, use grid
                if ((a.Distance || 0) < 300 && (b.Distance || 0) < 300) {
                    const gridA = infoA.GridPosition || 20;
                    const gridB = infoB.GridPosition || 20;
                    return gridA - gridB;
                }
            }

            // 3. Standard Race Sorting: Lap > Distance
            const lapA = a.Lap || 0;
            const lapB = b.Lap || 0;
            if (lapA !== lapB) return lapB - lapA;
            return (b.Distance || 0) - (a.Distance || 0);
        });

        // Calculate Gaps
        if (positions.length > 0) {
            // Find the leader (first running or finished car)
            const leader = positions.find(p => p.Status === "RUNNING" || p.Status === "FINISHED") || positions[0];
            const leaderDist = leader.Distance || 0;
            const leaderLap = leader.Lap || 0;

            // Check if race is over for the leader
            const isRaceOver = totalLaps > 0 && leaderLap >= totalLaps;

            positions.forEach((p, i) => {
                // Force status to FINISHED if race is over and they are classified
                if (isRaceOver && driversInfo[p.Driver]?.ClassifiedPosition) {
                    p.Status = "FINISHED";
                }

                if (p.Driver === leader.Driver) {
                    p.GapStr = "Leader";
                } else if (p.Status === "RET") {
                    p.GapStr = "OUT";
                } else {
                    // Check if lapped
                    const lapDiff = leaderLap - (p.Lap || 0);
                    if (lapDiff > 0) {
                        p.GapStr = `+${lapDiff} Lap${lapDiff > 1 ? 's' : ''}`;
                    } else {
                        const speed = p.Speed / 3.6;
                        const distDiff = leaderDist - (p.Distance || 0);
                        if (speed > 1) {
                            const timeGap = distDiff / speed;
                            p.GapStr = `+${timeGap.toFixed(3)} s`;
                        } else {
                            p.GapStr = `+${distDiff.toFixed(0)} m`;
                        }
                    }
                }
            });
        }

        return positions;
    }, [groupedTelemetry, currentTime, driversInfo, laps]);

    // Update standings state for Leaderboard
    useEffect(() => {
        setStandings(currentPositions);
    }, [currentPositions]);

    // Animation Loop
    useEffect(() => {
        let animationFrameId;
        let lastTimestamp;

        const animate = (timestamp) => {
            if (!lastTimestamp) lastTimestamp = timestamp;
            const deltaTime = (timestamp - lastTimestamp) / 1000; // seconds
            lastTimestamp = timestamp;

            if (isPlaying) {
                setCurrentTime(prev => {
                    const next = prev + (deltaTime * speed);
                    if (next >= maxTime) {
                        setIsPlaying(false);
                        // Trigger podium display when race ends
                        if (totalLaps > 0 && !showPodium) {
                            setTimeout(() => setShowPodium(true), 500);
                        }
                        return maxTime;
                    }
                    return next;
                });
                animationFrameId = requestAnimationFrame(animate);
            }
        };

        if (isPlaying) {
            animationFrameId = requestAnimationFrame(animate);
        }

        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying, speed, maxTime, totalLaps, showPodium]);

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

    // Calculate current lap from standings or time
    useEffect(() => {
        if (standings.length > 0 && standings[0]?.Lap) {
            setCurrentLap(standings[0].Lap);
        }
    }, [standings]);

    // Fastest lap detection
    const fastestLapInfo = useMemo(() => {
        if (!laps || laps.length === 0) return null;
        let fastest = null;
        laps.forEach(lap => {
            if (lap.LapTime && lap.LapTime > 0) {
                if (!fastest || lap.LapTime < fastest.time) {
                    fastest = { driver: lap.Driver, time: lap.LapTime, lap: lap.LapNumber };
                }
            }
        });
        return fastest;
    }, [laps]);

    // Check if race is finished
    const isRaceFinished = useMemo(() => {
        if (totalLaps === 0) return false;
        return currentLap >= totalLaps && currentTime >= maxTime - 5;
    }, [currentLap, totalLaps, currentTime, maxTime]);

    // Lap navigation functions
    const goToLap = useCallback((lapNum) => {
        const startTime = lapStartTimes[lapNum];
        if (startTime !== undefined) {
            setCurrentTime(Math.max(minTime, startTime - 2)); // 2 seconds before lap starts
        }
    }, [lapStartTimes, minTime]);

    const goToPrevLap = useCallback(() => {
        const prevLap = Math.max(1, currentLap - 1);
        goToLap(prevLap);
    }, [currentLap, goToLap]);

    const goToNextLap = useCallback(() => {
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

    useEffect(() => {
        if (!telemetry.length || !svgRef.current) return;

        const width = 800;
        const height = 500;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous

        // Scales
        const xExtent = d3.extent(telemetry, d => d.X);
        const yExtent = d3.extent(telemetry, d => d.Y);

        // Add some padding
        const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

        const xScale = d3.scaleLinear()
            .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([height, 0]); // Invert Y for SVG

        // Draw Track
        if (telemetry.length > 0) {
            const trackDriver = Object.keys(groupedTelemetry)[0];
            const trackData = groupedTelemetry[trackDriver];

            const line = d3.line()
                .x(d => xScale(d.X))
                .y(d => yScale(d.Y))
                .curve(d3.curveCatmullRom);

            // Glow effect definition
            const defs = svg.append("defs");
            const filter = defs.append("filter").attr("id", "glow");
            filter.append("feGaussianBlur").attr("stdDeviation", "3.5").attr("result", "coloredBlur");
            const feMerge = filter.append("feMerge");
            feMerge.append("feMergeNode").attr("in", "coloredBlur");
            feMerge.append("feMergeNode").attr("in", "SourceGraphic");

            // Track Outline (Glow)
            svg.append("path")
                .datum(trackData)
                .attr("fill", "none")
                .attr("stroke", "#444")
                .attr("stroke-width", 8)
                .attr("d", line)
                .style("filter", "url(#glow)")
                .attr("opacity", 0.5);

            // Track Center Line
            svg.append("path")
                .datum(trackData)
                .attr("fill", "none")
                .attr("stroke", "#E0E0E0")
                .attr("stroke-width", 2)
                .attr("d", line)
                .attr("opacity", 0.8);
        }

        // Draw Drivers (Filter out RETIRED)
        const activeDrivers = currentPositions.filter(d => d.Status === "RUNNING");

        const drivers = svg.selectAll(".driver-group")
            .data(activeDrivers)
            .enter()
            .append("g")
            .attr("class", "driver-group")
            .attr("transform", d => `translate(${xScale(d.X)}, ${yScale(d.Y)})`);

        // Driver Dot
        drivers.append("circle")
            .attr("r", 6)
            .attr("fill", d => {
                const info = driversInfo[d.Driver];
                return info ? info.TeamColor : '#111';
            })
            .attr("stroke", d => {
                const c = d.Compound ? d.Compound.toUpperCase() : 'UNKNOWN';
                if (c.includes('SOFT')) return '#DC0000';
                if (c.includes('MEDIUM')) return '#FCD700';
                if (c.includes('HARD')) return '#E0E0E0';
                if (c.includes('INTER')) return '#00D2BE';
                if (c.includes('WET')) return '#0000FF';
                return '#FFF';
            })
            .attr("stroke-width", 2);

        // Driver Label
        drivers.append("text")
            .attr("x", 8)
            .attr("y", 4)
            .text(d => {
                const info = driversInfo[d.Driver];
                return info ? info.Abbreviation : d.Driver;
            })
            .attr("fill", "white")
            .attr("font-size", "10px")
            .attr("font-family", "Roboto Mono, monospace")
            .attr("font-weight", "bold")
            .style("text-shadow", "0px 0px 4px black");

    }, [telemetry, currentPositions, driversInfo]);

    // Race Control Status (Flags)
    const currentStatus = useMemo(() => {
        // Check Race Control Messages first for Red/Yellow flags
        // We look for the latest message <= currentTime
        const recentMsgs = raceControl.filter(m => m.Time <= currentTime);
        const lastMsg = recentMsgs[recentMsgs.length - 1];

        if (lastMsg) {
            if (lastMsg.Message.includes("RED FLAG")) return { type: 'RED', text: 'RED FLAG' };
            if (lastMsg.Flag === 'Red') return { type: 'RED', text: 'RED FLAG' };
            // Yellow flags are often sector specific, but let's show global if "Yellow Flag"
            if (lastMsg.Message.includes("YELLOW FLAG")) return { type: 'YELLOW', text: 'YELLOW FLAG' };
        }

        // Check Track Status (SC/VSC)
        const activeEvent = events.filter(e => e.Time <= currentTime).pop();
        if (activeEvent) {
            if (activeEvent.Status === '4' || activeEvent.Status === 'SC') return { type: 'SC', text: 'SAFETY CAR' };
            if (activeEvent.Status === '6' || activeEvent.Status === 'VSC') return { type: 'VSC', text: 'VIRTUAL SAFETY CAR' };
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
        <div className="flex flex-col items-center w-full bg-black min-h-screen text-white font-sans">
            {loading && (
                <div className="w-full h-[500px] flex items-center justify-center border border-gray-800 rounded bg-black/50">
                    <div className="text-rbr-yellow font-mono animate-pulse text-2xl">INITIALIZING TELEMETRY STREAM...</div>
                </div>
            )}

            {!loading && (
                <div className="w-full max-w-[1800px] p-4 flex flex-col gap-4 min-h-[calc(100vh-80px)]">

                    {/* Header with Logo */}
                    <div className="flex items-center justify-between px-2 border-b border-gray-800 pb-2">
                        <div className="flex items-center gap-4">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/3/33/F1.svg" alt="F1" className="h-6 bg-white p-1 rounded" />
                            <h1 className="text-xl font-black italic tracking-tighter uppercase">
                                <span className="text-rbr-red">Oracle</span> Red Bull Racing <span className="text-gray-500 text-sm not-italic font-normal">| Post-Race Analytics</span>
                            </h1>
                        </div>
                        <div className="text-xs font-mono text-gray-500">
                            {year} {raceName}
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-4 flex-1 min-h-[600px]">
                        {/* LEFT COLUMN: Leaderboard (20%) */}
                        <div className="col-span-2 flex flex-col gap-4 h-full overflow-hidden">
                            <Leaderboard
                                standings={standings}
                                driversInfo={driversInfo}
                                onDriverClick={handleDriverClick}
                                fastestLapDriver={fastestLapInfo?.driver}
                                selectedDriver={selectedDriver}
                                comparisonDriver={comparisonDriver}
                            />
                        </div>

                        {/* CENTER COLUMN: Map & Charts (60%) */}
                        <div className="col-span-8 flex flex-col gap-4 h-full">
                            {/* Map Area */}
                            <div className="relative border border-gray-700 rounded bg-black flex justify-center overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)] flex-grow min-h-[400px]">
                                {/* Grid overlay */}
                                <div className="absolute inset-0 pointer-events-none opacity-20"
                                    style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                                </div>

                                {/* Flag Overlay */}
                                {currentStatus && (
                                    <div className={`absolute top-0 left-0 right-0 py-3 z-30 animate-pulse font-bold text-center text-2xl tracking-widest border-b-4 shadow-lg
                            ${currentStatus.type === 'RED' ? 'bg-red-600/90 border-red-800 text-white' :
                                            currentStatus.type === 'YELLOW' ? 'bg-yellow-500/90 border-yellow-700 text-black' :
                                                'bg-orange-500/90 border-orange-700 text-black'}`}>
                                        {currentStatus.text}
                                    </div>
                                )}

                                <svg ref={svgRef} viewBox="0 0 800 500" className="bg-transparent w-full h-full relative z-10" />

                                {/* Session Time & Lap */}
                                <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                                    <div className="text-white font-mono bg-black/80 border border-gray-700 p-3 rounded shadow-lg backdrop-blur min-w-[100px]">
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Session Time</div>
                                        <div className="text-2xl text-rbr-red font-bold tabular-nums">{new Date(currentTime * 1000).toISOString().substr(11, 8)}</div>
                                    </div>
                                    <div className="text-white font-mono bg-black/80 border border-gray-700 p-3 rounded shadow-lg backdrop-blur min-w-[100px]">
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Lap</div>
                                        <div className="text-2xl text-white font-bold tabular-nums">
                                            {currentLap} <span className="text-gray-500 text-lg">/ {totalLaps}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Driver Details Modal */}
                                {selectedDriver && driversInfo[selectedDriver] && (
                                    <div className="absolute bottom-4 right-4 bg-black/90 border-l-4 border-rbr-red p-6 rounded w-80 z-30 shadow-2xl backdrop-blur-md">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-3xl font-black text-white italic uppercase leading-none">{driversInfo[selectedDriver].LastName}</h3>
                                                <div className="text-sm text-gray-400 uppercase tracking-widest">{driversInfo[selectedDriver].FirstName}</div>
                                            </div>
                                            <button onClick={() => setSelectedDriver(null)} className="text-gray-500 hover:text-white text-xl">&times;</button>
                                        </div>

                                        <div className="flex items-center gap-3 mb-4 bg-gray-900/50 p-2 rounded">
                                            <div className="w-1.5 h-10" style={{ backgroundColor: driversInfo[selectedDriver].TeamColor }}></div>
                                            <div>
                                                <div className="text-xs text-gray-500 uppercase">Team</div>
                                                <div className="text-sm font-bold text-white">{driversInfo[selectedDriver].TeamName}</div>
                                            </div>
                                            <div className="ml-auto text-4xl font-bold text-gray-700 italic opacity-50">{selectedDriver}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                            <div className="bg-gray-800 p-2 rounded">
                                                <div className="text-gray-500 mb-1">TYRE</div>
                                                <div className="text-white text-lg font-bold">{standings.find(d => d.Driver === selectedDriver)?.Compound || '-'}</div>
                                            </div>
                                            <div className="bg-gray-800 p-2 rounded">
                                                <div className="text-gray-500 mb-1">SPEED</div>
                                                <div className="text-white text-lg font-bold">{Math.round(standings.find(d => d.Driver === selectedDriver)?.Speed || 0)} <span className="text-xs font-normal">km/h</span></div>
                                            </div>
                                            <div className="bg-gray-800 p-2 rounded col-span-2">
                                                <div className="text-gray-500 mb-1">STATUS</div>
                                                <div className={`text-lg font-bold ${standings.find(d => d.Driver === selectedDriver)?.Status === 'RET' ? 'text-red-500' : 'text-green-500'}`}>
                                                    {standings.find(d => d.Driver === selectedDriver)?.Status === 'RET' ? 'RETIRED' : 'ON TRACK'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Controls (Moved below map) */}
                            <div className="bg-gray-900/80 p-2 rounded border border-gray-700 flex gap-4 items-center shadow-lg backdrop-blur-sm shrink-0">
                                <button
                                    className={`px-4 py-1.5 rounded font-bold font-mono text-xs transition-all tracking-wider ${isPlaying ? 'bg-rbr-red text-white hover:bg-red-700 shadow-[0_0_15px_rgba(220,0,0,0.4)]' : 'bg-white text-black hover:bg-gray-200'}`}
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    title="Space to toggle"
                                >
                                    {isPlaying ? 'PAUSE' : 'PLAY'}
                                </button>

                                {/* Lap Navigation Controls */}
                                <div className="flex items-center gap-1 border-l border-gray-600 pl-4">
                                    <button
                                        onClick={goToPrevLap}
                                        disabled={currentLap <= 1}
                                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono text-xs transition-colors"
                                        title="← Previous lap"
                                    >
                                        ◀
                                    </button>
                                    <select
                                        value={currentLap}
                                        onChange={(e) => goToLap(Number(e.target.value))}
                                        className="bg-black border border-gray-600 text-white p-1 rounded font-mono text-[10px] outline-none focus:border-rbr-red w-16 text-center"
                                    >
                                        {Array.from({ length: totalLaps }, (_, i) => i + 1).map(lap => (
                                            <option key={lap} value={lap}>LAP {lap}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={goToNextLap}
                                        disabled={currentLap >= totalLaps}
                                        className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono text-xs transition-colors"
                                        title="→ Next lap"
                                    >
                                        ▶
                                    </button>
                                </div>

                                <div className="flex-grow flex flex-col justify-center gap-1">
                                    <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                                        <span>START</span>
                                        <span>FINISH</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={minTime}
                                        max={maxTime}
                                        value={currentTime}
                                        onChange={(e) => setCurrentTime(Number(e.target.value))}
                                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rbr-red hover:accent-white transition-all"
                                    />
                                </div>

                                <div className="flex items-center gap-2 border-l border-gray-600 pl-4">
                                    <span className="text-[9px] font-mono text-gray-400 uppercase">Speed</span>
                                    <select
                                        className="bg-black border border-gray-600 text-white p-1 rounded font-mono text-[10px] outline-none focus:border-rbr-red hover:border-gray-400 transition-colors"
                                        value={speed}
                                        onChange={(e) => setSpeed(Number(e.target.value))}
                                    >
                                        <option value="1">1x</option>
                                        <option value="5">5x</option>
                                        <option value="10">10x</option>
                                        <option value="20">20x</option>
                                        <option value="60">60x</option>
                                    </select>
                                </div>

                                {/* Keyboard shortcuts hint */}
                                <div className="text-[8px] text-gray-600 font-mono border-l border-gray-600 pl-4 hidden lg:block">
                                    <div>SPACE: Play/Pause</div>
                                    <div>←→: Prev/Next Lap</div>
                                </div>
                            </div>

                            {/* Telemetry Charts (Collapsible or Fixed Height) */}
                            <div className="h-[200px] shrink-0">
                                <TelemetryCharts
                                    telemetry={telemetry}
                                    selectedDriver={selectedDriver}
                                    comparisonDriver={comparisonDriver}
                                    leaderDriver={standings[0]?.Driver}
                                    currentTime={currentTime}
                                />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Info & Strategy (20%) */}
                        <div className="col-span-2 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pr-1">
                            {/* Circuit Info Panel */}
                            <div className="bg-gray-900/80 border border-gray-700 rounded p-3 backdrop-blur-sm shrink-0">
                                <h3 className="text-gray-400 text-[10px] uppercase tracking-widest mb-2 border-b border-gray-700 pb-1">Circuit Information</h3>
                                <div className="text-sm font-bold text-white mb-1 truncate" title={circuitInfo.OfficialEventName || raceName}>{circuitInfo.OfficialEventName || raceName}</div>
                                <div className="flex justify-between text-[10px] text-gray-300 mb-2">
                                    <span>{circuitInfo.Location}</span>
                                    <span>R{circuitInfo.RoundNumber}</span>
                                </div>

                                {currentWeather && (
                                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                        <div className="bg-gray-800 p-1.5 rounded">
                                            <div className="text-gray-500 mb-0.5">AIR</div>
                                            <div className="text-white font-bold">{currentWeather.AirTemp}°C</div>
                                        </div>
                                        <div className="bg-gray-800 p-1.5 rounded">
                                            <div className="text-gray-500 mb-0.5">TRACK</div>
                                            <div className="text-white font-bold">{currentWeather.TrackTemp}°C</div>
                                        </div>
                                        <div className="bg-gray-800 p-1.5 rounded">
                                            <div className="text-gray-500 mb-0.5">HUM</div>
                                            <div className="text-white font-bold">{currentWeather.Humidity}%</div>
                                        </div>
                                        <div className="bg-gray-800 p-1.5 rounded">
                                            <div className="text-gray-500 mb-0.5">WIND</div>
                                            <div className="text-white font-bold">{currentWeather.WindSpeed} m/s</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Race Control Messages & Radio */}
                            <div className="bg-gray-900/80 border border-gray-700 rounded p-3 backdrop-blur-sm flex flex-col h-40 shrink-0">
                                <h3 className="text-rbr-red text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rbr-red animate-pulse"></span>
                                    Race Control & Radio
                                </h3>
                                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 pr-1 space-y-2">
                                    {recentMessages.length === 0 && <div className="text-gray-500 text-[10px] italic">No active messages</div>}
                                    {recentMessages.map((msg, i) => (
                                        <div key={i} className={`text-[10px] border-l-2 pl-2 py-0.5 ${msg.type === 'TR' ? 'border-blue-500' : 'border-gray-600'}`}>
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="text-gray-500 font-mono mr-1">{new Date(msg.Time * 1000).toISOString().substr(11, 8)}</span>
                                                {msg.type === 'TR' && <span className="text-blue-400 font-bold bg-blue-900/30 px-1 rounded">{msg.Driver}</span>}
                                                {msg.type === 'RC' && <span className="text-gray-500 font-bold bg-gray-800 px-1 rounded">RC</span>}
                                            </div>
                                            <span className="text-white leading-tight block">{msg.Message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pit Stop Analysis */}
                            <div className="flex-1 min-h-[150px] flex flex-col">
                                <PitStopAnalysis laps={laps} driversInfo={driversInfo} />
                            </div>

                            {/* Sector Times */}
                            <SectorTimes
                                laps={laps}
                                driversInfo={driversInfo}
                                standings={standings}
                                currentTime={currentTime}
                            />
                        </div>

                    </div>

                    {/* Bottom Row: Gap Chart and Strategy Panel */}
                    <div className="grid grid-cols-2 gap-4 shrink-0">
                        {/* Gap to Leader Chart */}
                        <div className="h-64">
                            <GapChart
                                laps={laps}
                                driversInfo={driversInfo}
                                standings={standings}
                                currentTime={currentTime}
                                totalLaps={totalLaps}
                            />
                        </div>

                        {/* Strategy Panel */}
                        <div className="h-64">
                            <StrategyPanel
                                laps={laps}
                                driversInfo={driversInfo}
                                totalLaps={laps.length > 0 ? Math.max(...laps.map(l => l.LapNumber)) : 0}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Podium Display Modal */}
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
