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
  }, [])

  useEffect(() => {
    if (selectedSeason) {
      setLoading(true)
      axios.get(`${API_URL}/api/${selectedSeason}/races`)
        .then(res => {
          // Ensure we have an array
          const raceData = Array.isArray(res.data) ? res.data : [];
          setRaces(raceData)
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [selectedSeason])

  return (
    <div className="min-h-screen bg-rbr-black text-white font-sans flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-rbr-charcoal border-b border-gray-800 p-4 flex justify-between items-center shadow-lg z-10">
        <div className="flex items-center gap-4">
          <div className="w-1 h-8 bg-rbr-red"></div>
          <h1 className="text-2xl font-bold tracking-tighter italic">
            <span className="text-rbr-red">ORACLE</span> RED BULL RACING <span className="text-gray-500 text-sm not-italic font-mono border border-gray-600 px-1 rounded">PRAH v1.0</span>
          </h1>
        </div>
        
        <div className="flex gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Season</label>
            <select 
              className="bg-black border border-gray-700 p-1 rounded text-white font-mono text-sm focus:border-rbr-red outline-none"
              onChange={(e) => setSelectedSeason(e.target.value)}
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
                  setSelectedRace(race);
              }}
              disabled={!selectedSeason}
            >
              <option value="">SELECT EVENT</option>
              {races.map(r => <option key={r.EventName} value={r.EventName}>{r.EventName}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-grow p-6 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10" 
             style={{backgroundImage: 'linear-gradient(0deg, transparent 24%, #222 25%, #222 26%, transparent 27%, transparent 74%, #222 75%, #222 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #222 25%, #222 26%, transparent 27%, transparent 74%, #222 75%, #222 76%, transparent 77%, transparent)', backgroundSize: '50px 50px'}}>
        </div>

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
                <RaceReplay year={selectedSeason} raceName={selectedRace.EventName} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
