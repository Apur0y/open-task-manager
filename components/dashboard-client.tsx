"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Clock,
  CalendarPlus,
  RotateCcw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { ScheduleBlock } from "@/lib/schedule";
import {
  DEFAULT_SCHEDULE_BLOCKS,
  minutesToTimeLabel,
  timeInputToMinute,
  scheduleTotalSeconds,
  scheduleTargetAtMinute,
} from "@/lib/schedule-utils";
import type { StudySession } from "@/lib/types";
import {
  formatDuration,
  localMinutesOfDay,
  todayString,
} from "@/lib/types";

function makeTempId(): string {
  return `local-${Math.random().toString(36).slice(2, 10)}`;
}

export default function DashboardClient({ dbError }: { dbError?: string }) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>(dbError);
  const [startInput, setStartInput] = useState("08:00");
  const [endInput, setEndInput] = useState("10:00");

  const [now, setNow] = useState<number | null>(null);
  const [todays, setTodays] = useState<StudySession[]>([]);
  const [active, setActive] = useState<StudySession | null>(null);
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/schedule");
        if (!res.ok) throw new Error("Failed to load schedule");
        let data = (await res.json()) as ScheduleBlock[];
        if (data.length === 0) {
          const saveRes = await fetch("/api/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blocks: DEFAULT_SCHEDULE_BLOCKS.map(([startMin, endMin]) => ({
                startMin,
                endMin,
              })),
            }),
          });
          if (saveRes.ok) {
            data = (await saveRes.json()) as ScheduleBlock[];
          }
        }
        if (!cancelled) {
          setBlocks(data);
          setLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load schedule."
          );
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const d = todayString();
    (async () => {
      try {
        const res = await fetch(`/api/study?from=${d}&to=${d}`);
        if (res.ok && !cancelled) setTodays(await res.json());
      } catch {
        // ignore
      }
      try {
        const res = await fetch("/api/study?active=1");
        if (res.ok && !cancelled) setActive(await res.json());
      } catch {
        // ignore
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

  const persist = async (next: ScheduleBlock[]) => {
    setSaving(true);
    setError(undefined);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: next }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to save schedule.");
      }
      setBlocks(body as ScheduleBlock[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule.");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    const startMin = timeInputToMinute(startInput);
    const endMin = timeInputToMinute(endInput);
    if (startMin === null || endMin === null) {
      setError("Enter valid start and end times.");
      return;
    }
    if (endMin <= startMin) {
      setError("End time must be after start time.");
      return;
    }
    const next = [
      ...blocks,
      {
        _id: makeTempId(),
        startMin,
        endMin,
      },
    ].sort((a, b) => a.startMin - b.startMin);
    try {
      await persist(next);
    } catch {
      // error already shown
    }
  };

  const handleRemove = async (id: string) => {
    const next = blocks.filter((b) => b._id !== id);
    try {
      await persist(next);
    } catch {
      // error already shown
    }
  };

  const handleReset = async () => {
    try {
      await persist(
        DEFAULT_SCHEDULE_BLOCKS.map(([s, e]) => ({
          _id: makeTempId(),
          startMin: s,
          endMin: e,
        }))
      );
    } catch {
      // error already shown
    }
  };

  const totalSeconds = scheduleTotalSeconds(blocks);
  const completed = todays.filter(
    (s) => s.endAt !== null && s.durationSeconds !== null
  );
  const finishedTotal = completed.reduce(
    (sum, s) => sum + (s.durationSeconds ?? 0),
    0
  );
  const activeToday = active ? active.localDate === todayString() : false;
  const elapsedSeconds = active
    ? Math.max(
        0,
        Math.floor(
          ((now ?? Date.parse(active.startAt)) - Date.parse(active.startAt)) /
            1000
        )
      )
    : 0;
  const totalToday = finishedTotal + (activeToday ? elapsedSeconds : 0);

  const nowMin =
    now !== null
      ? localMinutesOfDay(new Date(now).toISOString(), timezone)
      : null;

  const scheduleTarget =
    nowMin !== null ? scheduleTargetAtMinute(blocks, nowMin) : 0;
  const scheduleDiff = totalToday - scheduleTarget;
  const scheduleDone = nowMin !== null && scheduleTarget >= totalSeconds;

  const blockStatus = (b: ScheduleBlock): "upcoming" | "active" | "done" => {
    if (nowMin === null) return "upcoming";
    if (nowMin < b.startMin) return "upcoming";
    if (nowMin >= b.endMin) return "done";
    return "active";
  };

  const timelineMarker =
    nowMin !== null
      ? `${(Math.min(1440, Math.max(0, nowMin)) / 1440) * 100}%`
      : null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {!loaded && !error ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-surface p-8 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading schedule…
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-neutral-200/80 bg-surface p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Live tracking
              </h2>
              <span className="text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                {now !== null ? minutesToTimeLabel(nowMin ?? 0) : "--:--"}
              </span>
            </div>

            <div
              className="relative mt-4 h-3 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
              role="presentation"
            >
              {timelineMarker !== null && (
                <span
                  className="absolute top-0 h-full w-0.5 bg-neutral-500 dark:bg-neutral-300"
                  style={{ left: timelineMarker }}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
              <span>12:00 AM</span>
              <span>6:00 AM</span>
              <span>12:00 PM</span>
              <span>6:00 PM</span>
              <span>11:59 PM</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-800/60">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Studied today
                </div>
                <div className="mt-0.5 text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {formatDuration(totalToday)}
                </div>
              </div>
              <div className="rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-800/60">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Target today
                </div>
                <div className="mt-0.5 text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {formatDuration(totalSeconds)}
                </div>
              </div>
              <div className="rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-800/60">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {scheduleDone ? "Final" : "By now"}
                </div>
                <div className="mt-0.5 text-lg font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {formatDuration(scheduleTarget)}
                </div>
              </div>
              <div className="rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-800/60">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Pace
                </div>
                <div
                  className={`mt-0.5 text-lg font-bold tabular-nums ${
                    scheduleDiff >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {scheduleDiff >= 0 ? "+" : "−"}
                  {formatDuration(Math.abs(scheduleDiff))}
                </div>
              </div>
            </div>

            {nowMin !== null && blocks.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Schedule now
                </div>
                <div className="space-y-1.5">
                  {blocks.map((b) => {
                    const status = blockStatus(b);
                    return (
                      <div
                        key={b._id}
                        className={`flex items-center justify-between rounded-lg border px-3 py-1.5 text-xs ${
                          status === "active"
                            ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950"
                            : status === "done"
                              ? "border-transparent bg-neutral-100 text-neutral-400 dark:bg-neutral-800/60 dark:text-neutral-500"
                              : "border-transparent bg-neutral-100/60 text-neutral-500 dark:bg-neutral-800/40 dark:text-neutral-400"
                        }`}
                      >
                        <span className="font-semibold">
                          {status === "done" ? "✓ " : ""}
                          {minutesToTimeLabel(b.startMin)} –{" "}
                          {minutesToTimeLabel(b.endMin)}
                        </span>
                        <span
                          className={`font-bold tabular-nums ${
                            status === "active"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : ""
                          }`}
                        >
                          {formatDuration((b.endMin - b.startMin) * 60)}
                          {status === "active" && " · now"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200/80 bg-surface p-4 dark:border-neutral-800">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <CalendarPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Schedule sessions
              </h2>
              <div className="flex items-center gap-1.5">
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-400" aria-hidden="true" />
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className="flex items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                Start
                <input
                  type="time"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm tabular-nums text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                End
                <input
                  type="time"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm tabular-nums text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                />
              </label>
              <button
                type="button"
                onClick={handleAdd}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add session
              </button>
            </div>
            <p
              className="mt-2 text-xs text-neutral-400 dark:text-neutral-500"
              aria-live="polite"
            >
              Add any number of study blocks: e.g. a 8:00–10:00 block. The
              total becomes your daily target and tracking adapts.
            </p>

            <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800/60">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                Total: {blocks.length} {blocks.length === 1 ? "session" : "sessions"}
              </span>
              <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatDuration(totalSeconds)}
              </span>
            </div>
          </section>

          {blocks.length > 0 && (
            <section className="rounded-2xl border border-neutral-200/80 bg-surface p-4 dark:border-neutral-800">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  Same-day timeline
                </h2>
                <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                  {formatDuration(totalSeconds)} planned
                </span>
              </div>
              <div
                className="flex h-12 w-full items-stretch gap-1"
                role="presentation"
              >
                {blocks.map((b) => {
                  const w = Math.max(
                    1,
                    ((b.endMin - b.startMin) / 1440) * 100
                  );
                  const status = blockStatus(b);
                  return (
                    <div
                      key={b._id}
                      title={`${minutesToTimeLabel(b.startMin)} – ${minutesToTimeLabel(b.endMin)}`}
                      style={{ width: `${w}%` }}
                      className={`flex flex-col items-center justify-center rounded-md px-0.5 ${
                        status === "active"
                          ? "bg-emerald-500"
                          : status === "done"
                            ? "bg-emerald-800/40 dark:bg-emerald-400/40"
                            : "bg-emerald-300 dark:bg-emerald-700"
                      }`}
                    />
                  );
                })}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500">
                <span>12:00 AM</span>
                <span>6:00 AM</span>
                <span>12:00 PM</span>
                <span>6:00 PM</span>
                <span>11:59 PM</span>
              </div>

              <ul className="mt-4 space-y-2">
                {blocks.map((b) => (
                  <li
                    key={b._id}
                    className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border px-3.5 py-2 ${
                      blockStatus(b) === "active"
                        ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950"
                        : "border-neutral-200/80 dark:border-neutral-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          blockStatus(b) === "active"
                            ? "bg-emerald-500"
                            : blockStatus(b) === "done"
                              ? "bg-emerald-800 dark:bg-emerald-400"
                              : "bg-neutral-300 dark:bg-neutral-600"
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                          {minutesToTimeLabel(b.startMin)} →{" "}
                          {minutesToTimeLabel(b.endMin)}
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {formatDuration((b.endMin - b.startMin) * 60)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(b._id)}
                      disabled={saving}
                      className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}