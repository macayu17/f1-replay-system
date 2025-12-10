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
    const [raceStartTime, setRaceStartTime] = useState(0) // Time when race actually started (Lap 1)

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

                // DEBUG: Log the actual data to understand the issue
                console.log('=== DEBUG LAP DATA ===');
                console.log('Total Laps:', res.data.total_laps);
                console.log('Sample Laps Data (first 5):', res.data.laps?.slice(0, 5));
                console.log('Sample Telemetry (first 3 points):', data.slice(0, 3));

                // Find when actual racing starts (Lap 2 begins)
                const lap2Start = res.data.laps?.find(l => l.LapNumber === 2)?.LapStartTime;
                console.log('Lap 2 Start Time:', lap2Start);

                console.log('Time Range:', {
                    min: d3.min(data, d => d.Time),
                    max: d3.max(data, d => d.Time),
                    raceStart: lap2Start
                });
                console.log('======================');

                if (data.length > 0) {
                    const fetchedLaps = res.data.laps || [];
                    let min = d3.min(data, d => d.Time);
                    let startAt = min;

                    // Find the start of Lap 1 (race start) - this is our reference for elapsed time
                    const lap1StartTime = fetchedLaps.find(l => l.LapNumber === 1)?.LapStartTime;
                    const raceStart = lap1StartTime || min;
                    setRaceStartTime(raceStart);
                    console.log('Race start time (Lap 1):', raceStart);

                    // Start the replay at the beginning of Lap 2 (after formation/parade lap)
                    const lap2StartTime = fetchedLaps.find(l => l.LapNumber === 2)?.LapStartTime;
                    if (lap2StartTime && lap2StartTime > min) {
                        startAt = lap2StartTime - 5; // Start 5 seconds before Lap 2
                        console.log('Setting start time to Lap 2:', startAt);
                    }

                    let max = d3.max(data, d => d.Time);

                    // Calculate Race End Time (Winner's Finish Time)
                    const totalLapsFromData = res.data.total_laps || 0;

                    if (totalLapsFromData > 0 && fetchedLaps.length > 0) {
                        // Find laps that are the final lap
                        const finalLaps = fetchedLaps.filter(l => l.LapNumber === totalLapsFromData);
                        if (finalLaps.length > 0) {
                            // Calculate finish times (StartTime + LapTime) - only for valid entries
                            const validFinishTimes = finalLaps
                                .filter(l => l.LapStartTime && l.LapTime && l.LapTime > 0)
                                .map(l => l.LapStartTime + l.LapTime);

                            if (validFinishTimes.length > 0) {
                                // The winner is the first one to finish
                                const winnerFinishTime = Math.min(...validFinishTimes);
                                console.log('Winner finish time:', winnerFinishTime);

                                // Cap the max time to winner's finish + 60 seconds (for cooldown lap display)
                                // This prevents the replay from running indefinitely
                                if (winnerFinishTime > startAt && winnerFinishTime < max) {
                                    max = winnerFinishTime + 60; // 60 seconds after winner finishes
                                    console.log('Capping max time to:', max);
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
            const completedLaps = driverLaps.filter(l =>
                l.LapTime && l.LapTime > 0 &&
                l.LapStartTime !== null && l.LapStartTime <= currentTime
            );

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

            // 1. If Race Finished (past maxTime OR leader has crossed finish), 
            //    ALWAYS use Official Classification
            const leaderLap = Math.max(...positions.map(p => p.Lap || 0));
            const raceFinished = (totalLaps > 0 && leaderLap >= totalLaps) || (currentTime >= maxTime - 5);

            if (raceFinished) {
                // Use official classification - default to 99 for non-classified
                const posA = infoA.ClassifiedPosition ?? 99;
                const posB = infoB.ClassifiedPosition ?? 99;
                return posA - posB;
            }

            // 2. If Start of Race (Lap 0 or 1 and very early), respect Grid Position
            const isStart = (a.Lap || 0) <= 1 && currentTime < 60;
            if (isStart && (a.Distance || 0) < 500 && (b.Distance || 0) < 500) {
                const gridA = infoA.GridPosition || 20;
                const gridB = infoB.GridPosition || 20;
                return gridA - gridB;
            }

            // 3. Standard Race Sorting: Higher Lap > Lower Cumulative Time (faster)
            const lapA = a.Lap || 0;
            const lapB = b.Lap || 0;
            if (lapA !== lapB) return lapB - lapA; // More laps = better

            // Same lap: who finished it first (lower cumulative time = ahead)
            // If cumulative times are available
            if (a.CumulativeTime && b.CumulativeTime) {
                return a.CumulativeTime - b.CumulativeTime;
            }

            // Fallback: use distance (for when cumulative time not yet available)
            return (b.Distance || 0) - (a.Distance || 0);
        });

        // Calculate Gaps
        if (positions.length > 0) {
            const leader = positions.find(p => p.Status === "RUNNING" || p.Status === "FINISHED") || positions[0];
            const leaderLap = leader.Lap || 0;
            const leaderTime = leader.CumulativeTime || 0;

            const isRaceOver = totalLaps > 0 && leaderLap >= totalLaps;

            positions.forEach((p, i) => {
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
    }, [groupedTelemetry, groupedLaps, currentTime, driversInfo, laps, totalLaps, maxTime]);

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

    // Calculate current lap based on elapsed session time
    // This is more reliable than using standings[0].Lap which can be inconsistent
    useEffect(() => {
        // DEBUG: Log lap start times on first load
        if (lapStartTimes && Object.keys(lapStartTimes).length > 0) {
            console.log('=== LAP TIMING DEBUG ===');
            console.log('currentTime:', currentTime);
            console.log('lapStartTimes (first 5):', Object.entries(lapStartTimes).slice(0, 5));
        }

        // Primary method: Use leader's lap from standings (most accurate)
        if (standings.length > 0 && standings[0]?.Lap && standings[0].Lap > 0) {
            const leaderLap = standings[0].Lap;
            if (leaderLap !== currentLap) {
                console.log('Setting lap from leader:', leaderLap);
                setCurrentLap(leaderLap);
            }
            return;
        }

        // Fallback: Calculate from lap start times
        if (!lapStartTimes || Object.keys(lapStartTimes).length === 0) {
            return;
        }

        // Find the highest lap number where its start time is <= currentTime
        let calculatedLap = 1;
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

        // Clamp to totalLaps if available
        if (totalLaps > 0 && calculatedLap > totalLaps) {
            calculatedLap = totalLaps;
        }

        if (calculatedLap !== currentLap) {
            console.log('Setting lap from calculation:', calculatedLap, 'currentTime:', currentTime);
            setCurrentLap(calculatedLap);
        }
    }, [currentTime, lapStartTimes, totalLaps, standings, currentLap]);

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
                                <span className="text-rbr-red">Grid</span>Pulse <span className="text-gray-500 text-sm not-italic font-normal">| Post-Race Analytics</span>
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
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">Race Time</div>
                                        <div className="text-2xl text-rbr-red font-bold tabular-nums">
                                            {(() => {
                                                // Calculate elapsed time from race start (Lap 1)
                                                const elapsed = Math.max(0, currentTime - raceStartTime);
                                                const hours = Math.floor(elapsed / 3600);
                                                const minutes = Math.floor((elapsed % 3600) / 60);
                                                const seconds = Math.floor(elapsed % 60);
                                                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                                            })()}
                                        </div>
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
