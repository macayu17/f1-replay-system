"""
Extract comprehensive F1 data from FastF1 API for 2025 Abu Dhabi GP
Creates multiple CSV files with all available race data
"""
import fastf1
import pandas as pd
import os

# Enable cache
cache_dir = 'f1_cache'
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)
fastf1.Cache.enable_cache(cache_dir)

# Output directory
output_dir = 'f1_data_2025_abudhabi'
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

print("Loading 2025 Abu Dhabi GP Race session...")
try:
    session = fastf1.get_session(2025, 'Abu Dhabi', 'R')
    session.load(telemetry=True, laps=True, weather=True, messages=True)
    print("Session loaded successfully!")
except Exception as e:
    print(f"Error loading session: {e}")
    print("The 2025 Abu Dhabi GP data may not be available yet.")
    exit(1)

# 1. Race Results
print("\nExporting race results...")
if hasattr(session, 'results') and session.results is not None:
    results = session.results.copy()
    results.to_csv(f'{output_dir}/race_results.csv', index=False)
    print(f"  Saved: race_results.csv ({len(results)} rows)")

# 2. Lap Data (all laps for all drivers)
print("\nExporting lap data...")
if hasattr(session, 'laps') and session.laps is not None:
    laps = session.laps.copy()
    
    # Convert timedelta columns to seconds for readability
    time_cols = ['LapTime', 'Sector1Time', 'Sector2Time', 'Sector3Time', 
                 'LapStartTime', 'PitInTime', 'PitOutTime', 
                 'Sector1SessionTime', 'Sector2SessionTime', 'Sector3SessionTime']
    for col in time_cols:
        if col in laps.columns:
            laps[f'{col}_seconds'] = laps[col].dt.total_seconds()
    
    laps.to_csv(f'{output_dir}/all_laps.csv', index=False)
    print(f"  Saved: all_laps.csv ({len(laps)} rows)")

# 3. Driver Telemetry (sampled at 1Hz for each driver)
print("\nExporting driver telemetry (this may take a while)...")
all_telemetry = []
for driver in session.drivers:
    try:
        driver_laps = session.laps.pick_driver(driver)
        if driver_laps.empty:
            continue
        tel = driver_laps.get_telemetry()
        if tel is not None and not tel.empty:
            # Resample to 1 second intervals
            tel = tel.set_index('Time')
            tel = tel.resample('1s').first().reset_index()
            tel['Time_seconds'] = tel['Time'].dt.total_seconds()
            tel['Driver'] = driver
            
            # Get driver info
            driver_info = session.get_driver(driver)
            tel['DriverName'] = driver_info.get('FullName', driver)
            tel['Team'] = driver_info.get('TeamName', 'Unknown')
            
            all_telemetry.append(tel)
            print(f"  Processed driver {driver}: {len(tel)} data points")
    except Exception as e:
        print(f"  Error processing driver {driver}: {e}")

if all_telemetry:
    telemetry_df = pd.concat(all_telemetry, ignore_index=True)
    telemetry_df.to_csv(f'{output_dir}/telemetry.csv', index=False)
    print(f"  Saved: telemetry.csv ({len(telemetry_df)} rows)")

# 4. Weather Data
print("\nExporting weather data...")
if hasattr(session, 'weather_data') and session.weather_data is not None:
    weather = session.weather_data.copy()
    if 'Time' in weather.columns:
        weather['Time_seconds'] = weather['Time'].dt.total_seconds()
    weather.to_csv(f'{output_dir}/weather.csv', index=False)
    print(f"  Saved: weather.csv ({len(weather)} rows)")

# 5. Track Status (flags, SC, VSC)
print("\nExporting track status...")
if hasattr(session, 'track_status') and session.track_status is not None:
    track_status = session.track_status.copy()
    if 'Time' in track_status.columns:
        track_status['Time_seconds'] = track_status['Time'].dt.total_seconds()
    track_status.to_csv(f'{output_dir}/track_status.csv', index=False)
    print(f"  Saved: track_status.csv ({len(track_status)} rows)")

