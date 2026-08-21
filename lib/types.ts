export interface StudySession {
  _id: string;
  userId: string;
  startAt: string;
  endAt: string | null;
  durationSeconds: number | null;
  localDate: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayStats {
  date: string;
  totalSeconds: number;
  sessionCount: number;
  avgSeconds: number;
  longestSeconds: number;
}

export function todayString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export function formatTimeOfDay(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "";
  }
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    parts.year,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0
  );
  return asUtc - date.getTime();
}

export function isoToLocalInputValue(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (!timeZone) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  try {
    const offset = timeZoneOffsetMs(d, timeZone);
    const shifted = new Date(d.getTime() + offset);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
      shifted.getUTCDate()
    )}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
  } catch {
    return isoToLocalInputValue(iso);
  }
}

export function localInputValueToIso(
  value: string,
  timeZone?: string
): string | null {
  if (!timeZone) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const naive = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  if (Number.isNaN(naive)) return null;
  const offset1 = timeZoneOffsetMs(new Date(naive), timeZone);
  let ts = naive - offset1;
  const offset2 = timeZoneOffsetMs(new Date(ts), timeZone);
  if (offset2 !== offset1) ts = naive - offset2;
  return new Date(ts).toISOString();
}

export function computeDayStats(
  date: string,
  sessions: StudySession[]
): DayStats {
  const durations = sessions
    .filter((s) => s.endAt !== null && s.durationSeconds !== null)
    .map((s) => s.durationSeconds as number);
  const totalSeconds = durations.reduce((sum, d) => sum + d, 0);
  const sessionCount = durations.length;
  return {
    date,
    totalSeconds,
    sessionCount,
    avgSeconds: sessionCount > 0 ? Math.round(totalSeconds / sessionCount) : 0,
    longestSeconds: durations.length > 0 ? Math.max(...durations) : 0,
  };
}

export function groupSessionsByDate(
  sessions: StudySession[]
): Map<string, StudySession[]> {
  const map = new Map<string, StudySession[]>();
  for (const s of sessions) {
    const list = map.get(s.localDate);
    if (list) list.push(s);
    else map.set(s.localDate, [s]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.startAt < b.startAt ? -1 : 1));
  }
  return map;
}

export function lastNDates(n: number, endDate?: Date): string[] {
  const end = endDate ?? new Date();
  const dates: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    dates.push(todayString(d));
  }
  return dates;
}
