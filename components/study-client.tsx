"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  BookOpen,
  AlertTriangle,
  Plus,
  X,
  Trophy,
} from "lucide-react";
import AddSessionForm from "./session-add-form";
import {
  StudySession,
  computeDayStats,
  cumulativeUpToMinute,
  dayCumulativeByHour,
  formatClock,
  formatDuration,
  formatTimeOfDay,
  groupSessionsByDate,
  lastNDates,
  localMinutesOfDay,
  todayString,
} from "@/lib/types";

interface StudyClientProps {
  initialActive: StudySession | null;
  dbError?: string;
}

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
function weekdayLetter(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAY_LETTERS[new Date(y, (m ?? 1) - 1, d ?? 1).getDay()];
}

const DAILY_TARGET_SECONDS = 12 * 3600;

const SCHEDULE_BLOCKS: [number, number][] = [
  [480, 600],   // 8:00 AM – 10:00 AM
  [630, 780],   // 10:30 AM – 1:00 PM
  [840, 900],   // 2:00 PM – 3:00 PM
  [960, 1080],  // 4:00 PM – 6:00 PM
  [1140, 1260], // 7:00 PM – 10:00 PM
  [1290, 1440], // 10:30 PM – 12:00 AM
];
const SCHEDULE_TOTAL_SECONDS = SCHEDULE_BLOCKS.reduce(
  (sum, [s, e]) => sum + (e - s) * 60,
  0
);
function scheduleTargetAtMinute(minuteOfDay: number): number {
  let acc = 0;
  for (const [start, end] of SCHEDULE_BLOCKS) {
    if (minuteOfDay <= start) break;
    const overlap = Math.min(minuteOfDay, end) - start;
    acc += overlap * 60;
  }
  return acc;
}

function dailyProgressMessage(hours: number): string {
  if (hours <= 0) return "Let's begin.";
  if (hours < 3) return "Let's begin.";
  if (hours < 6) return "You're warming up.";
  if (hours < 9) return "Halfway there! 🔥";
  if (hours < 11) return "You're entering beast mode.";
  if (hours < 12) return "ONE HOUR LEFT.";
  return "TARGET DESTROYED 🏆";
}

