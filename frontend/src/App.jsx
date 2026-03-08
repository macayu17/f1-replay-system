import { useState, useEffect, lazy, Suspense } from 'react'
import axios from 'axios'

const RaceReplay = lazy(() => import('./components/RaceReplay'))

function App() {
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [races, setRaces] = useState([])
  const [selectedRace, setSelectedRace] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  console.log("Frontend API URL:", API_URL); // Debugging log

  useEffect(() => {
    axios.get(`${API_URL}/api/seasons`)
      .then(res => {
        const apiSeasons = Array.isArray(res.data?.seasons) ? res.data.seasons : []
        const currentYear = new Date().getFullYear()
        const merged = Array.from(new Set([...apiSeasons, currentYear])).sort((a, b) => b - a)
        setSeasons(merged)
      })
      .catch(err => console.error(err))
  }, [API_URL])

  useEffect(() => {
    if (!selectedSeason) return

    axios.get(`${API_URL}/api/${selectedSeason}/races`)
      .then(res => {
        const raceData = Array.isArray(res.data) ? res.data : [];
        setRaces(raceData)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [selectedSeason, API_URL])

  return (
    <div className="min-h-screen bg-rbr-black text-white font-sans flex flex-col">
      <header className="relative bg-gradient-to-r from-[#0d1018] via-[#101624] to-[#0d1018]/95 border-b border-white/10 p-4 flex justify-between items-center z-10 backdrop-blur shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-rbr-red/70 to-transparent" />
        <div className="flex items-center gap-4">
          <div className="w-1 h-8 bg-rbr-red rounded-full"></div>
          <h1 className="text-xl md:text-2xl font-display font-semibold tracking-wide uppercase">
            <span className="text-white/95">GRIDPULSE</span> <span className="text-rbr-red">·</span>{' '}
            <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">F1 Replay</span>
            <span className="text-gray-300 text-[10px] font-mono border border-white/20 px-2 py-0.5 rounded-full ml-2 align-middle normal-case">revamp</span>
          </h1>
        </div>
        
        <div className="flex gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Season</label>
            <select 
              className="bg-black/70 border border-white/20 p-1.5 rounded-md text-white font-mono text-sm focus:border-rbr-red outline-none transition-colors"
              onChange={(e) => {
                const nextSeason = e.target.value
                setSelectedRace(null)
                if (!nextSeason) {
                  setRaces([])
                  setLoading(false)
                } else {
                  setLoading(true)
                }
                setSelectedSeason(nextSeason)
              }}
              value={selectedSeason || ''}
            >
              <option value="">SELECT</option>
              {seasons.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Grand Prix</label>
            <select 
              className="bg-black/70 border border-white/20 p-1.5 rounded-md text-white font-mono text-sm focus:border-rbr-red outline-none min-w-[220px] transition-colors"
              onChange={(e) => {
                  const race = races.find(r => r.EventName === e.target.value);
                  setSelectedRace(race || null);
              }}
              value={selectedRace?.EventName || ''}
              disabled={!selectedSeason}
            >
              <option value="">SELECT EVENT</option>
              {races.map(r => <option key={r.EventName} value={r.EventName}>{r.EventName}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-6 relative overflow-hidden">

        {loading && (
          <div className="absolute top-20 right-6 flex items-center gap-2 text-rbr-yellow font-mono text-xs animate-pulse">
            <div className="w-2 h-2 bg-rbr-yellow rounded-full"></div>
            FETCHING DATA...
          </div>
        )}
        
        {!selectedRace && !loading && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-gray-600">
            <div className="text-6xl mb-4 opacity-20 font-bold">NO DATA</div>
            <p className="text-xl font-mono">AWAITING SESSION SELECTION</p>
          </div>
        )}

        {selectedRace && (
          <div className="grid grid-cols-1 gap-8 relative z-0">
            <div className="bg-rbr-charcoal/50 backdrop-blur-sm p-1 rounded-lg border border-gray-800 shadow-2xl">
              <div className="bg-black/40 p-4 border-b border-gray-800 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold uppercase italic tracking-wider text-white">
                        {selectedRace.EventName}
                    </h2>
                    <div className="text-rbr-red font-mono text-xs tracking-widest mt-1">RACE REPLAY // TELEMETRY SYNC</div>
                </div>
                <div className="text-right font-mono text-xs text-gray-400">
                    <div>LOC: {selectedRace.Location}</div>
                    <div>DATE: {new Date(selectedRace.EventDate).toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className="p-6">
                <Suspense fallback={<div className="text-sm text-gray-400 font-mono">Loading replay engine…</div>}>
                  <RaceReplay year={selectedSeason} raceName={selectedRace.EventName} apiUrl={API_URL} />
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
