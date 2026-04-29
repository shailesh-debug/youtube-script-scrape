# YouTube Viral Shorts Scraper — Project Handover

## What We're Building

A **private web dashboard** where you paste any YouTube channel URL, specify how many top-performing videos you want, and receive a formatted `.docx` report containing the transcript, stats, and comment analysis for only the videos that went viral on that channel.

The key insight: "scrape 5 videos" doesn't mean the first 5 — it means scan a smart batch, identify which ones outperformed the channel's average, and return only those.

---

## Current Status

### ✅ Done — Local Python Scraper
A working command-line scraper (`youtube_shorts_scraper.py`) is fully built and tested against `@LoadedDiceShorts`. It produces a `.docx` report with:
- Cover page + overview table
- Per-video sections: stats, full transcript, comment themes, top liked comments

**Run it locally:**
```bash
python youtube_shorts_scraper.py
```
Output: `LoadedDiceShorts_Shorts_Report.docx` in the same folder.

### 🔄 Next — Web App
Convert this into a hosted web dashboard anyone can access via a URL.

---

## Credentials & API Keys

| Key | Value | Notes |
|-----|-------|-------|
| YouTube Data API v3 | Stored in `api.txt` or `YOUTUBE_API_KEY` | Free, 10,000 units/day |
| Groq API key | Stored in `api.txt` or `GROQ_API_KEY` | console.groq.com — free, 7,200 sec audio/day |

---

## Web App Architecture

```
Browser  ──→  Next.js Frontend (Vercel, free)
                │
                │  POST /scrape  {channel_url, count, type, password}
                ▼
             FastAPI Backend (Render, free tier)
                ├── yt-dlp          → scrape video IDs from Shorts/Videos tab
                ├── YouTube Data API → views, likes, comments per video
                ├── Viral filter    → pick top N from scanned batch
                ├── yt-dlp + Groq  → download audio → transcribe
                ├── YouTube Data API → fetch top comments
                └── python-docx    → build .docx
                │
                └── stream .docx back to browser as file download
```

### Tech Stack

| Layer | Technology | Hosting | Cost |
|-------|-----------|---------|------|
| Frontend | Next.js (React) | Vercel | Free |
| Backend API | FastAPI (Python) | Render | Free tier |
| Transcription | Groq Whisper API (`whisper-large-v3`) | Groq | Free (7,200 sec/day) |
| Video scraping | yt-dlp | runs on Render | Free |
| Metadata | YouTube Data API v3 | Google | Free (10k units/day) |
| Auth | Single password (env variable) | — | Free |

---

## Viral Detection Algorithm

### Batch Size (Adaptive)
```
scan_size = max(requested_count × 6,  20)
scan_size = min(scan_size,  total_videos_on_channel)
```
Examples:
- User requests 5 → scan 30
- User requests 10 → scan 60
- Channel only has 8 videos total → scan all 8

### Viral Threshold
1. Fetch view counts for all scanned videos
2. Calculate **median** views (more honest than mean — not skewed by one mega-viral video)
3. `viral_threshold = median × 1.5`
4. Sort above-threshold videos by views descending → take top N
5. If fewer than N pass → lower threshold to `median × 1.1` and retry
6. If still fewer than N → return top N sorted by views with a note: *"No strong viral outliers found — showing best performers"*

### Why Median, Not Mean
If a channel has one video with 10M views and 29 videos with 10K views, the mean is ~350K — which would make most videos look below average. The median stays at 10K, giving an honest channel baseline.

---

## Dashboard UI

### Input Panel
- Channel URL (any format: `@handle`, `/channel/ID`, full URL)
- Number of videos to scrape (1–20)
- Content type toggle: **Shorts** | **Videos** | **Both**
- Scrape button

### Progress View (shown while running)
- Step indicator: Scanning → Filtering → Transcribing → Building Report
- Per-video progress: *"Transcribing video 3 of 5…"*
- Estimated time remaining

### Output
- Download `.docx` button when complete
- Summary card: channel name, videos scanned, viral threshold used, videos selected

### Auth
Single password prompt on first load. Stored in `localStorage`. Password lives in a Render environment variable.

---

## .docx Report Structure (same as local version)

```
Cover page
  └── Channel name + "Viral Shorts Analysis"
  └── "Top N of M scanned  |  Viral threshold: Xk views  |  Generated: DD Mon YYYY"

Page 2 — Overview table
  └── # | Title | Views | vs. Channel Avg | Published
  └── Blue header, alternating row shading

Page 3+ — One section per video (sorted by views desc)
  └── H1: #N  <video title>
  └── Stats: views | likes | comments | date | URL | views vs avg
  └── H2: 📝 Script / Transcript
  └── Full transcript text
  └── H2: 💬 Comment Summary
  └── Theme breakdown + top 5 liked comments
  └── Page break
```

---

## Backend API Endpoints

```
POST /scrape
  Body: { channel_url, count, content_type, password }
  Returns: { job_id }

GET /status/{job_id}
  Returns: { status, step, progress, message }

GET /download/{job_id}
  Returns: .docx file stream (available when status = "done")
```

---

## Local Scraper Dependencies

```bash
pip install google-api-python-client python-docx yt-dlp faster-whisper
# Also requires: ffmpeg (winget install ffmpeg)
```

## Web App Dependencies (to be added)

```bash
# Backend
pip install fastapi uvicorn google-api-python-client python-docx yt-dlp groq

# Frontend
npx create-next-app@latest
```

---

## Files in This Folder

| File | Purpose |
|------|---------|
| `youtube_shorts_scraper.py` | Working local scraper — the logic base for the web app backend |
| `LoadedDiceShorts_Shorts_Report.docx` | Sample output from a successful test run |
| `api.txt` | Local YouTube and Groq API keys |
| `HANDOVER.md` | This file |

---

## Next Steps

1. Run the FastAPI backend locally and test `/health`
2. Install frontend dependencies and run the Next.js dashboard
3. Test an end-to-end scrape and DOCX download
4. Add deployment environment variables on Render and Vercel
5. Deploy both services
