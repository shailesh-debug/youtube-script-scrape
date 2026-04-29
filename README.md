# YouTube Viral Report Dashboard

Private dashboard for generating `.docx` reports from viral YouTube Shorts or videos.

## Current Shape

- `backend/` - FastAPI API with async scrape jobs, progress polling, Groq transcription, YouTube metadata, comment analysis, and DOCX output.
- `frontend/` - Next.js dashboard for submitting a channel, tracking progress, and downloading the generated report.
- `youtube_shorts_scraper.py` - Original local scraper kept as the reference implementation.
- `api.txt` - Local key file. Keep this private.

## Local Backend

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

The backend reads keys from environment variables first:

```bash
YOUTUBE_API_KEY=...
GROQ_API_KEY=...
APP_PASSWORD=...
```

If environment variables are missing, it falls back to `api.txt`. The password defaults to `change-me` for local development unless `APP_PASSWORD` is set.

## Local Frontend

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` if your backend is not on the default URL:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## API

- `POST /scrape` with `{ channel_url, count, content_type, password }`
- `GET /status/{job_id}`
- `GET /download/{job_id}`
- `GET /health`

## Deployment Notes

- Backend target: Render Docker web service from `render.yaml`.
- Frontend target: Vercel project with Root Directory set to `frontend`.
- Use host environment variables for keys and `APP_PASSWORD`; do not deploy `api.txt`.

### Render Backend

Create a Render Blueprint from this repository. Render will read `render.yaml` and prompt for:

```bash
YOUTUBE_API_KEY=...
GROQ_API_KEY=...
APP_PASSWORD=...
```

The expected backend URL is:

```bash
https://youtube-script-scrape-api.onrender.com
```

If Render assigns a different URL, use that URL in the Vercel frontend environment variable below.

### Vercel Frontend

Import the same GitHub repository into Vercel and set:

```bash
Root Directory: frontend
NEXT_PUBLIC_API_BASE_URL=https://youtube-script-scrape-api.onrender.com
```

Every push to `main` redeploys the connected services.
