FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (usually not for basic fastf1)
# RUN apt-get update && apt-get install -y ...

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Record build info so the running Space can be verified
RUN python -c "import json, datetime, platform; open('build_info.json','w',encoding='utf-8').write(json.dumps({'built_at_utc': datetime.datetime.utcnow().replace(microsecond=0).isoformat()+'Z','python': platform.python_version()}, indent=2))"

# Create cache directory (this will be the mount point for the volume)
RUN mkdir -p f1_cache

# Expose the port Hugging Face expects (7860)
EXPOSE 7860

# Start the application
# Hugging Face sets PORT to 7860, but we set a default just in case
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"
