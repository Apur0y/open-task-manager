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
    <div className="space-y-8">
      <section className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (DATE_RE.test(e.target.value)) navigate(e.target.value, compare);
            }}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Compare with
          </label>
          <input
            type="date"
            value={compare}
            onChange={(e) => navigate(date, e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
        {compare ? (
          <button
            type="button"
            onClick={() => navigate(date, "")}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Clear comparison
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(date, lastNDates(2)[0])}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Compare with yesterday
          </button>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={formatDuration(dayStats.totalSeconds)} />
        <StatCard label="Sessions" value={String(dayStats.sessionCount)} />
        <StatCard label="Avg session" value={formatDuration(dayStats.avgSeconds)} />
        <StatCard label="Longest" value={formatDuration(dayStats.longestSeconds)} />
      </section>

      {compareStats && <ComparisonCard a={dayStats} b={compareStats} />}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Session Timeline
        </h2>
        {loading ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            Loading sessions…
          </p>
        ) : daySessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <span className="font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                    {formatTimeOfDay(s.startAt, s.timezone)} →{" "}
                    {s.endAt ? formatTimeOfDay(s.endAt, s.timezone) : "…running"}
                  </span>
                  <span className="flex items-center gap-3">
                    <span
                      className={`font-semibold tabular-nums ${
                        s.endAt
                          ? "text-neutral-900 dark:text-neutral-100"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {s.endAt
                        ? formatDuration(s.durationSeconds ?? 0)
                        : "in progress"}
                    </span>
                    {s.endAt && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(s._id)}
                          className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSession(s)}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </span>
                </li>
              )
            )}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Last 7 Days
          </h2>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            Week total:{" "}
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              {formatDuration(weekTotal)}
            </span>
          </span>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex h-40 items-end justify-between gap-2">
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
                    className={`w-full rounded-t-md transition-colors ${
                      isSelected
                        ? "bg-emerald-500"
                        : "bg-emerald-200 group-hover:bg-emerald-300 dark:bg-emerald-900 dark:group-hover:bg-emerald-800"
                    }`}
                    style={{ height: `${Math.max(pct, d.totalSeconds > 0 ? 8 : 2)}%` }}
                  />
                  <span
                    className={`text-[10px] tabular-nums ${
                      isSelected
                        ? "font-bold text-emerald-600 dark:text-emerald-400"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {d.date.slice(8)}/{d.date.slice(5, 7)}
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
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
    <section className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-base font-semibold text-neutral-900 dark:text-neutral-100">
        Comparison
      </h2>
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {a.date}
          </div>
          <div className="mt-1 font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatDuration(a.totalSeconds)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            {a.sessionCount} sessions
          </div>
        </div>
        <div className="flex flex-col items-center justify-center">
          <div
            className={`font-semibold tabular-nums ${
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
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {diffLabel}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {b.date}
          </div>
          <div className="mt-1 font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatDuration(b.totalSeconds)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
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
    <div className="rounded-xl border border-emerald-300 bg-white p-4 dark:border-emerald-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Start
          </label>
          <input
            type="datetime-local"
            value={startValue}
            onChange={(e) => setStartValue(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            End
          </label>
          <input
            type="datetime-local"
            value={endValue}
            onChange={(e) => setEndValue(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
        </div>
        <div className="pb-1.5 text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
          {previewDuration !== null ? (
            <>
              New duration:{" "}
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {formatDuration(previewDuration)}
              </span>
            </>
          ) : (
            "Invalid range"
          )}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || previewDuration === null}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      {localError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{localError}</p>
      )}
    </div>
  );
}
