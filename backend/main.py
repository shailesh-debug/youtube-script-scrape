from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import get_settings, summarize_youtube_cookies
from .models import JobStatus, ScrapeRequest, ScrapeResponse
from .scraper import run_scrape_job


settings = get_settings()
app = FastAPI(title="YouTube Viral Report API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@dataclass
class Job:
    id: str
    status: str = "queued"
    step: str = "queued"
    progress: int = 0
    message: str = "Waiting to start."
    file_path: str | None = None
    summary: dict[str, Any] | None = None
    error: str | None = None
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)


jobs: dict[str, Job] = {}


async def update_job(job: Job, step: str, progress: int, message: str) -> None:
    async with job.lock:
        job.step = step
        job.progress = progress
        job.message = message
        if job.status == "queued":
            job.status = "running"


async def run_job(job: Job, request: ScrapeRequest) -> None:
    loop = asyncio.get_running_loop()

    def progress(step: str, percent: int, message: str) -> None:
        loop.call_soon_threadsafe(asyncio.create_task, update_job(job, step, percent, message))

    try:
        await update_job(job, "starting", 1, "Starting scrape job.")
        result = await asyncio.to_thread(
            run_scrape_job,
            settings,
            request.channel_url,
            request.count,
            request.content_type,
            progress,
        )
        async with job.lock:
            job.status = "done"
            job.step = "done"
            job.progress = 100
            job.message = "Report is ready."
            job.file_path = result["file_path"]
            job.summary = result["summary"]
    except Exception as exc:
        async with job.lock:
            job.status = "error"
            job.step = "error"
            job.progress = 100
            job.message = str(exc)
            job.error = str(exc)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "youtube_api_key": bool(settings.youtube_api_key),
        "groq_api_key": bool(settings.groq_api_key),
        "youtube_cookies": bool(settings.youtube_cookies),
        "youtube_cookies_summary": summarize_youtube_cookies(settings.youtube_cookies),
    }


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(request: ScrapeRequest) -> ScrapeResponse:
    if settings.app_password != "change-me" and request.password != settings.app_password:
        raise HTTPException(status_code=401, detail="Invalid password.")

    if len(jobs) >= settings.max_jobs:
        finished = [job_id for job_id, job in jobs.items() if job.status in {"done", "error"}]
        for job_id in finished[: max(1, len(finished))]:
            jobs.pop(job_id, None)

    job_id = uuid.uuid4().hex
    job = Job(id=job_id)
    jobs[job_id] = job
    asyncio.create_task(run_job(job, request))
    return ScrapeResponse(job_id=job_id)


@app.get("/status/{job_id}", response_model=JobStatus)
async def status(job_id: str) -> JobStatus:
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    async with job.lock:
        return JobStatus(
            job_id=job.id,
            status=job.status,
            step=job.step,
            progress=job.progress,
            message=job.message,
            download_url=f"/download/{job.id}" if job.status == "done" else None,
            summary=job.summary,
        )


@app.get("/download/{job_id}")
async def download(job_id: str):
    job = jobs.get(job_id)
    if not job or job.status != "done" or not job.file_path:
        raise HTTPException(status_code=404, detail="Report is not ready.")

    path = Path(job.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Report file is missing.")

    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=path.name,
    )
