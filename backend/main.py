import os
import fastf1
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import json

# Setup caching
# Use /tmp for cloud environments (Render/Vercel), local folder for dev
cache_dir = '/tmp/f1_cache' if os.environ.get('VERCEL') or os.environ.get('RENDER') else 'f1_cache'
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)
fastf1.Cache.enable_cache(cache_dir)

app = FastAPI(title="PRAH Backend")

# CORS Setup
# Handle the case where ALLOWED_ORIGINS is just "*" (common in dev/simple setups)
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "*")

if allowed_origins_env == "*":
    origins = ["*"]
else:
    # Split by comma, strip whitespace, and remove trailing slashes
    origins = [origin.strip().rstrip("/") for origin in allowed_origins_env.split(",")]

print(f"Configured CORS origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True if origins != ["*"] else False, # Disable credentials if allowing all origins to avoid CORS error
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Oracle Red Bull Racing - Post-Race Analytics Hub API is running"}

@app.get("/api/seasons")
def get_seasons():
    # FastF1 doesn't have a direct "list all seasons" lightweight call, 
    # but we can return a list of recent years for the UI.
    return {"seasons": list(range(2018, 2026))}

@app.get("/api/{year}/races")
def get_races(year: int):
    try:
        schedule = fastf1.get_event_schedule(year)
        # Convert timestamp objects to strings for JSON serialization
        data = json.loads(schedule.to_json(orient='records'))
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/{year}/{race_name}/race/telemetry_replay")
def get_telemetry_replay(year: int, race_name: str):
    try:
        # Load the session
        print(f"Loading session for {year} {race_name}...")
        session = fastf1.get_session(year, race_name, 'R')
        
        # Load all data including messages (for race control)
        try:
            session.load(telemetry=True, laps=True, weather=True, messages=True)
        except TypeError:
            # Older FastF1 version doesn't have messages parameter
            session.load(telemetry=True, laps=True, weather=True)
        print("Session loaded successfully.")
        
        drivers = session.drivers
        all_drivers_data = []
        global_t0 = None  # global minimum telemetry time in seconds (used to shift all outputs)
        
        print(f"Processing {len(drivers)} drivers for {year} {race_name}...")

        # Limit drivers for debugging/performance if needed (e.g. first 5)
        # drivers = drivers[:5] 

        for driver in drivers:
            try:
                # Build per-driver laps (used for LapNumber/Compound mapping)
                if hasattr(session, 'laps') and session.laps is not None and not session.laps.empty and 'DriverNumber' in session.laps.columns:
                    driver_laps = session.laps[session.laps['DriverNumber'].astype(str) == str(driver)]
                else:
                    driver_laps = session.laps.pick_driver(driver)

                if driver_laps is None or driver_laps.empty:
                    continue

                # Prefer full-session telemetry (pos_data + car_data) to avoid truncated lap telemetry
                tel = None
                try:
                    pos_dict = getattr(session, 'pos_data', None)
                    car_dict = getattr(session, 'car_data', None)
                    if isinstance(pos_dict, dict) and isinstance(car_dict, dict) and driver in pos_dict and driver in car_dict:
                        pos = pos_dict[driver].copy()
                        car = car_dict[driver].copy()

                        # Ensure Time is Timedelta for both
                        for df in (pos, car):
                            if 'Time' in df.columns and not pd.api.types.is_timedelta64_ns_dtype(df['Time']):
                                df['Time'] = pd.to_timedelta(df['Time'])

                        # Merge position (X,Y) with car channels (Speed/Distance/etc) on Time
                        pos = pos.sort_values('Time')
                        car = car.sort_values('Time')
                        tel = pd.merge_asof(
                            pos,
                            car,
                            on='Time',
                            direction='nearest',
                            tolerance=pd.Timedelta(milliseconds=250)
                        )
                except Exception:
                    tel = None

                # Fallback to lap-based telemetry if full-session data isn't available
                if tel is None:
                    tel = driver_laps.get_telemetry()
                
                # Create a mapping for Compound and LapNumber based on Time
                # We need to merge 'Compound' and 'LapNumber' from laps into telemetry
                # We can use merge_asof, but we need to prepare the laps dataframe
                laps_data = driver_laps[['LapStartTime', 'Compound', 'LapNumber']].copy()
                laps_data['Time'] = laps_data['LapStartTime'] # Rename for merge
                laps_data = laps_data.dropna(subset=['Time'])
                
                # Ensure Time is Timedelta
                if not isinstance(tel['Time'].dtype, pd.Timedelta):
                    tel['Time'] = pd.to_timedelta(tel['Time'])
                
                # NOTE:
                # Do NOT inject a synthetic row at time=0.
                # Doing so forces LapNumber=1 for all telemetry prior to the real Lap 1 start,
                # which makes Lap 1 appear to last tens of minutes (formation/grid delay).
                # We intentionally keep leading LapNumber as NaN until the first LapStartTime.

                # Merge Compound and LapNumber info
                # We use merge_asof to find the last LapStartTime <= Telemetry Time
                tel = pd.merge_asof(tel.sort_values('Time'), 
                                    laps_data[['Time', 'Compound', 'LapNumber']].sort_values('Time'), 
                                    on='Time', 
                                    direction='backward')
                
                # Resample to 1 second frequency for smoother playback (was 2S)
                tel = tel.set_index('Time')
                
                # Create the full time grid
                resampled = tel.resample('1S').first()
                
                # Interpolate continuous variables to fill gaps (prevents disappearing cars)
                continuous_cols = ['X', 'Y', 'Speed', 'Distance', 'Throttle', 'Brake', 'RPM']
                cols_to_interp = [c for c in continuous_cols if c in resampled.columns]
                resampled[cols_to_interp] = resampled[cols_to_interp].interpolate(method='linear', limit_direction='both')
                
                # Forward fill categorical/discrete variables
                categorical_cols = ['LapNumber', 'Compound', 'nGear', 'DRS']
                cols_to_ffill = [c for c in categorical_cols if c in resampled.columns]
                resampled[cols_to_ffill] = resampled[cols_to_ffill].ffill()
                
                resampled = resampled.reset_index()
                
                # Select relevant columns
                cols_to_keep = ['Time', 'X', 'Y', 'Speed', 'Compound', 'LapNumber', 'Distance', 'Throttle', 'Brake', 'nGear', 'RPM', 'DRS']
                available_cols = [c for c in cols_to_keep if c in resampled.columns]
                
                final_df = resampled[available_cols].copy()
                
                # Convert Time to total seconds for JSON
                final_df['Time'] = final_df['Time'].dt.total_seconds()
                # Track global t0 across all drivers
                try:
                    driver_min = float(final_df['Time'].min()) if not final_df.empty else None
                    if driver_min is not None:
                        global_t0 = driver_min if global_t0 is None else min(global_t0, driver_min)
                except Exception:
                    pass
                final_df['Driver'] = driver
                
                # REMOVED: Filter out data after the race is officially over
                # This was causing the race to end early if total_laps was incorrect or if data was slightly misaligned.
                # We will let the frontend handle the "stop" logic.
                # if hasattr(session, 'total_laps'):
                #      final_df = final_df[final_df['LapNumber'] <= session.total_laps + 1]

                # Use pandas to_json string then load it back to ensure compliance
                # This handles NaN -> null automatically
                records = json.loads(final_df.to_json(orient='records'))
                all_drivers_data.extend(records)
                
                print(f"Processed {driver} - {len(records)} points")
                
                # Explicitly clear large variables to help GC
                del tel
                del resampled
                del final_df
                del records
                
            except Exception as e:
                print(f"Error processing driver {driver}: {e}")
                continue
        
        print(f"Finished processing all drivers. Total points: {len(all_drivers_data)}")

        # Normalize to a common timeline starting at zero (matches reference implementation)
        if global_t0 is None:
            global_t0 = 0.0
        else:
            global_t0 = float(global_t0)

        for rec in all_drivers_data:
            try:
                if rec.get('Time') is not None:
                    rec['Time'] = float(rec['Time']) - global_t0
            except Exception:
                pass
        
        # Extract Driver Info
        drivers_info = {}
        if hasattr(session, 'results'):
            for i, row in session.results.iterrows():
                driver_number = str(row['DriverNumber'])

                total_time_s = None
                try:
                    if 'Time' in row and pd.notna(row['Time']):
                        # FastF1 typically stores this as a Timedelta
                        total_time_s = pd.to_timedelta(row['Time']).total_seconds()
                except Exception:
                    total_time_s = None

                drivers_info[driver_number] = {
                    "DriverNumber": driver_number,
                    "Abbreviation": row['Abbreviation'],
                    "TeamName": row['TeamName'],
                    "TeamColor": f"#{row['TeamColor']}" if row['TeamColor'] else "#FFFFFF",
                    "FirstName": row['FirstName'],
                    "LastName": row['LastName'],
                    "HeadshotUrl": row.get('HeadshotUrl', ''),
                    "Status": row.get('Status', 'Finished'),
                    "GridPosition": int(row['GridPosition']) if pd.notna(row.get('GridPosition')) else 20,
                    "ClassifiedPosition": int(row['Position']) if pd.notna(row.get('Position')) else 20,
                    "TotalTime": total_time_s
                }

        # Extract Lap Data (Strategy & Pit Stops)
        laps_data = []
        if hasattr(session, 'laps'):
            laps = session.laps.copy()

            # Align identifiers with telemetry/drivers_info:
            # telemetry uses driver numbers (session.drivers) and drivers_info is keyed by DriverNumber.
            # FastF1 laps typically uses driver abbreviations in the 'Driver' column.
            # Keep abbreviation in a separate field and use DriverNumber for 'Driver'.
            if 'DriverNumber' in laps.columns and 'Driver' in laps.columns:
                laps['DriverAbbreviation'] = laps['Driver']
                laps['Driver'] = laps['DriverNumber'].astype(str)

            # Convert Timedeltas
            time_cols = ['LapStartTime', 'LapTime', 'Sector1Time', 'Sector2Time', 'Sector3Time', 'PitInTime', 'PitOutTime']
            for col in time_cols:
                if col in laps.columns:
                    laps[col] = laps[col].dt.total_seconds()
            
            # Select columns - including sector times for analysis
            laps_cols = ['Driver', 'DriverAbbreviation', 'LapNumber', 'Stint', 'Compound', 'TyreLife', 'LapTime', 'LapStartTime', 'PitInTime', 'PitOutTime', 'Sector1Time', 'Sector2Time', 'Sector3Time']
            available_laps_cols = [c for c in laps_cols if c in laps.columns]
            laps_data = json.loads(laps[available_laps_cols].to_json(orient='records'))

            # Shift lap times to the same zero-based timeline
            if global_t0 and global_t0 > 0:
                for l in laps_data:
                    if l.get('LapStartTime') is not None:
                        try:
                            l['LapStartTime'] = float(l['LapStartTime']) - global_t0
                        except Exception:
                            pass
                    if l.get('PitInTime') is not None:
                        try:
                            l['PitInTime'] = float(l['PitInTime']) - global_t0
                        except Exception:
                            pass
                    if l.get('PitOutTime') is not None:
                        try:
                            l['PitOutTime'] = float(l['PitOutTime']) - global_t0
                        except Exception:
                            pass

        # Extract Track Status (Safety Car, etc.)
        events = []
        if hasattr(session, 'track_status') and session.track_status is not None:
            ts = session.track_status.copy()
            ts['Time'] = ts['Time'].dt.total_seconds()
            events = json.loads(ts.to_json(orient='records'))
            print(f"Track status events: {len(events)}")

            if global_t0 and global_t0 > 0:
                for ev in events:
                    if ev.get('Time') is not None:
                        try:
                            ev['Time'] = float(ev['Time']) - global_t0
                        except Exception:
                            pass

        # Extract Race Control Messages
        race_control = []
        if hasattr(session, 'race_control_messages') and session.race_control_messages is not None:
            rc = session.race_control_messages
            if not rc.empty:
                rc = rc.copy()
                if 'Time' in rc.columns:
                    if pd.api.types.is_timedelta64_ns_dtype(rc['Time']):
                        rc['Time'] = rc['Time'].dt.total_seconds()
                    else:
                        try:
                            rc['Time'] = pd.to_timedelta(rc['Time']).dt.total_seconds()
                        except:
                            pass
                race_control = json.loads(rc.to_json(orient='records'))
                print(f"Race control messages: {len(race_control)}")

                if global_t0 and global_t0 > 0:
                    for msg in race_control:
                        if msg.get('Time') is not None:
                            try:
                                msg['Time'] = float(msg['Time']) - global_t0
                            except Exception:
                                pass

        # Extract Circuit Info
        circuit_info = {}
        if hasattr(session, 'event'):
            # Handle potential missing keys safely
            def get_event_attr(attr):
                try:
                    return getattr(session.event, attr, "")
                except:
                    return ""

            circuit_info = {
                "Location": get_event_attr("Location"),
                "OfficialEventName": get_event_attr("OfficialEventName"),
                "EventDate": str(get_event_attr("EventDate")),
                "Country": get_event_attr("Country"),
                "RoundNumber": str(get_event_attr("RoundNumber"))
            }

        # Extract Weather Data
        weather_data = []
        if hasattr(session, 'weather_data') and session.weather_data is not None:
            wd = session.weather_data.copy()
            if 'Time' in wd.columns:
                if pd.api.types.is_timedelta64_ns_dtype(wd['Time']):
                    wd['Time'] = wd['Time'].dt.total_seconds()
                else:
                    # Attempt to force conversion if it's not already timedelta
                    try:
                        wd['Time'] = pd.to_timedelta(wd['Time']).dt.total_seconds()
                    except:
                        # If conversion fails, we might have datetimes or something else.
                        # For now, let's just not crash.
                        pass
            weather_data = json.loads(wd.to_json(orient='records'))

            if global_t0 and global_t0 > 0:
                for w in weather_data:
                    if w.get('Time') is not None:
                        try:
                            w['Time'] = float(w['Time']) - global_t0
                        except Exception:
                            pass

        # Calculate Total Laps
        total_laps = 0
        if hasattr(session, 'total_laps'):
             total_laps = session.total_laps
        elif hasattr(session, 'laps') and not session.laps.empty:
             total_laps = int(session.laps['LapNumber'].max())

        # Process Laps for all drivers (Global Laps Data)
        all_laps_data = []
        if hasattr(session, 'laps') and not session.laps.empty:
            laps_df = session.laps.copy()
            # Select relevant columns
            laps_cols = ['Driver', 'LapTime', 'LapNumber', 'LapStartTime', 'Compound', 'TyreLife']
            # Ensure columns exist
            laps_cols = [c for c in laps_cols if c in laps_df.columns]
            laps_export = laps_df[laps_cols].copy()
            
            # Convert Timedeltas
            for col in ['LapTime', 'LapStartTime']:
                if col in laps_export.columns:
                    laps_export[col] = laps_export[col].dt.total_seconds()
            
            # Handle NaNs - DO NOT fill Time columns with 0 as it breaks logic
            # We only fill non-time columns if needed, or let JSON handle nulls
            # laps_export = laps_export.fillna(0) 
            
            all_laps_data = json.loads(laps_export.to_json(orient='records'))

        return {
            "telemetry": all_drivers_data,
            "drivers": drivers_info,
            "laps": laps_data,  # Changed from all_laps_data - this includes sector times and pit times
            "events": events,
            "race_control": race_control,
            "circuit_info": circuit_info,
            "weather": weather_data,
            "total_laps": total_laps,
            "time_base": global_t0
        }

    except Exception as e:
        # In production, log the error
        print(f"Endpoint Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/{year}/{race_name}/race/team_radio")
def get_team_radio(year: int, race_name: str):
    try:
        session = fastf1.get_session(year, race_name, 'R')
        # Need to load messages (FastF1 >= 3.0 requires explicit messages=True)
        try:
            session.load(telemetry=False, laps=False, weather=False, messages=True)
        except TypeError:
            # Older FastF1 version doesn't have messages parameter
            session.load(telemetry=False, laps=False, weather=False)
        
        radio_data = []
        
        # Try team_radio attribute (FastF1 >= 3.0)
        if hasattr(session, 'team_radio') and session.team_radio is not None and not session.team_radio.empty:
            radios = session.team_radio.copy()
            if 'Time' in radios.columns:
                radios['Time'] = radios['Time'].dt.total_seconds()
            cols = [c for c in ['Time', 'Driver', 'Message'] if c in radios.columns]
            radio_data = json.loads(radios[cols].to_json(orient='records'))
        # Fallback: Try get_driver_radio (older FastF1)
        elif hasattr(session, 'get_driver_radio'):
            for driver in session.drivers[:10]:  # Limit to first 10 drivers
                try:
                    radio = session.get_driver_radio(driver)
                    if radio is not None and not radio.empty:
                        radio['Driver'] = driver
                        if 'Time' in radio.columns:
                            radio['Time'] = radio['Time'].dt.total_seconds()
                        cols = [c for c in ['Time', 'Driver', 'Message'] if c in radio.columns]
                        radio_data.extend(json.loads(radio[cols].to_json(orient='records')))
                except:
                    pass
        
        print(f"Team radio: {len(radio_data)} messages loaded")
        return radio_data
    except Exception as e:
        print(f"Error fetching radio: {e}")
        import traceback
        traceback.print_exc()
        return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
