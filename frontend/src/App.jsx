import { useState, useEffect } from 'react'
import axios from 'axios'
import RaceReplay from './components/RaceReplay'

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
      .then(res => setSeasons(res.data.seasons))
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
      <header className="bg-[#0f1115]/95 border-b border-white/10 p-4 flex justify-between items-center z-10 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="w-1 h-8 bg-rbr-red rounded-full"></div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            PRAH <span className="text-rbr-red">·</span> F1 Replay
            <span className="text-gray-400 text-xs font-mono border border-white/15 px-2 py-0.5 rounded-full ml-2 align-middle">revamp</span>
          </h1>
        </div>
        
        <div className="flex gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Season</label>
            <select 
              className="bg-black border border-gray-700 p-1 rounded text-white font-mono text-sm focus:border-rbr-red outline-none"
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
              className="bg-black border border-gray-700 p-1 rounded text-white font-mono text-sm focus:border-rbr-red outline-none min-w-[200px]"
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
                <RaceReplay year={selectedSeason} raceName={selectedRace.EventName} apiUrl={API_URL} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
