import { useState, useEffect, lazy, Suspense } from 'react'
import axios from 'axios'

const RaceReplay = lazy(() => import('./components/RaceReplay'))

function App() {
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [races, setRaces] = useState([])
  const [selectedRace, setSelectedRace] = useState(null)
  const [loading, setLoading] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
    <div className="velocity-app min-h-screen text-white font-sans flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[#f6a11a]/20 bg-[#050607]/92 backdrop-blur-xl">
        <div className="velocity-shell px-3 py-3 md:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="velocity-mono grid h-10 w-14 shrink-0 place-items-center border border-[#f6a11a]/45 bg-[#f6a11a]/12 text-xs font-black text-[#f6a11a]">
                GPX
              </div>
              <div className="min-w-0">
                <div className="velocity-label mb-1">Bloomberg-style race terminal</div>
                <h1 className="min-w-0 text-xl font-display font-bold uppercase leading-none md:text-3xl">
                  GridPulse <span className="text-[#f6a11a]">Grand Prix Rewind</span>
                </h1>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(130px,160px)_minmax(220px,340px)]">
              <div className="flex flex-col gap-2">
                <label className="velocity-label" htmlFor="season-select">Season</label>
                <select
                  id="season-select"
                  className="velocity-input velocity-mono w-full px-3 text-sm"
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
                  <option value="">Select</option>
                  {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <label className="velocity-label" htmlFor="race-select">Grand Prix</label>
                <select
                  id="race-select"
                  className="velocity-input velocity-mono w-full px-3 text-sm"
                  onChange={(e) => {
                    const race = races.find(r => r.EventName === e.target.value)
                    setSelectedRace(race || null)
                  }}
                  value={selectedRace?.EventName || ''}
                  disabled={!selectedSeason}
                >
                  <option value="">Select event</option>
                  {races.map(r => <option key={r.EventName} value={r.EventName}>{r.EventName}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="terminal-tape custom-scrollbar">
          <div className="terminal-cell"><span className="terminal-key">API</span> <span className="terminal-value">FASTF1/HF</span></div>
          <div className="terminal-cell"><span className="terminal-key">MODE</span> <span className="terminal-up">LIVE REPLAY</span></div>
          <div className="terminal-cell"><span className="terminal-key">SEASONS</span> <span className="terminal-value">{seasons.length || '--'}</span></div>
          <div className="terminal-cell"><span className="terminal-key">EVENTS</span> <span className="terminal-value">{races.length || '--'}</span></div>
          <div className="terminal-cell"><span className="terminal-key">STYLE</span> <span className="terminal-value">TERMINAL DENSE</span></div>
          <div className="terminal-cell"><span className="terminal-key">FEED</span> <span className={loading ? 'terminal-down' : 'terminal-up'}>{loading ? 'SYNCING' : 'READY'}</span></div>
        </div>
      </header>

      <main className="velocity-shell flex-grow px-3 py-4 md:px-5 md:py-5 relative">

        {loading && (
          <div className="velocity-panel absolute right-4 top-5 z-30 flex items-center gap-3 px-4 py-3 text-xs text-rbr-yellow md:right-8 md:top-8">
            <div className="h-2 w-2 bg-rbr-yellow shadow-[0_0_10px_rgba(188,86,20,0.8)]"></div>
            <span className="velocity-mono uppercase">Fetching race data</span>
          </div>
        )}

        {!selectedRace && !loading && (
          <div className="grid min-h-[66vh] place-items-center">
            <section className="velocity-panel is-hot w-full max-w-6xl">
              <div className="terminal-pane-title">
                <span className="velocity-label">Race Control Standby</span>
                <span className="velocity-mono text-[10px] text-white/45">GPX&lt;GO&gt;</span>
              </div>
              <div className="grid gap-px bg-[#f6a11a]/10 p-px lg:grid-cols-[1.25fr_0.75fr]">
                <div className="bg-[#050607]/95 p-5 md:p-7">
                  <div className="velocity-mono mb-4 text-xs text-[#f6a11a]">GRIDPULSE / F1R / SESSION SELECT</div>
                  <h2 className="max-w-3xl text-3xl font-display font-bold uppercase leading-tight md:text-5xl">
                    Select a season and event to load the race replay terminal.
                  </h2>
                  <div className="mt-6 grid gap-px bg-white/10 text-xs sm:grid-cols-3">
                    <div className="terminal-cell"><span className="terminal-key">POS</span> <span className="terminal-value">TRACK MAP</span></div>
                    <div className="terminal-cell"><span className="terminal-key">TEL</span> <span className="terminal-value">60S WINDOW</span></div>
                    <div className="terminal-cell"><span className="terminal-key">RC</span> <span className="terminal-value">RADIO/FLAGS</span></div>
                  </div>
                </div>

                <div className="grid gap-px bg-[#f6a11a]/10 p-px sm:grid-cols-3 lg:grid-cols-1">
                  <div className="bg-[#050607]/95 p-4">
                    <div className="velocity-label">Available Seasons</div>
                    <div className="velocity-mono mt-3 text-3xl font-semibold text-white">{seasons.length || '--'}</div>
                  </div>
                  <div className="bg-[#050607]/95 p-4">
                    <div className="velocity-label">Loaded Events</div>
                    <div className="velocity-mono mt-3 text-3xl font-semibold text-white">{races.length || '--'}</div>
                  </div>
                  <div className="bg-[#050607]/95 p-4">
                    <div className="velocity-label">Data Link</div>
                    <div className="velocity-mono mt-3 text-sm font-semibold text-[#f6a11a]">FastAPI / FastF1</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {selectedRace && (
          <div className="relative z-0 grid grid-cols-1 gap-4">
            <section className="velocity-panel is-hot">
              <div className="grid gap-4 border-b border-[#f6a11a]/15 bg-black/35 p-3 md:grid-cols-[1fr_auto] md:items-end md:p-4">
                <div className="min-w-0">
                  <div className="velocity-label mb-2">Race Replay / Telemetry Sync</div>
                  <h2 className="truncate text-2xl font-display font-bold uppercase leading-none text-white md:text-4xl">
                    {selectedRace.EventName}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3 md:min-w-[280px]">
                  <div className="metric-tile px-3 py-2">
                    <div className="velocity-label">Location</div>
                    <div className="velocity-mono mt-2 truncate text-xs text-white/80" title={selectedRace.Location}>{selectedRace.Location}</div>
                  </div>
                  <div className="metric-tile px-3 py-2">
                    <div className="velocity-label">Date</div>
                    <div className="velocity-mono mt-2 text-xs text-white/80">{new Date(selectedRace.EventDate).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              <div className="p-3 md:p-5">
                <Suspense fallback={<div className="text-sm text-gray-400 font-mono">Loading replay engine…</div>}>
                  <RaceReplay year={selectedSeason} raceName={selectedRace.EventName} apiUrl={API_URL} />
                </Suspense>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
