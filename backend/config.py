from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
API_TEXT_FILE = ROOT_DIR / "api.txt"


def _read_api_text_file() -> list[str]:
    if not API_TEXT_FILE.exists():
        return []
    return [line.strip() for line in API_TEXT_FILE.read_text(encoding="utf-8").splitlines() if line.strip()]


def _detect_key(lines: list[str], env_name: str, prefixes: tuple[str, ...]) -> str:
    env_value = os.getenv(env_name)
    if env_value:
        return env_value.strip()

    youtube_matcher = re.compile(r"(AIza[0-9A-Za-z_-]+)")
    groq_matcher = re.compile(r"(gsk_[0-9A-Za-z_-]+)")

    for line in lines:
        if "=" in line:
            name, value = line.split("=", 1)
            if name.strip().upper() == env_name:
                return value.strip()
        if line.startswith(prefixes):
            return line
        if env_name == "YOUTUBE_API_KEY":
            match = youtube_matcher.search(line)
            if match:
                return match.group(1)
        if env_name == "GROQ_API_KEY":
            match = groq_matcher.search(line)
            if match:
                return match.group(1)
    return ""


def summarize_youtube_cookies(cookies: str) -> dict[str, int | bool]:
    lines = [line.strip() for line in cookies.replace("\r\n", "\n").replace("\r", "\n").split("\n") if line.strip()]
    cookie_lines = [line for line in lines if not line.startswith("#")]
    domains = []
    for line in cookie_lines:
        parts = line.split("\t")
        if parts:
            domains.append(parts[0].lower())

    return {
        "line_count": len(lines),
        "cookie_count": len(cookie_lines),
        "domain_count": len(set(domains)),
        "has_youtube": any("youtube.com" in domain for domain in domains),
        "has_google": any("google.com" in domain for domain in domains),
    }


@dataclass(frozen=True)
class Settings:
    youtube_api_key: str
    groq_api_key: str
    app_password: str
    youtube_cookies: str
    output_dir: Path
    max_jobs: int = 20
    max_scan_size: int = 120


def get_settings() -> Settings:
    api_lines = _read_api_text_file()
    output_dir = Path(os.getenv("OUTPUT_DIR", ROOT_DIR / "outputs"))
    output_dir.mkdir(parents=True, exist_ok=True)

    return Settings(
        youtube_api_key=_detect_key(api_lines, "YOUTUBE_API_KEY", ("AIza",)),
        groq_api_key=_detect_key(api_lines, "GROQ_API_KEY", ("gsk_",)),
        app_password=os.getenv("APP_PASSWORD", "change-me"),
        youtube_cookies=os.getenv("YOUTUBE_COOKIES", ""),
        output_dir=output_dir,
    )
