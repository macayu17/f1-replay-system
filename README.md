# Oracle Red Bull Racing - Post-Race Analytics Hub (PRAH)

## Project Structure
- `backend/`: FastAPI Python backend
- `frontend/`: React + Vite frontend

## Setup & Run

### Backend
1. Navigate to `backend/`
2. Install requirements (if not already done):
   ```bash
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`.

### Frontend
1. Navigate to `frontend/`
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

## Features
- **Season & Race Selection**: Browse through recent F1 seasons.
- **Race Replay**: Visualize driver positions on the track synchronized with telemetry data.
- **F1 Aesthetic**: Dark mode interface inspired by RBR pit wall screens.
