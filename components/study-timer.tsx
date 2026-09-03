"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Play,
  Square,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import ConfirmDialog from "./confirm-dialog";
import {
  StudySession,
  formatClock,
  formatTimeOfDay,
  todayString,
} from "@/lib/types";

interface StudyTimerProps {
  initialActive: StudySession | null;
  dbError?: string;
}

const LONG_SESSION_WARNING_SECONDS = 12 * 3600;

export default function StudyTimer({ initialActive, dbError }: StudyTimerProps) {
  const [active, setActive] = useState<StudySession | null>(initialActive);
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/study?active=1");
        if (res.ok && !cancelled) setActive(await res.json());
      } catch {
        // keep initial active
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timeout = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const elapsedSeconds = active
    ? Math.max(
        0,
        Math.floor(
          ((now ?? Date.parse(active.startAt)) - Date.parse(active.startAt)) / 1000
        )
      )
    : 0;

  const handleStart = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      const body = await res.json();
      if (res.status === 201) {
        setActive(body as StudySession);
      } else if (res.status === 409 && body.session) {
        setActive(body.session as StudySession);
      } else {
        setError(body.error || "Failed to start session");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch("/api/study/active/stop", { method: "POST" });
      if (res.ok) {
        setActive(null);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to stop session");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDiscard = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await fetch(`/api/study/${active._id}`, { method: "DELETE" });
      setConfirmDiscard(false);
      setActive(null);
    } finally {
      setBusy(false);
    }
  };

  if (dbError) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {dbError}
      </div>
    );
  }

  const today = todayString();

  return (
    <section className="rounded-3xl border border-neutral-200/80 bg-surface px-5 pb-5 pt-8 shadow-sm">
      <div className="flex items-center justify-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            active
              ? "animate-pulse bg-emerald-500"
              : "bg-neutral-300 dark:bg-neutral-700"
          }`}
        />
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          {active ? "Studying" : "Ready"}
        </p>
      </div>

      <div
        className={`mt-4 text-center font-mono text-[3.75rem] font-bold leading-none tabular-nums sm:text-7xl ${
          active
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-neutral-900 dark:text-neutral-100"
        }`}
      >
        {formatClock(elapsedSeconds)}
      </div>

      <p className="mt-4 min-h-5 text-center text-sm text-neutral-500 dark:text-neutral-400">
        {active
          ? `Started ${formatTimeOfDay(active.startAt, active.timezone)}${
              active.localDate !== today ? ` · ${active.localDate}` : ""
            }`
          : "Time is counted on the server — safe to close the app"}
      </p>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {!active ? (
        <button
          type="button"
          onClick={handleStart}
          disabled={busy}
          className="mt-6 flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-lg shadow-emerald-600/25 transition-transform duration-100 hover:bg-emerald-500 active:scale-[0.97] disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-6 w-6" aria-hidden="true" />
          )}
          {busy ? "Starting…" : "Start Studying"}
        </button>
      ) : (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleStop}
            disabled={busy}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 text-lg font-bold text-white shadow-lg shadow-red-600/25 transition-transform duration-100 hover:bg-red-500 active:scale-[0.97] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Square className="h-5 w-5" fill="currentColor" aria-hidden="true" />
            )}
            {busy ? "Stopping…" : "Stop & Save"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmDiscard(true)}
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-neutral-300 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Discard session
          </button>
        </div>
      )}

      {elapsedSeconds > LONG_SESSION_WARNING_SECONDS && (
        <p className="mt-4 text-center text-xs text-amber-600 dark:text-amber-400">
          Running for a very long time — forgot to stop it earlier? Discard it
          or fix the time in History.
        </p>
      )}

      {confirmDiscard && (
        <ConfirmDialog
          title="Discard this session?"
          message="The running session will be deleted and none of its time will be recorded."
          confirmLabel="Discard"
          busy={busy}
          onConfirm={handleDiscard}
          onCancel={() => setConfirmDiscard(false)}
        />
      )}
    </section>
  );
}