# 6. Race Control Messages
print("\nExporting race control messages...")
if hasattr(session, 'race_control_messages') and session.race_control_messages is not None:
    rc_messages = session.race_control_messages.copy()
    if 'Time' in rc_messages.columns:
        # Time might be datetime or timedelta - handle both
        try:
            if pd.api.types.is_timedelta64_dtype(rc_messages['Time']):
                rc_messages['Time_seconds'] = rc_messages['Time'].dt.total_seconds()
            else:
                # It's datetime - convert to string
                rc_messages['Time_str'] = rc_messages['Time'].astype(str)
        except:
            pass
    rc_messages.to_csv(f'{output_dir}/race_control_messages.csv', index=False)
    print(f"  Saved: race_control_messages.csv ({len(rc_messages)} rows)")

# 7. Team Radio
print("\nExporting team radio...")
if hasattr(session, 'team_radio') and session.team_radio is not None:
    radio = session.team_radio.copy()
    if 'Time' in radio.columns:
        radio['Time_seconds'] = radio['Time'].dt.total_seconds()
    radio.to_csv(f'{output_dir}/team_radio.csv', index=False)
    print(f"  Saved: team_radio.csv ({len(radio)} rows)")

# 8. Event/Session Info
print("\nExporting session info...")
session_info = {
    'Year': [2025],
    'EventName': [session.event.EventName if hasattr(session.event, 'EventName') else 'Abu Dhabi GP'],
    'OfficialEventName': [session.event.OfficialEventName if hasattr(session.event, 'OfficialEventName') else ''],
    'Location': [session.event.Location if hasattr(session.event, 'Location') else ''],
    'Country': [session.event.Country if hasattr(session.event, 'Country') else ''],
    'RoundNumber': [session.event.RoundNumber if hasattr(session.event, 'RoundNumber') else ''],
    'SessionName': [session.name if hasattr(session, 'name') else 'Race'],
    'TotalLaps': [session.total_laps if hasattr(session, 'total_laps') else ''],
}
session_df = pd.DataFrame(session_info)
session_df.to_csv(f'{output_dir}/session_info.csv', index=False)
print(f"  Saved: session_info.csv")

# 9. Circuit Info (if available)
print("\nExporting circuit info...")
if hasattr(session, 'circuit_info') and session.circuit_info is not None:
    circuit = session.circuit_info
    # Circuit info might be a special object, extract what we can
    circuit_dict = {}
    for attr in dir(circuit):
        if not attr.startswith('_'):
            try:
                val = getattr(circuit, attr)
                if not callable(val):
                    circuit_dict[attr] = [val]
            except:
                pass
    if circuit_dict:
        circuit_df = pd.DataFrame(circuit_dict)
        circuit_df.to_csv(f'{output_dir}/circuit_info.csv', index=False)
        print(f"  Saved: circuit_info.csv")

# 10. Create a combined summary file
print("\nCreating combined summary...")
summary_data = []
for driver in session.drivers:
    try:
        driver_laps = session.laps.pick_driver(driver)
        if driver_laps.empty:
            continue
        
        driver_info = session.get_driver(driver)
        result_row = session.results[session.results['DriverNumber'] == int(driver)].iloc[0] if not session.results.empty else None
        
        summary_data.append({
            'DriverNumber': driver,
            'DriverName': driver_info.get('FullName', driver),
            'Abbreviation': driver_info.get('Abbreviation', ''),
            'Team': driver_info.get('TeamName', ''),
            'TeamColor': driver_info.get('TeamColor', ''),
            'Position': result_row['Position'] if result_row is not None else '',
            'GridPosition': result_row['GridPosition'] if result_row is not None else '',
            'Status': result_row['Status'] if result_row is not None else '',
            'Points': result_row['Points'] if result_row is not None else '',
            'TotalLapsCompleted': len(driver_laps),
            'FastestLap_seconds': driver_laps['LapTime'].min().total_seconds() if not driver_laps['LapTime'].isna().all() else None,
            'AverageLap_seconds': driver_laps['LapTime'].mean().total_seconds() if not driver_laps['LapTime'].isna().all() else None,
            'PitStops': driver_laps['PitOutTime'].notna().sum(),
        })
    except Exception as e:
        print(f"  Error processing summary for driver {driver}: {e}")

if summary_data:
    summary_df = pd.DataFrame(summary_data)
    summary_df.to_csv(f'{output_dir}/driver_summary.csv', index=False)
    print(f"  Saved: driver_summary.csv ({len(summary_df)} rows)")

print(f"\n{'='*50}")
print(f"All data exported to: {output_dir}/")
print(f"{'='*50}")
