"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, Play, Shield } from "lucide-react";

type ContentType = "shorts" | "videos" | "both";

type JobStatus = {
  job_id: string;
  status: "queued" | "running" | "done" | "error";
  step: string;
  progress: number;
  message: string;
  download_url?: string | null;
  summary?: {
    channel: string;
    videos_scanned: number;
    videos_selected: number;
    median_views: number;
    viral_threshold: number;
    note: string;
  } | null;
};

const deployedApiBaseUrl = "https://youtube-script-scrape-api.onrender.com";

function getApiBaseUrl() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:8000";
  }
  return deployedApiBaseUrl;
}

export default function Dashboard() {
  const [channelUrl, setChannelUrl] = useState("");
  const [count, setCount] = useState(5);
  const [contentType, setContentType] = useState<ContentType>("shorts");
  const [password, setPassword] = useState("");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    const saved = window.localStorage.getItem("yt-dashboard-password");
    if (saved) {
      setPassword(saved);
    }
  }, []);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/status/${jobId}`);
        if (!response.ok) {
          throw new Error("Could not load job status.");
        }
        const nextStatus = (await response.json()) as JobStatus;
        if (!cancelled) {
          setStatus(nextStatus);
        }
        if (nextStatus.status === "done" || nextStatus.status === "error") {
          return;
        }
        window.setTimeout(poll, 1500);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Status polling failed.");
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const canSubmit = useMemo(() => channelUrl.trim().length > 0 && password.trim().length > 0, [channelUrl, password]);

  async function startScrape() {
    setError("");
    setStatus(null);
    setIsSubmitting(true);
    window.localStorage.setItem("yt-dashboard-password", password);

    try {
      const response = await fetch(`${apiBaseUrl}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel_url: channelUrl,
          count,
          content_type: contentType,
          password,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail ?? "Scrape request failed.");
      }

      const body = (await response.json()) as { job_id: string };
      setJobId(body.job_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start scrape.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const downloadHref = status?.download_url ? `${apiBaseUrl}${status.download_url}` : "";

  return (
    <main className="page-shell">
      <section className="workspace">
        <aside className="control-panel">
          <div className="brand-row">
            <FileText size={24} />
            <div>
              <h1>Viral Report</h1>
              <p>YouTube channel analysis</p>
            </div>
          </div>

          <label>
            <span>Channel URL</span>
            <input
              value={channelUrl}
              onChange={(event) => setChannelUrl(event.target.value)}
              placeholder="https://www.youtube.com/@LoadedDiceShorts"
            />
          </label>

          <label>
            <span>Videos to include</span>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </label>

          <div className="field-group">
            <span>Content type</span>
            <div className="segments">
              {(["shorts", "videos", "both"] as ContentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={contentType === type ? "active" : ""}
                  onClick={() => setContentType(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <label>
            <span>Password</span>
            <div className="password-row">
              <Shield size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Private dashboard password"
              />
            </div>
          </label>

          <button className="primary-action" disabled={!canSubmit || isSubmitting} onClick={startScrape}>
            {isSubmitting ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            Generate report
          </button>
        </aside>

        <section className="status-panel">
          <div className="status-header">
            <div>
              <p className="eyebrow">Job Status</p>
              <h2>{status ? status.message : "Ready to scan"}</h2>
            </div>
            <span className={`state-pill ${status?.status ?? "idle"}`}>{status?.status ?? "idle"}</span>
          </div>

          <div className="progress-track" aria-label="progress">
            <div style={{ width: `${status?.progress ?? 0}%` }} />
          </div>

          <div className="step-grid">
            {["scanning", "filtering", "transcribing", "building_report"].map((step) => (
              <div key={step} className={status?.step === step ? "current" : ""}>
                <span>{step.replace("_", " ")}</span>
              </div>
            ))}
          </div>

          {status?.summary ? (
            <div className="summary-grid">
              <Metric label="Channel" value={status.summary.channel} />
              <Metric label="Scanned" value={String(status.summary.videos_scanned)} />
              <Metric label="Selected" value={String(status.summary.videos_selected)} />
              <Metric label="Median views" value={status.summary.median_views.toLocaleString()} />
              <Metric label="Threshold" value={status.summary.viral_threshold.toLocaleString()} />
              <div className="summary-note">{status.summary.note}</div>
            </div>
          ) : (
            <div className="empty-state">
              <FileText size={42} />
              <p>Submit a channel to generate a DOCX report with transcripts, stats, and comment themes.</p>
            </div>
          )}

          {error ? <p className="error">{error}</p> : null}

          {downloadHref ? (
            <a className="download-action" href={downloadHref}>
              <Download size={18} />
              Download DOCX
            </a>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
