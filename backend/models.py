from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ContentType(str, Enum):
    shorts = "shorts"
    videos = "videos"
    both = "both"


class ScrapeRequest(BaseModel):
    channel_url: str = Field(..., min_length=1)
    count: int = Field(5, ge=1, le=20)
    content_type: ContentType = ContentType.shorts
    password: str = ""


class ScrapeResponse(BaseModel):
    job_id: str


class JobStatus(BaseModel):
    job_id: str
    status: str
    step: str
    progress: int
    message: str
    download_url: str | None = None
    summary: dict[str, Any] | None = None
