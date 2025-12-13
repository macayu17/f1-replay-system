# Deployment Guide: Hugging Face Spaces (Free, High RAM)

Since Render's free tier (512MB RAM) is too small for processing full F1 race data, we will use **Hugging Face Spaces**.
Spaces offers **16GB RAM** and **2 vCPU** for free, with **no credit card required**.

## Step 1: Create a Hugging Face Account
1. Go to [huggingface.co](https://huggingface.co/) and sign up.

## Step 2: Create a New Space
1. Click on your profile picture -> **New Space**.
2. **Space Name:** `f1-replay-backend` (or similar).
3. **License:** `MIT` (optional).
4. **Select the Space SDK:** Choose **Docker**.
5. **Space Hardware:** Select **Free** (2 vCPU · 16GB · CPU basic).
6. Click **Create Space**.

## Step 3: Deploy Your Code
You have two options:

### Option A: Connect GitHub (Recommended)
1. In your new Space, go to **Settings**.
2. Scroll to **Git Repository** and connect your GitHub repository (`macayu17/f1-replay-system`).
3. Ensure your Space SDK is **Docker** and the repo has a root `Dockerfile` (this repo does).
4. After connecting, go to the **Logs** tab and wait for a full rebuild.

### Verify the Space is running the latest backend
1. Open `https://<your-space>.hf.space/openapi.json` and search for:
   - `/api/{year}/{race_name}/race/telemetry_replay`
   - `/api/{year}/{race_name}/race/telemetry_replay_meta`
   - `/api/build_info`
2. Open `https://<your-space>.hf.space/api/build_info` and confirm it returns JSON with a `built_at_utc` timestamp.

If `telemetry_replay_meta` is missing or returns `{"detail":"Not Found"}`, your Space is still running an older image.
Use **Settings → Factory rebuild** (or **Restart this Space**) to force a new build.

### Option B: Direct Upload (If GitHub sync is tricky)
1. Clone the Space repository locally (Hugging Face gives you a git command).
2. Copy your `backend` files into it.
3. Push.

## Step 4: Update Frontend
1. Once the Space is "Running", you will see a "Direct URL" or "Embed URL".
   - It usually looks like: `https://username-space-name.hf.space`
2. Go to your **Vercel Dashboard**.
3. Select your project -> **Settings** -> **Environment Variables**.
4. Edit `VITE_API_URL` and paste your new Hugging Face URL.
5. Redeploy the Frontend (or push a small change to trigger it).

## Troubleshooting
- If the Space fails to build, check the **Logs** tab in Hugging Face.
- Ensure the `Dockerfile` is found.

## GitHub → Hugging Face Sync (Action)
This repo can auto-sync to your Space via `.github/workflows/huggingface.yml`.

### Required GitHub Secrets
In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

- `HF_TOKEN`: a Hugging Face access token with permission to write to the Space.
- `HF_SPACE_ID`: your Space id in the form `<username>/<space_name>` (example: `anayush1406/f1-replay-backend`).

### Verify sync worked
After a push to `main`, check the GitHub Actions run is green, then verify on HF:
- `https://<your-space>.hf.space/api/build_info`
- `https://<your-space>.hf.space/openapi.json` contains `/api/{year}/{race_name}/race/telemetry_replay_meta`
