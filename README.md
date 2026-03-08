# GRIDPULSE · F1 Replay Analytics

GRIDPULSE is a full-stack Formula 1 replay and telemetry analysis app.
It replays race position data in sync with timing/telemetry, strategy, weather, and race control streams.

## Tech Stack

- **Backend:** FastAPI + FastF1 + pandas
- **Frontend:** React (Vite) + D3 + Recharts + Tailwind CSS
- **Data source:** FastF1 session data (with local cache)

## Repository Structure

- `backend/` — API + telemetry processing
- `frontend/` — web UI
- `backend/f1_cache/` — FastF1 cache (session artifacts)
- `Dockerfile` — container build (HF Spaces compatible)
- `DEPLOY_HF.md` — Hugging Face Spaces deployment notes

## Features

- Season and race selection (includes current season dynamically)
- Track replay with live driver markers
- Live leaderboard with gaps and tyre info
- Fastest-lap indicator (updates as replay time advances)
- Telemetry charts (speed, throttle, brake, gear, RPM)
- Strategy and pit-stop panels
- Sector time comparison
- Race control + team radio timeline
- Podium/finish presentation when replay reaches race end

## Local Development

### 1) Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend runs at: `http://localhost:8000`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

## Environment

Frontend API base URL:

- `VITE_API_URL` (optional)
- default: `http://localhost:8000`

Backend CORS origins:

- `ALLOWED_ORIGINS` (optional, comma-separated)
- default: `*`

## Useful API Endpoints

- `GET /api/seasons`
- `GET /api/{year}/races`
- `GET /api/{year}/{race_name}/race/telemetry_replay`
- `GET /api/{year}/{race_name}/race/telemetry_replay_meta`
- `GET /api/{year}/{race_name}/race/team_radio`
- `GET /api/build_info`

## Build / Quality

```bash
cd frontend
npm run lint
npm run build
```

## Deployment

Use the root `Dockerfile` for Hugging Face Spaces (Docker SDK).
See `DEPLOY_HF.md` for full deployment workflow and verification steps.
