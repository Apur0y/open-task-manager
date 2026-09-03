"use client";

import { useEffect, useMemo, useState } from "react";
import { StudySession, formatDuration, todayString } from "@/lib/types";

type Range = "7" | "30" | "month";

function dateFromString(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

interface DailyPoint {
  date: string;
  seconds: number;
}

function buildDailyTotals(sessions: StudySession[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of sessions) {
    if (s.endAt === null || s.durationSeconds == null) continue;
    const cur = map.get(s.localDate) ?? 0;
    map.set(s.localDate, cur + s.durationSeconds);
  }
  return map;
}

function shiftDate(dateStr: string, days: number): string {
  const d = dateFromString(dateStr) ?? new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const end = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  return { start, end };
}

function buildSeriesBetween(
  daily: Map<string, number>,
  start: string,
  end: string
): DailyPoint[] {
  const series: DailyPoint[] = [];
  let cur = start;
  while (cur <= end) {
    series.push({ date: cur, seconds: daily.get(cur) ?? 0 });
    cur = shiftDate(cur, 1);
  }
  return series;
}

export default function TargetsStats() {
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [range, setRange] = useState<Range>("30");
  const [monthVal, setMonthVal] = useState(() => todayString().slice(0, 7));
  const [chartRange, setChartRange] = useState<"1" | "3" | "6">("3");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const d = todayString();
      try {
        const res = await fetch(`/api/study?from=1970-01-01&to=${d}`);
        if (res.ok && !cancelled) setAllSessions(await res.json());
      } catch {
        // keep empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const daily = useMemo(() => buildDailyTotals(allSessions), [allSessions]);

  const today = todayString();

  const rangeBounds = useMemo<{ start: string; end: string }>(() => {
    if (range === "7") {
      return { start: shiftDate(today, -6), end: today };
    }
    if (range === "30") {
      return { start: shiftDate(today, -29), end: today };
    }
    const { start, end } = monthRange(monthVal);
    return { start, end: end > today ? today : end };
  }, [range, monthVal, today]);

  const rangeStats = useMemo(() => {
    const series = buildSeriesBetween(daily, rangeBounds.start, rangeBounds.end);
    const total = series.reduce((sum, p) => sum + p.seconds, 0);
    let bestDay: DailyPoint | null = null;
    for (const p of series) {
      if (!bestDay || p.seconds > bestDay.seconds) bestDay = p;
    }
    const bestDayVal = bestDay && bestDay.seconds > 0 ? bestDay : null;

    let best7: { seconds: number; start: string; end: string } | null = null;
    for (let i = 0; i + 6 < series.length; i++) {
      let sum = 0;
      for (let j = 0; j < 7; j++) sum += series[i + j].seconds;
      if (!best7 || sum > best7.seconds) {
        best7 = {
          seconds: sum,
          start: series[i].date,
          end: series[i + 6].date,
        };
      }
    }
    return { total, bestDayVal, best7: best7 && best7.seconds > 0 ? best7 : null };
  }, [daily, rangeBounds]);

  const chartData = useMemo(() => {
    const months = Number(chartRange);
    const start = shiftDate(today, -(months * 30));
    const series = buildSeriesBetween(daily, start, today);
    return series;
  }, [daily, chartRange, today]);

  const now = todayString();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-neutral-200/80 bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Overall stats
          </h2>
          <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
            {(["7", "30"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                  range === r
                    ? "bg-white text-emerald-600 shadow dark:bg-neutral-900 dark:text-emerald-400"
                    : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
                }`}
              >
                {r} days
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRange("month")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                range === "month"
                  ? "bg-white text-emerald-600 shadow dark:bg-neutral-900 dark:text-emerald-400"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {range === "month" && (
          <div className="mt-3">
            <input
              type="month"
              value={monthVal}
              max={now.slice(0, 7)}
              onChange={(e) => {
                if (e.target.value) setMonthVal(e.target.value);
              }}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Total
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
              {formatDuration(rangeStats.total)}
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Best day
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
              {rangeStats.bestDayVal
                ? formatDuration(rangeStats.bestDayVal.seconds)
                : "—"}
            </div>
            {rangeStats.bestDayVal && (
              <div className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                {rangeStats.bestDayVal.date}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-neutral-200/80 bg-surface p-4 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Best 7 days
            </div>
            <div className="mt-1 text-xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
              {rangeStats.best7 ? formatDuration(rangeStats.best7.seconds) : "—"}
            </div>
            {rangeStats.best7 && (
              <div className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
                {rangeStats.best7.start} → {rangeStats.best7.end}
              </div>
            )}
          </div>
        </div>
      </section>

      <LineChart
        data={chartData}
        range={chartRange}
        onRangeChange={(r) => setChartRange(r)}
      />
    </div>
  );
}

const CHART_RANGES: { value: "1" | "3" | "6"; label: string }[] = [
  { value: "1", label: "1 month" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
];

function LineChart({
  data,
  range,
  onRangeChange,
}: {
  data: DailyPoint[];
  range: "1" | "3" | "6";
  onRangeChange: (r: "1" | "3" | "6") => void;
}) {
  const width = 320;
  const height = 160;
  const padL = 34;
  const padR = 8;
  const padT = 12;
  const padB = 22;

  const maxH = useMemo(() => {
    const m = Math.max(...data.map((d) => d.seconds), 0);
    return Math.max(m, 3600);
  }, [data]);

  const path = useMemo(() => {
    if (data.length === 0) return "";
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    return data
      .map((d, i) => {
        const x = padL + (i / (data.length - 1)) * innerW;
        const y = padT + innerH - (d.seconds / maxH) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, maxH]);

  const areaPath = useMemo(() => {
    if (data.length === 0) return "";
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const firstX = padL;
    const lastX = padL + innerW;
    const baseY = padT + innerH;
    return `${path} L${lastX},${baseY} L${firstX},${baseY} Z`;
  }, [path, data.length]);

  const yTicks = useMemo(() => {
    const hours = Math.ceil(maxH / 3600 / 4) * 4 || 1;
    const ticks = [0, Math.round(hours / 2), hours];
    return ticks.map((h) => h * 3600);
  }, [maxH]);

  const xTicks = useMemo(() => {
    if (data.length < 2) return [];
    const count = 4;
    const idxs = Array.from({ length: count }, (_, i) =>
      Math.round((i / (count - 1)) * (data.length - 1))
    );
    return idxs.map((i) => data[i]);
  }, [data]);

  return (
    <section className="rounded-3xl border border-neutral-200/80 bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Reading hours
        </h2>
        <div className="flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800">
          {CHART_RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onRangeChange(r.value)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                range === r.value
                  ? "bg-white text-emerald-600 shadow dark:bg-neutral-900 dark:text-emerald-400"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          role="img"
          aria-label="Study hours over time"
        >
          {yTicks.map((t) => {
            const innerH = height - padT - padB;
            const y = padT + innerH - (t / maxH) * innerH;
            return (
              <g key={t}>
                <line
                  x1={padL}
                  x2={width - padR}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={0.1}
                />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-neutral-400 text-[9px] tabular-nums"
                >
                  {Math.round(t / 3600)}h
                </text>
              </g>
            );
          })}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#grad)"
              stroke="none"
            />
          )}
          {path && (
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="text-emerald-500"
            />
          )}
          {data.map((d, i) => {
            const innerW = width - padL - padR;
            const innerH = height - padT - padB;
            const x = padL + (i / (data.length - 1)) * innerW;
            const y = padT + innerH - (d.seconds / maxH) * innerH;
            return (
              <g key={d.date}>
                <circle
                  cx={x}
                  cy={y}
                  r={1.5}
                  className="fill-emerald-500"
                />
                <title>{`${d.date}: ${formatDuration(d.seconds)}`}</title>
              </g>
            );
          })}
          {xTicks.map((d) => {
            const idx = data.indexOf(d);
            const innerW = width - padL - padR;
            const x = padL + (idx / (data.length - 1)) * innerW;
            return (
              <text
                key={d.date}
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="fill-neutral-400 text-[9px] tabular-nums"
              >
                {d.date.slice(5)}
              </text>
            );
          })}
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="rgb(16 185 129)"
                stopOpacity={0.25}
              />
              <stop
                offset="100%"
                stopColor="rgb(16 185 129)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
}
