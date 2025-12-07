
import fastf1
import pandas as pd

# Enable cache
fastf1.Cache.enable_cache('f1_cache')

session = fastf1.get_session(2023, 'Bahrain', 'R')
session.load()

print("Drivers Info Sample:")
print(session.results.iloc[0])

print("\nTrack Status Sample:")
# track_status is usually accessed via session.track_status
# It returns a dataframe with 'Time', 'Status', 'Message'?
# Actually it might be session.laps.pick_track_status() which is per lap?
# No, session.track_status is the property.
print(session.track_status.head())
