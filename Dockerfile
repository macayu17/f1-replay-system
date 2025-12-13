# This Dockerfile is for Hugging Face Spaces
# It builds the backend from the root context

FROM python:3.11-slim

WORKDIR /app

# Copy backend requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Record build info so the running Space can be verified
RUN python -c "import json, datetime, platform; open('build_info.json','w',encoding='utf-8').write(json.dumps({'built_at_utc': datetime.datetime.utcnow().replace(microsecond=0).isoformat()+'Z','python': platform.python_version()}, indent=2))"

# Create cache directory
RUN mkdir -p f1_cache

# Expose the port Hugging Face expects (7860)
EXPOSE 7860

# Start the application
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"
