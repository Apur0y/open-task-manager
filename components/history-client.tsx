"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConfirmDialog from "./confirm-dialog";
import {
  DayStats,
  StudySession,
  computeDayStats,
  formatDuration,
  formatTimeOfDay,
  groupSessionsByDate,
  isoToLocalInputValue,
  lastNDates,
  localInputValueToIso,
} from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function weekdayLetter(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAY_LETTERS[new Date(y, (m ?? 1) - 1, d ?? 1).getDay()];
}

interface HistoryClientProps {
  fallbackDate: string;
}

export default function HistoryClient({ fallbackDate }: HistoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const qDate = searchParams.get("date") ?? "";
  const qCompare = searchParams.get("compare") ?? "";
  const date = DATE_RE.test(qDate) ? qDate : fallbackDate;
  const compare = DATE_RE.test(qCompare) ? qCompare : "";
  const dataKey = `${date}|${compare}`;

  const [daySessions, setDaySessions] = useState<StudySession[]>([]);
  const [trendSessions, setTrendSessions] = useState<StudySession[]>([]);
  const [compareSessions, setCompareSessions] = useState<StudySession[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<StudySession | null>(null);
  const [busy, setBusy] = useState(false);

  const navigate = useCallback(
    (nextDate: string, nextCompare: string) => {
      const params = new URLSearchParams();
      params.set("date", nextDate);
      if (nextCompare) params.set("compare", nextCompare);
      router.replace(`/history?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const trendFrom = lastNDates(7)[0];
        const requests: [Promise<Response>, (data: StudySession[]) => void][] = [
          [
            fetch(`/api/study?from=${date}&to=${date}`),
            (data) => setDaySessions(data),
          ],
          [
            fetch(`/api/study?from=${trendFrom}&to=${lastNDates(1)[0]}`),
            (data) => setTrendSessions(data),
          ],
        ];
        if (compare) {
          requests.push([
            fetch(`/api/study?from=${compare}&to=${compare}`),
            (data) => setCompareSessions(data),
          ]);
        } else {
          setCompareSessions([]);
        }
        const responses = await Promise.all(requests.map(([p]) => p));
        if (cancelled) return;
        for (let i = 0; i < requests.length; i++) {
          const res = responses[i];
          if (!res.ok) throw new Error(`Request failed: ${res.status}`);
          requests[i][1](await res.json());
        }
        setError(undefined);
        setLoadedKey(dataKey);
      } catch {
        if (!cancelled) setError("Could not load study data.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, compare, dataKey]);

  const loading = loadedKey !== dataKey;

  const dayStats: DayStats = useMemo(
    () => computeDayStats(date, daySessions),
    [date, daySessions]
  );

  const compareStats: DayStats | null = useMemo(() => {
    if (!compare) return null;
    return computeDayStats(compare, compareSessions);
  }, [compare, compareSessions]);

  const trendDays: DayStats[] = useMemo(() => {
    const grouped = groupSessionsByDate(trendSessions);
    return lastNDates(7).map((d) => computeDayStats(d, grouped.get(d) ?? []));
  }, [trendSessions]);

  const weekTotal = trendDays.reduce((sum, d) => sum + d.totalSeconds, 0);
  const maxTrendSeconds = Math.max(...trendDays.map((d) => d.totalSeconds), 1);

  const handleDelete = async () => {
    if (!deletingSession) return;
    setBusy(true);
    try {
      await fetch(`/api/study/${deletingSession._id}`, { method: "DELETE" });
      setDeletingSession(null);
      setLoadedKey("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (DATE_RE.test(e.target.value)) navigate(e.target.value, compare);
            }}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-surface px-3 text-[15px] text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Compare
          </span>
          <input
            type="date"
            value={compare}
            onChange={(e) => navigate(date, e.target.value)}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-surface px-3 text-[15px] text-neutral-900 dark:border-neutral-700 dark:text-neutral-100"
          />
        </label>
        {!compare ? (
          <button
            type="button"
            onClick={() => navigate(date, lastNDates(2)[0])}
            className="col-span-2 flex min-h-11 items-center justify-center rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Compare with yesterday
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(date, "")}
            className="col-span-2 flex min-h-11 items-center justify-center rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Clear comparison ({compare})
          </button>
        )}
      </section>

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="Total" value={formatDuration(dayStats.totalSeconds)} />
        <StatCard label="Sessions" value={String(dayStats.sessionCount)} />
        <StatCard label="Avg session" value={formatDuration(dayStats.avgSeconds)} />
        <StatCard label="Longest" value={formatDuration(dayStats.longestSeconds)} />
      </section>

      {compareStats && <ComparisonCard a={dayStats} b={compareStats} />}

      <section>
        <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Session timeline
        </h2>
        {loading ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            Loading sessions…
          </p>
        ) : daySessions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            No study sessions on this date.
          </p>
        ) : (
          <ul className="space-y-2">
            {daySessions.map((s) =>
              editingId === s._id ? (
                <li key={s._id}>
                  <EditSessionRow
                    session={s}
                    busy={busy}
                    onCancel={() => setEditingId(null)}
                    onSave={async (startIso, endIso) => {
                      setBusy(true);
                      try {
                        const res = await fetch(`/api/study/${s._id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ startAt: startIso, endAt: endIso }),
                        });
                        if (!res.ok) {
                          const body = await res.json().catch(() => ({}));
                          setError(body.error || "Failed to update session");
                          return;
                        }
                        setError(undefined);
                        setEditingId(null);
                        setLoadedKey("");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  />
                </li>
              ) : (
                <li
                  key={s._id}
                  className="flex min-h-14 items-center justify-between gap-2 rounded-2xl border border-neutral-200/80 bg-surface px-4 py-2.5"
                >
                  <span className="flex flex-col">
                    <span className="font-mono text-[15px] tabular-nums text-neutral-800 dark:text-neutral-200">
                      {formatTimeOfDay(s.startAt, s.timezone)} →{" "}
                      {s.endAt ? formatTimeOfDay(s.endAt, s.timezone) : "…"}
                    </span>
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        s.endAt
                          ? "text-neutral-500 dark:text-neutral-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {s.endAt
                        ? formatDuration(s.durationSeconds ?? 0)
                        : "in progress"}
                    </span>
                  </span>
                  {s.endAt ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Edit session ${formatTimeOfDay(s.startAt, s.timezone)}`}
                        onClick={() => setEditingId(s._id)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-300 text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4.5 w-4.5"
                          aria-hidden="true"
                        >
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete session ${formatTimeOfDay(s.startAt, s.timezone)}`}
                        onClick={() => setDeletingSession(s)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4.5 w-4.5"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      live
                    </span>
                  )}
                </li>
              )
            )}
          </ul>
        )}
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
          <div className="flex h-44 items-end justify-between gap-2">
            {trendDays.map((d) => {
              const pct = Math.round((d.totalSeconds / maxTrendSeconds) * 100);
              const isSelected = d.date === date;
              return (
                <button
                  type="button"
                  key={d.date}
                  onClick={() => navigate(d.date, compare)}
                  title={`${d.date}: ${formatDuration(d.totalSeconds)} (${d.sessionCount} sessions)`}
                  className="group flex h-full flex-1 cursor-pointer flex-col items-center justify-end gap-1"
                >
                  <span className="text-[10px] font-medium tabular-nums text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-neutral-400">
                    {formatDuration(d.totalSeconds)}
                  </span>
                  <div
                    className={`w-full rounded-lg transition-colors ${
                      isSelected
                        ? "bg-emerald-500"
                        : "bg-emerald-200 group-hover:bg-emerald-300 dark:bg-emerald-900 dark:group-hover:bg-emerald-800"
                    }`}
                    style={{ height: `${Math.max(pct, d.totalSeconds > 0 ? 8 : 2)}%` }}
                  />
                  <span
                    className={`flex flex-col items-center leading-tight ${
                      isSelected
                        ? "font-bold text-emerald-600 dark:text-emerald-400"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    <span className="text-[10px]">{weekdayLetter(d.date)}</span>
                    <span className="text-[9px] tabular-nums opacity-70">
                      {d.date.slice(8)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {deletingSession && (
        <ConfirmDialog
          title="Delete this session?"
          message={`${formatTimeOfDay(deletingSession.startAt, deletingSession.timezone)} → ${
            deletingSession.endAt
              ? formatTimeOfDay(deletingSession.endAt, deletingSession.timezone)
              : ""
          } will be permanently removed and daily totals recalculated.`}
          confirmLabel="Delete"
          busy={busy}
          onConfirm={handleDelete}
          onCancel={() => setDeletingSession(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 text-center">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </div>
    </div>
  );
}

function ComparisonCard({ a, b }: { a: DayStats; b: DayStats }) {
  const diffSeconds = a.totalSeconds - b.totalSeconds;
  const diffLabel =
    diffSeconds === 0
      ? "Same study time"
      : diffSeconds > 0
        ? `${formatDuration(diffSeconds)} more than ${b.date}`
        : `${formatDuration(-diffSeconds)} less than ${b.date}`;
  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-surface p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Comparison
      </h2>
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {a.date}
          </div>
          <div className="mt-1 font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatDuration(a.totalSeconds)}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {a.sessionCount} sessions
          </div>
        </div>
        <div className="flex flex-col items-center justify-center">
          <div
            className={`font-bold tabular-nums ${
              diffSeconds > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : diffSeconds < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            {diffSeconds === 0 ? "=" : diffSeconds > 0 ? "+" : "−"}
            {formatDuration(Math.abs(diffSeconds))}
          </div>
          <div className="mt-1 text-[11px] leading-tight text-neutral-500 dark:text-neutral-400">
            {diffLabel}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {b.date}
          </div>
          <div className="mt-1 font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatDuration(b.totalSeconds)}
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            {b.sessionCount} sessions
          </div>
        </div>
      </div>
    </section>
  );
}

function EditSessionRow({
  session,
  busy,
  onSave,
  onCancel,
}: {
  session: StudySession;
  busy: boolean;
  onSave: (startIso: string, endIso: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [startValue, setStartValue] = useState(() =>
    isoToLocalInputValue(session.startAt, session.timezone)
  );
  const [endValue, setEndValue] = useState(() =>
    session.endAt ? isoToLocalInputValue(session.endAt, session.timezone) : ""
  );
  const [localError, setLocalError] = useState<string | undefined>();

  const previewDuration = useMemo(() => {
    const s = localInputValueToIso(startValue, session.timezone);
    const e = localInputValueToIso(endValue, session.timezone);
    if (!s || !e) return null;
    const seconds = Math.round((Date.parse(e) - Date.parse(s)) / 1000);
    return seconds > 0 ? seconds : null;
  }, [startValue, endValue, session.timezone]);

  const handleSave = async () => {
    const startIso = localInputValueToIso(startValue, session.timezone);
    const endIso = localInputValueToIso(endValue, session.timezone);
    if (!startIso || !endIso) {
      setLocalError("Both start and end times are required.");
      return;
    }
    if (previewDuration === null) {
      setLocalError("End time must be after start time.");
      return;
    }
    setLocalError(undefined);
    await onSave(startIso, endIso);
  };

  return (
    <div className="space-y-3 rounded-2xl border-2 border-emerald-500/60 bg-surface p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Start
          </span>
          <input
            type="datetime-local"
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-[15px] text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            End
          </span>
          <input
            type="datetime-local"
            value={endValue}
            onChange={(e) => setEndValue(e.target.value)}
            className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-[15px] text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </label>
      </div>
      <div className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
        {previewDuration !== null ? (
          <>
            New duration:{" "}
            <span className="font-bold text-neutral-900 dark:text-neutral-100">
              {formatDuration(previewDuration)}
            </span>
          </>
        ) : (
          <span className="text-red-600 dark:text-red-400">Invalid time range</span>
        )}
      </div>
      {localError && (
        <p className="text-xs text-red-600 dark:text-red-400">{localError}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex h-12 flex-1 items-center justify-center rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || previewDuration === null}
          className="flex h-12 flex-1 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white transition-transform duration-100 hover:bg-emerald-500 active:scale-[0.97] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