export default function StudyClient({ initialActive, dbError }: StudyClientProps) {
  const [active, setActive] = useState<StudySession | null>(initialActive);
  const [todays, setTodays] = useState<StudySession[]>([]);
  const [now, setNow] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | undefined>();
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [weeklySessions, setWeeklySessions] = useState<StudySession[]>([]);
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  const loadToday = async () => {
    const d = todayString();
    try {
      const res = await fetch(`/api/study?from=${d}&to=${d}`);
      if (res.ok) setTodays(await res.json());
    } catch {
      // network hiccup; keep current list
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = todayString();
      try {
        const res = await fetch(`/api/study?from=1970-01-01&to=${d}`);
        if (res.ok && !cancelled) setAllSessions(await res.json());
      } catch {
        // ignore; best-day comparison stays empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const dates = lastNDates(7);
      const from = dates[0];
      const to = dates[dates.length - 1];
      try {
        const res = await fetch(`/api/study?from=${from}&to=${to}`);
        if (res.ok && !cancelled) setWeeklySessions(await res.json());
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const handleAddSession = async (startAtIso: string, endAtIso: string) => {
    setAddBusy(true);
    setAddError(undefined);
    try {
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone, startAt: startAtIso, endAt: endAtIso }),
      });
      const body = await res.json();
      if (res.status === 201) {
        setShowAdd(false);
        await loadToday();
      } else {
        setAddError(body.error || "Failed to add session");
      }
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAddBusy(false);
    }
  };

  const today = todayString();
  const completed = todays.filter((s) => s.endAt !== null && s.durationSeconds !== null);
  const finishedTotal = completed.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  const activeCountsToday = active ? active.localDate === today : false;
  const totalToday = finishedTotal + (activeCountsToday ? elapsedSeconds : 0);

  const record = useMemo(() => {
    if (now === null) return null;
    const grouped = new Map<string, StudySession[]>();
    for (const s of allSessions) {
      if (s.endAt === null || s.durationSeconds == null) continue;
      if (s.localDate === today) continue;
      const list = grouped.get(s.localDate);
      if (list) list.push(s);
      else grouped.set(s.localDate, [s]);
    }

    let bestDate = "";
    let bestTotal = 0;
    const cumByDate = new Map<string, number[]>();
    for (const [date, sessions] of grouped) {
      const total = sessions.reduce(
        (sum, s) => sum + (s.durationSeconds ?? 0),
        0
      );
      cumByDate.set(date, dayCumulativeByHour(sessions, timezone));
      if (total > bestTotal) {
        bestTotal = total;
        bestDate = date;
      }
    }

    if (!bestDate) return null;

    const nowMin = localMinutesOfDay(new Date(now).toISOString(), timezone);
    const bestCum = (cumByDate.get(bestDate) as number[]) ?? [];
    const recordAtNow = cumulativeUpToMinute(bestCum, nowMin);
    return {
      date: bestDate,
      total: bestTotal,
      atNow: recordAtNow,
      isNewRecord: totalToday >= bestTotal && bestTotal > 0,
    };
  }, [allSessions, today, timezone, now, totalToday]);

  const recordDiff = record ? totalToday - record.atNow : null;

  const scheduleTarget = now !== null
    ? scheduleTargetAtMinute(localMinutesOfDay(new Date(now).toISOString(), timezone))
    : 0;
  const scheduleDiff = totalToday - scheduleTarget;
  const schedulePassed = now !== null && scheduleTarget > 0;
  const scheduleFinished = scheduleTarget >= SCHEDULE_TOTAL_SECONDS;

  const weeklyDays = useMemo(() => {
    const grouped = groupSessionsByDate(weeklySessions);
    return lastNDates(7).map((d) => computeDayStats(d, grouped.get(d) ?? []));
  }, [weeklySessions]);

  const weekTotal = weeklyDays.reduce((sum, d) => sum + d.totalSeconds, 0);
  const maxWeeklySeconds = Math.max(...weeklyDays.map((d) => d.totalSeconds), 1);

  if (dbError) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {dbError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200/80 bg-surface px-5 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold uppercase tracking-widest text-neutral-700 dark:text-neutral-200">
            Today
          </h2>
          <span className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {(totalToday / 3600).toFixed(1)}h
          </span>
        </div>

        <div
          className="mt-4 flex items-center gap-1"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={DAILY_TARGET_SECONDS}
          aria-valuenow={Math.min(totalToday, DAILY_TARGET_SECONDS)}
        >
          {Array.from({ length: 16 }, (_, i) => {
            const filled = i < 16 * (Math.min(totalToday, DAILY_TARGET_SECONDS) / DAILY_TARGET_SECONDS);
            const isActive = active && activeCountsToday;
            return (
              <span
                key={i}
                className={`h-10 flex-1 rounded-[5px] ${
                  filled
                    ? isActive
                      ? "bg-emerald-500"
                      : "bg-emerald-400"
                    : "bg-neutral-200 dark:bg-neutral-800"
                }`}
              />
            );
          })}
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-4xl font-black tabular-nums text-neutral-900 dark:text-neutral-100">
              {totalToday / 3600 >= 1
                ? `${(totalToday / 3600).toFixed(1)}`
                : `${Math.floor(totalToday / 60)}m`}
            </div>
            
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              of 12 hour target
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {totalToday / 3600 >= 1
                ? `${(12 - totalToday / 3600).toFixed(1)}h`
                : `${(12 * 60 * 60 - totalToday) / 60}m`}
            </div>
            <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              to go
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {dailyProgressMessage(totalToday / 3600)}
        </div>

        {record && recordDiff !== null && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800/60">
            {record.isNewRecord ? (
              <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
                New record! {formatDuration(totalToday)}
              </span>
            ) : recordDiff >= 0 ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatDuration(recordDiff)} ahead of record
              </span>
            ) : (
              <span className="font-semibold text-neutral-500 dark:text-neutral-400">
                {formatDuration(-recordDiff)} behind record
              </span>
            )}
            <span className="text-neutral-400 dark:text-neutral-500">
              · best {formatDuration(record.total)} ({record.date.slice(5)})
            </span>
          </div>
        )}

        {schedulePassed && !scheduleFinished && (
          <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800/60">
            {scheduleDiff >= 0 ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatDuration(scheduleDiff)} ahead of schedule
              </span>
            ) : (
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatDuration(-scheduleDiff)} behind schedule
              </span>
            )}
            <span className="text-neutral-400 dark:text-neutral-500">
              · target {formatDuration(scheduleTarget)}
            </span>
          </div>
        )}
        {scheduleFinished && (
          <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-xs dark:bg-neutral-800/60">
            {scheduleDiff >= 0 ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                All schedule blocks done · {formatDuration(scheduleDiff)} ahead
              </span>
            ) : (
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatDuration(-scheduleDiff)} behind schedule
              </span>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Today total
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatDuration(totalToday)}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Sessions
          </div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
            {completed.length + (activeCountsToday ? 1 : 0)}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Today&apos;s sessions
          </h2>
          <button
            type="button"
            onClick={() => {
              setAddError(undefined);
              setShowAdd(true);
            }}
            className="flex items-center gap-1 rounded-lg border border-emerald-500/60 px-2.5 py-1 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add session
          </button>
        </div>
        {todays.length === 0 && !activeCountsToday ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            <BookOpen className="h-8 w-8 text-neutral-300 dark:text-neutral-600" aria-hidden="true" />
            No sessions yet today. Tap Start when you begin.
          </div>
        ) : (
          <ul className="space-y-2">
            {(activeCountsToday && active
              ? [...completed, { ...active, endAt: null, durationSeconds: null }]
              : completed
            ).map((s) => (
              <li
                key={s._id}
                className="flex min-h-14 items-center justify-between rounded-2xl border border-neutral-200/80 bg-surface px-4 py-2.5"
              >
                <span className="font-mono text-[15px] tabular-nums text-neutral-700 dark:text-neutral-300">
                  {formatTimeOfDay(s.startAt, s.timezone)} →{" "}
                  {s.endAt ? formatTimeOfDay(s.endAt, s.timezone) : "…"}
                </span>
                <span
                  className={`ml-3 whitespace-nowrap font-bold tabular-nums ${
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
        <Link
          href="/history"
          className="mt-3 flex min-h-12 items-center justify-between rounded-2xl border border-neutral-200/80 bg-surface px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-surface dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          History &amp; statistics
          <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
        </Link>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Last 7 days
          </h2>
          <span className="text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            Week:{" "}
            <span className="font-bold text-neutral-800 dark:text-neutral-200">
              {formatDuration(weekTotal)}
            </span>
          </span>
        </div>
        <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 pt-3">
          <div className="flex h-48 items-end justify-between gap-2">
            {weeklyDays.map((d) => {
              const hasData = d.totalSeconds > 0;
              const pct = hasData
                ? Math.max(8, Math.round((d.totalSeconds / maxWeeklySeconds) * 100))
                : 2;
              const isToday = d.date === today;
              return (
                <div
                  key={d.date}
                  title={`${d.date}: ${formatDuration(d.totalSeconds)} (${d.sessionCount} sessions)`}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1 "
                >
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      hasData
                        ? "text-neutral-800 dark:text-neutral-200"
                        : "text-neutral-400 dark:text-neutral-600"
                    }`}
                  >
                    {hasData ? formatDuration(d.totalSeconds) : "0h"}
                  </span>
                  <div
                    className={`w-full rounded-md ${
                      hasData
                        ? isToday
                          ? "bg-emerald-500"
                          : "bg-emerald-400 dark:bg-emerald-600"
                        : "bg-neutral-200 dark:bg-neutral-700"
                    }`}
                    style={{ height: `${pct}%` }}
                  />
                  <span
                    className={`flex flex-col items-center leading-tight ${
                      isToday
                        ? "font-bold text-emerald-600 dark:text-emerald-400"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    <span className="text-[10px]">{weekdayLetter(d.date)}</span>
                    <span className="text-[9px] tabular-nums opacity-70">
                      {d.date.slice(8)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={() => {
            if (!addBusy) setShowAdd(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Add a study session"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Add session for today
              </h3>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                disabled={addBusy}
                aria-label="Close"
                className="rounded-full p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {addError && (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {addError}
              </p>
            )}

            <AddSessionForm
              date={today}
              busy={addBusy}
              onCancel={() => setShowAdd(false)}
              onSave={handleAddSession}
            />
          </div>
        </div>
      )}
    </div>
  );
}
