
import fastf1
import pandas as pd
import os

# Enable cache
cache_dir = 'f1_cache'
if not os.path.exists(cache_dir):
    os.makedirs(cache_dir)
fastf1.Cache.enable_cache(cache_dir)

session = fastf1.get_session(2023, 'Monaco', 'R')
session.load()

print("\nWeather Data Sample:")
if hasattr(session, 'weather_data'):
    print(session.weather_data.head())
    print(session.weather_data.columns)
else:
    print("No weather_data found")

print("\nEvent Info:")
print(session.event)
