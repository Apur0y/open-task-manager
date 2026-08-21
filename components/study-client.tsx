"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "./confirm-dialog";
import {
  StudySession,
  formatClock,
  formatDuration,
  formatTimeOfDay,
  todayString,
} from "@/lib/types";

interface StudyClientProps {
  initialActive: StudySession | null;
  dbError?: string;
}

const LONG_SESSION_WARNING_SECONDS = 12 * 3600;

export default function StudyClient({ initialActive, dbError }: StudyClientProps) {
  const [active, setActive] = useState<StudySession | null>(initialActive);
  const [todays, setTodays] = useState<StudySession[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  );

  const loadToday = useCallback(async () => {
    const d = todayString();
    try {
      const res = await fetch(`/api/study?from=${d}&to=${d}`);
      if (res.ok) setTodays(await res.json());
    } catch {
      // network hiccup; keep current list
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = todayString();
      try {
        const res = await fetch(`/api/study?from=${d}&to=${d}`);
        if (res.ok && !cancelled) setTodays(await res.json());
      } catch {
        // ignore; initial server data stays
      }
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
        await loadToday();
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
      await loadToday();
    } finally {
      setBusy(false);
    }
  };

  if (dbError) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        {dbError}
      </div>
    );
  }

  const today = todayString();
  const completed = todays.filter((s) => s.endAt !== null && s.durationSeconds !== null);
  const finishedTotal = completed.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  const activeCountsToday = active ? active.localDate === today : false;
  const totalToday = finishedTotal + (activeCountsToday ? elapsedSeconds : 0);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {active ? "Session in progress" : "Ready to study?"}
        </p>
        <div
          className={`mt-4 font-mono text-6xl font-bold tabular-nums sm:text-7xl ${
            active
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-neutral-900 dark:text-neutral-100"
          }`}
        >
          {formatClock(elapsedSeconds)}
        </div>
        <p className="mt-3 h-5 text-sm text-neutral-500 dark:text-neutral-400">
          {active
            ? `Started at ${formatTimeOfDay(active.startAt, active.timezone)}${
                active.localDate !== today ? ` (${active.localDate})` : ""
              }`
            : "Elapsed time is stored server-side and survives refreshes"}
        </p>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          {!active ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={busy}
              className="rounded-xl bg-emerald-600 px-10 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy ? "Starting..." : "Start Studying"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStop}
                disabled={busy}
                className="rounded-xl bg-red-600 px-10 py-3 text-base font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50"
              >
                {busy ? "Stopping..." : "Stop"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDiscard(true)}
                disabled={busy}
                className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Discard
              </button>
            </>
          )}
        </div>

        {elapsedSeconds > LONG_SESSION_WARNING_SECONDS && (
          <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
            This session has been running for a very long time. If you forgot to
            stop it earlier, use Discard or edit it later in History.
          </p>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Today&apos;s Sessions
          </h2>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            Total:{" "}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {formatDuration(totalToday)}
            </span>
          </span>
        </div>
        {todays.length === 0 && !activeCountsToday ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            No study sessions yet today. Press Start when you begin.
          </p>
        ) : (
          <ul className="space-y-2">
            {(activeCountsToday && active
              ? [...completed, { ...active, endAt: null, durationSeconds: null }]
              : completed
            ).map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                  {formatTimeOfDay(s.startAt, s.timezone)} →{" "}
                  {s.endAt ? formatTimeOfDay(s.endAt, s.timezone) : "…running"}
                </span>
                <span
                  className={`font-semibold tabular-nums ${
                    s.endAt
                      ? "text-neutral-900 dark:text-neutral-100"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {s.endAt
                    ? formatDuration(s.durationSeconds ?? 0)
                    : formatClock(elapsedSeconds)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 text-right">
          <Link
            href="/history"
            className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            View full history &amp; statistics →
          </Link>
        </div>
      </section>

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
    </div>
  );
}
